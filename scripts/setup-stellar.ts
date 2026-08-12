/**
 * Stellar Account Setup Script
 *
 * Run this script to set up the issuing and distribution accounts
 * for the iLede anchor service.
 *
 * Usage: npx tsx scripts/setup-stellar.ts
 */

import { Keypair, Asset, Operation, TransactionBuilder, Horizon, Networks } from 'stellar-sdk';

const HORIZON_URL = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
const NETWORK = process.env.STELLAR_NETWORK || 'testnet';
const ASSET_CODE = process.env.ASSET_CODE || 'iLede';

const networkPassphrase = NETWORK === 'testnet'
  ? Networks.TESTNET
  : Networks.PUBLIC;

async function fundAccount(server: Horizon.Server, publicKey: string) {
  if (NETWORK !== 'testnet') {
    console.log(`[SKIP] Friendbot only available on testnet. Fund ${publicKey} manually.`);
    return;
  }

  try {
    await server.loadAccount(publicKey);
    console.log(`[OK] Account ${publicKey.slice(0, 12)}... already exists.`);
    return;
  } catch {
    // Account doesn't exist, fund it
  }

  console.log(`[FUND] Funding ${publicKey.slice(0, 12)}... via Friendbot...`);
  const response = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`);
  if (!response.ok) {
    throw new Error(`Friendbot failed: ${response.statusText}`);
  }
  console.log(`[OK] Account funded.`);
}

async function main() {
  console.log('=== iLede Stellar Account Setup ===\n');
  console.log(`Network: ${NETWORK}`);
  console.log(`Horizon: ${HORIZON_URL}`);
  console.log(`Asset: ${ASSET_CODE}\n`);

  const server = new Horizon.Server(HORIZON_URL);

  // Generate keypairs
  const issuerKP = Keypair.random();
  const distributionKP = Keypair.random();

  console.log('--- Generated Keypairs ---');
  console.log(`\nIssuing Account:`);
  console.log(`  Public Key:  ${issuerKP.publicKey()}`);
  console.log(`  Secret Key:  ${issuerKP.secret()}`);
  console.log(`\nDistribution Account:`);
  console.log(`  Public Key:  ${distributionKP.publicKey()}`);
  console.log(`  Secret Key:  ${distributionKP.secret()}`);

  console.log('\n--- Save these keys securely! ---\n');

  // Fund accounts
  console.log('--- Funding Accounts ---');
  await fundAccount(server, issuerKP.publicKey());
  await fundAccount(server, distributionKP.publicKey());

  // Set flags on issuing account
  console.log('\n--- Setting Issuer Flags ---');
  const issuerAccount = await server.loadAccount(issuerKP.publicKey());
  const fee = await server.fetchBaseFee();

  const flagTx = new TransactionBuilder(issuerAccount, {
    fee: fee.toString(),
    networkPassphrase,
  })
    .addOperation(
      Operation.setOptions({
        setFlags: 3, // AUTH_REQUIRED_FLAG (1) + AUTH_REVOCABLE_FLAG (2)
      })
    )
    .setTimeout(30)
    .build();

  flagTx.sign(issuerKP);
  const flagResult = await server.submitTransaction(flagTx);
  console.log(`[OK] Issuer flags set. TX: ${flagResult.hash}`);

  // Create trustline from distribution to issuer FIRST (required before allowTrust)
  console.log('\n--- Creating Trustline ---');
  const asset = new Asset(ASSET_CODE, issuerKP.publicKey());
  const distAccount = await server.loadAccount(distributionKP.publicKey());
  const fee2 = await server.fetchBaseFee();

  const trustTx = new TransactionBuilder(distAccount, {
    fee: fee2.toString(),
    networkPassphrase,
  })
    .addOperation(Operation.changeTrust({ asset }))
    .setTimeout(30)
    .build();

  trustTx.sign(distributionKP);
  const trustResult = await server.submitTransaction(trustTx);
  console.log(`[OK] Trustline created. TX: ${trustResult.hash}`);

  // Authorize distribution account to hold iLede (required when AUTH_REQUIRED_FLAG is set)
  // Must happen AFTER trustline exists
  console.log('\n--- Authorizing Distribution Account ---');
  const issuerAccountForAuth = await server.loadAccount(issuerKP.publicKey());
  const feeAuth = await server.fetchBaseFee();

  const authTx = new TransactionBuilder(issuerAccountForAuth, {
    fee: feeAuth.toString(),
    networkPassphrase,
  })
    .addOperation(
      Operation.allowTrust({
        trustor: distributionKP.publicKey(),
        assetCode: ASSET_CODE,
        authorize: true,
      })
    )
    .setTimeout(30)
    .build();

  authTx.sign(issuerKP);
  const authResult = await server.submitTransaction(authTx);
  console.log(`[OK] Distribution account authorized. TX: ${authResult.hash}`);

  // Mint initial supply to distribution
  console.log('\n--- Minting Initial Supply ---');
  const mintAmount = '2000000000'; // 2B tokens - full supply to distribution
  const issuerAccount2 = await server.loadAccount(issuerKP.publicKey());
  const fee3 = await server.fetchBaseFee();

  const mintTx = new TransactionBuilder(issuerAccount2, {
    fee: fee3.toString(),
    networkPassphrase,
  })
    .addOperation(
      Operation.payment({
        destination: distributionKP.publicKey(),
        asset,
        amount: mintAmount,
      })
    )
    .setTimeout(30)
    .build();

  mintTx.sign(issuerKP);
  const mintResult = await server.submitTransaction(mintTx);
  console.log(`[OK] Minted ${mintAmount} ${ASSET_CODE}. TX: ${mintResult.hash}`);

  // Print .env.local template
  console.log('\n\n=== Add these to your .env.local ===\n');
  console.log(`STELLAR_HORIZON_URL=${HORIZON_URL}`);
  console.log(`STELLAR_NETWORK_PASSPHRASE=${networkPassphrase}`);
  console.log(`ISSUING_ACCOUNT_PUBLIC_KEY=${issuerKP.publicKey()}`);
  console.log(`ISSUING_ACCOUNT_SECRET_KEY=${issuerKP.secret()}`);
  console.log(`DISTRIBUTION_ACCOUNT_PUBLIC_KEY=${distributionKP.publicKey()}`);
  console.log(`DISTRIBUTION_ACCOUNT_SECRET_KEY=${distributionKP.secret()}`);
  console.log(`ASSET_CODE=${ASSET_CODE}`);
  console.log(`SIGNING_KEY_SECRET=${distributionKP.secret()} # Use a separate key for production`);
  console.log(`HOME_DOMAIN=localhost:3000 # Change for production`);
  console.log(`JWT_SECRET=${Keypair.random().secret().slice(0, 64)}`);
  console.log(`ADMIN_API_TOKEN=${Keypair.random().secret().slice(0, 64)}`);
  console.log('\nDone!');
}

main().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
