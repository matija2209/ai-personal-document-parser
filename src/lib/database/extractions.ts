import { prisma } from '@/lib/prisma'
import { Extraction } from '@prisma/client'

export async function createExtraction(
  documentId: string,
  modelName: string,
  extractionData: object,
  fieldsForReview?: string[],
  confidenceScore?: number,
  processingTimeMs?: number
): Promise<Extraction> {
  return await prisma.extraction.create({
    data: {
      documentId,
      modelName,
      extractionData,
      fieldsForReview,
      confidenceScore,
      processingTimeMs,
    },
  })
}

export async function getExtractionsByDocument(documentId: string): Promise<Extraction[]> {
  return await prisma.extraction.findMany({
    where: {
      documentId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}

export async function getLatestExtraction(documentId: string): Promise<Extraction | null> {
  return await prisma.extraction.findFirst({
    where: {
      documentId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}

export async function updateExtractionData(
  id: string,
  extractionData: object,
  isManuallyCorrected: boolean = true
): Promise<Extraction> {
  return await prisma.extraction.update({
    where: {
      id,
    },
    data: {
      extractionData,
      isManuallyCorrected,
      updatedAt: new Date(),
    },
  })
}

export async function updateFieldsForReview(
  id: string,
  fieldsForReview: string[]
): Promise<Extraction> {
  return await prisma.extraction.update({
    where: {
      id,
    },
    data: {
      fieldsForReview,
      updatedAt: new Date(),
    },
  })
}

export async function getExtractionsForReview(): Promise<Extraction[]> {
  return await prisma.extraction.findMany({
    where: {
      fieldsForReview: {
        not: {
          equals: null,
        },
      },
      isManuallyCorrected: false,
    },
    include: {
      document: {
        include: {
          user: true,
          files: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  })
}

export async function getExtractionsByModel(modelName: string): Promise<Extraction[]> {
  return await prisma.extraction.findMany({
    where: {
      modelName,
    },
    include: {
      document: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}

export async function getExtractionStats(documentId: string): Promise<{
  totalExtractions: number
  averageConfidence: number | null
  averageProcessingTime: number | null
  modelsUsed: string[]
}> {
  const extractions = await prisma.extraction.findMany({
    where: {
      documentId,
    },
    select: {
      modelName: true,
      confidenceScore: true,
      processingTimeMs: true,
    },
  })

  const totalExtractions = extractions.length
  const confidenceScores = extractions
    .map(e => e.confidenceScore)
    .filter((score): score is number => score !== null)
  const processingTimes = extractions
    .map(e => e.processingTimeMs)
    .filter((time): time is number => time !== null)

  const averageConfidence = confidenceScores.length > 0
    ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
    : null

  const averageProcessingTime = processingTimes.length > 0
    ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
    : null

  const modelsUsed = [...new Set(extractions.map(e => e.modelName))]

  return {
    totalExtractions,
    averageConfidence,
    averageProcessingTime,
    modelsUsed,
  }
}