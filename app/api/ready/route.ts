import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  const checks: { database: string; stellar: string } = { database: 'ok', stellar: 'ok' };

  try {
    await pool.query('SELECT 1');
  } catch {
    checks.database = 'error';
  }

  try {
    const horizonUrl = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
    const res = await fetch(`${horizonUrl}/fee_stats`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Horizon returned ${res.status}`);
  } catch {
    checks.stellar = 'error';
  }

  const allOk = Object.values(checks).every((v) => v === 'ok');

  return NextResponse.json(
    {
      status: allOk ? 'ready' : 'not_ready',
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: allOk ? 200 : 503 }
  );
}
