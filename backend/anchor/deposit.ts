import { api } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { anchorDB } from "../database/db";

// External Service Configuration
const bankingApiKey = secret("BankingApiKey");

interface DepositRequest {
  asset_code: string;
  account: string;
  amount?: string;
  memo_type?: string;
  memo?: string;
}

interface DepositResponse {
  id: string;
  how: string;
  eta?: number;
  min_amount?: string;
  max_amount?: string;
  fee_fixed?: string;
  fee_percent?: string;
  extra_info?: any;
}

// Initiates a deposit transaction (SEP-6)
export const deposit = api<DepositRequest, DepositResponse>(
  { expose: true, method: "GET", path: "/deposit" },
  async (req) => {
    // Validate asset code
    if (!["iLede", "USDC"].includes(req.asset_code)) {
      throw new Error("Unsupported asset");
    }
    
    // Create deposit record
    const result = await anchorDB.queryRow`
      INSERT INTO transactions (stellar_account_id, transaction_type, asset_code, amount, status)
      VALUES (${req.account}, 'deposit', ${req.asset_code}, ${req.amount || "0"}, 'pending')
      RETURNING id
    `;
    
    return {
      id: result!.id.toString(),
      how: "Send funds to the provided bank account details",
      eta: 300, // 5 minutes
      min_amount: "1.0000000",
      max_amount: "10000.0000000",
      fee_fixed: "0.1000000",
      fee_percent: "0.1",
      extra_info: {
        message: "Please include the transaction ID in the bank transfer memo"
      }
    };
  }
);
