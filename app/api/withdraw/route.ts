import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { validate } from '@/lib/validation';
import { errorToResponse, UnauthorizedError, ValidationError } from '@/lib/errors';
import { verifyJwt } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const asset_code = searchParams.get('asset_code') || '';
    const type = searchParams.get('type') || '';
    const dest = searchParams.get('dest') || undefined;
    const account = searchParams.get('account') || undefined;
    const amount = searchParams.get('amount') || '0';
    const memo = searchParams.get('memo') || undefined;

    // Auth check
    const authHeader = request.headers.get('authorization');
    const tokenPayload = verifyJwt(authHeader?.replace('Bearer ', '') || '');
    const authAccount = account || dest;
    if (!tokenPayload || tokenPayload.sub !== authAccount) {
      throw new UnauthorizedError('Authentication required.');
    }

    validate()
      .required('asset_code', asset_code)
      .required('type', type)
      .assetCode('asset_code', asset_code)
      .amount('amount', amount)
      .validate();

    if (!['bank_account', 'cash', 'mobile_money'].includes(type)) {
      throw new ValidationError('Invalid withdrawal type', { type: 'Must be one of: bank_account, cash, mobile_money' });
    }

    if (!dest && !account) {
      throw new ValidationError('Destination required', { dest: 'Either dest or account must be provided' });
    }

    // Check KYC status
    const kycCheck = await pool.query(
      `SELECT kyc_status FROM users WHERE stellar_account_id = $1`,
      [authAccount]
    );
    if (kycCheck.rows.length > 0 && kycCheck.rows[0].kyc_status !== 'approved') {
      return NextResponse.json({
        error: {
          code: 'KYC_REQUIRED',
          message: 'KYC verification required before withdrawing.',
          recovery_suggestion: 'Complete KYC at /kyc before withdrawing.',
        },
      }, { status: 403 });
    }

    const result = await pool.query(
      `INSERT INTO transactions (stellar_account_id, type, asset_code, amount, status, memo, to_address)
       VALUES ($1, 'withdraw', $2, $3, 'pending_user_transfer_start', $4, $5)
       RETURNING id`,
      [authAccount, asset_code, amount, memo || null, dest || null]
    );

    const txId = result.rows[0].id.toString();
    const distributionAccount = process.env.DISTRIBUTION_ACCOUNT_PUBLIC_KEY || '';
    const issuingAccount = process.env.ISSUING_ACCOUNT_PUBLIC_KEY || '';

    // Determine which asset the user should send
    const assetIssuer = asset_code === 'USDC'
      ? 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'
      : issuingAccount;

    return NextResponse.json({
      id: txId,
      status: 'pending_user_transfer_start',
      account_id: distributionAccount,
      memo_type: 'id',
      memo: txId,
      how: `Send ${amount} ${asset_code} (issuer: ${assetIssuer}) to ${distributionAccount} with memo: ${txId}`,
      eta: 300,
      min_amount: '1.0000000',
      max_amount: '10000.0000000',
      fee_fixed: '0.1000000',
      fee_percent: '0.1',
      instructions: {
        send_to: distributionAccount,
        asset_code,
        asset_issuer: assetIssuer,
        amount,
        memo: txId,
        memo_type: 'id',
      },
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
