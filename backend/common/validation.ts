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

  stellarSecretKey(field: string, value: string | undefined): this {
    if (value && (!/^S[A-Z2-7]{55}$/.test(value) || value.length !== 56)) {
      this.errors[field] = `${field} must be a valid Stellar secret key`;
    }
    return this;
  }

  amount(field: string, value: string | number | undefined): this {
    if (value !== undefined) {
      const numValue = typeof value === "string" ? parseFloat(value) : value;
      if (isNaN(numValue) || numValue <= 0) {
        this.errors[field] = `${field} must be a positive number`;
      }
      if (numValue > 1e14) {
        this.errors[field] = `${field} exceeds maximum allowed amount`;
      }
    }
    return this;
  }

  assetCode(field: string, value: string | undefined): this {
    if (value && (value.length < 1 || value.length > 12 || !/^[A-Za-z0-9]+$/.test(value))) {
      this.errors[field] = `${field} must be 1-12 alphanumeric characters`;
    }
    return this;
  }

  memo(field: string, value: string | undefined): this {
    if (value && value.length > 28) {
      this.errors[field] = `${field} must be 28 characters or less`;
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

  minLength(field: string, value: string | undefined, min: number): this {
    if (value && value.length < min) {
      this.errors[field] = `${field} must be at least ${min} characters`;
    }
    return this;
  }

  maxLength(field: string, value: string | undefined, max: number): this {
    if (value && value.length > max) {
      this.errors[field] = `${field} must be ${max} characters or less`;
    }
    return this;
  }

  custom<T>(field: string, value: T, rule: ValidationRule<T>): this {
    if (value !== undefined && value !== null && !rule.validate(value)) {
      this.errors[field] = rule.message;
    }
    return this;
  }

  validate(): void {
    if (Object.keys(this.errors).length > 0) {
      throw new ValidationError("Validation failed", this.errors);
    }
  }

  getErrors(): Record<string, string> {
    return { ...this.errors };
  }

  hasErrors(): boolean {
    return Object.keys(this.errors).length > 0;
  }
}

export function validate(): Validator {
  return new Validator();
}