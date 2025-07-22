import { AIProviderResponse, ExtractedData, GuestFormExtractionData } from '@/lib/ai/types';

// Type guard to check if data is ExtractedData vs GuestFormExtractionData
function isExtractedData(data: ExtractedData | GuestFormExtractionData): data is ExtractedData {
  return !('guests' in data);
}

export interface ReconciliationResult {
  finalData: ExtractedData;
  fieldsToReview: string[];
}

export function reconcileAIResults(
  primaryResult: AIProviderResponse,
  secondaryResult: AIProviderResponse
): ReconciliationResult {
  const fieldsToReview: string[] = [];
  const finalData: ExtractedData = {};
  
  // Use primary result as the base
  if (primaryResult.success && primaryResult.data) {
    Object.assign(finalData, primaryResult.data);
  }
  
  // Compare with secondary result if both succeeded
  if (primaryResult.success && secondaryResult.success && 
      primaryResult.data && secondaryResult.data) {
    
    // Get all unique keys from both results
    const allKeys = new Set([
      ...Object.keys(primaryResult.data),
      ...Object.keys(secondaryResult.data)
    ]);
    
    for (const key of allKeys) {
      // Type guard to ensure we're working with ExtractedData (not GuestFormExtractionData)
      if (!isExtractedData(primaryResult.data) || !isExtractedData(secondaryResult.data)) {
        continue; // Skip comparison for guest forms
      }
      
      const primaryValue = primaryResult.data[key];
      const secondaryValue = secondaryResult.data[key];
      
      // Mark for review if values differ
      if (primaryValue !== secondaryValue) {
        fieldsToReview.push(key);
      }
      
      // If primary doesn't have the field but secondary does, add it
      if (primaryValue === undefined && secondaryValue !== undefined) {
        finalData[key] = secondaryValue;
        fieldsToReview.push(key);
      }
    }
  }
  
  return { finalData, fieldsToReview };
}

export function calculateConfidenceScore(
  primaryResult: AIProviderResponse,
  secondaryResult?: AIProviderResponse
): number {
  // Base confidence
  let confidence = 0.7;
  
  // Increase confidence if primary succeeded
  if (primaryResult.success) {
    confidence = 0.8;
  }
  
  // If we have dual verification
  if (secondaryResult) {
    if (secondaryResult.success) {
      // Both succeeded - calculate based on agreement
      const { fieldsToReview } = reconcileAIResults(primaryResult, secondaryResult);
      const totalFields = primaryResult.data ? Object.keys(primaryResult.data).length : 0;
      
      if (totalFields > 0) {
        const agreementRatio = (totalFields - fieldsToReview.length) / totalFields;
        confidence = 0.6 + (agreementRatio * 0.4); // 0.6 to 1.0 based on agreement
      }
    } else {
      // Only primary succeeded
      confidence = 0.7;
    }
  }
  
  return Math.round(confidence * 100) / 100; // Round to 2 decimal places
}