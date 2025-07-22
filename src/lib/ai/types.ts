export type DocumentType = 'passport' | 'driving-license' | 'guest-form';

// This is the clean, structured data we expect after processing
export type ExtractedData = Record<string, string | number | null>;

// Guest-specific data structure
export type GuestData = {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  country?: string;
  documentType?: string;
  documentId?: string;
};

// Guest form extraction result
export type GuestFormExtractionData = {
  guests: GuestData[];
  detectedGuestCount: number;
};

// Form template structure
export type FormTemplate = {
  id: string;
  name: string;
  description: string;
  fields: string[];
  maxGuests: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// This is the standard response format from ANY AI service we use
export type AIProviderResponse = {
  success: boolean;
  data?: ExtractedData | GuestFormExtractionData;
  provider: string; // e.g., 'gemini', 'openai'
  error?: string;
};

// This is the "contract" or interface our adapters must implement
export interface IAIDocumentProcessor {
  extractDataFromDocument(
    imageUrl: string,
    documentType: DocumentType,
    template?: FormTemplate,
    guestCount?: number
  ): Promise<AIProviderResponse>;
}