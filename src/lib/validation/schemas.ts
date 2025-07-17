import { z } from 'zod';

// Common validation schemas
export const DocumentTypeSchema = z.enum(['passport', 'driving-license', 'single_document', 'document_with_sides']);

export const FileUploadSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  fileType: z.string().refine(
    (type) => ['image/jpeg', 'image/png', 'image/webp'].includes(type),
    'File must be JPEG, PNG, or WebP'
  ),
  fileSize: z.number().min(1).max(10 * 1024 * 1024, 'File size must be less than 10MB'),
  documentType: DocumentTypeSchema,
});

export const ExtractionDataSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.null()])
);

export const DocumentUpdateSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required'),
  extractionData: ExtractionDataSchema,
});

export const SearchParamsSchema = z.object({
  search: z.string().optional(),
  type: z.string().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

// Form validation schemas
export const DocumentFormSchema = z.object({
  documentType: DocumentTypeSchema,
  retentionDays: z.number().min(1).max(365).optional(),
});

export const ProcessingOptionsSchema = z.object({
  enableDualVerification: z.boolean().default(false),
  skipQualityCheck: z.boolean().default(false),
});

// Validation helpers
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  try {
    FileUploadSchema.parse({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      documentType: 'single_document',
    });
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        isValid: false, 
        error: error.errors.map(e => e.message).join(', ')
      };
    }
    return { isValid: false, error: 'Invalid file' };
  }
}

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 1000); // Limit length
}

export function validateExtractedData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Data must be an object');
    return { isValid: false, errors };
  }
  
  // Check for required fields based on document type
  const requiredFields = {
    passport: ['firstName', 'lastName', 'documentNumber', 'dateOfBirth', 'expiryDate'],
    'driving-license': ['firstName', 'lastName', 'documentNumber', 'dateOfBirth', 'expiryDate'],
  };
  
  // Validate field formats
  for (const [key, value] of Object.entries(data)) {
    if (typeof key !== 'string') {
      errors.push(`Invalid field name: ${key}`);
      continue;
    }
    
    if (value !== null && typeof value !== 'string' && typeof value !== 'number') {
      errors.push(`Invalid value type for field ${key}`);
    }
    
    // Date validation
    if (key.toLowerCase().includes('date') && value && typeof value === 'string') {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(value) && !Date.parse(value)) {
        errors.push(`Invalid date format for ${key}: ${value}`);
      }
    }
  }
  
  return { isValid: errors.length === 0, errors };
}