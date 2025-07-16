import { prisma } from '@/lib/prisma'
import { ProcessingError } from '@prisma/client'

export async function logError(
  documentId: string | null,
  errorType: string,
  errorMessage: string,
  stepFailed: string,
  errorDetails?: object
): Promise<ProcessingError> {
  return await prisma.processingError.create({
    data: {
      documentId,
      errorType,
      errorMessage,
      stepFailed,
      errorDetails,
    },
  })
}

export async function getErrorsByDocument(documentId: string): Promise<ProcessingError[]> {
  return await prisma.processingError.findMany({
    where: {
      documentId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}

export async function markErrorResolved(id: string): Promise<ProcessingError> {
  return await prisma.processingError.update({
    where: {
      id,
    },
    data: {
      resolved: true,
    },
  })
}

export async function getUnresolvedErrors(): Promise<ProcessingError[]> {
  return await prisma.processingError.findMany({
    where: {
      resolved: false,
    },
    include: {
      document: {
        include: {
          user: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  })
}

export async function incrementRetryCount(id: string): Promise<ProcessingError> {
  return await prisma.processingError.update({
    where: {
      id,
    },
    data: {
      retryCount: {
        increment: 1,
      },
    },
  })
}

export async function getErrorsByType(errorType: string): Promise<ProcessingError[]> {
  return await prisma.processingError.findMany({
    where: {
      errorType,
    },
    include: {
      document: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}

export async function getErrorStats(): Promise<{
  totalErrors: number
  resolvedErrors: number
  unresolvedErrors: number
  errorsByType: Record<string, number>
  averageRetryCount: number
}> {
  const [totalErrors, resolvedCount, errorTypes, retryStats] = await Promise.all([
    prisma.processingError.count(),
    prisma.processingError.count({
      where: {
        resolved: true,
      },
    }),
    prisma.processingError.groupBy({
      by: ['errorType'],
      _count: {
        errorType: true,
      },
    }),
    prisma.processingError.aggregate({
      _avg: {
        retryCount: true,
      },
    }),
  ])

  const unresolvedErrors = totalErrors - resolvedCount
  const errorsByType = errorTypes.reduce((acc, curr) => {
    acc[curr.errorType] = curr._count.errorType
    return acc
  }, {} as Record<string, number>)

  return {
    totalErrors,
    resolvedErrors: resolvedCount,
    unresolvedErrors,
    errorsByType,
    averageRetryCount: retryStats._avg.retryCount || 0,
  }
}

export async function cleanupOldResolvedErrors(olderThanDays: number = 30): Promise<number> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

  const result = await prisma.processingError.deleteMany({
    where: {
      resolved: true,
      createdAt: {
        lt: cutoffDate,
      },
    },
  })

  return result.count
}