import { prisma } from '@/lib/prisma'
import { Document } from '@prisma/client'

export async function createDocument(
  userId: string,
  documentType: string,
  retentionDays?: number
): Promise<Document> {
  return await prisma.document.create({
    data: {
      userId,
      documentType,
      retentionDays,
      status: 'processing',
    },
  })
}

export async function getDocumentById(id: string): Promise<Document | null> {
  return await prisma.document.findUnique({
    where: {
      id,
    },
    include: {
      user: true,
      files: true,
      extractions: true,
      errors: true,
    },
  })
}

export async function getUserDocuments(
  userId: string,
  limit: number = 50
): Promise<Document[]> {
  return await prisma.document.findMany({
    where: {
      userId,
      deletedAt: null,
    },
    include: {
      files: true,
      extractions: {
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  })
}

export async function updateDocumentStatus(
  id: string,
  status: string
): Promise<Document> {
  return await prisma.document.update({
    where: {
      id,
    },
    data: {
      status,
    },
  })
}

export async function updateDocumentRetention(
  id: string,
  retentionDays: number
): Promise<Document> {
  return await prisma.document.update({
    where: {
      id,
    },
    data: {
      retentionDays,
    },
  })
}

export async function getDocumentsForDeletion(): Promise<Document[]> {
  const cutoffDate = new Date()
  
  return await prisma.document.findMany({
    where: {
      AND: [
        {
          retentionDays: {
            not: null,
          },
        },
        {
          deletedAt: null,
        },
        {
          OR: [
            {
              createdAt: {
                lte: new Date(cutoffDate.getTime() - (7 * 24 * 60 * 60 * 1000)), // 7 days ago as minimum
              },
            },
          ],
        },
      ],
    },
    include: {
      files: true,
    },
  })
}

export async function softDeleteDocument(id: string): Promise<Document> {
  return await prisma.document.update({
    where: {
      id,
    },
    data: {
      deletedAt: new Date(),
      status: 'deleted',
    },
  })
}

export async function getDocumentsByStatus(status: string): Promise<Document[]> {
  return await prisma.document.findMany({
    where: {
      status,
      deletedAt: null,
    },
    include: {
      files: true,
      errors: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}