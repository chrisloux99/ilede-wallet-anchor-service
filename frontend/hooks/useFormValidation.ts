import { useState, useCallback } from 'react';

export interface ValidationRule {
  required?: boolean | string;
  minLength?: number | [number, string];
  maxLength?: number | [number, string];
  pattern?: RegExp | [RegExp, string];
  email?: boolean | string;
  phone?: boolean | string;
  stellarAccount?: boolean | string;
  amount?: boolean | string;
  url?: boolean | string;
  custom?: (value: any) => string | null;
}

export interface FormValidationOptions<T> {
  fields: Record<keyof T, ValidationRule>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  options: FormValidationOptions<T>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<keyof T, string>>({} as Record<keyof T, string>);
  const [touched, setTouched] = useState<Record<keyof T, boolean>>({} as Record<keyof T, boolean>);

  const validateField = useCallback((name: keyof T, value: any): string => {
    const rules = options.fields[name];
    if (!rules) return '';

    // Required validation
    if (rules.required) {
      const message = typeof rules.required === 'string' ? rules.required : `${String(name)} is required`;
      if (value === undefined || value === null || value === '') {
        return message;
      }
    }

    // Skip other validations if field is empty and not required
    if (!rules.required && (value === undefined || value === null || value === '')) {
      return '';
    }

    // String length validations
    if (typeof value === 'string') {
      if (rules.minLength) {
        const [min, message] = Array.isArray(rules.minLength) 
          ? rules.minLength 
          : [rules.minLength, `${String(name)} must be at least ${rules.minLength} characters`];
        if (value.length < min) {
          return message;
        }
      }

      if (rules.maxLength) {
        const [max, message] = Array.isArray(rules.maxLength) 
          ? rules.maxLength 
          : [rules.maxLength, `${String(name)} must be ${rules.maxLength} characters or less`];
        if (value.length > max) {
          return message;
        }
      }
    }

    // Pattern validation
    if (rules.pattern && typeof value === 'string') {
      const [pattern, message] = Array.isArray(rules.pattern) 
        ? rules.pattern 
        : [rules.pattern, `${String(name)} format is invalid`];
      if (!pattern.test(value)) {
        return message;
      }
    }

    // Email validation
    if (rules.email && typeof value === 'string') {
      const message = typeof rules.email === 'string' ? rules.email : 'Invalid email address';
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(value)) {
        return message;
      }
    }

    // Phone validation
    if (rules.phone && typeof value === 'string') {
      const message = typeof rules.phone === 'string' ? rules.phone : 'Invalid phone number';
      const phonePattern = /^\+?[\d\s\-\(\)]+$/;
      if (!phonePattern.test(value)) {
        return message;
      }
    }

    // Stellar account validation
    if (rules.stellarAccount && typeof value === 'string') {
      const message = typeof rules.stellarAccount === 'string' ? rules.stellarAccount : 'Invalid Stellar account ID';
      const stellarPattern = /^G[A-Z2-7]{55}$/;
      if (!stellarPattern.test(value) || value.length !== 56) {
        return message;
      }
    }

    // Amount validation
    if (rules.amount) {
      const message = typeof rules.amount === 'string' ? rules.amount : 'Invalid amount';
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(numValue) || numValue <= 0) {
        return message;
      }
      if (numValue > 1e14) {
        return 'Amount exceeds maximum allowed value';
      }
    }

    // URL validation
    if (rules.url && typeof value === 'string') {
      const message = typeof rules.url === 'string' ? rules.url : 'Invalid URL';
      try {
        new URL(value);
      } catch {
        return message;
      }
    }

    // Custom validation
    if (rules.custom) {
      const customError = rules.custom(value);
      if (customError) {
        return customError;
      }
    }

    return '';
  }, [options.fields]);

  const validateAllFields = useCallback((): boolean => {
    const newErrors: Record<keyof T, string> = {} as Record<keyof T, string>;
    let isValid = true;

    Object.keys(options.fields).forEach((key) => {
      const fieldName = key as keyof T;
      const error = validateField(fieldName, values[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [values, options.fields, validateField]);

  const setValue = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    if (options.validateOnChange) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, [options.validateOnChange, validateField]);

  const setFieldTouched = useCallback((name: keyof T, isTouched: boolean = true) => {
    setTouched(prev => ({ ...prev, [name]: isTouched }));
    
    if (options.validateOnBlur && isTouched) {
      const error = validateField(name, values[name]);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, [options.validateOnBlur, validateField, values]);

  const reset = useCallback((newValues?: Partial<T>) => {
    setValues(newValues ? { ...initialValues, ...newValues } : initialValues);
    setErrors({} as Record<keyof T, string>);
    setTouched({} as Record<keyof T, boolean>);
  }, [initialValues]);

  const getFieldProps = useCallback((name: keyof T) => ({
    value: values[name] || '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setValue(name, e.target.value);
    },
    onBlur: () => setFieldTouched(name, true),
    error: touched[name] ? errors[name] : undefined,
  }), [values, errors, touched, setValue, setFieldTouched]);

  const isValid = Object.keys(errors).length === 0 || Object.values(errors).every(error => !error);
  const hasErrors = Object.values(errors).some(error => error);

  return {
    values,
    errors,
    touched,
    isValid,
    hasErrors,
    setValue,
    setFieldTouched,
    validateAllFields,
    reset,
    getFieldProps,
  };
}