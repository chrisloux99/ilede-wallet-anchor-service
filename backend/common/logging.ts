/**
 * Comprehensive logging system for the anchor service
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: Error;
  userId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;

  private constructor() {
    this.logLevel = LogLevel.INFO;
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatLog(entry: LogEntry): string {
    const levelName = LogLevel[entry.level];
    const timestamp = entry.timestamp;
    const message = entry.message;
    const context = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    const error = entry.error ? ` Error: ${entry.error.message}` : '';
    
    return `[${timestamp}] ${levelName}: ${message}${context}${error}`;
  }

  private addLog(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    // Add to in-memory store
    this.logs.push(entry);
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output for development
    const formatted = this.formatLog(entry);
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(formatted);
        break;
      case LogLevel.INFO:
        console.info(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(formatted);
        break;
    }

    // In production, send to external logging service
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalService(entry);
    }
  }

  private async sendToExternalService(entry: LogEntry): Promise<void> {
    // TODO: Integrate with external logging service (e.g., DataDog, LogRocket, etc.)
    // For now, just store in database or send to monitoring service
    try {
      // Example: Send to monitoring endpoint
      // await fetch('https://monitoring.ilede.example.com/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(entry)
      // });
    } catch (error) {
      console.error('Failed to send log to external service:', error);
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    this.addLog({
      timestamp: new Date().toISOString(),
      level: LogLevel.DEBUG,
      message,
      context
    });
  }

  info(message: string, context?: Record<string, any>): void {
    this.addLog({
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      message,
      context
    });
  }

  warn(message: string, context?: Record<string, any>): void {
    this.addLog({
      timestamp: new Date().toISOString(),
      level: LogLevel.WARN,
      message,
      context
    });
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.addLog({
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      message,
      error,
      context
    });
  }

  fatal(message: string, error?: Error, context?: Record<string, any>): void {
    this.addLog({
      timestamp: new Date().toISOString(),
      level: LogLevel.FATAL,
      message,
      error,
      context
    });
  }

  // Request-specific logging
  logRequest(req: any, res: any, duration: number): void {
    const context = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent']
    };

    if (res.statusCode >= 400) {
      this.warn(`Request failed: ${req.method} ${req.url}`, context);
    } else {
      this.info(`Request completed: ${req.method} ${req.url}`, context);
    }
  }

  // Security event logging
  logSecurityEvent(event: string, context?: Record<string, any>): void {
    this.warn(`Security event: ${event}`, {
      ...context,
      securityEvent: true,
      timestamp: new Date().toISOString()
    });
  }

  // Transaction logging
  logTransaction(transactionId: string, event: string, context?: Record<string, any>): void {
    this.info(`Transaction ${event}: ${transactionId}`, {
      ...context,
      transactionId,
      transactionEvent: true
    });
  }

  // Get recent logs
  getRecentLogs(count: number = 100): LogEntry[] {
    return this.logs.slice(-count);
  }

  // Get logs by level
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  // Clear logs
  clearLogs(): void {
    this.logs = [];
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Request logging middleware
export function requestLogger(req: any, res: any, next?: any) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.logRequest(req, res, duration);
  });
  
  if (next) next();
}

// Error logging middleware
export function errorLogger(error: Error, req?: any, context?: Record<string, any>): void {
  logger.error(`Unhandled error: ${error.message}`, error, {
    ...context,
    stack: error.stack,
    url: req?.url,
    method: req?.method,
    ip: req?.ip
  });
}

// Performance monitoring
export function performanceMonitor<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  
  return fn().then(
    (result) => {
      const duration = Date.now() - start;
      logger.info(`Performance: ${operation} completed`, {
        operation,
        duration,
        success: true
      });
      return result;
    },
    (error) => {
      const duration = Date.now() - start;
      logger.error(`Performance: ${operation} failed`, error, {
        operation,
        duration,
        success: false
      });
      throw error;
    }
  );
}

