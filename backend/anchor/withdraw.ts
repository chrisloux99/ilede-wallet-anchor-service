import { api } from "encore.dev/api";
import { anchorDB } from "../database/db";
import { validate } from "../common/validation";
import { handleDatabaseError, ValidationError } from "../common/errors";

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
    try {
      // Validate input
      validate()
        .required("asset_code", req.asset_code)
        .required("type", req.type)
        .assetCode("asset_code", req.asset_code)
        .memo("memo", req.memo)
        .validate();

      // Validate asset code
      if (!req.asset_code || !["iLede", "USDC"].includes(req.asset_code)) {
        throw new ValidationError("Unsupported asset code", {
          asset_code: "Must be one of: iLede, USDC"
        });
      }

      // Validate withdrawal type
      if (!req.type || !["bank_account", "cash", "mobile_money"].includes(req.type)) {
        throw new ValidationError("Invalid withdrawal type", {
          type: "Must be one of: bank_account, cash, mobile_money"
        });
      }

      // Validate destination or account
      if (!req.dest && !req.account) {
        throw new ValidationError("Destination required", {
          dest: "Either dest or account must be provided"
        });
      }

      if (req.account) {
        validate().stellarAccount("account", req.account).validate();
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
    } catch (error: any) {
      if (error.code) {
        throw error; // Re-throw our custom errors
      }
      handleDatabaseError(error);
    }
  }
);
