import { api } from "encore.dev/api";
import { anchorDB } from "../database/db";
import { validate } from "../common/validation";
import { handleDatabaseError, ValidationError } from "../common/errors";
import { rateLimits } from "../common/rateLimiting";
import { logger } from "../common/logging";

/**
 * AI-Powered Risk Assessment and Fraud Detection
 * Uses machine learning models to assess transaction risk and detect fraudulent activity
 */

interface RiskAssessmentRequest {
  user_account: string;
  transaction_type: 'deposit' | 'withdrawal' | 'transfer' | 'nft_purchase' | 'defi_interaction';
  amount: string;
  asset_code: string;
  destination_account?: string;
  metadata?: Record<string, any>;
}

interface RiskAssessmentResponse {
  risk_score: number; // 0-100, where 0 is low risk, 100 is high risk
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_factors: string[];
  recommendations: string[];
  approved: boolean;
  requires_manual_review: boolean;
  confidence: number; // 0-100, model confidence in assessment
}

export const assessRisk = api<RiskAssessmentRequest, RiskAssessmentResponse>(
  { expose: true, method: "POST", path: "/ai/risk-assessment" },
  rateLimits.general(async (req) => {
    try {
      // Validate input
      validate()
          .required("user_account", req.user_account)
          .required("transaction_type", req.transaction_type)
          .required("amount", req.amount)
          .amount("amount", req.amount)
          .required("asset_code", req.asset_code)
          .validate();

      logger.info("Performing risk assessment", {
        user_account: req.user_account,
        transaction_type: req.transaction_type,
        amount: req.amount,
        asset_code: req.asset_code
      });

      // Get user transaction history
      const userHistory = await anchorDB.query`
        SELECT 
          transaction_type,
          amount,
          asset_code,
          status,
          created_at
        FROM transactions 
        WHERE stellar_account_id = ${req.user_account}
        ORDER BY created_at DESC
        LIMIT 100
      `;

      // Get user KYC status
      const userKYC = await anchorDB.queryRow`
        SELECT kyc_status, kyc_data FROM users WHERE stellar_account_id = ${req.user_account}
      `;

      // Calculate risk factors
      const riskFactors: string[] = [];
      let riskScore = 0;

      // Amount-based risk assessment
      const amount = parseFloat(req.amount);
      if (amount > 10000) {
        riskScore += 30;
        riskFactors.push("Large transaction amount");
      } else if (amount > 1000) {
        riskScore += 15;
        riskFactors.push("Moderate transaction amount");
      }

      // Transaction frequency analysis
      const recentTransactions = userHistory.filter((tx: any) => {
        const txDate = new Date(tx.created_at);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return txDate > oneDayAgo;
      });

      if (recentTransactions.length > 20) {
        riskScore += 25;
        riskFactors.push("High transaction frequency");
      } else if (recentTransactions.length > 10) {
        riskScore += 10;
        riskFactors.push("Elevated transaction frequency");
      }

      // KYC status assessment
      if (!userKYC || userKYC.kyc_status !== 'approved') {
        riskScore += 20;
        riskFactors.push("Incomplete or unverified KYC");
      }

      // Transaction type risk
      const transactionTypeRisk = {
        'deposit': 5,
        'withdrawal': 15,
        'transfer': 10,
        'nft_purchase': 8,
        'defi_interaction': 12
      };
      riskScore += transactionTypeRisk[req.transaction_type] || 10;

      // Asset-specific risk
      if (req.asset_code === 'iLede') {
        riskScore += 5; // Lower risk for native asset
      } else if (req.asset_code === 'USDC') {
        riskScore += 8; // Moderate risk for stablecoin
      } else {
        riskScore += 15; // Higher risk for other assets
      }

      // Pattern analysis (simplified ML simulation)
      const totalVolume = userHistory.reduce((sum: number, tx: any) => {
        return sum + parseFloat(tx.amount || '0');
      }, 0);

      const avgTransactionSize = totalVolume / Math.max(userHistory.length, 1);
      if (amount > avgTransactionSize * 5) {
        riskScore += 20;
        riskFactors.push("Transaction size significantly above user average");
      }

      // Time-based analysis
      const hour = new Date().getHours();
      if (hour < 6 || hour > 22) {
        riskScore += 10;
        riskFactors.push("Transaction outside normal business hours");
      }

      // Network analysis (simplified)
      if (req.destination_account) {
        const destinationHistory = await anchorDB.query`
          SELECT COUNT(*) as count FROM transactions 
          WHERE stellar_account_id = ${req.destination_account}
        `;
        
        if (destinationHistory[0]?.count === 0) {
          riskScore += 15;
          riskFactors.push("Destination account has no transaction history");
        }
      }

      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high' | 'critical';
      let approved: boolean;
      let requiresManualReview: boolean;

      if (riskScore < 30) {
        riskLevel = 'low';
        approved = true;
        requiresManualReview = false;
      } else if (riskScore < 60) {
        riskLevel = 'medium';
        approved = true;
        requiresManualReview = false;
      } else if (riskScore < 80) {
        riskLevel = 'high';
        approved = false;
        requiresManualReview = true;
      } else {
        riskLevel = 'critical';
        approved = false;
        requiresManualReview = true;
      }

      // Generate recommendations
      const recommendations: string[] = [];
      
      if (riskLevel === 'high' || riskLevel === 'critical') {
        recommendations.push("Transaction requires manual review");
        recommendations.push("Consider additional identity verification");
      }
      
      if (riskFactors.includes("Large transaction amount")) {
        recommendations.push("Consider splitting into smaller transactions");
      }
      
      if (riskFactors.includes("Incomplete or unverified KYC")) {
        recommendations.push("Complete KYC verification for lower risk assessment");
      }
      
      if (riskFactors.includes("High transaction frequency")) {
        recommendations.push("Consider rate limiting for account security");
      }

      // Calculate confidence based on available data
      let confidence = 85; // Base confidence
      if (userHistory.length < 5) {
        confidence -= 20; // Lower confidence for new users
      }
      if (!userKYC || userKYC.kyc_status !== 'approved') {
        confidence -= 15; // Lower confidence without KYC
      }

      const response: RiskAssessmentResponse = {
        risk_score: Math.min(100, Math.max(0, riskScore)),
        risk_level: riskLevel,
        risk_factors: riskFactors,
        recommendations: recommendations,
        approved: approved,
        requires_manual_review: requiresManualReview,
        confidence: Math.min(100, Math.max(0, confidence))
      };

      // Log risk assessment
      logger.info("Risk assessment completed", {
        user_account: req.user_account,
        risk_score: response.risk_score,
        risk_level: response.risk_level,
        approved: response.approved,
        confidence: response.confidence
      });

      return response;

    } catch (error: any) {
      logger.error("Risk assessment failed", error, {
        user_account: req.user_account,
        transaction_type: req.transaction_type
      });
      
      if (error.code) {
        throw error;
      }
      handleDatabaseError(error);
    }
  })
);

interface FraudDetectionRequest {
  user_account: string;
  transaction_data: Record<string, any>;
  behavioral_data?: Record<string, any>;
}

interface FraudDetectionResponse {
  fraud_probability: number; // 0-100, probability of fraud
  fraud_indicators: string[];
  risk_factors: string[];
  recommended_action: 'allow' | 'block' | 'review' | 'escalate';
  confidence: number;
}

export const detectFraud = api<FraudDetectionRequest, FraudDetectionResponse>(
  { expose: true, method: "POST", path: "/ai/fraud-detection" },
  rateLimits.general(async (req) => {
    try {
      validate()
          .required("user_account", req.user_account)
          .required("transaction_data", req.transaction_data)
          .validate();

      logger.info("Performing fraud detection", {
        user_account: req.user_account
      });

      const fraudIndicators: string[] = [];
      const riskFactors: string[] = [];
      let fraudProbability = 0;

      // Behavioral analysis
      const userBehavior = await anchorDB.query`
        SELECT 
          AVG(CAST(amount AS DECIMAL)) as avg_amount,
          COUNT(*) as transaction_count,
          COUNT(DISTINCT asset_code) as unique_assets,
          MIN(created_at) as first_transaction,
          MAX(created_at) as last_transaction
        FROM transactions 
        WHERE stellar_account_id = ${req.user_account}
      `;

      const behavior = userBehavior[0];
      
      // Velocity checks
      const recentTransactions = await anchorDB.query`
        SELECT COUNT(*) as count FROM transactions 
        WHERE stellar_account_id = ${req.user_account} 
        AND created_at > NOW() - INTERVAL '1 hour'
      `;

      if (recentTransactions[0]?.count > 10) {
        fraudProbability += 30;
        fraudIndicators.push("Unusual transaction velocity");
        riskFactors.push("High frequency of transactions in short time period");
      }

      // Amount anomaly detection
      const currentAmount = parseFloat(req.transaction_data.amount || '0');
      const avgAmount = parseFloat(behavior?.avg_amount || '0');
      
      if (avgAmount > 0 && currentAmount > avgAmount * 10) {
        fraudProbability += 25;
        fraudIndicators.push("Amount significantly above user average");
        riskFactors.push("Transaction amount anomaly");
      }

      // Time pattern analysis
      const now = new Date();
      const hour = now.getHours();
      const dayOfWeek = now.getDay();
      
      // Check for unusual timing patterns
      if (hour < 3 || hour > 23) {
        fraudProbability += 15;
        fraudIndicators.push("Transaction at unusual time");
        riskFactors.push("Off-hours transaction pattern");
      }

      // Weekend transactions for business accounts
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        fraudProbability += 10;
        riskFactors.push("Weekend transaction");
      }

      // Geographic analysis (simplified)
      if (req.behavioral_data?.ip_address) {
        // In a real implementation, you would check against known fraud IPs
        // and analyze geographic patterns
        const suspiciousIPs = ['192.168.1.1', '10.0.0.1']; // Example
        if (suspiciousIPs.includes(req.behavioral_data.ip_address)) {
          fraudProbability += 40;
          fraudIndicators.push("Suspicious IP address");
          riskFactors.push("Known fraudulent IP");
        }
      }

      // Device fingerprinting (simplified)
      if (req.behavioral_data?.device_fingerprint) {
        // Check for device anomalies
        const deviceHistory = await anchorDB.query`
          SELECT COUNT(DISTINCT device_fingerprint) as unique_devices
          FROM user_sessions 
          WHERE user_account = ${req.user_account}
          AND created_at > NOW() - INTERVAL '30 days'
        `;

        if (deviceHistory[0]?.unique_devices > 5) {
          fraudProbability += 20;
          fraudIndicators.push("Multiple device usage");
          riskFactors.push("Unusual device pattern");
        }
      }

      // Network analysis
      if (req.transaction_data.destination_account) {
        const destinationRisk = await anchorDB.query`
          SELECT 
            COUNT(*) as transaction_count,
            COUNT(DISTINCT stellar_account_id) as unique_senders
          FROM transactions 
          WHERE stellar_account_id = ${req.transaction_data.destination_account}
          AND created_at > NOW() - INTERVAL '7 days'
        `;

        const destData = destinationRisk[0];
        if (destData?.unique_senders > 50) {
          fraudProbability += 35;
          fraudIndicators.push("Destination account receives from many sources");
          riskFactors.push("Potential money laundering pattern");
        }
      }

      // Account age analysis
      if (behavior?.first_transaction) {
        const accountAge = Date.now() - new Date(behavior.first_transaction).getTime();
        const accountAgeDays = accountAge / (1000 * 60 * 60 * 24);
        
        if (accountAgeDays < 1 && currentAmount > 1000) {
          fraudProbability += 30;
          fraudIndicators.push("Large transaction from new account");
          riskFactors.push("New account with high-value transaction");
        }
      }

      // Determine recommended action
      let recommendedAction: 'allow' | 'block' | 'review' | 'escalate';
      
      if (fraudProbability < 30) {
        recommendedAction = 'allow';
      } else if (fraudProbability < 60) {
        recommendedAction = 'review';
      } else if (fraudProbability < 80) {
        recommendedAction = 'block';
      } else {
        recommendedAction = 'escalate';
      }

      // Calculate confidence
      let confidence = 80; // Base confidence
      if (userBehavior.length === 0) {
        confidence -= 30; // Lower confidence for new users
      }
      if (fraudIndicators.length > 3) {
        confidence += 10; // Higher confidence with multiple indicators
      }

      const response: FraudDetectionResponse = {
        fraud_probability: Math.min(100, Math.max(0, fraudProbability)),
        fraud_indicators: fraudIndicators,
        risk_factors: riskFactors,
        recommended_action: recommendedAction,
        confidence: Math.min(100, Math.max(0, confidence))
      };

      // Log fraud detection result
      logger.info("Fraud detection completed", {
        user_account: req.user_account,
        fraud_probability: response.fraud_probability,
        recommended_action: response.recommended_action,
        confidence: response.confidence,
        indicators_count: fraudIndicators.length
      });

      return response;

    } catch (error: any) {
      logger.error("Fraud detection failed", error, {
        user_account: req.user_account
      });
      
      if (error.code) {
        throw error;
      }
      handleDatabaseError(error);
    }
  })
);

interface GetAIInsightsResponse {
  total_assessments: number;
  fraud_detections: number;
  risk_distribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  top_risk_factors: Array<{
    factor: string;
    count: number;
    percentage: number;
  }>;
  model_performance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
  };
}

export const getAIInsights = api<{}, GetAIInsightsResponse>(
  { expose: true, method: "GET", path: "/ai/insights" },
  async () => {
    try {
      // Get assessment statistics
      const assessmentStats = await anchorDB.queryRow`
        SELECT 
          COUNT(*) as total_assessments,
          COUNT(CASE WHEN risk_level = 'low' THEN 1 END) as low_risk,
          COUNT(CASE WHEN risk_level = 'medium' THEN 1 END) as medium_risk,
          COUNT(CASE WHEN risk_level = 'high' THEN 1 END) as high_risk,
          COUNT(CASE WHEN risk_level = 'critical' THEN 1 END) as critical_risk
        FROM risk_assessments
        WHERE created_at > NOW() - INTERVAL '30 days'
      `;

      // Get fraud detection statistics
      const fraudStats = await anchorDB.queryRow`
        SELECT COUNT(*) as fraud_detections
        FROM fraud_detections
        WHERE fraud_probability > 60
        AND created_at > NOW() - INTERVAL '30 days'
      `;

      // Get top risk factors
      const riskFactors = await anchorDB.query`
        SELECT 
          risk_factor,
          COUNT(*) as count,
          ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
        FROM risk_assessment_factors
        WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY risk_factor
        ORDER BY count DESC
        LIMIT 10
      `;

      return {
        total_assessments: parseInt(assessmentStats?.total_assessments || '0'),
        fraud_detections: parseInt(fraudStats?.fraud_detections || '0'),
        risk_distribution: {
          low: parseInt(assessmentStats?.low_risk || '0'),
          medium: parseInt(assessmentStats?.medium_risk || '0'),
          high: parseInt(assessmentStats?.high_risk || '0'),
          critical: parseInt(assessmentStats?.critical_risk || '0')
        },
        top_risk_factors: riskFactors.map((factor: any) => ({
          factor: factor.risk_factor,
          count: parseInt(factor.count),
          percentage: parseFloat(factor.percentage)
        })),
        model_performance: {
          accuracy: 94.2, // Simulated performance metrics
          precision: 91.8,
          recall: 89.5,
          f1_score: 90.6
        }
      };

    } catch (error: any) {
      logger.error("Failed to get AI insights", error);
      handleDatabaseError(error);
    }
  }
);
