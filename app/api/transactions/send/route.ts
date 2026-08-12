import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyJwt } from '@/lib/auth';
import { errorToResponse, UnauthorizedError, ValidationError } from '@/lib/errors';
import { Keypair, Asset, Operation, TransactionBuilder, Horizon } from 'stellar-sdk';

/**
 * SEP-31: Cross-border payment send endpoint.
 * Creates a cross-border payment transaction.
 *
 * This is the sending anchor's endpoint. It:
 * 1. Validates the sender's auth and KYC
 * 2. Accepts receiver info and quote
 * 3. Creates a transaction record
 * 4. Executes on-chain transfer to receiving anchor (or holds for processing)
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const tokenPayload = verifyJwt(authHeader?.replace('Bearer ', '') || '');
    if (!tokenPayload) {
      throw new UnauthorizedError('Authentication required.');
    }

    const body = await request.json();
    const {
      send_asset,
      send_amount,
      destination_asset,
      destination_account,
      quote_id,
      fields, // receiver info fields
    } = body;

    const senderAccount = tokenPayload.sub;

    // Validate required fields
    if (!send_asset || !send_amount || !destination_asset || !destination_account) {
      throw new ValidationError('Missing required fields', {
        send_asset: send_asset ? undefined : 'Required',
        send_amount: send_amount ? undefined : 'Required',
        destination_asset: destination_asset ? undefined : 'Required',
        destination_account: destination_account ? undefined : 'Required',
      });
    }

    // Check sender KYC
    const kycCheck = await pool.query(
      `SELECT kyc_status FROM users WHERE stellar_account_id = $1`,
      [senderAccount]
    );
    if (kycCheck.rows.length === 0 || kycCheck.rows[0].kyc_status !== 'approved') {
      return NextResponse.json({
        error: {
          code: 'KYC_REQUIRED',
          message: 'KYC verification required for cross-border payments.',
          recovery_suggestion: 'Complete KYC at /kyc before sending.',
        },
      }, { status: 403 });
    }

    // Look up quote if provided
    let quote: any = null;
    if (quote_id) {
      const quoteResult = await pool.query(
        `SELECT * FROM quotes WHERE id = $1 AND stellar_account_id = $2 AND expires_at > NOW()`,
        [quote_id, senderAccount]
      );
      if (quoteResult.rows.length === 0) {
        throw new ValidationError('Invalid or expired quote', { quote_id: 'Quote not found or expired' });
      }
      quote = quoteResult.rows[0];
    }

    // Create transaction record
    const result = await pool.query(
      `INSERT INTO transactions (
        stellar_account_id, type, asset_code, amount, status,
        from_address, to_address, memo
      )
      VALUES ($1, 'transfer', $2, $3, 'pending_anchor', $4, $5, $6)
      RETURNING id`,
      [senderAccount, send_asset, send_amount, senderAccount, destination_account, quote_id || null]
    );

    const txId = result.rows[0].id.toString();

    // Execute on-chain transfer from sender to distribution account
    // (In production, this would go to the receiving anchor's distribution account)
    const horizonUrl = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
    const networkPassphrase = process.env.STELLAR_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';
    const distributionSecret = process.env.DISTRIBUTION_ACCOUNT_SECRET_KEY;
    const issuingAccountPublicKey = process.env.ISSUING_ACCOUNT_PUBLIC_KEY;

    if (!distributionSecret || !issuingAccountPublicKey) {
      await pool.query(`UPDATE transactions SET status = 'error' WHERE id = $1`, [txId]);
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    try {
      const server = new Horizon.Server(horizonUrl);
      const distributionKP = Keypair.fromSecret(distributionSecret);

      // For cross-border: the sending anchor transfers the destination asset
      // to the receiving account. For now, we simulate by transferring from
      // distribution to the destination.
      let asset: Asset;
      if (destination_asset === 'USDC') {
        asset = new Asset('USDC', 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN');
      } else {
        asset = new Asset(destination_asset, issuingAccountPublicKey);
      }

      const distAccount = await server.loadAccount(distributionKP.publicKey());
      const fee = await server.fetchBaseFee();

      // Calculate destination amount (apply exchange rate from quote)
      let destAmount = send_amount;
      if (quote) {
        destAmount = quote.buy_amount?.toString() || send_amount;
      }

      const paymentTx = new TransactionBuilder(distAccount, {
        fee: fee.toString(),
        networkPassphrase,
      })
        .addOperation(
          Operation.payment({
            destination: destination_account,
            asset,
            amount: destAmount,
          })
        )
        .addOperation(
          Operation.manageData({
            name: 'cross_border_ref',
            value: txId,
          })
        )
        .setTimeout(120)
        .build();

      paymentTx.sign(distributionKP);
      const paymentResult = await server.submitTransaction(paymentTx);

      // Update transaction as completed
      await pool.query(
        `UPDATE transactions
         SET status = 'completed',
             stellar_transaction_id = $1,
             amount_out = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [paymentResult.hash, destAmount, txId]
      );

      return NextResponse.json({
        id: txId,
        status: 'completed',
        stellar_transaction_id: paymentResult.hash,
        send_asset,
        send_amount,
        destination_asset,
        destination_account,
        amount_out: destAmount,
        quote_id: quote_id || null,
      });
    } catch (stellarError: any) {
      console.error('SEP-31 stellar error:', stellarError);
      await pool.query(
        `UPDATE transactions SET status = 'error', updated_at = NOW() WHERE id = $1`,
        [txId]
      );
      return NextResponse.json({
        id: txId,
        status: 'error',
        error: stellarError.message,
      }, { status: 500 });
    }
  } catch (error) {
    return errorToResponse(error);
  }
}

/**
 * GET handler: returns supported destination assets and required fields.
 */
export async function GET(request: NextRequest) {
  try {
    const issuingAccount = process.env.ISSUING_ACCOUNT_PUBLIC_KEY || '';

    return NextResponse.json({
      assets: {
        'iLede:iLede': {
          enabled: true,
          sender_sep12_status: 'not_supported',
          receiver_sep12_status: 'not_supported',
          fields: {
            transaction: {
              receiver: {
                description: 'Stellar account ID of the receiver',
                optional: false,
              },
            },
          },
        },
        'USDC:USD': {
          enabled: true,
          sender_sep12_status: 'not_supported',
          receiver_sep12_status: 'not_supported',
          fields: {
            transaction: {
              receiver: {
                description: 'Stellar account ID of the receiver',
                optional: false,
              },
            },
          },
        },
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get info' }, { status: 500 });
  }
}
