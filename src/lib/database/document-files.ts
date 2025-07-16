import { prisma } from '@/lib/prisma'
import { DocumentFile } from '@prisma/client'

export async function createDocumentFile(
  documentId: string,
  userId: string,
  fileKey: string,
  filePath: string,
  fileType: string,
  originalFileName: string,
  compressedSize: number,
  originalSize: number,
  mimeType: string
): Promise<DocumentFile> {
  return await prisma.documentFile.create({
    data: {
      documentId,
      userId,
      fileKey,
      filePath,
      fileType,
      originalFileName,
      compressedSize,
      originalSize,
      mimeType,
    },
  })
}

export async function getDocumentFiles(documentId: string): Promise<DocumentFile[]> {
  return await prisma.documentFile.findMany({
    where: {
      documentId,
    },
    orderBy: {
      uploadedAt: 'asc',
    },
  })
}

export async function getDocumentFile(fileKey: string): Promise<DocumentFile | null> {
  return await prisma.documentFile.findUnique({
    where: {
      fileKey,
    },
    include: {
      document: true,
      user: true,
    },
  })
}

export async function deleteDocumentFile(fileKey: string): Promise<DocumentFile> {
  return await prisma.documentFile.delete({
    where: {
      fileKey,
    },
  })
}

export async function getOrphanedFiles(olderThan: Date): Promise<DocumentFile[]> {
  return await prisma.documentFile.findMany({
    where: {
      uploadedAt: {
        lt: olderThan,
      },
      document: {
        deletedAt: {
          not: null,
        },
      },
    },
    include: {
      document: true,
    },
  })
}

export async function getUserFiles(
  userId: string,
  limit: number = 100
): Promise<DocumentFile[]> {
  return await prisma.documentFile.findMany({
    where: {
      userId,
    },
    include: {
      document: true,
    },
    orderBy: {
      uploadedAt: 'desc',
    },
    take: limit,
  })
}

export async function getFilesByType(
  documentId: string,
  fileType: string
): Promise<DocumentFile[]> {
  return await prisma.documentFile.findMany({
    where: {
      documentId,
      fileType,
    },
    orderBy: {
      uploadedAt: 'asc',
    },
  })
}