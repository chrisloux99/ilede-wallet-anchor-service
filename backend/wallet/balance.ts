import { api } from "encore.dev/api";

interface BalanceRequest {
  account_id: string;
}

interface AssetBalance {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
}

interface BalanceResponse {
  balances: AssetBalance[];
}

// Retrieves account balances from Stellar network
export const balance = api<BalanceRequest, BalanceResponse>(
  { expose: true, method: "GET", path: "/wallet/:account_id/balance" },
  async (req) => {
    // In a real implementation, you would:
    // 1. Query Stellar Horizon for account balances
    // 2. Format and return the balance information
    
    // Placeholder balances
    const balances: AssetBalance[] = [
      {
        asset_type: "native",
        balance: "1.0000000"
      },
      {
        asset_type: "credit_alphanum12",
        asset_code: "iLede",
        asset_issuer: "PLACEHOLDER_ISSUER",
        balance: "0.0100000"
      }
    ];
    
    return { balances };
  }
);
