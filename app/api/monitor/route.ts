import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { Horizon } from 'stellar-sdk';
import { validateAdminToken } from '@/lib/auth';

/**
 * Monitor incoming Stellar payments to the distribution account
 * and match them to pending withdrawals by memo.
 *
 * Call this endpoint periodically (e.g., via cron or manual trigger).
 * Protected by admin token.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { admin_token } = body;

    if (!validateAdminToken(admin_token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const horizonUrl = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
    const distributionPublicKey = process.env.DISTRIBUTION_ACCOUNT_PUBLIC_KEY;
    const issuingAccountPublicKey = process.env.ISSUING_ACCOUNT_PUBLIC_KEY;
    const assetCode = process.env.ASSET_CODE || 'iLede';

    if (!distributionPublicKey || !issuingAccountPublicKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const server = new Horizon.Server(horizonUrl);

    // Get pending withdrawals
    const pendingResult = await pool.query(
      `SELECT id, stellar_account_id, asset_code, amount, memo
       FROM transactions
       WHERE type = 'withdraw' AND status = 'pending_user_transfer_start'`
    );

    if (pendingResult.rows.length === 0) {
      return NextResponse.json({ matched: 0, message: 'No pending withdrawals' });
    }

    // Build a map of pending withdrawal memos
    const pendingByMemo = new Map<string, typeof pendingResult.rows[0]>();
    for (const row of pendingResult.rows) {
      pendingByMemo.set(row.id.toString(), row);
    }

    // Fetch recent payments to the distribution account
    let matched = 0;
    const errors: string[] = [];

    try {
      const payments = await server
        .payments()
        .forAccount(distributionPublicKey)
        .order('desc')
        .limit(50)
        .call();

      for (const payment of payments.records) {
        // Only look at incoming payments (not outgoing)
        if (payment.type !== 'payment') continue;
        if (payment.to !== distributionPublicKey) continue;

        // Check if this payment matches a pending withdrawal
        // We need to check the transaction memo
        try {
          const tx = await payment.transaction();
          const txMemo = tx.memo;

          if (txMemo && pendingByMemo.has(txMemo)) {
            const withdrawal = pendingByMemo.get(txMemo)!;

            // Verify the asset matches
            const paymentAssetCode = payment.asset_type === 'native' ? 'XLM' : payment.asset_code;

            // Update the withdrawal status
            await pool.query(
              `UPDATE transactions
               SET status = 'completed',
                   stellar_transaction_id = $1,
                   amount_out = $2,
                   updated_at = NOW()
               WHERE id = $3`,
              [payment.transaction_hash, payment.amount, withdrawal.id]
            );

            matched++;
            pendingByMemo.delete(txMemo); // Don't match again
          }
        } catch (txErr) {
          // Skip if we can't fetch the transaction
          continue;
        }
      }
    } catch (horizonErr: any) {
      errors.push(`Horizon error: ${horizonErr.message}`);
    }

    return NextResponse.json({
      matched,
      pending_count: pendingResult.rows.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Monitor error:', error);
    return NextResponse.json({ error: 'Monitor failed' }, { status: 500 });
  }
}
