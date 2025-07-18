// src/lib/client/ai-processing.ts

export interface ProcessingResult {
  success: boolean;
  extractionId?: string;
  fieldsToReview?: string[];
  confidenceScore?: number;
  error?: string;
}

export async function triggerAIProcessing(
  documentId: string,
  enableDualVerification: boolean = false
): Promise<ProcessingResult> {
  try {
    const response = await fetch('/api/documents/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentId,
        enableDualVerification,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Processing failed');
    }

    const result = await response.json();
    return {
      success: true,
      extractionId: result.extractionId,
      fieldsToReview: result.fieldsForReview,
      confidenceScore: result.confidenceScore,
    };
  } catch (error) {
    console.error('AI processing failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}