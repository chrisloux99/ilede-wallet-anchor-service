import { APIError } from "encore.dev/api";

export enum ErrorCode {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  RATE_LIMITED = "RATE_LIMITED",
  STELLAR_NETWORK_ERROR = "STELLAR_NETWORK_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  KYC_REQUIRED = "KYC_REQUIRED",
  INSUFFICIENT_BALANCE = "INSUFFICIENT_BALANCE",
  INVALID_STELLAR_ACCOUNT = "INVALID_STELLAR_ACCOUNT",
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR"
}

export interface StandardErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: string;
    recovery_suggestion?: string;
    field_errors?: Record<string, string>;
  };
}

export class ValidationError extends APIError {
  constructor(
    message: string, 
    fieldErrors?: Record<string, string>,
    details?: string
  ) {
    super(400, ErrorCode.VALIDATION_ERROR, message, { 
      field_errors: fieldErrors,
      details,
      recovery_suggestion: "Please check your input and try again."
    });
  }
}

export class UnauthorizedError extends APIError {
  constructor(message: string = "Authentication required") {
    super(401, ErrorCode.UNAUTHORIZED, message, {
      recovery_suggestion: "Please log in and try again."
    });
  }
}

export class ForbiddenError extends APIError {
  constructor(message: string = "Access denied") {
    super(403, ErrorCode.FORBIDDEN, message, {
      recovery_suggestion: "You don't have permission to perform this action."
    });
  }
}

export class NotFoundError extends APIError {
  constructor(resource: string = "Resource") {
    super(404, ErrorCode.NOT_FOUND, `${resource} not found`, {
      recovery_suggestion: "Please check the resource ID and try again."
    });
  }
}

export class ConflictError extends APIError {
  constructor(message: string) {
    super(409, ErrorCode.CONFLICT, message, {
      recovery_suggestion: "The resource already exists or conflicts with another resource."
    });
  }
}

export class StellarNetworkError extends APIError {
  constructor(message: string, details?: string) {
    super(503, ErrorCode.STELLAR_NETWORK_ERROR, message, {
      details,
      recovery_suggestion: "Please try again later. If the problem persists, contact support."
    });
  }
}

export class DatabaseError extends APIError {
  constructor(message: string = "Database operation failed") {
    super(500, ErrorCode.DATABASE_ERROR, message, {
      recovery_suggestion: "Please try again later. If the problem persists, contact support."
    });
  }
}

export class KycRequiredError extends APIError {
  constructor(message: string = "KYC verification required") {
    super(403, ErrorCode.KYC_REQUIRED, message, {
      recovery_suggestion: "Please complete KYC verification to continue."
    });
  }
}

export class InsufficientBalanceError extends APIError {
  constructor(required: string, available: string) {
    super(400, ErrorCode.INSUFFICIENT_BALANCE, 
      `Insufficient balance. Required: ${required}, Available: ${available}`, {
      recovery_suggestion: "Please deposit more funds or reduce the amount."
    });
  }
}

export class InvalidStellarAccountError extends APIError {
  constructor(account: string) {
    super(400, ErrorCode.INVALID_STELLAR_ACCOUNT, 
      `Invalid Stellar account: ${account}`, {
      recovery_suggestion: "Please provide a valid Stellar account ID (starting with 'G')."
    });
  }
}

export function handleDatabaseError(error: any): never {
  console.error("Database error:", error);
  throw new DatabaseError("A database error occurred");
}

export function handleStellarError(error: any): never {
  console.error("Stellar network error:", error);
  throw new StellarNetworkError("Stellar network operation failed", error.message);
}