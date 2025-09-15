import { api } from "encore.dev/api";
import { Request } from "encore.dev/api";

// In-memory rate limiting store (for production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator
}

/**
 * Rate limiting middleware for API endpoints
 */
export function createRateLimit(config: RateLimitConfig) {
  return function rateLimitMiddleware(
    handler: (req: Request, ...args: any[]) => Promise<any>
  ) {
    return async function (req: Request, ...args: any[]) {
      const now = Date.now();
      const key = config.keyGenerator ? config.keyGenerator(req) : getDefaultKey(req);
      
      // Clean up expired entries
      cleanupExpiredEntries(now);
      
      // Get or create rate limit entry
      let entry = rateLimitStore.get(key);
      if (!entry || now > entry.resetTime) {
        entry = { count: 0, resetTime: now + config.windowMs };
        rateLimitStore.set(key, entry);
      }
      
      // Check if limit exceeded
      if (entry.count >= config.maxRequests) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        throw new Error(`Rate limit exceeded. Try again in ${retryAfter} seconds.`);
      }
      
      // Increment counter
      entry.count++;
      
      // Call the original handler
      return await handler(req, ...args);
    };
  };
}

/**
 * Default key generator using IP address
 */
function getDefaultKey(req: Request): string {
  const ip = req.headers['x-forwarded-for'] || 
             req.headers['x-real-ip'] || 
             'unknown';
  return `rate_limit:${ip}`;
}

/**
 * Clean up expired rate limit entries
 */
function cleanupExpiredEntries(now: number): void {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Predefined rate limit configurations
 */
export const rateLimits = {
  // Strict rate limiting for wallet creation
  walletCreation: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 3, // 3 wallet creations per 15 minutes
    keyGenerator: (req) => {
      const ip = getDefaultKey(req);
      const email = req.body?.email || 'no-email';
      return `wallet_creation:${ip}:${email}`;
    }
  }),
  
  // Moderate rate limiting for general API calls
  general: createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
  }),
  
  // Strict rate limiting for auth endpoints
  auth: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 auth attempts per 15 minutes
  }),
  
  // Rate limiting for deposit/withdrawal
  transactions: createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 transactions per minute
  })
};

/**
 * Get rate limit status for a key
 */
export function getRateLimitStatus(key: string): { count: number; resetTime: number; remaining: number } | null {
  const entry = rateLimitStore.get(key);
  if (!entry) return null;
  
  const now = Date.now();
  if (now > entry.resetTime) return null;
  
  return {
    count: entry.count,
    resetTime: entry.resetTime,
    remaining: Math.max(0, 60 - entry.count) // Assuming max 60 requests
  };
}

