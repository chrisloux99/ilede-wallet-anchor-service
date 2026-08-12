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
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
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

export class AppError extends Error {
  public readonly status: number;
  public readonly code: ErrorCode;
  public readonly details?: string;
  public readonly recovery_suggestion?: string;
  public readonly field_errors?: Record<string, string>;

  constructor(
    status: number,
    code: ErrorCode,
    message: string,
    options?: {
      details?: string;
      recovery_suggestion?: string;
      field_errors?: Record<string, string>;
    }
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = options?.details;
    this.recovery_suggestion = options?.recovery_suggestion;
    this.field_errors = options?.field_errors;
  }

  toJSON(): StandardErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        recovery_suggestion: this.recovery_suggestion,
        field_errors: this.field_errors,
      },
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, fieldErrors?: Record<string, string>, details?: string) {
    super(400, ErrorCode.VALIDATION_ERROR, message, {
      field_errors: fieldErrors,
      details,
      recovery_suggestion: "Please check your input and try again.",
    });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Authentication required") {
    super(401, ErrorCode.UNAUTHORIZED, message, {
      recovery_suggestion: "Please log in and try again.",
    });
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Access denied") {
    super(403, ErrorCode.FORBIDDEN, message, {
      recovery_suggestion: "You don't have permission to perform this action.",
    });
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(404, ErrorCode.NOT_FOUND, `${resource} not found`, {
      recovery_suggestion: "Please check the resource ID and try again.",
    });
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, ErrorCode.CONFLICT, message, {
      recovery_suggestion: "The resource already exists or conflicts with another resource.",
    });
  }
}

export class StellarNetworkError extends AppError {
  constructor(message: string, details?: string) {
    super(503, ErrorCode.STELLAR_NETWORK_ERROR, message, {
      details,
      recovery_suggestion: "Please try again later. If the problem persists, contact support.",
    });
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = "Database operation failed") {
    super(500, ErrorCode.DATABASE_ERROR, message, {
      recovery_suggestion: "Please try again later. If the problem persists, contact support.",
    });
  }
}

export class KycRequiredError extends AppError {
  constructor(message: string = "KYC verification required") {
    super(403, ErrorCode.KYC_REQUIRED, message, {
      recovery_suggestion: "Please complete KYC verification to continue.",
    });
  }
}

export class InsufficientBalanceError extends AppError {
  constructor(required: string, available: string) {
    super(400, ErrorCode.INSUFFICIENT_BALANCE,
      `Insufficient balance. Required: ${required}, Available: ${available}`, {
        recovery_suggestion: "Please deposit more funds or reduce the amount.",
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

export function errorToResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return Response.json(error.toJSON(), { status: error.status });
  }
  console.error("Unhandled error:", error);
  return Response.json(
    {
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: "An unexpected error occurred",
        recovery_suggestion: "Please try again later.",
      },
    },
    { status: 500 }
  );
}
