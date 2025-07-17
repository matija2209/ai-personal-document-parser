import { unstable_cache } from 'next/cache';

// Cache user documents for 5 minutes
export const getCachedUserDocuments = unstable_cache(
  async (userId: string, search?: string, type?: string) => {
    const { prisma } = await import('@/lib/prisma');
    
    const whereClause: any = { userId };
    
    if (search) {
      whereClause.OR = [
        {
          documentType: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          id: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }
    
    if (type && type !== 'all') {
      whereClause.documentType = type;
    }

    return prisma.document.findMany({
      where: whereClause,
      include: {
        extractions: {
          select: { confidenceScore: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
  ['user-documents'],
  {
    revalidate: 300, // 5 minutes
    tags: ['user-documents'],
  }
);

// Cache document details for 10 minutes
export const getCachedDocument = unstable_cache(
  async (documentId: string, userId: string) => {
    const { prisma } = await import('@/lib/prisma');
    
    return prisma.document.findFirst({
      where: {
        id: documentId,
        userId: userId,
      },
      include: {
        files: true,
        extractions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        errors: {
          where: { resolved: false },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  },
  ['document-details'],
  {
    revalidate: 600, // 10 minutes
    tags: ['document-details'],
  }
);

// Image optimization helpers
export function getOptimizedImageUrl(fileKey: string, width?: number, quality?: number): string {
  const baseUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL 
    ? `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${fileKey}`
    : `https://${process.env.NEXT_PUBLIC_R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.NEXT_PUBLIC_R2_BUCKET_NAME}/${fileKey}`;
  
  // If you have image transformation service (like Cloudflare Images), add params here
  // For now, return the base URL
  return baseUrl;
}

// Debounce utility for search inputs
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Memoization helper for expensive calculations
export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map();
  
  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn(...args);
    cache.set(key, result);
    
    return result;
  }) as T;
}

// Performance monitoring
export function measurePerformance<T>(
  name: string,
  fn: () => T | Promise<T>
): T | Promise<T> {
  const start = performance.now();
  
  const result = fn();
  
  if (result instanceof Promise) {
    return result.finally(() => {
      const end = performance.now();
      console.log(`${name} took ${end - start} milliseconds`);
    });
  } else {
    const end = performance.now();
    console.log(`${name} took ${end - start} milliseconds`);
    return result;
  }
}