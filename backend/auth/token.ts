import { api, APIError } from "encore.dev/api";

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
    // In a real implementation, you would:
    // 1. Verify the transaction signature
    // 2. Check that the transaction hasn't been tampered with
    // 3. Verify the account signed the challenge
    // 4. Generate and return a JWT token
    
    if (!req.transaction) {
      throw APIError.invalidArgument("transaction is required");
    }
    
    // Placeholder token generation - implement with proper JWT
    const token = "placeholder_jwt_token";
    
    return {
      token,
      expires_in: 3600 // 1 hour
    };
  }
);
