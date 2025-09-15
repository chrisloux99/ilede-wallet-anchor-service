import { api } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { anchorDB } from "../database/db";
import { validate } from "../common/validation";
import { handleDatabaseError, ValidationError } from "../common/errors";
import { rateLimits } from "../common/rateLimiting";
import { withTransaction } from "../common/transactions";
import { logger } from "../common/logging";

/**
 * Cross-Chain Bridge Service
 * Enables asset transfers between Stellar and other blockchains
 */

interface BridgeTransferRequest {
  user_account: string;
  source_chain: 'stellar' | 'ethereum' | 'binance' | 'polygon';
  destination_chain: 'stellar' | 'ethereum' | 'binance' | 'polygon';
  asset_code: string;
  amount: string;
  destination_address: string;
  memo?: string;
}

interface BridgeTransferResponse {
  bridge_id: string;
  transaction_hash: string;
  estimated_time: number; // minutes
  fees: {
    bridge_fee: string;
    gas_fee?: string;
    total_fee: string;
  };
  success: boolean;
}

export const initiateBridgeTransfer = api<BridgeTransferRequest, BridgeTransferResponse>(
  { expose: true, method: "POST", path: "/bridge/transfer" },
  rateLimits.transactions(async (req) => {
    return withTransaction(async (tx) => {
      try {
        // Validate input
        validate()
          .required("user_account", req.user_account)
          .stellarAccount("user_account", req.user_account)
          .required("source_chain", req.source_chain)
          .required("destination_chain", req.destination_chain)
          .required("asset_code", req.asset_code)
          .required("amount", req.amount)
          .amount("amount", req.amount)
          .required("destination_address", req.destination_address)
          .validate();

        // Validate chains
        const validChains = ['stellar', 'ethereum', 'binance', 'polygon'];
        if (!validChains.includes(req.source_chain) || !validChains.includes(req.destination_chain)) {
          throw new ValidationError("Invalid chain", {
            source_chain: `Must be one of: ${validChains.join(', ')}`,
            destination_chain: `Must be one of: ${validChains.join(', ')}`
          });
        }

        if (req.source_chain === req.destination_chain) {
          throw new ValidationError("Source and destination chains must be different", {
            source_chain: "Must be different from destination chain"
          });
        }

        logger.info("Initiating cross-chain bridge transfer", {
          user_account: req.user_account,
          source_chain: req.source_chain,
          destination_chain: req.destination_chain,
          asset_code: req.asset_code,
          amount: req.amount
        });

        // Calculate fees based on chains and amount
        const amount = parseFloat(req.amount);
        const bridgeFees = {
          'stellar-ethereum': { base: 0.001, percentage: 0.1 },
          'stellar-binance': { base: 0.0005, percentage: 0.05 },
          'stellar-polygon': { base: 0.0003, percentage: 0.03 },
          'ethereum-stellar': { base: 0.002, percentage: 0.15 },
          'binance-stellar': { base: 0.001, percentage: 0.08 },
          'polygon-stellar': { base: 0.0008, percentage: 0.06 }
        };

        const feeKey = `${req.source_chain}-${req.destination_chain}`;
        const feeConfig = bridgeFees[feeKey] || { base: 0.001, percentage: 0.1 };
        
        const bridgeFee = feeConfig.base + (amount * feeConfig.percentage / 100);
        const gasFee = req.destination_chain !== 'stellar' ? 0.01 : 0; // Simulated gas fee
        const totalFee = bridgeFee + gasFee;

        // Estimate transfer time
        const estimatedTimes = {
          'stellar-ethereum': 15,
          'stellar-binance': 10,
          'stellar-polygon': 8,
          'ethereum-stellar': 20,
          'binance-stellar': 12,
          'polygon-stellar': 10
        };

        const estimatedTime = estimatedTimes[feeKey] || 15;

        // Create bridge transfer record
        const bridgeResult = await tx.queryRow`
          INSERT INTO bridge_transfers (
            user_account, source_chain, destination_chain, asset_code, 
            amount, destination_address, bridge_fee, gas_fee, total_fee,
            estimated_time, status, created_at
          )
          VALUES (
            ${req.user_account}, ${req.source_chain}, ${req.destination_chain}, 
            ${req.asset_code}, ${req.amount}, ${req.destination_address},
            ${bridgeFee.toFixed(7)}, ${gasFee.toFixed(7)}, ${totalFee.toFixed(7)},
            ${estimatedTime}, 'pending', NOW()
          )
          RETURNING id
        `;

        // Record transaction
        await tx.exec`
          INSERT INTO transactions (stellar_account_id, transaction_type, asset_code, amount, status)
          VALUES (${req.user_account}, 'bridge_transfer', ${req.asset_code}, ${req.amount}, 'pending')
        `;

        logger.info("Bridge transfer initiated successfully", {
          bridge_id: bridgeResult!.id,
          user_account: req.user_account,
          total_fee: totalFee
        });

        return {
          bridge_id: bridgeResult!.id.toString(),
          transaction_hash: "bridge_" + bridgeResult!.id, // Placeholder
          estimated_time: estimatedTime,
          fees: {
            bridge_fee: bridgeFee.toFixed(7),
            gas_fee: gasFee > 0 ? gasFee.toFixed(7) : undefined,
            total_fee: totalFee.toFixed(7)
          },
          success: true
        };

      } catch (error: any) {
        logger.error("Bridge transfer initiation failed", error, {
          user_account: req.user_account,
          source_chain: req.source_chain,
          destination_chain: req.destination_chain
        });
        
        if (error.code) {
          throw error;
        }
        handleDatabaseError(error);
      }
    });
  })
);

interface GetBridgeStatusRequest {
  bridge_id: string;
}

interface GetBridgeStatusResponse {
  bridge_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress_percentage: number;
  current_step: string;
  estimated_completion: string;
  source_transaction_hash?: string;
  destination_transaction_hash?: string;
  error_message?: string;
}

export const getBridgeStatus = api<GetBridgeStatusRequest, GetBridgeStatusResponse>(
  { expose: true, method: "GET", path: "/bridge/status/:bridge_id" },
  rateLimits.general(async (req) => {
    try {
      validate()
        .required("bridge_id", req.bridge_id)
        .validate();

      logger.info("Getting bridge transfer status", {
        bridge_id: req.bridge_id
      });

      // Get bridge transfer details
      const bridgeTransfer = await anchorDB.queryRow`
        SELECT 
          id, status, created_at, estimated_time,
          source_transaction_hash, destination_transaction_hash,
          error_message
        FROM bridge_transfers
        WHERE id = ${req.bridge_id}
      `;

      if (!bridgeTransfer) {
        throw new ValidationError("Bridge transfer not found", {
          bridge_id: "Invalid bridge transfer ID"
        });
      }

      // Calculate progress based on status and time elapsed
      let progressPercentage = 0;
      let currentStep = "";
      let estimatedCompletion = "";

      const createdTime = new Date(bridgeTransfer.created_at);
      const elapsedMinutes = (Date.now() - createdTime.getTime()) / (1000 * 60);
      const estimatedTime = parseInt(bridgeTransfer.estimated_time || '15');

      switch (bridgeTransfer.status) {
        case 'pending':
          progressPercentage = 10;
          currentStep = "Validating transfer request";
          break;
        case 'processing':
          progressPercentage = Math.min(90, 20 + (elapsedMinutes / estimatedTime) * 70);
          currentStep = "Processing cross-chain transfer";
          break;
        case 'completed':
          progressPercentage = 100;
          currentStep = "Transfer completed successfully";
          break;
        case 'failed':
          progressPercentage = 0;
          currentStep = "Transfer failed";
          break;
        case 'cancelled':
          progressPercentage = 0;
          currentStep = "Transfer cancelled";
          break;
      }

      const completionTime = new Date(createdTime.getTime() + estimatedTime * 60 * 1000);
      estimatedCompletion = completionTime.toISOString();

      const response: GetBridgeStatusResponse = {
        bridge_id: bridgeTransfer.id.toString(),
        status: bridgeTransfer.status,
        progress_percentage: Math.round(progressPercentage),
        current_step: currentStep,
        estimated_completion: estimatedCompletion,
        source_transaction_hash: bridgeTransfer.source_transaction_hash,
        destination_transaction_hash: bridgeTransfer.destination_transaction_hash,
        error_message: bridgeTransfer.error_message
      };

      logger.info("Bridge status retrieved", {
        bridge_id: req.bridge_id,
        status: bridgeTransfer.status,
        progress: response.progress_percentage
      });

      return response;

    } catch (error: any) {
      logger.error("Failed to get bridge status", error, {
        bridge_id: req.bridge_id
      });
      
      if (error.code) {
        throw error;
      }
      handleDatabaseError(error);
    }
  })
);

interface GetSupportedChainsResponse {
  chains: Array<{
    chain_id: string;
    name: string;
    symbol: string;
    is_active: boolean;
    supported_assets: string[];
    bridge_fees: {
      base_fee: string;
      percentage_fee: number;
    };
    estimated_time: number;
  }>;
}

export const getSupportedChains = api<{}, GetSupportedChainsResponse>(
  { expose: true, method: "GET", path: "/bridge/chains" },
  async () => {
    try {
      logger.info("Getting supported chains");

      const chains = [
        {
          chain_id: 'stellar',
          name: 'Stellar',
          symbol: 'XLM',
          is_active: true,
          supported_assets: ['XLM', 'iLede', 'USDC'],
          bridge_fees: {
            base_fee: '0.0000100',
            percentage_fee: 0.01
          },
          estimated_time: 5
        },
        {
          chain_id: 'ethereum',
          name: 'Ethereum',
          symbol: 'ETH',
          is_active: true,
          supported_assets: ['ETH', 'USDC', 'USDT', 'DAI'],
          bridge_fees: {
            base_fee: '0.0010000',
            percentage_fee: 0.1
          },
          estimated_time: 15
        },
        {
          chain_id: 'binance',
          name: 'Binance Smart Chain',
          symbol: 'BNB',
          is_active: true,
          supported_assets: ['BNB', 'USDC', 'USDT', 'BUSD'],
          bridge_fees: {
            base_fee: '0.0005000',
            percentage_fee: 0.05
          },
          estimated_time: 10
        },
        {
          chain_id: 'polygon',
          name: 'Polygon',
          symbol: 'MATIC',
          is_active: true,
          supported_assets: ['MATIC', 'USDC', 'USDT', 'DAI'],
          bridge_fees: {
            base_fee: '0.0003000',
            percentage_fee: 0.03
          },
          estimated_time: 8
        }
      ];

      const response: GetSupportedChainsResponse = {
        chains: chains
      };

      logger.info("Supported chains retrieved", {
        chain_count: chains.length
      });

      return response;

    } catch (error: any) {
      logger.error("Failed to get supported chains", error);
      handleDatabaseError(error);
    }
  }
);

interface GetBridgeHistoryRequest {
  user_account: string;
  limit?: number;
  offset?: number;
}

interface GetBridgeHistoryResponse {
  transfers: Array<{
    bridge_id: string;
    source_chain: string;
    destination_chain: string;
    asset_code: string;
    amount: string;
    status: string;
    created_at: string;
    completed_at?: string;
    total_fee: string;
  }>;
  total_count: number;
  has_more: boolean;
}

export const getBridgeHistory = api<GetBridgeHistoryRequest, GetBridgeHistoryResponse>(
  { expose: true, method: "GET", path: "/bridge/history/:user_account" },
  rateLimits.general(async (req) => {
    try {
      validate()
        .required("user_account", req.user_account)
        .stellarAccount("user_account", req.user_account)
        .validate();

      const limit = Math.min(req.limit || 20, 100);
      const offset = req.offset || 0;

      logger.info("Getting bridge transfer history", {
        user_account: req.user_account,
        limit,
        offset
      });

      // Get bridge transfers
      const transfers = await anchorDB.query`
        SELECT 
          id, source_chain, destination_chain, asset_code, amount,
          status, created_at, completed_at, total_fee
        FROM bridge_transfers
        WHERE user_account = ${req.user_account}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      // Get total count
      const totalCount = await anchorDB.queryRow`
        SELECT COUNT(*) as count
        FROM bridge_transfers
        WHERE user_account = ${req.user_account}
      `;

      const response: GetBridgeHistoryResponse = {
        transfers: transfers.map((transfer: any) => ({
          bridge_id: transfer.id.toString(),
          source_chain: transfer.source_chain,
          destination_chain: transfer.destination_chain,
          asset_code: transfer.asset_code,
          amount: transfer.amount,
          status: transfer.status,
          created_at: transfer.created_at,
          completed_at: transfer.completed_at,
          total_fee: transfer.total_fee
        })),
        total_count: parseInt(totalCount?.count || '0'),
        has_more: (offset + limit) < parseInt(totalCount?.count || '0')
      };

      logger.info("Bridge history retrieved", {
        user_account: req.user_account,
        transfer_count: transfers.length,
        total_count: response.total_count
      });

      return response;

    } catch (error: any) {
      logger.error("Failed to get bridge history", error, {
        user_account: req.user_account
      });
      handleDatabaseError(error);
    }
  })
);
