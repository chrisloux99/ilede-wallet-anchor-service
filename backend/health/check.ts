import { api } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { anchorDB } from "../database/db";
import { Server } from "stellar-sdk";
import { cache } from "../common/cache";
import { logger } from "../common/logging";

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: {
    database: ServiceStatus;
    stellar: ServiceStatus;
    cache: ServiceStatus;
  };
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

interface ServiceStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  error?: string;
}

const startTime = Date.now();

// Health check endpoint for monitoring
export const check = api<{}, HealthCheckResponse>(
  { expose: true, method: "GET", path: "/health" },
  async () => {
    const timestamp = new Date().toISOString();
    const uptime = Date.now() - startTime;
    
    // Check database connectivity
    const databaseStatus = await checkDatabase();
    
    // Check Stellar network connectivity
    const stellarStatus = await checkStellar();
    
    // Check cache system
    const cacheStatus = checkCache();
    
    // Get memory usage
    const memoryUsage = process.memoryUsage();
    const memory = {
      used: memoryUsage.heapUsed,
      total: memoryUsage.heapTotal,
      percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
    };
    
    // Determine overall status
    const services = { database: databaseStatus, stellar: stellarStatus, cache: cacheStatus };
    const overallStatus = determineOverallStatus(services);
    
    const response: HealthCheckResponse = {
      status: overallStatus,
      timestamp,
      version: process.env.npm_package_version || '1.0.0',
      services,
      uptime,
      memory
    };
    
    // Log health check
    logger.info("Health check performed", {
      status: overallStatus,
      uptime,
      memory_usage: memory.percentage
    });
    
    return response;
  }
);

async function checkDatabase(): Promise<ServiceStatus> {
  const start = Date.now();
  
  try {
    // Simple query to test database connectivity
    await anchorDB.query`SELECT 1`;
    const responseTime = Date.now() - start;
    
    return {
      status: 'healthy',
      responseTime
    };
  } catch (error: any) {
    logger.error("Database health check failed", error);
    
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

async function checkStellar(): Promise<ServiceStatus> {
  const start = Date.now();
  
  try {
    const horizonUrl = await secret("StellarHorizonUrl")();
    const server = new Server(horizonUrl);
    
    // Test Stellar network connectivity
    await server.fetchTimebounds();
    const responseTime = Date.now() - start;
    
    return {
      status: 'healthy',
      responseTime
    };
  } catch (error: any) {
    logger.error("Stellar health check failed", error);
    
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

function checkCache(): ServiceStatus {
  try {
    const stats = cache.getStats();
    
    // Check if cache is functioning properly
    if (stats.size >= stats.maxSize * 0.9) {
      return {
        status: 'degraded',
        error: 'Cache near capacity'
      };
    }
    
    return {
      status: 'healthy'
    };
  } catch (error: any) {
    logger.error("Cache health check failed", error);
    
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

function determineOverallStatus(services: HealthCheckResponse['services']): 'healthy' | 'degraded' | 'unhealthy' {
  const statuses = Object.values(services).map(s => s.status);
  
  if (statuses.includes('unhealthy')) {
    return 'unhealthy';
  }
  
  if (statuses.includes('degraded')) {
    return 'degraded';
  }
  
  return 'healthy';
}

// Detailed health check with more information
export const detailed = api<{}, any>(
  { expose: true, method: "GET", path: "/health/detailed" },
  async () => {
    const basicHealth = await check({});
    
    // Add additional detailed information
    const detailed = {
      ...basicHealth,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cpuUsage: process.cpuUsage(),
      cacheStats: cache.getStats(),
      recentLogs: logger.getRecentLogs(10)
    };
    
    return detailed;
  }
);

// Readiness check for Kubernetes
export const ready = api<{}, { status: string }>(
  { expose: true, method: "GET", path: "/ready" },
  async () => {
    const health = await check({});
    
    if (health.status === 'healthy' || health.status === 'degraded') {
      return { status: 'ready' };
    } else {
      return { status: 'not ready' };
    }
  }
);

// Liveness check for Kubernetes
export const live = api<{}, { status: string }>(
  { expose: true, method: "GET", path: "/live" },
  async () => {
    // Simple liveness check - if we can respond, we're alive
    return { status: 'alive' };
  }
);

