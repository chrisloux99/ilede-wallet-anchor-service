import { api } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { anchorDB } from "../database/db";
import { validate } from "../common/validation";
import { handleDatabaseError, ConflictError, StellarNetworkError } from "../common/errors";
import { rateLimits } from "../common/rateLimiting";
import { withTransaction, withRetry } from "../common/transactions";
import { Server, Keypair, TransactionBuilder, Operation, Asset } from "stellar-sdk";

// Stellar Network Configuration
const stellarHorizonUrl = secret("StellarHorizonUrl");
const stellarNetworkPassphrase = secret("StellarNetworkPassphrase");
const distributionAccountSecretKey = secret("DistributionAccountSecretKey");
const issuingAccountSecretKey = secret("IssuingAccountSecretKey");
const assetCodeSecret = secret("AssetCode");

interface CreateWalletRequest {
  email?: string;
  phone?: string;
  public_key: string; // Client-generated public key
}

interface CreateWalletResponse {
  account_id: string;
  airdrop_transaction_hash?: string;
  success: boolean;
  message: string;
}

// Creates a new Stellar wallet and performs airdrop
export const create = api<CreateWalletRequest, CreateWalletResponse>(
  { expose: true, method: "POST", path: "/wallet/create" },
  rateLimits.walletCreation(async (req) => {
    return withRetry(async () => {
      return withTransaction(async (tx) => {
        // Validate input - at least one contact method and public key required
        const validator = validate();
        validator.required("public_key", req.public_key);
        validator.stellarAccount("public_key", req.public_key);
        if (req.email) validator.email("email", req.email);
        if (req.phone) validator.phone("phone", req.phone);
        if (!req.email && !req.phone) validator.required("email or phone", null);
        validator.validate();

        // Check if user already exists
        if (req.email) {
          const existingUser = await tx.query`
            SELECT stellar_account_id FROM users WHERE email = ${req.email}
          `;
          if (existingUser.length > 0) {
            throw new ConflictError("An account with this email already exists");
          }
        }
        if (req.phone) {
          const existingUser = await tx.query`
            SELECT stellar_account_id FROM users WHERE phone = ${req.phone}
          `;
          if (existingUser.length > 0) {
            throw new ConflictError("An account with this phone number already exists");
          }
        }

      // Initialize Stellar SDK
      const horizonUrl = await stellarHorizonUrl();
      const networkPassphrase = await stellarNetworkPassphrase();
      const server = new Server(horizonUrl);

      // Use client-provided public key (secret key never leaves client)
      const accountId = req.public_key;
      
      // Validate the public key by creating a keypair object
      const userKeypair = Keypair.fromPublicKey(accountId);

      // Create and fund account on testnet or via distribution account
      let xlmAirdropHash: string | undefined;
      const isTestnet = /Test SDF Network/i.test(networkPassphrase) || /testnet/i.test(horizonUrl);

      if (isTestnet) {
        // Use Friendbot to create and fund the account on testnet
        const resp = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(accountId)}`);
        if (!resp.ok) {
          throw new StellarNetworkError("Friendbot funding failed", `status=${resp.status}`);
        }
        const body = await resp.json().catch(() => ({}));
        xlmAirdropHash = body.hash || undefined;
      } else {
        // Use distribution account to create with 1 XLM starting balance
        const distSecret = await distributionAccountSecretKey();
        const distKeypair = Keypair.fromSecret(distSecret);
        const distAccount = await server.loadAccount(distKeypair.publicKey());
        const fee = await server.fetchBaseFee();
        const tx = new TransactionBuilder(distAccount, { fee: String(fee), networkPassphrase })
          .addOperation(Operation.createAccount({ destination: accountId, startingBalance: "1" }))
          .setTimeout(180)
          .build();
        tx.sign(distKeypair);
        const res = await server.submitTransaction(tx);
        xlmAirdropHash = res.hash;
      }

        // Store user in database
        await tx.exec`
          INSERT INTO users (stellar_account_id, email, phone)
          VALUES (${accountId}, ${req.email}, ${req.phone})
        `;

      // Add trustline for iLede asset (from secret AssetCode)
      const issuerSecret = await issuingAccountSecretKey();
      const issuer = Keypair.fromSecret(issuerSecret).publicKey();
      const assetCode = await assetCodeSecret();
      const iledeAsset = new Asset(assetCode, issuer);

      // Ensure account exists before trustline
      const userAccount = await server.loadAccount(accountId);
      const fee2 = await server.fetchBaseFee();
      const trustTx = new TransactionBuilder(userAccount, { fee: String(fee2), networkPassphrase })
        .addOperation(Operation.changeTrust({ asset: iledeAsset }))
        .setTimeout(180)
        .build();
      trustTx.sign(userKeypair);
      await server.submitTransaction(trustTx);

      // Send 0.01 iLede from distribution to user
      const distSecretForAsset = await distributionAccountSecretKey();
      const distKeypairForAsset = Keypair.fromSecret(distSecretForAsset);
      const distAccount2 = await server.loadAccount(distKeypairForAsset.publicKey());
      const fee3 = await server.fetchBaseFee();
      const paymentTx = new TransactionBuilder(distAccount2, { fee: String(fee3), networkPassphrase })
        .addOperation(
          Operation.payment({
            destination: accountId,
            asset: iledeAsset,
            amount: "0.0100000",
          })
        )
        .setTimeout(180)
        .build();
      paymentTx.sign(distKeypairForAsset);
      const paymentRes = await server.submitTransaction(paymentTx);

        // Record transactions
        if (xlmAirdropHash) {
          await tx.exec`
            INSERT INTO transactions (stellar_account_id, asset_code, amount, transaction_type, status, transaction_hash)
            VALUES (${accountId}, 'XLM', ${isTestnet ? '10.0000000' : '1.0000000'}, 'airdrop', 'completed', ${xlmAirdropHash})
          `;
        }

        await tx.exec`
          INSERT INTO transactions (stellar_account_id, asset_code, amount, transaction_type, status, transaction_hash)
          VALUES (${accountId}, ${assetCode}, '0.0100000', 'airdrop', 'completed', ${paymentRes.hash})
        `;

        return {
          account_id: accountId,
          airdrop_transaction_hash: paymentRes.hash,
          success: true,
          message: "Wallet created successfully with initial funding",
        };
      });
    });
  })
);
