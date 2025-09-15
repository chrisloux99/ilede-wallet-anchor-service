import { api } from "encore.dev/api";
import { validate } from "../common/validation";
import { handleStellarError } from "../common/errors";
import { secret } from "encore.dev/config";
import { Server } from "stellar-sdk";
import { cacheBalanceData, cacheKeys } from "../common/cache";
import { logger } from "../common/logging";
import { rateLimits } from "../common/rateLimiting";

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

const stellarHorizonUrl = secret("StellarHorizonUrl");

// Retrieves account balances from Stellar network
export const balance = api<BalanceRequest, BalanceResponse>(
  { expose: true, method: "GET", path: "/wallet/:account_id/balance" },
  rateLimits.general(async (req) => {
    try {
      validate().required("account_id", req.account_id).stellarAccount("account_id", req.account_id).validate();

      // Use caching for balance data (cache for 30 seconds)
      const result = await cacheBalanceData(
        req.account_id,
        async () => {
          logger.info("Fetching balance from Stellar network", { account_id: req.account_id });
          
          const server = new Server(await stellarHorizonUrl());
          const account = await server.loadAccount(req.account_id);
          const balances: AssetBalance[] = account.balances.map((b: any) => ({
            asset_type: b.asset_type,
            asset_code: b.asset_code,
            asset_issuer: b.asset_issuer,
            balance: b.balance,
          }));
          
          return { balances };
        },
        30 * 1000 // 30 seconds cache
      );

      logger.info("Balance retrieved successfully", { 
        account_id: req.account_id, 
        balance_count: result.balances.length 
      });

      return result;
    } catch (error: any) {
      logger.error("Balance retrieval failed", error, { account_id: req.account_id });
      
      if (error.code) throw error;
      handleStellarError(error);
    }
  })
);
