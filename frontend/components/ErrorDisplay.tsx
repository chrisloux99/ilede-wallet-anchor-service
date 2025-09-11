import React from 'react';
import { AlertTriangle, AlertCircle, Info, RefreshCw, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface ApiError {
  code?: string;
  message: string;
  details?: string;
  recovery_suggestion?: string;
  field_errors?: Record<string, string>;
}

interface ErrorDisplayProps {
  error: ApiError | Error | string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  variant?: 'default' | 'destructive' | 'warning';
  showDetails?: boolean;
}

export function ErrorDisplay({ 
  error, 
  onRetry, 
  onDismiss, 
  className = '', 
  variant = 'destructive',
  showDetails = false 
}: ErrorDisplayProps) {
  const getErrorInfo = (err: ApiError | Error | string) => {
    if (typeof err === 'string') {
      return { 
        message: err, 
        code: 'UNKNOWN_ERROR',
        recovery_suggestion: 'Please try again or contact support if the problem persists.'
      };
    }
    
    if (err instanceof Error) {
      return { 
        message: err.message, 
        code: 'CLIENT_ERROR',
        recovery_suggestion: 'Please refresh the page and try again.'
      };
    }
    
    return err;
  };

  const errorInfo = getErrorInfo(error);
  
  const getIcon = () => {
    switch (variant) {
      case 'warning':
        return <AlertCircle className="h-4 w-4" />;
      case 'destructive':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getErrorTitle = (code?: string) => {
    switch (code) {
      case 'VALIDATION_ERROR':
        return 'Invalid Input';
      case 'UNAUTHORIZED':
        return 'Authentication Required';
      case 'FORBIDDEN':
        return 'Access Denied';
      case 'NOT_FOUND':
        return 'Not Found';
      case 'CONFLICT':
        return 'Conflict';
      case 'STELLAR_NETWORK_ERROR':
        return 'Network Error';
      case 'KYC_REQUIRED':
        return 'Verification Required';
      case 'INSUFFICIENT_BALANCE':
        return 'Insufficient Balance';
      case 'INVALID_STELLAR_ACCOUNT':
        return 'Invalid Account';
      default:
        return 'Error';
    }
  };

  const getRecoveryActions = (code?: string) => {
    switch (code) {
      case 'UNAUTHORIZED':
        return (
          <Button 
            onClick={() => window.location.href = '/'}
            variant="outline" 
            size="sm"
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-3 w-3" />
            Go to Login
          </Button>
        );
      case 'KYC_REQUIRED':
        return (
          <Button 
            onClick={() => window.location.href = '/kyc'}
            variant="outline" 
            size="sm"
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-3 w-3" />
            Complete KYC
          </Button>
        );
      case 'STELLAR_NETWORK_ERROR':
      case 'DATABASE_ERROR':
        return (
          <Button 
            onClick={onRetry}
            variant="outline" 
            size="sm"
            className="flex items-center gap-2"
            disabled={!onRetry}
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
        );
      default:
        return onRetry ? (
          <Button 
            onClick={onRetry}
            variant="outline" 
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-3 w-3" />
            Try Again
          </Button>
        ) : null;
    }
  };

  return (
    <Alert variant={variant} className={className}>
      {getIcon()}
      <AlertTitle className="flex items-center gap-2">
        {getErrorTitle(errorInfo.code)}
        {errorInfo.code && (
          <Badge variant="outline" className="text-xs">
            {errorInfo.code}
          </Badge>
        )}
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{errorInfo.message}</p>
        
        {errorInfo.field_errors && (
          <div className="space-y-1">
            <p className="text-sm font-medium">Field errors:</p>
            <ul className="text-sm space-y-1">
              {Object.entries(errorInfo.field_errors).map(([field, message]) => (
                <li key={field} className="flex gap-2">
                  <span className="font-medium capitalize">{field.replace('_', ' ')}:</span>
                  <span>{message}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {errorInfo.recovery_suggestion && (
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm">
              <strong>💡 Suggestion:</strong> {errorInfo.recovery_suggestion}
            </p>
          </div>
        )}
        
        {showDetails && errorInfo.details && (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground">
              Technical Details
            </summary>
            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
              {errorInfo.details}
            </pre>
          </details>
        )}
        
        <div className="flex gap-2 pt-2">
          {getRecoveryActions(errorInfo.code)}
          {onDismiss && (
            <Button 
              onClick={onDismiss}
              variant="ghost" 
              size="sm"
            >
              Dismiss
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

interface FieldErrorProps {
  error?: string;
  className?: string;
}

export function FieldError({ error, className = '' }: FieldErrorProps) {
  if (!error) return null;
  
  return (
    <p className={`text-sm text-destructive flex items-center gap-1 ${className}`}>
      <AlertTriangle className="h-3 w-3" />
      {error}
    </p>
  );
}