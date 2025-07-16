export type DocumentType = 'passport' | 'driving-license';

// This is the clean, structured data we expect after processing
export type ExtractedData = Record<string, string | number | null>;

// This is the standard response format from ANY AI service we use
export type AIProviderResponse = {
  success: boolean;
  data?: ExtractedData;
  provider: string; // e.g., 'gemini', 'openai'
  error?: string;
};

// This is the "contract" or interface our adapters must implement
export interface IAIDocumentProcessor {
  extractDataFromDocument(
    imageUrl: string,
    documentType: DocumentType
  ): Promise<AIProviderResponse>;
}