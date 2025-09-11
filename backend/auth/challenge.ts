import { api } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { randomBytes } from "crypto";
import { validate } from "../common/validation";
import { handleStellarError } from "../common/errors";

// Stellar Network Configuration
const stellarNetworkPassphrase = secret("StellarNetworkPassphrase");
const signingKeySecret = secret("SigningKeySecret");

interface ChallengeRequest {
  account: string;
  memo?: string;
  home_domain?: string;
  client_domain?: string;
}

interface ChallengeResponse {
  transaction: string;
  network_passphrase: string;
}

// Generates a Stellar Web Authentication challenge transaction (SEP-10)
export const challenge = api<ChallengeRequest, ChallengeResponse>(
  { expose: true, method: "GET", path: "/auth" },
  async (req) => {
    try {
      // Validate input
      validate()
        .required("account", req.account)
        .stellarAccount("account", req.account)
        .memo("memo", req.memo)
        .url("home_domain", req.home_domain)
        .url("client_domain", req.client_domain)
        .validate();

      // Generate a random nonce for the challenge
      const nonce = randomBytes(32).toString('base64');
      
      // In a real implementation, you would:
      // 1. Create a challenge transaction with the account ID
      // 2. Add a manage_data operation with the nonce
      // 3. Set the transaction timeout
      // 4. Sign the transaction with the server's signing key
      
      // Placeholder transaction - implement with stellar-sdk
      const challengeTransaction = "placeholder_challenge_transaction";
      
      return {
        transaction: challengeTransaction,
        network_passphrase: await stellarNetworkPassphrase()
      };
    } catch (error: any) {
      if (error.code) {
        throw error; // Re-throw our custom errors
      }
      handleStellarError(error);
    }
  }
);
