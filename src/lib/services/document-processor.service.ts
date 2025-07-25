import { prisma } from '@/lib/prisma';
import { GeminiAdapter } from '@/lib/ai/gemini.adapter';
import { OpenAIAdapter } from '@/lib/ai/openai.adapter';
import { DocumentType, GuestFormExtractionData } from '@/lib/ai/types';
import type { FormTemplate } from '@/lib/ai/types';
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
    // Fetch document with files and template
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: userId,
      },
      include: {
        files: true,
        formTemplate: true,
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

    // Get front and back files
    const frontFile = document.files.find((file: any) => file.fileType === 'front');
    const backFile = document.files.find((file: any) => file.fileType === 'back');
    const primaryFile = frontFile || document.files[0];
    
    // Construct image URL with proper encoding
    const encodedFileKey = encodeURIComponent(primaryFile.fileKey);
    const imageUrl = R2_CONFIG.publicUrl 
      ? `${R2_CONFIG.publicUrl}/${encodedFileKey}`
      : `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_CONFIG.bucketName}/${encodedFileKey}`;

    // Construct back image URL if available
    let backImageUrl: string | undefined;
    if (backFile) {
      const encodedBackFileKey = encodeURIComponent(backFile.fileKey);
      backImageUrl = R2_CONFIG.publicUrl 
        ? `${R2_CONFIG.publicUrl}/${encodedBackFileKey}`
        : `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_CONFIG.bucketName}/${encodedBackFileKey}`;
    }

    console.log(`Processing mode: ${backImageUrl ? 'front+back' : 'single image'}`);

    // Determine document type (map from database to AI types)
    const documentType: DocumentType = mapDocumentType(document.documentType);

    // Initialize AI adapters
    const geminiAdapter = new GeminiAdapter();
    
    // Get template for guest forms
    let template: FormTemplate | undefined = undefined;
    if (documentType === 'guest-form' && document.formTemplate) {
      template = {
        ...document.formTemplate,
        fields: document.formTemplate.fields as string[],
      };
    }
    
    // Process front image with primary model (Gemini)
    let primaryResult = await geminiAdapter.extractDataFromDocument(
      imageUrl, 
      documentType, 
      template, 
      document.guestCount || undefined
    );
    
    // If we have a back image and front processing succeeded, process back image too
    // Note: Guest forms typically don't have back images, but we handle it anyway
    if (backImageUrl && primaryResult.success && documentType !== 'guest-form') {
      console.log('Processing back image...');
      try {
        const backResult = await geminiAdapter.extractDataFromDocument(
          backImageUrl, 
          documentType, 
          template, 
          document.guestCount || undefined
        );
        if (backResult.success && backResult.data) {
          // Merge back image data with front image data
          primaryResult.data = { ...primaryResult.data, ...backResult.data };
          console.log('Successfully merged front and back image data');
        }
      } catch (error) {
        console.warn('Back image processing failed, continuing with front only:', error);
      }
    }
    
    let secondaryResult;
    let finalData = primaryResult.data || {};
    let fieldsToReview: string[] = [];
    
    // Process with secondary model if dual verification is enabled
    if (enableDualVerification && primaryResult.success) {
      try {
        const openaiAdapter = new OpenAIAdapter();
        secondaryResult = await openaiAdapter.extractDataFromDocument(
          imageUrl, 
          documentType, 
          template, 
          document.guestCount || undefined
        );
        
        // Reconcile results (skip reconciliation for guest forms as structure is different)
        if (documentType !== 'guest-form') {
          const reconciliation = reconcileAIResults(primaryResult, secondaryResult);
          finalData = reconciliation.finalData;
          fieldsToReview = reconciliation.fieldsToReview;
        } else {
          // For guest forms, just use primary result
          finalData = primaryResult.data || {};
        }
      } catch (secondaryError) {
        console.warn('Secondary verification failed:', secondaryError);
        // Continue with primary result only
      }
    }

    // Calculate confidence score
    const confidenceScore = calculateConfidenceScore(primaryResult, secondaryResult);

    // Save extraction to database and handle guest extractions
    if (documentType === 'guest-form' && finalData && 'guests' in finalData) {
      const guestData = finalData as GuestFormExtractionData;
      
      // Save main extraction record
      await prisma.extraction.create({
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

      // Save individual guest extractions
      for (let i = 0; i < guestData.guests.length; i++) {
        const guest = guestData.guests[i];
        if (Object.values(guest).some(value => value !== null && value !== '')) {
          await prisma.guestExtraction.create({
            data: {
              documentId,
              guestIndex: i + 1,
              extractedData: guest,
            },
          });
        }
      }
    } else {
      // Regular document extraction
      await prisma.extraction.create({
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
    }

    // Update document status
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'completed' },
    });

    return {
      extractionId: 'completed',
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
    case 'guest-form':
      return 'guest-form';
    default:
      // Default to passport for unknown types
      return 'passport';
  }
}