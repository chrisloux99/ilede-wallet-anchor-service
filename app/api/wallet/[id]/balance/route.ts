import { NextRequest, NextResponse } from 'next/server';
import { errorToResponse } from '@/lib/errors';
import { Horizon } from 'stellar-sdk';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const horizonUrl = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
    const server = new Horizon.Server(horizonUrl);

    const account = await server.loadAccount(id);

    return NextResponse.json({
      balances: account.balances.map((b: any) => ({
        asset_type: b.asset_type,
        asset_code: b.asset_code,
        asset_issuer: b.asset_issuer,
        balance: b.balance,
      })),
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
