export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError = new Error('Operation failed');
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt === config.maxAttempts) {
        break;
      }
      
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelay
      );
      
      console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, lastError.message);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  
  const message = error.message.toLowerCase();
  const retryableMessages = [
    'network error',
    'timeout',
    'connection refused',
    'temporary failure',
    'service unavailable',
    'internal server error',
    'bad gateway',
    'gateway timeout',
  ];
  
  return retryableMessages.some(msg => message.includes(msg));
}

export class UploadError extends Error {
  constructor(
    message: string,
    public readonly isRetryable: boolean = false,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'UploadError';
  }
}