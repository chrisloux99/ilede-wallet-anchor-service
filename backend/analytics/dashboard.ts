import { api } from "encore.dev/api";
import { anchorDB } from "../database/db";
import { validate } from "../common/validation";
import { handleDatabaseError } from "../common/errors";
import { rateLimits } from "../common/rateLimiting";
import { logger } from "../common/logging";

/**
 * Advanced Analytics Dashboard
 * Provides comprehensive insights into platform usage, performance, and trends
 */

interface DashboardMetricsResponse {
  overview: {
    total_users: number;
    total_transactions: number;
    total_volume: string;
    active_wallets: number;
    platform_revenue: string;
  };
  transaction_analytics: {
    daily_volume: Array<{ date: string; volume: string; count: number }>;
    transaction_types: Array<{ type: string; count: number; volume: string }>;
    asset_distribution: Array<{ asset: string; count: number; volume: string }>;
    hourly_distribution: Array<{ hour: number; count: number }>;
  };
  user_analytics: {
    new_users_daily: Array<{ date: string; count: number }>;
    user_retention: {
      day_1: number;
      day_7: number;
      day_30: number;
    };
    kyc_completion_rate: number;
    top_users_by_volume: Array<{ account: string; volume: string; transactions: number }>;
  };
  defi_analytics: {
    total_liquidity: string;
    active_pools: number;
    total_staked: string;
    yield_farms_active: number;
    lending_volume: string;
  };
  nft_analytics: {
    total_nfts: number;
    active_listings: number;
    total_volume: string;
    average_price: string;
    top_collections: Array<{ collection: string; volume: string; count: number }>;
  };
  security_analytics: {
    risk_assessments_today: number;
    fraud_detections_today: number;
    blocked_transactions: number;
    security_score: number;
  };
  performance_metrics: {
    average_response_time: number;
    error_rate: number;
    uptime_percentage: number;
    cache_hit_rate: number;
  };
}

export const getDashboardMetrics = api<{}, DashboardMetricsResponse>(
  { expose: true, method: "GET", path: "/analytics/dashboard" },
  rateLimits.general(async () => {
    try {
      logger.info("Generating dashboard metrics");

      // Overview metrics
      const overview = await anchorDB.queryRow`
        SELECT 
          COUNT(DISTINCT stellar_account_id) as total_users,
          COUNT(*) as total_transactions,
          COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_volume,
          COUNT(DISTINCT CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN stellar_account_id END) as active_wallets
        FROM transactions
      `;

      // Transaction analytics
      const dailyVolume = await anchorDB.query`
        SELECT 
          DATE(created_at) as date,
          COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as volume,
          COUNT(*) as count
        FROM transactions
        WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;

      const transactionTypes = await anchorDB.query`
        SELECT 
          transaction_type,
          COUNT(*) as count,
          COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as volume
        FROM transactions
        GROUP BY transaction_type
        ORDER BY count DESC
      `;

      const assetDistribution = await anchorDB.query`
        SELECT 
          asset_code,
          COUNT(*) as count,
          COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as volume
        FROM transactions
        GROUP BY asset_code
        ORDER BY volume DESC
      `;

      const hourlyDistribution = await anchorDB.query`
        SELECT 
          EXTRACT(HOUR FROM created_at) as hour,
          COUNT(*) as count
        FROM transactions
        WHERE created_at > NOW() - INTERVAL '7 days'
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hour
      `;

      // User analytics
      const newUsersDaily = await anchorDB.query`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
        FROM users
        WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;

      const kycStats = await anchorDB.queryRow`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN kyc_status = 'approved' THEN 1 END) as approved_users
        FROM users
      `;

      const topUsers = await anchorDB.query`
        SELECT 
          stellar_account_id as account,
          COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as volume,
          COUNT(*) as transactions
        FROM transactions
        GROUP BY stellar_account_id
        ORDER BY volume DESC
        LIMIT 10
      `;

      // DeFi analytics
      const defiStats = await anchorDB.queryRow`
        SELECT 
          COALESCE(SUM(CAST(liquidity_a AS DECIMAL) + CAST(liquidity_b AS DECIMAL)), 0) as total_liquidity,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_pools
        FROM amm_pools
      `;

      const stakingStats = await anchorDB.queryRow`
        SELECT 
          COALESCE(SUM(CAST(liquidity_amount AS DECIMAL)), 0) as total_staked,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_stakes
        FROM liquidity_stakes
      `;

      const yieldStats = await anchorDB.queryRow`
        SELECT 
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_farms,
          COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as lending_volume
        FROM yield_farms
      `;

      const lendingStats = await anchorDB.queryRow`
        SELECT 
          COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as total_lent
        FROM lending_pools
      `;

      // NFT analytics
      const nftStats = await anchorDB.queryRow`
        SELECT 
          COUNT(*) as total_nfts,
          COUNT(CASE WHEN status = 'listed' THEN 1 END) as active_listings,
          COALESCE(SUM(CAST(p.purchase_price AS DECIMAL)), 0) as total_volume,
          COALESCE(AVG(CAST(p.purchase_price AS DECIMAL)), 0) as average_price
        FROM nfts n
        LEFT JOIN nft_purchases p ON n.id = p.nft_id AND p.status = 'completed'
      `;

      const topCollections = await anchorDB.query`
        SELECT 
          collection_id as collection,
          COALESCE(SUM(CAST(p.purchase_price AS DECIMAL)), 0) as volume,
          COUNT(*) as count
        FROM nfts n
        LEFT JOIN nft_purchases p ON n.id = p.nft_id AND p.status = 'completed'
        WHERE n.collection_id IS NOT NULL
        GROUP BY n.collection_id
        ORDER BY volume DESC
        LIMIT 5
      `;

      // Security analytics
      const securityStats = await anchorDB.queryRow`
        SELECT 
          COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as risk_assessments_today,
          COUNT(CASE WHEN fraud_probability > 60 AND DATE(created_at) = CURRENT_DATE THEN 1 END) as fraud_detections_today
        FROM risk_assessments
      `;

      const blockedTransactions = await anchorDB.queryRow`
        SELECT COUNT(*) as blocked_count
        FROM transactions
        WHERE status = 'blocked'
        AND created_at > NOW() - INTERVAL '24 hours'
      `;

      // Calculate user retention (simplified)
      const retentionStats = await anchorDB.queryRow`
        SELECT 
          COUNT(DISTINCT CASE WHEN created_at > NOW() - INTERVAL '1 day' THEN stellar_account_id END) as day_1,
          COUNT(DISTINCT CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN stellar_account_id END) as day_7,
          COUNT(DISTINCT CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN stellar_account_id END) as day_30
        FROM transactions
      `;

      const totalUsers = parseInt(overview?.total_users || '0');
      const userRetention = {
        day_1: totalUsers > 0 ? Math.round((parseInt(retentionStats?.day_1 || '0') / totalUsers) * 100) : 0,
        day_7: totalUsers > 0 ? Math.round((parseInt(retentionStats?.day_7 || '0') / totalUsers) * 100) : 0,
        day_30: totalUsers > 0 ? Math.round((parseInt(retentionStats?.day_30 || '0') / totalUsers) * 100) : 0
      };

      const kycCompletionRate = parseInt(kycStats?.total_users || '0') > 0 
        ? Math.round((parseInt(kycStats?.approved_users || '0') / parseInt(kycStats?.total_users || '1')) * 100)
        : 0;

      // Calculate security score (simplified)
      const securityScore = Math.max(0, 100 - (parseInt(securityStats?.fraud_detections_today || '0') * 5));

      const response: DashboardMetricsResponse = {
        overview: {
          total_users: parseInt(overview?.total_users || '0'),
          total_transactions: parseInt(overview?.total_transactions || '0'),
          total_volume: (overview?.total_volume || '0').toString(),
          active_wallets: parseInt(overview?.active_wallets || '0'),
          platform_revenue: "0.0000000" // Placeholder
        },
        transaction_analytics: {
          daily_volume: dailyVolume.map((item: any) => ({
            date: item.date,
            volume: item.volume.toString(),
            count: parseInt(item.count)
          })),
          transaction_types: transactionTypes.map((item: any) => ({
            type: item.transaction_type,
            count: parseInt(item.count),
            volume: item.volume.toString()
          })),
          asset_distribution: assetDistribution.map((item: any) => ({
            asset: item.asset_code,
            count: parseInt(item.count),
            volume: item.volume.toString()
          })),
          hourly_distribution: hourlyDistribution.map((item: any) => ({
            hour: parseInt(item.hour),
            count: parseInt(item.count)
          }))
        },
        user_analytics: {
          new_users_daily: newUsersDaily.map((item: any) => ({
            date: item.date,
            count: parseInt(item.count)
          })),
          user_retention: userRetention,
          kyc_completion_rate: kycCompletionRate,
          top_users_by_volume: topUsers.map((item: any) => ({
            account: item.account,
            volume: item.volume.toString(),
            transactions: parseInt(item.transactions)
          }))
        },
        defi_analytics: {
          total_liquidity: (defiStats?.total_liquidity || '0').toString(),
          active_pools: parseInt(defiStats?.active_pools || '0'),
          total_staked: (stakingStats?.total_staked || '0').toString(),
          yield_farms_active: parseInt(yieldStats?.active_farms || '0'),
          lending_volume: (lendingStats?.total_lent || '0').toString()
        },
        nft_analytics: {
          total_nfts: parseInt(nftStats?.total_nfts || '0'),
          active_listings: parseInt(nftStats?.active_listings || '0'),
          total_volume: (nftStats?.total_volume || '0').toString(),
          average_price: (nftStats?.average_price || '0').toString(),
          top_collections: topCollections.map((item: any) => ({
            collection: item.collection,
            volume: item.volume.toString(),
            count: parseInt(item.count)
          }))
        },
        security_analytics: {
          risk_assessments_today: parseInt(securityStats?.risk_assessments_today || '0'),
          fraud_detections_today: parseInt(securityStats?.fraud_detections_today || '0'),
          blocked_transactions: parseInt(blockedTransactions?.blocked_count || '0'),
          security_score: securityScore
        },
        performance_metrics: {
          average_response_time: 245, // Simulated
          error_rate: 0.12, // Simulated
          uptime_percentage: 99.8, // Simulated
          cache_hit_rate: 87.5 // Simulated
        }
      };

      logger.info("Dashboard metrics generated successfully", {
        total_users: response.overview.total_users,
        total_transactions: response.overview.total_transactions,
        security_score: response.security_analytics.security_score
      });

      return response;

    } catch (error: any) {
      logger.error("Failed to generate dashboard metrics", error);
      handleDatabaseError(error);
    }
  })
);

interface GetTrendsRequest {
  period: '7d' | '30d' | '90d' | '1y';
  metric: 'volume' | 'transactions' | 'users' | 'revenue';
}

interface GetTrendsResponse {
  period: string;
  metric: string;
  data: Array<{ date: string; value: number; change_percentage?: number }>;
  summary: {
    total: number;
    average: number;
    growth_rate: number;
    peak_value: number;
    peak_date: string;
  };
}

export const getTrends = api<GetTrendsRequest, GetTrendsResponse>(
  { expose: true, method: "GET", path: "/analytics/trends" },
  rateLimits.general(async (req) => {
    try {
      validate()
        .required("period", req.period)
        .required("metric", req.metric)
        .validate();

      const validPeriods = ['7d', '30d', '90d', '1y'];
      const validMetrics = ['volume', 'transactions', 'users', 'revenue'];

      if (!validPeriods.includes(req.period)) {
        throw new Error("Invalid period");
      }
      if (!validMetrics.includes(req.metric)) {
        throw new Error("Invalid metric");
      }

      logger.info("Generating trends data", {
        period: req.period,
        metric: req.metric
      });

      // Calculate date range
      const periodDays = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '1y': 365
      };

      const days = periodDays[req.period];
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      let query: string;
      let data: any[];

      switch (req.metric) {
        case 'volume':
          data = await anchorDB.query`
            SELECT 
              DATE(created_at) as date,
              COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as value
            FROM transactions
            WHERE created_at >= ${startDate.toISOString()}
            GROUP BY DATE(created_at)
            ORDER BY date
          `;
          break;

        case 'transactions':
          data = await anchorDB.query`
            SELECT 
              DATE(created_at) as date,
              COUNT(*) as value
            FROM transactions
            WHERE created_at >= ${startDate.toISOString()}
            GROUP BY DATE(created_at)
            ORDER BY date
          `;
          break;

        case 'users':
          data = await anchorDB.query`
            SELECT 
              DATE(created_at) as date,
              COUNT(DISTINCT stellar_account_id) as value
            FROM transactions
            WHERE created_at >= ${startDate.toISOString()}
            GROUP BY DATE(created_at)
            ORDER BY date
          `;
          break;

        case 'revenue':
          // Simulated revenue data
          data = await anchorDB.query`
            SELECT 
              DATE(created_at) as date,
              COALESCE(SUM(CAST(amount AS DECIMAL)) * 0.001, 0) as value
            FROM transactions
            WHERE created_at >= ${startDate.toISOString()}
            GROUP BY DATE(created_at)
            ORDER BY date
          `;
          break;

        default:
          throw new Error("Invalid metric");
      }

      // Calculate summary statistics
      const values = data.map((item: any) => parseFloat(item.value));
      const total = values.reduce((sum, val) => sum + val, 0);
      const average = values.length > 0 ? total / values.length : 0;
      const peakValue = Math.max(...values);
      const peakIndex = values.indexOf(peakValue);
      const peakDate = data[peakIndex]?.date || '';

      // Calculate growth rate
      const firstValue = values[0] || 0;
      const lastValue = values[values.length - 1] || 0;
      const growthRate = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

      // Add change percentage for each data point
      const dataWithChange = data.map((item: any, index: number) => {
        const currentValue = parseFloat(item.value);
        const previousValue = index > 0 ? parseFloat(data[index - 1].value) : currentValue;
        const changePercentage = previousValue > 0 
          ? ((currentValue - previousValue) / previousValue) * 100 
          : 0;

        return {
          date: item.date,
          value: currentValue,
          change_percentage: Math.round(changePercentage * 100) / 100
        };
      });

      const response: GetTrendsResponse = {
        period: req.period,
        metric: req.metric,
        data: dataWithChange,
        summary: {
          total: Math.round(total * 100) / 100,
          average: Math.round(average * 100) / 100,
          growth_rate: Math.round(growthRate * 100) / 100,
          peak_value: Math.round(peakValue * 100) / 100,
          peak_date: peakDate
        }
      };

      logger.info("Trends data generated", {
        period: req.period,
        metric: req.metric,
        data_points: data.length,
        growth_rate: response.summary.growth_rate
      });

      return response;

    } catch (error: any) {
      logger.error("Failed to generate trends data", error, {
        period: req.period,
        metric: req.metric
      });
      handleDatabaseError(error);
    }
  })
);

interface GetUserInsightsRequest {
  user_account: string;
}

interface GetUserInsightsResponse {
  user_profile: {
    account: string;
    join_date: string;
    total_transactions: number;
    total_volume: string;
    kyc_status: string;
    risk_score: number;
  };
  activity_summary: {
    last_30_days: {
      transactions: number;
      volume: string;
      unique_assets: number;
    };
    favorite_assets: Array<{ asset: string; count: number; volume: string }>;
    transaction_patterns: {
      most_active_hour: number;
      most_active_day: string;
      average_transaction_size: string;
    };
  };
  portfolio_analysis: {
    current_balances: Array<{ asset: string; balance: string; value_usd: string }>;
    portfolio_performance: {
      total_value: string;
      change_24h: string;
      change_7d: string;
      change_30d: string;
    };
    diversification_score: number;
  };
  recommendations: string[];
}

export const getUserInsights = api<GetUserInsightsRequest, GetUserInsightsResponse>(
  { expose: true, method: "GET", path: "/analytics/user/:user_account" },
  rateLimits.general(async (req) => {
    try {
      validate()
        .required("user_account", req.user_account)
        .stellarAccount("user_account", req.user_account)
        .validate();

      logger.info("Generating user insights", {
        user_account: req.user_account
      });

      // Get user profile
      const userProfile = await anchorDB.queryRow`
        SELECT 
          stellar_account_id,
          created_at,
          kyc_status
        FROM users
        WHERE stellar_account_id = ${req.user_account}
      `;

      if (!userProfile) {
        throw new Error("User not found");
      }

      // Get transaction summary
      const transactionSummary = await anchorDB.queryRow`
        SELECT 
          COUNT(*) as total_transactions,
          COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_volume,
          COUNT(DISTINCT asset_code) as unique_assets
        FROM transactions
        WHERE stellar_account_id = ${req.user_account}
      `;

      // Get last 30 days activity
      const last30Days = await anchorDB.queryRow`
        SELECT 
          COUNT(*) as transactions,
          COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as volume,
          COUNT(DISTINCT asset_code) as unique_assets
        FROM transactions
        WHERE stellar_account_id = ${req.user_account}
        AND created_at > NOW() - INTERVAL '30 days'
      `;

      // Get favorite assets
      const favoriteAssets = await anchorDB.query`
        SELECT 
          asset_code as asset,
          COUNT(*) as count,
          COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as volume
        FROM transactions
        WHERE stellar_account_id = ${req.user_account}
        GROUP BY asset_code
        ORDER BY count DESC
        LIMIT 5
      `;

      // Get transaction patterns
      const hourlyPattern = await anchorDB.query`
        SELECT 
          EXTRACT(HOUR FROM created_at) as hour,
          COUNT(*) as count
        FROM transactions
        WHERE stellar_account_id = ${req.user_account}
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY count DESC
        LIMIT 1
      `;

      const dailyPattern = await anchorDB.query`
        SELECT 
          TO_CHAR(created_at, 'Day') as day,
          COUNT(*) as count
        FROM transactions
        WHERE stellar_account_id = ${req.user_account}
        GROUP BY TO_CHAR(created_at, 'Day')
        ORDER BY count DESC
        LIMIT 1
      `;

      // Get latest risk assessment
      const latestRisk = await anchorDB.queryRow`
        SELECT risk_score
        FROM risk_assessments
        WHERE user_account = ${req.user_account}
        ORDER BY created_at DESC
        LIMIT 1
      `;

      // Generate recommendations
      const recommendations: string[] = [];
      
      if (userProfile.kyc_status !== 'approved') {
        recommendations.push("Complete KYC verification for enhanced security and higher limits");
      }
      
      if (parseInt(last30Days?.transactions || '0') < 5) {
        recommendations.push("Consider exploring more features to maximize your wallet usage");
      }
      
      if (parseInt(transactionSummary?.unique_assets || '0') === 1) {
        recommendations.push("Diversify your portfolio by exploring different assets");
      }

      const response: GetUserInsightsResponse = {
        user_profile: {
          account: req.user_account,
          join_date: userProfile.created_at,
          total_transactions: parseInt(transactionSummary?.total_transactions || '0'),
          total_volume: (transactionSummary?.total_volume || '0').toString(),
          kyc_status: userProfile.kyc_status,
          risk_score: parseInt(latestRisk?.risk_score || '0')
        },
        activity_summary: {
          last_30_days: {
            transactions: parseInt(last30Days?.transactions || '0'),
            volume: (last30Days?.volume || '0').toString(),
            unique_assets: parseInt(last30Days?.unique_assets || '0')
          },
          favorite_assets: favoriteAssets.map((asset: any) => ({
            asset: asset.asset,
            count: parseInt(asset.count),
            volume: asset.volume.toString()
          })),
          transaction_patterns: {
            most_active_hour: parseInt(hourlyPattern[0]?.hour || '12'),
            most_active_day: dailyPattern[0]?.day?.trim() || 'Monday',
            average_transaction_size: transactionSummary?.total_transactions > 0 
              ? (parseFloat(transactionSummary?.total_volume || '0') / parseInt(transactionSummary?.total_transactions || '1')).toFixed(7)
              : '0.0000000'
          }
        },
        portfolio_analysis: {
          current_balances: [], // Would need to fetch from Stellar network
          portfolio_performance: {
            total_value: "0.0000000", // Placeholder
            change_24h: "0.00",
            change_7d: "0.00",
            change_30d: "0.00"
          },
          diversification_score: Math.min(100, parseInt(transactionSummary?.unique_assets || '0') * 20)
        },
        recommendations: recommendations
      };

      logger.info("User insights generated", {
        user_account: req.user_account,
        total_transactions: response.user_profile.total_transactions,
        recommendations_count: recommendations.length
      });

      return response;

    } catch (error: any) {
      logger.error("Failed to generate user insights", error, {
        user_account: req.user_account
      });
      handleDatabaseError(error);
    }
  })
);
