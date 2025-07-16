export interface AIError {
  type: 'rate_limit' | 'quota_exceeded' | 'api_error' | 'timeout' | 'network' | 'validation';
  message: string;
  statusCode?: number;
  retryAfter?: number;
  provider: string;
}

export function handleAIProviderError(error: any, provider: string): AIError {
  // Handle OpenAI errors
  if (error.code === 'rate_limit_exceeded') {
    return {
      type: 'rate_limit',
      message: 'Rate limit exceeded. Please try again later.',
      statusCode: 429,
      retryAfter: error.headers?.['retry-after'] ? parseInt(error.headers['retry-after']) : 60,
      provider
    };
  }
  
  // Handle Gemini errors
  if (error.status === 429) {
    return {
      type: 'rate_limit',
      message: 'API rate limit exceeded',
      statusCode: 429,
      retryAfter: 60,
      provider
    };
  }
  
  // Handle network timeouts
  if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
    return {
      type: 'network',
      message: 'Network error occurred',
      provider
    };
  }
  
  // Generic error
  return {
    type: 'api_error',
    message: error.message || 'Unknown AI processing error',
    statusCode: error.status || 500,
    provider
  };
}