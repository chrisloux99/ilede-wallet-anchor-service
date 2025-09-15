import { Request, Response } from "encore.dev/api";
import { logger } from "./logging";
import { addSecurityHeaders } from "./security";
import { getClientIP } from "./security";

/**
 * Comprehensive middleware for API endpoints
 */

export interface MiddlewareOptions {
  enableSecurityHeaders?: boolean;
  enableRequestLogging?: boolean;
  enableErrorHandling?: boolean;
  enableCORS?: boolean;
}

/**
 * Main middleware wrapper for API endpoints
 */
export function withMiddleware<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  options: MiddlewareOptions = {}
) {
  const {
    enableSecurityHeaders = true,
    enableRequestLogging = true,
    enableErrorHandling = true,
    enableCORS = true
  } = options;

  return async function (...args: T): Promise<R> {
    const req = args.find(arg => arg && typeof arg === 'object' && !arg.then);
    const res = args.find(arg => arg && typeof arg.setHeader === 'function');
    
    const startTime = Date.now();
    const requestId = generateRequestId();
    const clientIP = req ? getClientIP(req) : 'unknown';

    // Add request ID to context
    if (req) {
      req.requestId = requestId;
    }

    try {
      // Security headers
      if (enableSecurityHeaders && res) {
        addSecurityHeaders(res);
      }

      // CORS headers
      if (enableCORS && res) {
        addCORSHeaders(res);
      }

      // Request logging
      if (enableRequestLogging && req) {
        logger.info("Request started", {
          requestId,
          method: req.method,
          url: req.url,
          ip: clientIP,
          userAgent: req.headers?.['user-agent']
        });
      }

      // Execute the handler
      const result = await handler(...args);

      // Success logging
      if (enableRequestLogging && req) {
        const duration = Date.now() - startTime;
        logger.info("Request completed", {
          requestId,
          method: req.method,
          url: req.url,
          duration,
          status: 'success'
        });
      }

      return result;

    } catch (error: any) {
      // Error handling
      if (enableErrorHandling) {
        const duration = Date.now() - startTime;
        
        logger.error("Request failed", error, {
          requestId,
          method: req?.method,
          url: req?.url,
          duration,
          ip: clientIP,
          errorCode: error.code,
          errorMessage: error.message
        });

        // Log security events
        if (isSecurityError(error)) {
          logger.logSecurityEvent("Security error detected", {
            requestId,
            error: error.message,
            ip: clientIP,
            url: req?.url
          });
        }
      }

      throw error;
    }
  };
}

/**
 * Add CORS headers
 */
function addCORSHeaders(res: Response): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if error is security-related
 */
function isSecurityError(error: any): boolean {
  const securityErrorCodes = [
    'RATE_LIMIT_ERROR',
    'VALIDATION_ERROR',
    'AUTHENTICATION_ERROR',
    'AUTHORIZATION_ERROR',
    'CSRF_ERROR'
  ];
  
  return securityErrorCodes.includes(error.code) ||
         error.message?.toLowerCase().includes('security') ||
         error.message?.toLowerCase().includes('unauthorized') ||
         error.message?.toLowerCase().includes('forbidden');
}

/**
 * Request timeout middleware
 */
export function withTimeout<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  timeoutMs: number = 30000
) {
  return async function (...args: T): Promise<R> {
    return Promise.race([
      handler(...args),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Request timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      })
    ]);
  };
}

/**
 * Retry middleware with exponential backoff
 */
export function withRetry<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  maxRetries: number = 3,
  baseDelay: number = 1000
) {
  return async function (...args: T): Promise<R> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await handler(...args);
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on certain types of errors
        if (isNonRetryableError(error)) {
          throw error;
        }
        
        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        logger.warn(`Request failed, retrying in ${delay}ms`, {
          attempt: attempt + 1,
          maxRetries,
          error: error.message
        });
      }
    }
    
    throw lastError!;
  };
}

/**
 * Check if error should not be retried
 */
function isNonRetryableError(error: any): boolean {
  const nonRetryableCodes = [
    'VALIDATION_ERROR',
    'AUTHENTICATION_ERROR',
    'AUTHORIZATION_ERROR',
    'NOT_FOUND_ERROR',
    'RATE_LIMIT_ERROR'
  ];
  
  return nonRetryableCodes.includes(error.code) ||
         error.status >= 400 && error.status < 500; // Client errors
}

/**
 * Circuit breaker middleware
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000,
    private resetTimeout: number = 30000
  ) {}
  
  async execute<T extends any[], R>(
    handler: (...args: T) => Promise<R>,
    ...args: T
  ): Promise<R> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await handler(...args);
      
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = 0;
      }
      
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      
      if (this.failures >= this.threshold) {
        this.state = 'OPEN';
        logger.warn('Circuit breaker opened', {
          failures: this.failures,
          threshold: this.threshold
        });
      }
      
      throw error;
    }
  }
  
  getState(): string {
    return this.state;
  }
  
  getFailures(): number {
    return this.failures;
  }
}

/**
 * Metrics collection middleware
 */
export function withMetrics<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  metricName: string
) {
  return async function (...args: T): Promise<R> {
    const start = Date.now();
    
    try {
      const result = await handler(...args);
      const duration = Date.now() - start;
      
      logger.info(`Metric: ${metricName}`, {
        metric: metricName,
        duration,
        success: true
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      
      logger.info(`Metric: ${metricName}`, {
        metric: metricName,
        duration,
        success: false,
        error: error.message
      });
      
      throw error;
    }
  };
}

