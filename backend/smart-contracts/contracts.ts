import { api } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { anchorDB } from "../database/db";
import { validate } from "../common/validation";
import { handleDatabaseError, ValidationError } from "../common/errors";
import { rateLimits } from "../common/rateLimiting";
import { withTransaction } from "../common/transactions";
import { logger } from "../common/logging";
import { Server, Keypair, TransactionBuilder, Operation, Asset, Memo, MemoType } from "stellar-sdk";

// Stellar Network Configuration
const stellarHorizonUrl = secret("StellarHorizonUrl");
const stellarNetworkPassphrase = secret("StellarNetworkPassphrase");
const distributionAccountSecretKey = secret("DistributionAccountSecretKey");
const issuingAccountSecretKey = secret("IssuingAccountSecretKey");

/**
 * Smart Contract: Automated Market Maker (AMM)
 * Provides liquidity and price discovery for iLede/USDC trading
 */

interface CreateAMMRequest {
  asset_a: string;
  asset_b: string;
  initial_liquidity_a: string;
  initial_liquidity_b: string;
  fee_rate: number; // 0.3% = 30
}

interface CreateAMMResponse {
  amm_id: string;
  pool_address: string;
  transaction_hash: string;
  success: boolean;
}

export const createAMM = api<CreateAMMRequest, CreateAMMResponse>(
  { expose: true, method: "POST", path: "/smart-contracts/amm/create" },
  rateLimits.transactions(async (req) => {
    return withTransaction(async (tx) => {
      try {
        // Validate input
        validate()
          .required("asset_a", req.asset_a)
          .required("asset_b", req.asset_b)
          .required("initial_liquidity_a", req.initial_liquidity_a)
          .required("initial_liquidity_b", req.initial_liquidity_b)
          .amount("initial_liquidity_a", req.initial_liquidity_a)
          .amount("initial_liquidity_b", req.initial_liquidity_b)
          .validate();

        // Validate fee rate (0.1% to 1%)
        if (req.fee_rate < 10 || req.fee_rate > 100) {
          throw new ValidationError("Invalid fee rate", {
            fee_rate: "Must be between 10 (0.1%) and 100 (1%)"
          });
        }

        logger.info("Creating AMM pool", {
          asset_a: req.asset_a,
          asset_b: req.asset_b,
          liquidity_a: req.initial_liquidity_a,
          liquidity_b: req.initial_liquidity_b,
          fee_rate: req.fee_rate
        });

        // Initialize Stellar SDK
        const horizonUrl = await stellarHorizonUrl();
        const networkPassphrase = await stellarNetworkPassphrase();
        const server = new Server(horizonUrl);

        // Generate AMM pool account
        const poolKeypair = Keypair.random();
        const poolAddress = poolKeypair.publicKey();

        // Create pool account with initial funding
        const distSecret = await distributionAccountSecretKey();
        const distKeypair = Keypair.fromSecret(distSecret);
        const distAccount = await server.loadAccount(distKeypair.publicKey());
        const fee = await server.fetchBaseFee();

        const createPoolTx = new TransactionBuilder(distAccount, { fee: String(fee), networkPassphrase })
          .addOperation(Operation.createAccount({ 
            destination: poolAddress, 
            startingBalance: "2" // 2 XLM for account
          }))
          .setTimeout(180)
          .build();
        createPoolTx.sign(distKeypair);
        await server.submitTransaction(createPoolTx);

        // Store AMM pool in database
        const ammResult = await tx.queryRow`
          INSERT INTO amm_pools (pool_address, asset_a, asset_b, liquidity_a, liquidity_b, fee_rate, status)
          VALUES (${poolAddress}, ${req.asset_a}, ${req.asset_b}, ${req.initial_liquidity_a}, ${req.initial_liquidity_b}, ${req.fee_rate}, 'active')
          RETURNING id
        `;

        // Record transaction
        await tx.exec`
          INSERT INTO transactions (stellar_account_id, transaction_type, asset_code, amount, status, transaction_hash)
          VALUES (${poolAddress}, 'amm_create', 'XLM', '2.0000000', 'completed', ${createPoolTx.hash})
        `;

        logger.info("AMM pool created successfully", {
          amm_id: ammResult!.id,
          pool_address: poolAddress,
          transaction_hash: createPoolTx.hash
        });

        return {
          amm_id: ammResult!.id.toString(),
          pool_address: poolAddress,
          transaction_hash: createPoolTx.hash,
          success: true
        };

      } catch (error: any) {
        logger.error("AMM creation failed", error, {
          asset_a: req.asset_a,
          asset_b: req.asset_b
        });
        
        if (error.code) {
          throw error;
        }
        handleDatabaseError(error);
      }
    });
  })
);

/**
 * Smart Contract: Liquidity Staking
 * Allows users to stake liquidity and earn rewards
 */

interface StakeLiquidityRequest {
  user_account: string;
  amm_pool_id: string;
  liquidity_amount: string;
  staking_period_days: number;
}

interface StakeLiquidityResponse {
  stake_id: string;
  transaction_hash: string;
  expected_rewards: string;
  success: boolean;
}

export const stakeLiquidity = api<StakeLiquidityRequest, StakeLiquidityResponse>(
  { expose: true, method: "POST", path: "/smart-contracts/staking/stake" },
  rateLimits.transactions(async (req) => {
    return withTransaction(async (tx) => {
      try {
        // Validate input
        validate()
          .required("user_account", req.user_account)
          .stellarAccount("user_account", req.user_account)
          .required("amm_pool_id", req.amm_pool_id)
          .required("liquidity_amount", req.liquidity_amount)
          .amount("liquidity_amount", req.liquidity_amount)
          .validate();

        // Validate staking period (7 to 365 days)
        if (req.staking_period_days < 7 || req.staking_period_days > 365) {
          throw new ValidationError("Invalid staking period", {
            staking_period_days: "Must be between 7 and 365 days"
          });
        }

        logger.info("Processing liquidity staking", {
          user_account: req.user_account,
          amm_pool_id: req.amm_pool_id,
          liquidity_amount: req.liquidity_amount,
          staking_period: req.staking_period_days
        });

        // Get AMM pool details
        const pool = await tx.queryRow`
          SELECT * FROM amm_pools WHERE id = ${req.amm_pool_id} AND status = 'active'
        `;

        if (!pool) {
          throw new ValidationError("AMM pool not found or inactive", {
            amm_pool_id: "Invalid pool ID"
          });
        }

        // Calculate expected rewards (simplified formula)
        const baseRewardRate = 0.1; // 10% APY
        const periodMultiplier = req.staking_period_days / 365;
        const expectedRewards = parseFloat(req.liquidity_amount) * baseRewardRate * periodMultiplier;

        // Create staking record
        const stakeResult = await tx.queryRow`
          INSERT INTO liquidity_stakes (
            user_account, amm_pool_id, liquidity_amount, staking_period_days, 
            expected_rewards, status, created_at, expires_at
          )
          VALUES (
            ${req.user_account}, ${req.amm_pool_id}, ${req.liquidity_amount}, 
            ${req.staking_period_days}, ${expectedRewards.toFixed(7)}, 'active',
            NOW(), NOW() + INTERVAL '${req.staking_period_days} days'
          )
          RETURNING id
        `;

        // Record transaction
        await tx.exec`
          INSERT INTO transactions (stellar_account_id, transaction_type, asset_code, amount, status)
          VALUES (${req.user_account}, 'liquidity_stake', 'LIQUIDITY', ${req.liquidity_amount}, 'completed')
        `;

        logger.info("Liquidity staking successful", {
          stake_id: stakeResult!.id,
          user_account: req.user_account,
          expected_rewards: expectedRewards
        });

        return {
          stake_id: stakeResult!.id.toString(),
          transaction_hash: "staking_" + stakeResult!.id, // Placeholder
          expected_rewards: expectedRewards.toFixed(7),
          success: true
        };

      } catch (error: any) {
        logger.error("Liquidity staking failed", error, {
          user_account: req.user_account,
          amm_pool_id: req.amm_pool_id
        });
        
        if (error.code) {
          throw error;
        }
        handleDatabaseError(error);
      }
    });
  })
);

/**
 * Smart Contract: Automated Lending
 * Provides peer-to-peer lending with smart contract automation
 */

interface CreateLendingPoolRequest {
  lender_account: string;
  asset_code: string;
  total_amount: string;
  interest_rate: number; // Annual percentage rate
  term_days: number;
  collateral_ratio: number; // Required collateral ratio
}

interface CreateLendingPoolResponse {
  pool_id: string;
  pool_address: string;
  transaction_hash: string;
  success: boolean;
}

export const createLendingPool = api<CreateLendingPoolRequest, CreateLendingPoolResponse>(
  { expose: true, method: "POST", path: "/smart-contracts/lending/create-pool" },
  rateLimits.transactions(async (req) => {
    return withTransaction(async (tx) => {
      try {
        // Validate input
        validate()
          .required("lender_account", req.lender_account)
          .stellarAccount("lender_account", req.lender_account)
          .required("asset_code", req.asset_code)
          .assetCode("asset_code", req.asset_code)
          .required("total_amount", req.total_amount)
          .amount("total_amount", req.total_amount)
          .validate();

        // Validate interest rate (1% to 50% APR)
        if (req.interest_rate < 1 || req.interest_rate > 50) {
          throw new ValidationError("Invalid interest rate", {
            interest_rate: "Must be between 1% and 50% APR"
          });
        }

        // Validate term (1 to 365 days)
        if (req.term_days < 1 || req.term_days > 365) {
          throw new ValidationError("Invalid term", {
            term_days: "Must be between 1 and 365 days"
          });
        }

        // Validate collateral ratio (100% to 200%)
        if (req.collateral_ratio < 100 || req.collateral_ratio > 200) {
          throw new ValidationError("Invalid collateral ratio", {
            collateral_ratio: "Must be between 100% and 200%"
          });
        }

        logger.info("Creating lending pool", {
          lender_account: req.lender_account,
          asset_code: req.asset_code,
          total_amount: req.total_amount,
          interest_rate: req.interest_rate,
          term_days: req.term_days,
          collateral_ratio: req.collateral_ratio
        });

        // Generate lending pool account
        const poolKeypair = Keypair.random();
        const poolAddress = poolKeypair.publicKey();

        // Create lending pool record
        const poolResult = await tx.queryRow`
          INSERT INTO lending_pools (
            pool_address, lender_account, asset_code, total_amount, 
            available_amount, interest_rate, term_days, collateral_ratio, status
          )
          VALUES (
            ${poolAddress}, ${req.lender_account}, ${req.asset_code}, ${req.total_amount},
            ${req.total_amount}, ${req.interest_rate}, ${req.term_days}, ${req.collateral_ratio}, 'active'
          )
          RETURNING id
        `;

        // Record transaction
        await tx.exec`
          INSERT INTO transactions (stellar_account_id, transaction_type, asset_code, amount, status)
          VALUES (${req.lender_account}, 'lending_pool_create', ${req.asset_code}, ${req.total_amount}, 'completed')
        `;

        logger.info("Lending pool created successfully", {
          pool_id: poolResult!.id,
          pool_address: poolAddress,
          lender_account: req.lender_account
        });

        return {
          pool_id: poolResult!.id.toString(),
          pool_address: poolAddress,
          transaction_hash: "lending_" + poolResult!.id, // Placeholder
          success: true
        };

      } catch (error: any) {
        logger.error("Lending pool creation failed", error, {
          lender_account: req.lender_account,
          asset_code: req.asset_code
        });
        
        if (error.code) {
          throw error;
        }
        handleDatabaseError(error);
      }
    });
  })
);

/**
 * Smart Contract: Yield Farming
 * Automated yield generation through multiple DeFi strategies
 */

interface CreateYieldFarmRequest {
  user_account: string;
  asset_code: string;
  amount: string;
  strategy: 'liquidity_provision' | 'lending' | 'staking' | 'arbitrage';
  auto_compound: boolean;
}

interface CreateYieldFarmResponse {
  farm_id: string;
  expected_apy: number;
  transaction_hash: string;
  success: boolean;
}

export const createYieldFarm = api<CreateYieldFarmRequest, CreateYieldFarmResponse>(
  { expose: true, method: "POST", path: "/smart-contracts/yield-farming/create" },
  rateLimits.transactions(async (req) => {
    return withTransaction(async (tx) => {
      try {
        // Validate input
        validate()
          .required("user_account", req.user_account)
          .stellarAccount("user_account", req.user_account)
          .required("asset_code", req.asset_code)
          .assetCode("asset_code", req.asset_code)
          .required("amount", req.amount)
          .amount("amount", req.amount)
          .validate();

        // Validate strategy
        const validStrategies = ['liquidity_provision', 'lending', 'staking', 'arbitrage'];
        if (!validStrategies.includes(req.strategy)) {
          throw new ValidationError("Invalid strategy", {
            strategy: `Must be one of: ${validStrategies.join(', ')}`
          });
        }

        logger.info("Creating yield farm", {
          user_account: req.user_account,
          asset_code: req.asset_code,
          amount: req.amount,
          strategy: req.strategy,
          auto_compound: req.auto_compound
        });

        // Calculate expected APY based on strategy
        const strategyAPYs = {
          'liquidity_provision': 15.0, // 15% APY
          'lending': 8.0,              // 8% APY
          'staking': 12.0,             // 12% APY
          'arbitrage': 20.0            // 20% APY (higher risk)
        };

        const expectedAPY = strategyAPYs[req.strategy];

        // Create yield farm record
        const farmResult = await tx.queryRow`
          INSERT INTO yield_farms (
            user_account, asset_code, amount, strategy, expected_apy, 
            auto_compound, status, created_at
          )
          VALUES (
            ${req.user_account}, ${req.asset_code}, ${req.amount}, ${req.strategy},
            ${expectedAPY}, ${req.auto_compound}, 'active', NOW()
          )
          RETURNING id
        `;

        // Record transaction
        await tx.exec`
          INSERT INTO transactions (stellar_account_id, transaction_type, asset_code, amount, status)
          VALUES (${req.user_account}, 'yield_farm_create', ${req.asset_code}, ${req.amount}, 'completed')
        `;

        logger.info("Yield farm created successfully", {
          farm_id: farmResult!.id,
          user_account: req.user_account,
          strategy: req.strategy,
          expected_apy: expectedAPY
        });

        return {
          farm_id: farmResult!.id.toString(),
          expected_apy: expectedAPY,
          transaction_hash: "yield_" + farmResult!.id, // Placeholder
          success: true
        };

      } catch (error: any) {
        logger.error("Yield farm creation failed", error, {
          user_account: req.user_account,
          asset_code: req.asset_code,
          strategy: req.strategy
        });
        
        if (error.code) {
          throw error;
        }
        handleDatabaseError(error);
      }
    });
  })
);

/**
 * Get smart contract statistics
 */

interface SmartContractStatsResponse {
  amm_pools: {
    total: number;
    active: number;
    total_liquidity: string;
  };
  lending_pools: {
    total: number;
    active: number;
    total_lent: string;
  };
  yield_farms: {
    total: number;
    active: number;
    total_deposits: string;
  };
  liquidity_stakes: {
    total: number;
    active: number;
    total_staked: string;
  };
}

export const getStats = api<{}, SmartContractStatsResponse>(
  { expose: true, method: "GET", path: "/smart-contracts/stats" },
  async () => {
    try {
      // Get AMM pool statistics
      const ammStats = await anchorDB.queryRow`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
          COALESCE(SUM(CAST(liquidity_a AS DECIMAL) + CAST(liquidity_b AS DECIMAL)), 0) as total_liquidity
        FROM amm_pools
      `;

      // Get lending pool statistics
      const lendingStats = await anchorDB.queryRow`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
          COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as total_lent
        FROM lending_pools
      `;

      // Get yield farm statistics
      const yieldStats = await anchorDB.queryRow`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
          COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_deposits
        FROM yield_farms
      `;

      // Get liquidity stake statistics
      const stakeStats = await anchorDB.queryRow`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
          COALESCE(SUM(CAST(liquidity_amount AS DECIMAL)), 0) as total_staked
        FROM liquidity_stakes
      `;

      return {
        amm_pools: {
          total: parseInt(ammStats?.total || '0'),
          active: parseInt(ammStats?.active || '0'),
          total_liquidity: (ammStats?.total_liquidity || '0').toString()
        },
        lending_pools: {
          total: parseInt(lendingStats?.total || '0'),
          active: parseInt(lendingStats?.active || '0'),
          total_lent: (lendingStats?.total_lent || '0').toString()
        },
        yield_farms: {
          total: parseInt(yieldStats?.total || '0'),
          active: parseInt(yieldStats?.active || '0'),
          total_deposits: (yieldStats?.total_deposits || '0').toString()
        },
        liquidity_stakes: {
          total: parseInt(stakeStats?.total || '0'),
          active: parseInt(stakeStats?.active || '0'),
          total_staked: (stakeStats?.total_staked || '0').toString()
        }
      };

    } catch (error: any) {
      logger.error("Failed to get smart contract stats", error);
      handleDatabaseError(error);
    }
  }
);
