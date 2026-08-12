import { NextRequest, NextResponse } from 'next/server';
import { validate, sanitizeInput } from '@/lib/validation';
import { errorToResponse, StellarNetworkError } from '@/lib/errors';
import { Keypair, Operation, TransactionBuilder, Horizon } from 'stellar-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = sanitizeInput(await request.json());
    const { public_key } = body;

    validate()
      .required('public_key', public_key)
      .stellarAccount('public_key', public_key)
      .validate();

    const horizonUrl = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
    const networkPassphrase = process.env.STELLAR_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';
    const issuingAccountPublicKey = process.env.ISSUING_ACCOUNT_PUBLIC_KEY;
    const issuingAccountSecret = process.env.ISSUING_ACCOUNT_SECRET_KEY;
    const assetCode = process.env.ASSET_CODE || 'iLede';

    if (!issuingAccountPublicKey || !issuingAccountSecret) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const server = new Horizon.Server(horizonUrl);
    const issuerKeypair = Keypair.fromSecret(issuingAccountSecret);

    // Verify the trustline exists before authorizing
    const account = await server.loadAccount(public_key);
    const hasTrustline = account.balances.some(
      (b: any) => b.asset_code === assetCode && b.asset_issuer === issuingAccountPublicKey
    );

    if (!hasTrustline) {
      return NextResponse.json({
        error: {
          code: 'TRUSTLINE_MISSING',
          message: 'No trustline found. Sign and submit the trustline_xdr from /api/wallet/create first.',
        },
      }, { status: 400 });
    }

    // Authorize user account to hold iLede (required when AUTH_REQUIRED_FLAG is set)
    const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());
    const fee = await server.fetchBaseFee();

    const authTx = new TransactionBuilder(issuerAccount, {
      fee: fee.toString(),
      networkPassphrase,
    })
      .addOperation(
        Operation.allowTrust({
          trustor: public_key,
          assetCode: assetCode,
          authorize: true,
        })
      )
      .setTimeout(30)
      .build();

    authTx.sign(issuerKeypair);
    const result = await server.submitTransaction(authTx);

    return NextResponse.json({
      account_id: public_key,
      authorize_transaction_hash: result.hash,
      success: true,
      message: 'Account authorized to hold iLede tokens.',
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
