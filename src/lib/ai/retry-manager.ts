import { AIError } from './error-handler';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBase: number;
  retryableErrors: string[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  exponentialBase: 2,
  retryableErrors: ['rate_limit', 'timeout', 'network']
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: AIError = {
    type: 'api_error',
    message: 'Operation failed',
    provider: 'unknown'
  };
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as AIError;
      
      // Don't retry if error type is not retryable
      if (!config.retryableErrors.includes(lastError.type)) {
        throw lastError;
      }
      
      // Don't retry on last attempt
      if (attempt === config.maxRetries) {
        throw lastError;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(config.exponentialBase, attempt),
        config.maxDelay
      );
      
      // Use retry-after header if available
      const actualDelay = lastError.retryAfter ? lastError.retryAfter * 1000 : delay;
      
      console.log(`Retrying AI operation in ${actualDelay}ms (attempt ${attempt + 1}/${config.maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, actualDelay));
    }
  }
  
  throw lastError;
}