import { api } from "encore.dev/api";
import { anchorDB } from "../database/db";

interface WithdrawRequest {
  asset_code: string;
  type: string;
  dest?: string;
  dest_extra?: string;
  account?: string;
  memo?: string;
}

interface WithdrawResponse {
  id: string;
  account_id: string;
  memo_type?: string;
  memo?: string;
  eta?: number;
  min_amount?: string;
  max_amount?: string;
  fee_fixed?: string;
  fee_percent?: string;
}

// Initiates a withdrawal transaction (SEP-6)
export const withdraw = api<WithdrawRequest, WithdrawResponse>(
  { expose: true, method: "GET", path: "/withdraw" },
  async (req) => {
    // Validate asset code
    if (!["iLede", "USDC"].includes(req.asset_code)) {
      throw new Error("Unsupported asset");
    }
    
    // Create withdrawal record
    const result = await anchorDB.queryRow`
      INSERT INTO transactions (stellar_account_id, transaction_type, asset_code, amount, status)
      VALUES (${req.account || req.dest}, 'withdrawal', ${req.asset_code}, 0, 'pending')
      RETURNING id
    `;
    
    return {
      id: result!.id.toString(),
      account_id: "PLACEHOLDER_ANCHOR_ACCOUNT",
      memo_type: "id",
      memo: result!.id.toString(),
      eta: 300,
      min_amount: "1.0000000",
      max_amount: "10000.0000000",
      fee_fixed: "0.1000000",
      fee_percent: "0.1"
    };
  }
);
