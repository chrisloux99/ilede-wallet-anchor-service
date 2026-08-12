import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { validate, sanitizeInput } from '@/lib/validation';
import { errorToResponse, UnauthorizedError, StellarNetworkError } from '@/lib/errors';
import { verifyJwt } from '@/lib/auth';
import { Keypair, Asset, Operation, TransactionBuilder, Horizon } from 'stellar-sdk';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const asset_code = searchParams.get('asset_code') || '';
    const account = searchParams.get('account') || '';
    const amount = searchParams.get('amount') || undefined;
    const memo = searchParams.get('memo') || undefined;

    // Auth check
    const authHeader = request.headers.get('authorization');
    const tokenPayload = verifyJwt(authHeader?.replace('Bearer ', '') || '');
    if (!tokenPayload || tokenPayload.sub !== account) {
      throw new UnauthorizedError('Authentication required. Token account must match deposit account.');
    }

    validate()
      .required('asset_code', asset_code)
      .required('account', account)
      .stellarAccount('account', account)
      .assetCode('asset_code', asset_code)
      .amount('amount', amount)
      .validate();

    // Check KYC status
    const kycCheck = await pool.query(
      `SELECT kyc_status FROM users WHERE stellar_account_id = $1`,
      [account]
    );
    if (kycCheck.rows.length > 0 && kycCheck.rows[0].kyc_status !== 'approved') {
      return NextResponse.json({
        error: {
          code: 'KYC_REQUIRED',
          message: 'KYC verification required before depositing.',
          recovery_suggestion: 'Complete KYC at /kyc before depositing.',
        },
      }, { status: 403 });
    }

    // Create transaction record
    const result = await pool.query(
      `INSERT INTO transactions (stellar_account_id, type, asset_code, amount, status, memo)
       VALUES ($1, 'deposit', $2, $3, 'pending', $4)
       RETURNING id`,
      [account, asset_code, amount || '0', memo || null]
    );

    const txId = result.rows[0].id.toString();

    // Execute on-chain transfer
    const horizonUrl = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
    const networkPassphrase = process.env.STELLAR_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';
    const distributionSecret = process.env.DISTRIBUTION_ACCOUNT_SECRET_KEY;
    const issuingAccountPublicKey = process.env.ISSUING_ACCOUNT_PUBLIC_KEY;
    const depositAmount = amount || '10.0000000';

    if (!distributionSecret || !issuingAccountPublicKey) {
      await pool.query(`UPDATE transactions SET status = 'error' WHERE id = $1`, [txId]);
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    try {
      const server = new Horizon.Server(horizonUrl);
      const distributionKP = Keypair.fromSecret(distributionSecret);

      // Determine which asset to send
      let asset: Asset;
      if (asset_code === 'USDC') {
        // Use testnet USDC from Circle
        asset = new Asset('USDC', 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN');
      } else {
        asset = new Asset(asset_code, issuingAccountPublicKey);
      }

      const distAccount = await server.loadAccount(distributionKP.publicKey());
      const fee = await server.fetchBaseFee();

      const paymentTx = new TransactionBuilder(distAccount, {
        fee: fee.toString(),
        networkPassphrase,
      })
        .addOperation(
          Operation.payment({
            destination: account,
            asset,
            amount: depositAmount,
          })
        )
        .addOperation(
          Operation.manageData({
            name: 'deposit_ref',
            value: txId,
          })
        )
        .setTimeout(60)
        .build();

      paymentTx.sign(distributionKP);
      const paymentResult = await server.submitTransaction(paymentTx);

      // Update transaction as completed
      await pool.query(
        `UPDATE transactions SET status = 'completed', stellar_transaction_id = $1, updated_at = NOW() WHERE id = $2`,
        [paymentResult.hash, txId]
      );

      return NextResponse.json({
        id: txId,
        status: 'completed',
        stellar_transaction_id: paymentResult.hash,
        how: `Deposit of ${depositAmount} ${asset_code} completed.`,
        amount: depositAmount,
        asset_code,
        eta: 0,
      });
    } catch (stellarError: any) {
      console.error('Stellar deposit error:', stellarError);
      await pool.query(
        `UPDATE transactions SET status = 'error', updated_at = NOW() WHERE id = $1`,
        [txId]
      );
      throw new StellarNetworkError('On-chain deposit failed', stellarError.message);
    }
  } catch (error) {
    return errorToResponse(error);
  }
}
