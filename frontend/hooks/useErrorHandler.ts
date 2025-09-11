import { useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import type { ApiError } from '../components/ErrorDisplay';

export function useErrorHandler() {
  const { toast } = useToast();

  const handleError = useCallback((error: unknown, options?: {
    title?: string;
    showToast?: boolean;
    logError?: boolean;
  }) => {
    const { 
      title = 'Error', 
      showToast = true, 
      logError = true 
    } = options || {};

    let errorInfo: ApiError;

    // Parse different error types
    if (typeof error === 'string') {
      errorInfo = { 
        message: error, 
        code: 'UNKNOWN_ERROR' 
      };
    } else if (error instanceof Error) {
      errorInfo = { 
        message: error.message, 
        code: 'CLIENT_ERROR' 
      };
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorInfo = error as ApiError;
    } else {
      errorInfo = { 
        message: 'An unexpected error occurred', 
        code: 'UNKNOWN_ERROR' 
      };
    }

    // Log error for debugging
    if (logError) {
      console.error('Error handled:', error, errorInfo);
    }

    // Show toast notification
    if (showToast) {
      toast({
        title,
        description: errorInfo.message,
        variant: 'destructive',
      });
    }

    return errorInfo;
  }, [toast]);

  const handleApiError = useCallback(async (response: Response) => {
    let errorData: ApiError;
    
    try {
      const data = await response.json();
      errorData = data.error || data;
    } catch {
      errorData = {
        code: `HTTP_${response.status}`,
        message: response.statusText || 'An error occurred',
        recovery_suggestion: 'Please try again later.'
      };
    }

    // Add status-specific recovery suggestions
    if (!errorData.recovery_suggestion) {
      switch (response.status) {
        case 400:
          errorData.recovery_suggestion = 'Please check your input and try again.';
          break;
        case 401:
          errorData.recovery_suggestion = 'Please log in and try again.';
          break;
        case 403:
          errorData.recovery_suggestion = 'You don\'t have permission for this action.';
          break;
        case 404:
          errorData.recovery_suggestion = 'The requested resource was not found.';
          break;
        case 409:
          errorData.recovery_suggestion = 'This action conflicts with existing data.';
          break;
        case 429:
          errorData.recovery_suggestion = 'Too many requests. Please wait and try again.';
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          errorData.recovery_suggestion = 'Server error. Please try again later.';
          break;
        default:
          errorData.recovery_suggestion = 'Please try again or contact support.';
      }
    }

    const error = new Error(errorData.message);
    (error as any).code = errorData.code;
    (error as any).details = errorData.details;
    (error as any).recovery_suggestion = errorData.recovery_suggestion;
    (error as any).field_errors = errorData.field_errors;

    throw error;
  }, []);

  const withErrorHandling = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    options?: { title?: string; showToast?: boolean }
  ) => {
    return async (...args: T): Promise<R | null> => {
      try {
        return await fn(...args);
      } catch (error) {
        handleError(error, options);
        return null;
      }
    };
  }, [handleError]);

  return {
    handleError,
    handleApiError,
    withErrorHandling
  };
}