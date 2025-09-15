import { api } from "encore.dev/api";
import { Request, Response } from "encore.dev/api";

/**
 * Security middleware and utilities
 */

export interface SecurityHeaders {
  'X-Content-Type-Options': string;
  'X-Frame-Options': string;
  'X-XSS-Protection': string;
  'Strict-Transport-Security': string;
  'Content-Security-Policy': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
}

/**
 * Default security headers for production
 */
export const defaultSecurityHeaders: SecurityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self' data:;",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
};

/**
 * Add security headers to response
 */
export function addSecurityHeaders(res: Response, customHeaders: Partial<SecurityHeaders> = {}): void {
  const headers = { ...defaultSecurityHeaders, ...customHeaders };
  
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value);
  }
}

/**
 * Security middleware wrapper for API endpoints
 */
export function withSecurity<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  customHeaders: Partial<SecurityHeaders> = {}
) {
  return async function (...args: T): Promise<R> {
    // Add security headers to response if available
    const res = args.find(arg => arg && typeof arg.setHeader === 'function');
    if (res) {
      addSecurityHeaders(res, customHeaders);
    }
    
    return await handler(...args);
  };
}

/**
 * CSRF token generation and validation
 */
export class CSRFProtection {
  private static tokens = new Map<string, { token: string; expires: number }>();
  
  /**
   * Generate a CSRF token for a session
   */
  static generateToken(sessionId: string): string {
    const token = this.generateRandomToken();
    const expires = Date.now() + (30 * 60 * 1000); // 30 minutes
    
    this.tokens.set(sessionId, { token, expires });
    
    // Clean up expired tokens
    this.cleanupExpiredTokens();
    
    return token;
  }
  
  /**
   * Validate a CSRF token
   */
  static validateToken(sessionId: string, token: string): boolean {
    const stored = this.tokens.get(sessionId);
    if (!stored) return false;
    
    if (Date.now() > stored.expires) {
      this.tokens.delete(sessionId);
      return false;
    }
    
    return stored.token === token;
  }
  
  /**
   * Generate a random token
   */
  private static generateRandomToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  /**
   * Clean up expired tokens
   */
  private static cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [sessionId, data] of this.tokens.entries()) {
      if (now > data.expires) {
        this.tokens.delete(sessionId);
      }
    }
  }
}

/**
 * Input sanitization for preventing injection attacks
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate and sanitize file uploads
 */
export function validateFileUpload(file: any, allowedTypes: string[], maxSize: number): boolean {
  if (!file || !file.type || !file.size) {
    return false;
  }
  
  if (!allowedTypes.includes(file.type)) {
    return false;
  }
  
  if (file.size > maxSize) {
    return false;
  }
  
  return true;
}

/**
 * IP address validation and filtering
 */
export function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Get client IP address from request
 */
export function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];
  const remoteAddress = req.connection?.remoteAddress;
  
  if (forwarded) {
    const ips = forwarded.split(',');
    return ips[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return remoteAddress || 'unknown';
}

/**
 * Check if IP is in allowed whitelist
 */
export function isIPAllowed(ip: string, whitelist: string[]): boolean {
  if (!isValidIP(ip)) return false;
  
  return whitelist.some(allowedIP => {
    if (allowedIP.includes('/')) {
      // CIDR notation support (simplified)
      return ip.startsWith(allowedIP.split('/')[0]);
    }
    return ip === allowedIP;
  });
}

