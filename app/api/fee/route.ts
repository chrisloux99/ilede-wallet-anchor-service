import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth';
import { errorToResponse, UnauthorizedError, ValidationError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const tokenPayload = verifyJwt(authHeader?.replace('Bearer ', '') || '');
    if (!tokenPayload) {
      throw new UnauthorizedError('Authentication required.');
    }

    const { searchParams } = request.nextUrl;
    const operation = searchParams.get('type') || '';
    const assetCode = searchParams.get('asset_code') || '';
    const amount = parseFloat(searchParams.get('amount') || '0');

    if (!operation || !['deposit', 'withdraw'].includes(operation)) {
      throw new ValidationError('Invalid type', { type: 'Must be deposit or withdraw' });
    }

    if (!assetCode) {
      throw new ValidationError('Missing asset_code', { asset_code: 'Required' });
    }

    const feeFixed = 0.1;
    const feePercent = 0.1;
    const fee = feeFixed + (amount * feePercent / 100);

    return NextResponse.json({
      fee: parseFloat(fee.toFixed(7)),
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
