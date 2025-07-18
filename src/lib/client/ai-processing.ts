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
    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    const response = await fetch('/api/documents/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentId,
        enableDualVerification,
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

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
    
    // Handle abort error (timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: 'Processing timed out. Please try again.',
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}