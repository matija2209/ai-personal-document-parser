import { prisma } from '@/lib/prisma';
import { GeminiAdapter } from '@/lib/ai/gemini.adapter';
import { OpenAIAdapter } from '@/lib/ai/openai.adapter';
import { DocumentType } from '@/lib/ai/types';
import { reconcileAIResults, calculateConfidenceScore } from '@/lib/utils/comparison';
import { R2_CONFIG } from '@/lib/r2-client';

export interface ProcessingResult {
  extractionId: string;
  fieldsToReview: string[];
  confidenceScore: number;
}

export async function processDocument(
  documentId: string,
  userId: string,
  enableDualVerification: boolean = false
): Promise<ProcessingResult> {
  try {
    // Fetch document with files
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: userId,
      },
      include: {
        files: true,
      },
    });

    if (!document) {
      throw new Error('Document not found or unauthorized');
    }

    console.log(`Processing document ${documentId}:`, {
      documentType: document.documentType,
      status: document.status,
      fileCount: document.files.length,
      files: document.files.map((f: any) => ({ id: f.id, fileKey: f.fileKey, fileType: f.fileType }))
    });

    if (!document.files.length) {
      throw new Error('No files found for document');
    }

    // Get the primary image file (front or first available)
    const primaryFile = document.files.find((file: any) => file.fileType === 'front') || document.files[0];
    
    // Construct image URL with proper encoding
    const encodedFileKey = encodeURIComponent(primaryFile.fileKey);
    const imageUrl = R2_CONFIG.publicUrl 
      ? `${R2_CONFIG.publicUrl}/${encodedFileKey}`
      : `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_CONFIG.bucketName}/${encodedFileKey}`;


    // Determine document type (map from database to AI types)
    const documentType: DocumentType = mapDocumentType(document.documentType);

    // Initialize AI adapters
    const geminiAdapter = new GeminiAdapter();
    
    // Process with primary model (Gemini)
    const primaryResult = await geminiAdapter.extractDataFromDocument(imageUrl, documentType);
    
    let secondaryResult;
    let finalData = primaryResult.data || {};
    let fieldsToReview: string[] = [];
    
    // Process with secondary model if dual verification is enabled
    if (enableDualVerification && primaryResult.success) {
      try {
        const openaiAdapter = new OpenAIAdapter();
        secondaryResult = await openaiAdapter.extractDataFromDocument(imageUrl, documentType);
        
        // Reconcile results
        const reconciliation = reconcileAIResults(primaryResult, secondaryResult);
        finalData = reconciliation.finalData;
        fieldsToReview = reconciliation.fieldsToReview;
      } catch (secondaryError) {
        console.warn('Secondary verification failed:', secondaryError);
        // Continue with primary result only
      }
    }

    // Calculate confidence score
    const confidenceScore = calculateConfidenceScore(primaryResult, secondaryResult);

    // Save extraction to database
    const extraction = await prisma.extraction.create({
      data: {
        documentId,
        modelName: enableDualVerification && secondaryResult 
          ? `${primaryResult.provider}+${secondaryResult.provider}` 
          : primaryResult.provider,
        extractionData: finalData,
        fieldsForReview: fieldsToReview,
        confidenceScore,
      },
    });

    // Update document status
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'completed' },
    });

    return {
      extractionId: extraction.id,
      fieldsToReview,
      confidenceScore,
    };

  } catch (error) {
    // Log error to database
    await prisma.processingError.create({
      data: {
        documentId,
        errorType: 'processing_failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        stepFailed: 'ai_extraction',
        errorDetails: {
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        },
      },
    });

    // Update document status to failed
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'failed' },
    });

    throw error;
  }
}

function mapDocumentType(dbType: string): DocumentType {
  switch (dbType) {
    case 'passport':
    case 'passport_front':
      return 'passport';
    case 'driving_license':
    case 'driving_license_front':
    case 'driving_license_back':
      return 'driving-license';
    default:
      // Default to passport for unknown types
      return 'passport';
  }
}