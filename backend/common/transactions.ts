import { anchorDB } from "../database/db";

/**
 * Database transaction utilities for atomic operations
 */

export interface TransactionOptions {
  isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
  timeout?: number; // milliseconds
}

/**
 * Execute a function within a database transaction
 * Automatically handles rollback on error
 */
export async function withTransaction<T>(
  operation: (tx: any) => Promise<T>,
  options: TransactionOptions = {}
): Promise<T> {
  const { isolationLevel = 'READ_COMMITTED', timeout = 30000 } = options;
  
  // Start transaction
  await anchorDB.exec`BEGIN TRANSACTION ISOLATION LEVEL ${isolationLevel}`;
  
  try {
    // Set transaction timeout
    if (timeout > 0) {
      await anchorDB.exec`SET LOCAL statement_timeout = ${timeout}`;
    }
    
    // Execute the operation
    const result = await operation(anchorDB);
    
    // Commit transaction
    await anchorDB.exec`COMMIT`;
    
    return result;
  } catch (error) {
    // Rollback transaction on error
    try {
      await anchorDB.exec`ROLLBACK`;
    } catch (rollbackError) {
      console.error('Failed to rollback transaction:', rollbackError);
    }
    throw error;
  }
}

/**
 * Retry a transaction operation with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on certain types of errors
      if (error.code === 'VALIDATION_ERROR' || 
          error.code === 'CONFLICT_ERROR' ||
          error.code === 'RATE_LIMIT_ERROR') {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Execute multiple operations in a single transaction
 */
export async function batchTransaction<T>(
  operations: Array<(tx: any) => Promise<T>>,
  options: TransactionOptions = {}
): Promise<T[]> {
  return withTransaction(async (tx) => {
    const results: T[] = [];
    
    for (const operation of operations) {
      const result = await operation(tx);
      results.push(result);
    }
    
    return results;
  }, options);
}

/**
 * Check if an error is a transaction-related error
 */
export function isTransactionError(error: any): boolean {
  const transactionErrorCodes = [
    'DEADLOCK_DETECTED',
    'SERIALIZATION_FAILURE',
    'CONCURRENT_UPDATE',
    'TRANSACTION_TIMEOUT'
  ];
  
  return transactionErrorCodes.includes(error.code) ||
         error.message?.includes('deadlock') ||
         error.message?.includes('serialization') ||
         error.message?.includes('concurrent');
}

