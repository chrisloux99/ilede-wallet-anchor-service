import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { validate, sanitizeInput } from '@/lib/validation';
import { errorToResponse, StellarNetworkError, ValidationError } from '@/lib/errors';
import { Keypair, Asset, Operation, TransactionBuilder, Horizon } from 'stellar-sdk';

// Simple per-IP rate limit for wallet creation (prevent distribution account drain)
const walletCreationLog = new Map<string, { count: number; windowStart: number }>();
const MAX_WALLETS_PER_HOUR = 5;
const WINDOW_MS = 3600_000;

function checkWalletRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = walletCreationLog.get(ip);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    walletCreationLog.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= MAX_WALLETS_PER_HOUR) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

    if (!checkWalletRateLimit(ip)) {
      return NextResponse.json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many wallet creation attempts. Please try again later.',
        },
      }, { status: 429 });
    }

    const body = sanitizeInput(await request.json());
    const { email, phone, public_key } = body;

    validate()
      .required('public_key', public_key)
      .stellarAccount('public_key', public_key)
      .email('email', email)
      .phone('phone', phone)
      .validate();

    const horizonUrl = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
    const networkPassphrase = process.env.STELLAR_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';
    const distributionSecret = process.env.DISTRIBUTION_ACCOUNT_SECRET_KEY;
    const issuingAccountPublicKey = process.env.ISSUING_ACCOUNT_PUBLIC_KEY;
    const issuingAccountSecret = process.env.ISSUING_ACCOUNT_SECRET_KEY;
    const assetCode = process.env.ASSET_CODE || 'iLede';

    if (!distributionSecret || !issuingAccountPublicKey || !issuingAccountSecret) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const server = new Horizon.Server(horizonUrl);
    const distributionKeypair = Keypair.fromSecret(distributionSecret);
    const issuerKeypair = Keypair.fromSecret(issuingAccountSecret);
    const asset = new Asset(assetCode, issuingAccountPublicKey);

    // Check if account exists, fund with Friendbot on testnet
    let accountExists = true;
    try {
      await server.loadAccount(public_key);
    } catch {
      accountExists = false;
    }

    if (!accountExists && horizonUrl.includes('testnet')) {
      const friendbotUrl = `https://friendbot.stellar.org?addr=${encodeURIComponent(public_key)}`;
      const fbRes = await fetch(friendbotUrl);
      if (!fbRes.ok) {
        throw new StellarNetworkError('Failed to fund account via Friendbot');
      }
    }

    // Load user account and build trustline XDR (client must sign)
    const userAccount = await server.loadAccount(public_key);
    const fee = await server.fetchBaseFee();

    const trustTx = new TransactionBuilder(userAccount, {
      fee: fee.toString(),
      networkPassphrase,
    })
      .addOperation(Operation.changeTrust({ asset }))
      .setTimeout(180)
      .build();

    // Airdrop XLM from distribution account
    const distAccount = await server.loadAccount(distributionKeypair.publicKey());

    const xlmTx = new TransactionBuilder(distAccount, {
      fee: fee.toString(),
      networkPassphrase,
    })
      .addOperation(
        Operation.payment({
          destination: public_key,
          asset: Asset.native(),
          amount: '1.0',
        })
      )
      .setTimeout(30)
      .build();

    xlmTx.sign(distributionKeypair);
    const xlmResult = await server.submitTransaction(xlmTx);

    // Authorize user account to hold iLede (required when AUTH_REQUIRED_FLAG is set)
    const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());
    const fee2 = await server.fetchBaseFee();

    const authTx = new TransactionBuilder(issuerAccount, {
      fee: fee2.toString(),
      networkPassphrase,
    })
      .addOperation(
        Operation.allowTrust({
          trustor: public_key,
          assetCode: assetCode,
          authorize: true,
        })
      )
      .setTimeout(30)
      .build();

    authTx.sign(issuerKeypair);
    await server.submitTransaction(authTx);

    // Store user in database
    let userId: string | null = null;
    try {
      const result = await pool.query(
        `INSERT INTO users (stellar_account_id, email, phone, kyc_status)
         VALUES ($1, $2, $3, 'pending')
         ON CONFLICT (stellar_account_id) DO UPDATE SET email = COALESCE($2, users.email), phone = COALESCE($3, users.phone)
         RETURNING id`,
        [public_key, email || null, phone || null]
      );
      userId = result.rows[0]?.id || null;
    } catch (dbError) {
      console.error('Database error during wallet creation:', dbError);
      // Continue — wallet is funded even if DB write fails
    }

    return NextResponse.json({
      account_id: public_key,
      airdrop_transaction_hash: xlmResult.hash,
      trustline_xdr: trustTx.toXDR(),
      success: true,
      message: 'Wallet created and funded with 1 XLM. Sign and submit the trustline_xdr to hold iLede tokens.',
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
