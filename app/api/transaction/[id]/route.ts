import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { errorToResponse, UnauthorizedError, NotFoundError } from '@/lib/errors';
import { verifyJwt } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Auth check
    const authHeader = request.headers.get('authorization');
    const tokenPayload = verifyJwt(authHeader?.replace('Bearer ', '') || '');
    if (!tokenPayload) {
      throw new UnauthorizedError('Authentication required.');
    }

    const result = await pool.query(
      `SELECT id, type, asset_code, amount, amount_out, amount_fee, status, stellar_account_id,
              memo, stellar_transaction_id, from_address, to_address, created_at, updated_at
       FROM transactions WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Transaction');
    }

    const tx = result.rows[0];

    // Users can only view their own transactions
    if (tx.stellar_account_id !== tokenPayload.sub) {
      throw new UnauthorizedError('You can only view your own transactions.');
    }

    return NextResponse.json({
      id: tx.id.toString(),
      kind: tx.type,
      status: tx.status,
      amount_in: tx.amount?.toString(),
      amount_out: tx.amount_out?.toString(),
      amount_fee: tx.amount_fee?.toString(),
      started_at: tx.created_at?.toISOString(),
      completed_at: tx.status === 'completed' ? tx.updated_at?.toISOString() : null,
      memo: tx.memo,
      stellar_transaction_id: tx.stellar_transaction_id,
      from: tx.from_address,
      to: tx.to_address,
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
