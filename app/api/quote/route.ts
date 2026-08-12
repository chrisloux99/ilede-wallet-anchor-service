import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { validate } from '@/lib/validation';
import { errorToResponse, UnauthorizedError, ValidationError, NotFoundError } from '@/lib/errors';
import { verifyJwt } from '@/lib/auth';
import { randomBytes } from 'crypto';

// Configurable exchange rates (override via env or replace with DEX oracle)
function getExchangeRate(sellAsset: string, buyAsset: string): number | null {
  const rates: Record<string, number> = {
    'iLede:USDC': parseFloat(process.env.RATE_ILEDE_USDC || '0.5'),
    'USDC:iLede': 1 / parseFloat(process.env.RATE_ILEDE_USDC || '0.5'),
    'iLede:USD': parseFloat(process.env.RATE_ILEDE_USD || '0.5'),
    'USD:iLede': 1 / parseFloat(process.env.RATE_ILEDE_USD || '0.5'),
    'USDC:USD': 1.0,
    'USD:USDC': 1.0,
  };
  return rates[`${sellAsset}:${buyAsset}`] || null;
}

const FEE_PERCENT = parseFloat(process.env.QUOTE_FEE_PERCENT || '0.001');
const QUOTE_TTL_MINUTES = parseInt(process.env.QUOTE_TTL_MINUTES || '5', 10);

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const tokenPayload = verifyJwt(authHeader?.replace('Bearer ', '') || '');
    if (!tokenPayload) {
      throw new UnauthorizedError('Authentication required.');
    }

    const { searchParams } = request.nextUrl;
    const id = searchParams.get('id');

    if (!id) {
      throw new ValidationError('Missing quote ID', { id: 'Quote ID is required' });
    }

    const result = await pool.query(
      `SELECT * FROM quotes WHERE id = $1 AND stellar_account_id = $2`,
      [id, tokenPayload.sub]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Quote');
    }

    const q = result.rows[0];
    const expired = new Date(q.expires_at) < new Date();

    return NextResponse.json({
      id: q.id.toString(),
      sell_asset: q.sell_asset_code,
      buy_asset: q.buy_asset_code,
      sell_amount: q.sell_amount?.toString(),
      buy_amount: q.buy_amount?.toString(),
      price: q.price?.toString(),
      fee: { total: q.fee_amount?.toString(), asset: q.sell_asset_code },
      expires_at: q.expires_at,
      expired,
    });
  } catch (error) {
    return errorToResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const tokenPayload = verifyJwt(authHeader?.replace('Bearer ', '') || '');
    if (!tokenPayload) {
      throw new UnauthorizedError('Authentication required.');
    }

    const body = await request.json();
    const { sell_asset, buy_asset, sell_amount, buy_amount } = body;

    validate()
      .required('sell_asset', sell_asset)
      .required('buy_asset', buy_asset)
      .validate();

    if (!sell_amount && !buy_amount) {
      throw new ValidationError('Amount required', { amount: 'Either sell_amount or buy_amount must be specified' });
    }

    if (sell_asset === buy_asset) {
      throw new ValidationError('Invalid asset pair', { assets: 'Sell and buy assets must be different' });
    }

    const rate = getExchangeRate(sell_asset, buy_asset);
    if (!rate) {
      throw new ValidationError('Unsupported trading pair', { pair: `Trading pair ${sell_asset}:${buy_asset} is not supported` });
    }

    // Use string-based decimal to avoid float precision issues
    let sellAmt = sell_amount ? parseFloat(sell_amount) : 0;
    let buyAmt = buy_amount ? parseFloat(buy_amount) : 0;

    if (sellAmt > 0) {
      buyAmt = parseFloat((sellAmt * rate).toFixed(7));
    } else if (buyAmt > 0) {
      sellAmt = parseFloat((buyAmt / rate).toFixed(7));
    }

    const fee = parseFloat((sellAmt * FEE_PERCENT).toFixed(7));
    const expiresAt = new Date(Date.now() + QUOTE_TTL_MINUTES * 60 * 1000);

    const result = await pool.query(
      `INSERT INTO quotes (sell_asset_code, buy_asset_code, sell_amount, buy_amount, price, fee_amount, fee_percent, stellar_account_id, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [sell_asset, buy_asset, sellAmt, buyAmt, rate, fee, FEE_PERCENT, tokenPayload.sub, expiresAt]
    );

    return NextResponse.json({
      id: result.rows[0].id.toString(),
      expires_at: expiresAt.toISOString(),
      price: rate.toString(),
      total_price: (sellAmt + fee).toString(),
      sell_asset,
      buy_asset,
      sell_amount: sellAmt.toString(),
      buy_amount: buyAmt.toString(),
      fee: { total: fee.toString(), asset: sell_asset },
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
