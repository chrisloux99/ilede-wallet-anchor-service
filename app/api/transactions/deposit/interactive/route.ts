import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyJwt } from '@/lib/auth';
import { errorToResponse, UnauthorizedError, ValidationError } from '@/lib/errors';

/**
 * SEP-24: Interactive deposit endpoint.
 * Creates a deposit transaction and returns an interactive URL
 * that the wallet opens in a popup.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const tokenPayload = verifyJwt(authHeader?.replace('Bearer ', '') || '');
    if (!tokenPayload) {
      throw new UnauthorizedError('Authentication required.');
    }

    const body = await request.json().catch(() => ({}));
    const { asset_code, amount, memo } = body;
    const account = tokenPayload.sub;

    if (!asset_code) {
      throw new ValidationError('Missing asset_code', { asset_code: 'Required' });
    }

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
       VALUES ($1, 'deposit', $2, $3, 'pending_user_transfer_start', $4)
       RETURNING id`,
      [account, asset_code, amount || '0', memo || null]
    );

    const txId = result.rows[0].id.toString();
    const baseUrl = `https://${process.env.HOME_DOMAIN || 'il3pay.com'}`;

    return NextResponse.json({
      id: txId,
      type: 'interactive_customer_info_needed',
      url: `${baseUrl}/deposit-interactive?id=${txId}&account=${encodeURIComponent(account)}`,
      interactive: true,
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
