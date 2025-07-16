export class SimpleRateLimit {
  private requests: Map<string, number[]> = new Map();
  
  checkLimit(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    const userRequests = this.requests.get(key) || [];
    const recentRequests = userRequests.filter(time => time > windowStart);
    
    if (recentRequests.length >= maxRequests) {
      return false;
    }
    
    recentRequests.push(now);
    this.requests.set(key, recentRequests);
    return true;
  }
  
  resetLimit(key: string): void {
    this.requests.delete(key);
  }
  
  cleanup(): void {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    for (const [key, requests] of this.requests.entries()) {
      const recentRequests = requests.filter(time => time > oneHourAgo);
      if (recentRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, recentRequests);
      }
    }
  }
}

// Global rate limiter instance
export const rateLimiter = new SimpleRateLimit();

// Rate limit configurations
export const RATE_LIMITS = {
  upload: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 uploads per minute
  processing: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 AI processing requests per minute
  api: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 API requests per minute
} as const;