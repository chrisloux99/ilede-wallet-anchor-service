import { Keypair, TransactionBuilder } from 'stellar-sdk';

export interface AuthResult {
  token: string;
  expires_in: number;
}

/**
 * Perform SEP-10 web authentication.
 * 1. GET challenge from server
 * 2. Sign with client keypair
 * 3. POST signed challenge back to get JWT
 */
export async function authenticate(secretKey: string): Promise<AuthResult> {
  const keypair = Keypair.fromSecret(secretKey);
  const account = keypair.publicKey();

  // Step 1: Get challenge
  const challengeRes = await fetch(`/api/auth?account=${encodeURIComponent(account)}`);
  if (!challengeRes.ok) {
    const err = await challengeRes.json();
    throw new Error(err.error?.message || 'Failed to get auth challenge');
  }
  const { transaction, network_passphrase } = await challengeRes.json();

  // Step 2: Sign challenge
  const tx = TransactionBuilder.fromXDR(transaction, network_passphrase) as any;
  tx.sign(keypair);
  const signedXdr = tx.toXDR();

  // Step 3: Submit signed challenge
  const tokenRes = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction: signedXdr }),
  });
  if (!tokenRes.ok) {
    const err = await tokenRes.json();
    throw new Error(err.error?.message || 'Auth verification failed');
  }

  return tokenRes.json();
}
