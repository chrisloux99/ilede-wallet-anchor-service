import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { validate } from '@/lib/validation';
import { errorToResponse } from '@/lib/errors';
import { createJwt } from '@/lib/auth';
import { Keypair, Account, Operation, TransactionBuilder, Memo } from 'stellar-sdk';

const HOME_DOMAIN = process.env.HOME_DOMAIN || 'il3pay.com';
const CHALLENGE_TIMEOUT = 300;
const JWT_TTL = parseInt(process.env.JWT_TTL || '3600', 10);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const account = searchParams.get('account') || '';
    const memo = searchParams.get('memo') || undefined;
    const home_domain = searchParams.get('home_domain') || undefined;
    const client_domain = searchParams.get('client_domain') || undefined;

    validate().required('account', account).stellarAccount('account', account).validate();

    const networkPassphrase = process.env.STELLAR_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';
    const serverSecret = process.env.SIGNING_KEY_SECRET;
    if (!serverSecret) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }
    const serverKeypair = Keypair.fromSecret(serverSecret);

    // SEP-10: challenge source must be the server signing key
    const sourceAccount = new Account(serverKeypair.publicKey(), '0');
    const nonce = randomBytes(48).toString('base64');
    const homeDomain = home_domain || HOME_DOMAIN;

    const txBuilder = new TransactionBuilder(sourceAccount, {
      fee: '0',
      networkPassphrase,
      timebounds: {
        minTime: Math.floor(Date.now() / 1000),
        maxTime: Math.floor(Date.now() / 1000) + CHALLENGE_TIMEOUT,
      },
    });

    txBuilder.addOperation(
      Operation.manageData({
        source: account,
        name: `${homeDomain} auth`,
        value: nonce,
      })
    );

    txBuilder.addOperation(
      Operation.manageData({
        source: serverKeypair.publicKey(),
        name: 'web_auth_domain',
        value: homeDomain,
      })
    );

    if (client_domain) {
      txBuilder.addOperation(
        Operation.manageData({
          source: client_domain,
          name: 'client_domain',
          value: client_domain,
        })
      );
    }

    if (memo) {
      validate().memo('memo', memo).validate();
      txBuilder.addMemo(Memo.id(memo));
    }

    const tx = txBuilder.build();
    tx.sign(serverKeypair);

    return NextResponse.json({
      transaction: tx.toXDR(),
      network_passphrase: networkPassphrase,
    });
  } catch (error) {
    return errorToResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transaction } = body;

    validate().required('transaction', transaction).minLength('transaction', transaction, 10).validate();

    const networkPassphrase = process.env.STELLAR_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';
    const serverSecret = process.env.SIGNING_KEY_SECRET;
    if (!serverSecret) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }
    const serverKeypair = Keypair.fromSecret(serverSecret);

    const { TransactionBuilder } = await import('stellar-sdk');
    const tx = TransactionBuilder.fromXDR(transaction, networkPassphrase) as any;

    // Validate challenge structure
    if (tx.sequence !== '0') {
      return NextResponse.json({ error: 'Challenge sequence number must be 0' }, { status: 401 });
    }

    // Verify server signature
    const serverSigValid = tx.signatures.some((sig: any) => {
      try {
        return serverKeypair.verify(tx.hash(), sig.signature());
      } catch {
        return false;
      }
    });
    if (!serverSigValid) {
      return NextResponse.json({ error: 'Challenge not signed by server' }, { status: 401 });
    }

    // Check time bounds
    if (tx.timeBounds) {
      const now = Math.floor(Date.now() / 1000);
      if (now < Number(tx.timeBounds.minTime) || now > Number(tx.timeBounds.maxTime)) {
        return NextResponse.json({ error: 'Challenge has expired' }, { status: 401 });
      }
    }

    // Extract client account from first operation
    const firstOp = tx.operations[0];
    if (!firstOp || firstOp.type !== 'manageData' || firstOp.name !== `${HOME_DOMAIN} auth`) {
      return NextResponse.json({ error: 'Invalid challenge structure' }, { status: 401 });
    }

    const clientAccount = firstOp.source;
    if (!clientAccount) {
      return NextResponse.json({ error: 'Missing client account' }, { status: 401 });
    }

    // Verify client signature
    const clientKeypair = Keypair.fromPublicKey(clientAccount);
    const clientSigValid = tx.signatures.some((sig: any) => {
      try {
        return clientKeypair.verify(tx.hash(), sig.signature());
      } catch {
        return false;
      }
    });
    if (!clientSigValid) {
      return NextResponse.json({ error: 'Transaction not signed by client' }, { status: 401 });
    }

    // Issue JWT with proper claims
    const token = createJwt({ sub: clientAccount, aud: HOME_DOMAIN }, JWT_TTL);

    return NextResponse.json({ token, expires_in: JWT_TTL });
  } catch (error) {
    return errorToResponse(error);
  }
}
