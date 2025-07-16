interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
}

export const PROVIDER_LIMITS: Record<string, RateLimitConfig> = {
  'gemini': {
    requestsPerMinute: 15,
    requestsPerHour: 1000,
    requestsPerDay: 50000
  },
  'openai': {
    requestsPerMinute: 500,
    requestsPerHour: 10000,
    requestsPerDay: 200000
  }
};

class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  async checkRateLimit(provider: string): Promise<boolean> {
    const now = Date.now();
    const config = PROVIDER_LIMITS[provider];
    
    if (!config) return true;
    
    const key = provider;
    const timestamps = this.requests.get(key) || [];
    
    // Clean old timestamps
    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    
    const recentRequests = timestamps.filter(t => t > oneDayAgo);
    
    // Check limits
    const minuteRequests = recentRequests.filter(t => t > oneMinuteAgo).length;
    const hourRequests = recentRequests.filter(t => t > oneHourAgo).length;
    const dayRequests = recentRequests.length;
    
    if (minuteRequests >= config.requestsPerMinute) {
      throw new Error(`Rate limit exceeded: ${minuteRequests}/${config.requestsPerMinute} requests per minute`);
    }
    
    if (hourRequests >= config.requestsPerHour) {
      throw new Error(`Rate limit exceeded: ${hourRequests}/${config.requestsPerHour} requests per hour`);
    }
    
    if (dayRequests >= config.requestsPerDay) {
      throw new Error(`Rate limit exceeded: ${dayRequests}/${config.requestsPerDay} requests per day`);
    }
    
    // Add current request
    recentRequests.push(now);
    this.requests.set(key, recentRequests);
    
    return true;
  }
}

export const rateLimiter = new RateLimiter();