import { api } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { anchorDB } from "../database/db";
import { validate } from "../common/validation";
import { handleDatabaseError, ConflictError } from "../common/errors";

// Stellar Network Configuration
const stellarHorizonUrl = secret("StellarHorizonUrl");
const stellarNetworkPassphrase = secret("StellarNetworkPassphrase");
const distributionAccountSecretKey = secret("DistributionAccountSecretKey");
const issuingAccountPublicKey = secret("IssuingAccountPublicKey");

interface CreateWalletRequest {
  email?: string;
  phone?: string;
}

interface CreateWalletResponse {
  account_id: string;
  secret_key: string;
  airdrop_transaction_hash?: string;
}

// Creates a new Stellar wallet and performs airdrop
export const create = api<CreateWalletRequest, CreateWalletResponse>(
  { expose: true, method: "POST", path: "/wallet/create" },
  async (req) => {
    try {
      // Validate input - at least one contact method required
      const validator = validate();
      
      if (req.email) {
        validator.email("email", req.email);
      }
      if (req.phone) {
        validator.phone("phone", req.phone);
      }
      
      if (!req.email && !req.phone) {
        validator.required("email or phone", null);
      }
      
      validator.validate();

      // Check if user already exists
      if (req.email) {
        const existingUser = await anchorDB.query`
          SELECT stellar_account_id FROM users WHERE email = ${req.email}
        `;
        if (existingUser.length > 0) {
          throw new ConflictError("An account with this email already exists");
        }
      }

      if (req.phone) {
        const existingUser = await anchorDB.query`
          SELECT stellar_account_id FROM users WHERE phone = ${req.phone}
        `;
        if (existingUser.length > 0) {
          throw new ConflictError("An account with this phone number already exists");
        }
      }
      
      // Generate a new Stellar keypair
      // Note: In production, use stellar-sdk library
      // const keypair = Keypair.random();
      // For now, using placeholders
      const accountId = `G${Math.random().toString(36).substring(2, 18).toUpperCase().padEnd(54, 'A')}`;
      const secretKey = `S${Math.random().toString(36).substring(2, 18).toUpperCase().padEnd(54, 'A')}`;
      
      // Store user in database
      await anchorDB.exec`
        INSERT INTO users (stellar_account_id, email, phone, created_at)
        VALUES (${accountId}, ${req.email}, ${req.phone}, NOW())
      `;
      
      // In production, perform airdrop transaction:
      // 1. Create account with 1 XLM
      // 2. Send 0.01 iLede coin
      const airdropTransactionHash = `airdrop_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Log airdrop transaction
      await anchorDB.exec`
        INSERT INTO transactions (stellar_account_id, asset_code, amount, transaction_type, status, stellar_transaction_hash)
        VALUES (${accountId}, 'XLM', '1.0000000', 'airdrop', 'completed', ${airdropTransactionHash})
      `;
      
      await anchorDB.exec`
        INSERT INTO transactions (stellar_account_id, asset_code, amount, transaction_type, status, stellar_transaction_hash)
        VALUES (${accountId}, 'iLede', '0.0100000', 'airdrop', 'completed', ${airdropTransactionHash})
      `;
      
      return {
        account_id: accountId,
        secret_key: secretKey,
        airdrop_transaction_hash: airdropTransactionHash
      };
    } catch (error: any) {
      if (error.code) {
        throw error; // Re-throw our custom errors
      }
      handleDatabaseError(error);
    }
  }
);
