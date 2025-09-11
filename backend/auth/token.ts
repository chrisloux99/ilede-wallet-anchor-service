import { api } from "encore.dev/api";
import { validate } from "../common/validation";
import { handleStellarError } from "../common/errors";

interface TokenRequest {
  transaction: string;
}

interface TokenResponse {
  token: string;
  expires_in: number;
}

// Validates the signed challenge and returns a JWT token (SEP-10)
export const token = api<TokenRequest, TokenResponse>(
  { expose: true, method: "POST", path: "/auth" },
  async (req) => {
    try {
      // Validate input
      validate()
        .required("transaction", req.transaction)
        .minLength("transaction", req.transaction, 10)
        .validate();

      // In a real implementation, you would:
      // 1. Verify the transaction signature
      // 2. Check that the transaction hasn't been tampered with
      // 3. Verify the account signed the challenge
      // 4. Generate and return a JWT token
      
      // Placeholder token generation - implement with proper JWT
      const token = "placeholder_jwt_token";
      
      return {
        token,
        expires_in: 3600 // 1 hour
      };
    } catch (error: any) {
      if (error.code) {
        throw error; // Re-throw our custom errors
      }
      handleStellarError(error);
    }
  }
);
