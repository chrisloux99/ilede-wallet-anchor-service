import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { validate } from '@/lib/validation';
import { errorToResponse, UnauthorizedError } from '@/lib/errors';
import { verifyJwt } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const tokenPayload = verifyJwt(authHeader?.replace('Bearer ', '') || '');
    if (!tokenPayload) {
      throw new UnauthorizedError('Authentication required.');
    }

    const { searchParams } = request.nextUrl;
    const kind = searchParams.get('kind') || undefined;
    const status = searchParams.get('status') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let query = `SELECT id, type, asset_code, amount, amount_out, amount_fee, status,
                        stellar_transaction_id, memo, created_at, updated_at
                 FROM transactions WHERE stellar_account_id = $1`;
    const params: any[] = [tokenPayload.sub];
    let paramIdx = 2;

    if (kind) {
      query += ` AND type = $${paramIdx++}`;
      params.push(kind);
    }
    if (status) {
      query += ` AND status = $${paramIdx++}`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    const transactions = result.rows.map((tx) => ({
      id: tx.id.toString(),
      kind: tx.type,
      status: tx.status,
      amount_in: tx.amount?.toString(),
      amount_out: tx.amount_out?.toString(),
      amount_fee: tx.amount_fee?.toString(),
      stellar_transaction_id: tx.stellar_transaction_id,
      memo: tx.memo,
      started_at: tx.created_at?.toISOString(),
      completed_at: tx.status === 'completed' ? tx.updated_at?.toISOString() : null,
    }));

    return NextResponse.json({
      transactions,
      total: transactions.length,
      limit,
      offset,
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
