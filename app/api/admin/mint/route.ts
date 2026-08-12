import { NextRequest, NextResponse } from 'next/server';
import { validate } from '@/lib/validation';
import { errorToResponse, UnauthorizedError } from '@/lib/errors';
import { validateAdminToken } from '@/lib/auth';
import { Keypair, Asset, Operation, TransactionBuilder, Horizon } from 'stellar-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, admin_token } = body;

    validate().required('amount', amount).amount('amount', amount).validate();

    // Admin token guard with constant-time comparison
    if (!validateAdminToken(admin_token)) {
      throw new UnauthorizedError('Invalid admin token');
    }

    const horizonUrl = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
    const networkPassphrase = process.env.STELLAR_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';
    const issuingSecret = process.env.ISSUING_ACCOUNT_SECRET_KEY;
    const distributionSecret = process.env.DISTRIBUTION_ACCOUNT_SECRET_KEY;
    const assetCode = process.env.ASSET_CODE || 'iLede';

    if (!issuingSecret || !distributionSecret) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const server = new Horizon.Server(horizonUrl);
    const issuerKP = Keypair.fromSecret(issuingSecret);
    const distributionKP = Keypair.fromSecret(distributionSecret);
    const asset = new Asset(assetCode, issuerKP.publicKey());

    // Ensure distribution has trustline
    const distAccount = await server.loadAccount(distributionKP.publicKey());
    const hasTrust = distAccount.balances.some(
      (b: any) => b.asset_code === asset.getCode() && b.asset_issuer === asset.getIssuer()
    );

    let trustline_tx_hash: string | undefined;
    if (!hasTrust) {
      const fee = await server.fetchBaseFee();
      const tx = new TransactionBuilder(distAccount, {
        fee: fee.toString(),
        networkPassphrase,
      })
        .addOperation(Operation.changeTrust({ asset }))
        .setTimeout(30)
        .build();
      tx.sign(distributionKP);
      const res = await server.submitTransaction(tx);
      trustline_tx_hash = res.hash;
    }

    // Issue asset from issuer to distribution
    const issuerAccount = await server.loadAccount(issuerKP.publicKey());
    const fee2 = await server.fetchBaseFee();
    const paymentTx = new TransactionBuilder(issuerAccount, {
      fee: fee2.toString(),
      networkPassphrase,
    })
      .addOperation(
        Operation.payment({
          destination: distributionKP.publicKey(),
          asset,
          amount: amount,
        })
      )
      .setTimeout(30)
      .build();

    paymentTx.sign(issuerKP);
    const paymentRes = await server.submitTransaction(paymentTx);

    return NextResponse.json({
      distribution_public_key: distributionKP.publicKey(),
      asset_code: assetCode,
      trustline_tx_hash,
      mint_tx_hash: paymentRes.hash,
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
