import { ValidationError } from "./errors";

export interface ValidationRule<T> {
  validate: (value: T) => boolean;
  message: string;
}

export class Validator {
  private errors: Record<string, string> = {};

  required<T>(field: string, value: T | undefined | null): this {
    if (value === undefined || value === null || value === "") {
      this.errors[field] = `${field} is required`;
    }
    return this;
  }

  email(field: string, value: string | undefined): this {
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      this.errors[field] = `${field} must be a valid email address`;
    }
    return this;
  }

  phone(field: string, value: string | undefined): this {
    if (value && !/^\+?[\d\s\-\(\)]+$/.test(value)) {
      this.errors[field] = `${field} must be a valid phone number`;
    }
    return this;
  }

  stellarAccount(field: string, value: string | undefined): this {
    if (value && (!/^G[A-Z2-7]{55}$/.test(value) || value.length !== 56)) {
      this.errors[field] = `${field} must be a valid Stellar account ID`;
    }
    return this;
  }

  amount(field: string, value: string | number | undefined): this {
    if (value !== undefined) {
      const numValue = typeof value === "string" ? parseFloat(value) : value;
      if (isNaN(numValue) || numValue <= 0) {
        this.errors[field] = `${field} must be a positive number`;
      }
    }
    return this;
  }

  assetCode(field: string, value: string | undefined): this {
    if (value && !/^[A-Za-z0-9]{1,12}$/.test(value)) {
      this.errors[field] = `${field} must be a valid asset code (1-12 alphanumeric characters)`;
    }
    return this;
  }

  memo(field: string, value: string | undefined): this {
    if (value && value.length > 28) {
      this.errors[field] = `${field} must be 28 characters or less`;
    }
    return this;
  }

  minLength(field: string, value: string, min: number): this {
    if (value && value.length < min) {
      this.errors[field] = `${field} must be at least ${min} characters`;
    }
    return this;
  }

  maxLength(field: string, value: string, max: number): this {
    if (value && value.length > max) {
      this.errors[field] = `${field} must be ${max} characters or less`;
    }
    return this;
  }

  url(field: string, value: string | undefined): this {
    if (value) {
      try {
        new URL(value);
      } catch {
        this.errors[field] = `${field} must be a valid URL`;
      }
    }
    return this;
  }

  validate(): void {
    if (Object.keys(this.errors).length > 0) {
      throw new ValidationError("Validation failed", this.errors);
    }
  }
}

export function validate(): Validator {
  return new Validator();
}

export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return input
      .replace(/[<>"'&]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }

  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }

  return input;
}
