/**
 * In-memory caching system for performance optimization
 * In production, this should be replaced with Redis
 */

interface CacheEntry<T> {
  value: T;
  expires: number;
  createdAt: number;
}

export class Cache {
  private static instance: Cache;
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize: number = 1000;
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): Cache {
    if (!Cache.instance) {
      Cache.instance = new Cache();
    }
    return Cache.instance;
  }

  /**
   * Set a cache entry
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const expires = Date.now() + (ttl || this.defaultTTL);
    
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }
    
    this.cache.set(key, {
      value,
      expires,
      createdAt: Date.now()
    });
  }

  /**
   * Get a cache entry
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value as T;
  }

  /**
   * Get or set a cache entry
   */
  async getOrSet<T>(
    key: string, 
    factory: () => Promise<T>, 
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }
    
    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Delete a cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    entries: Array<{ key: string; age: number; expires: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.createdAt,
      expires: entry.expires
    }));

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // TODO: Implement hit rate tracking
      entries
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Evict the oldest entry
   */
  private evictOldest(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

// Export singleton instance
export const cache = Cache.getInstance();

// Cache key generators
export const cacheKeys = {
  user: (accountId: string) => `user:${accountId}`,
  balance: (accountId: string) => `balance:${accountId}`,
  transaction: (id: string) => `transaction:${id}`,
  stellarAccount: (accountId: string) => `stellar_account:${accountId}`,
  assetInfo: (assetCode: string) => `asset_info:${assetCode}`,
  kycStatus: (accountId: string) => `kyc_status:${accountId}`,
  rateLimit: (key: string) => `rate_limit:${key}`,
};

// Cache decorator for functions
export function cached<T extends any[], R>(
  keyGenerator: (...args: T) => string,
  ttl?: number
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: T): Promise<R> {
      const key = keyGenerator(...args);
      const cached = cache.get<R>(key);
      
      if (cached !== null) {
        return cached;
      }
      
      const result = await method.apply(this, args);
      cache.set(key, result, ttl);
      return result;
    };
  };
}

// Utility functions for common caching patterns
export async function cacheUserData<T>(
  accountId: string,
  factory: () => Promise<T>,
  ttl?: number
): Promise<T> {
  return cache.getOrSet(cacheKeys.user(accountId), factory, ttl);
}

export async function cacheBalanceData<T>(
  accountId: string,
  factory: () => Promise<T>,
  ttl?: number
): Promise<T> {
  return cache.getOrSet(cacheKeys.balance(accountId), factory, ttl);
}

export async function cacheTransactionData<T>(
  transactionId: string,
  factory: () => Promise<T>,
  ttl?: number
): Promise<T> {
  return cache.getOrSet(cacheKeys.transaction(transactionId), factory, ttl);
}

// Cache invalidation helpers
export function invalidateUserCache(accountId: string): void {
  cache.delete(cacheKeys.user(accountId));
  cache.delete(cacheKeys.balance(accountId));
  cache.delete(cacheKeys.kycStatus(accountId));
}

export function invalidateTransactionCache(transactionId: string): void {
  cache.delete(cacheKeys.transaction(transactionId));
}

// Periodic cleanup
setInterval(() => {
  cache.cleanup();
}, 60 * 1000); // Clean up every minute

