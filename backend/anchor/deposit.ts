import { api } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { anchorDB } from "../database/db";
import { validate } from "../common/validation";
import { handleDatabaseError, ValidationError } from "../common/errors";
import { rateLimits } from "../common/rateLimiting";
import { withTransaction } from "../common/transactions";
import { logger } from "../common/logging";

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
  rateLimits.transactions(async (req) => {
    return withTransaction(async (tx) => {
      try {
        // Log deposit attempt
        logger.info("Deposit initiated", {
          account: req.account,
          asset_code: req.asset_code,
          amount: req.amount
        });

        // Validate input
        validate()
          .required("asset_code", req.asset_code)
          .required("account", req.account)
          .stellarAccount("account", req.account)
          .assetCode("asset_code", req.asset_code)
          .amount("amount", req.amount)
          .memo("memo", req.memo)
          .validate();

        // Validate asset code
        if (!req.asset_code || !["iLede", "USDC"].includes(req.asset_code)) {
          throw new ValidationError("Unsupported asset code", {
            asset_code: "Must be one of: iLede, USDC"
          });
        }

        // Validate memo type
        if (req.memo_type && !["text", "id", "hash", "return"].includes(req.memo_type)) {
          throw new ValidationError("Invalid memo type", {
            memo_type: "Must be one of: text, id, hash, return"
          });
        }
        
        // Create deposit record
        const result = await tx.queryRow`
          INSERT INTO transactions (stellar_account_id, transaction_type, asset_code, amount, status)
          VALUES (${req.account}, 'deposit', ${req.asset_code}, ${req.amount || "0"}, 'pending')
          RETURNING id
        `;
        
        // Log successful deposit creation
        logger.info("Deposit record created", {
          transaction_id: result!.id,
          account: req.account,
          asset_code: req.asset_code
        });
        
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
      } catch (error: any) {
        logger.error("Deposit failed", error, {
          account: req.account,
          asset_code: req.asset_code
        });
        
        if (error.code) {
          throw error; // Re-throw our custom errors
        }
        handleDatabaseError(error);
      }
    });
  })
);
