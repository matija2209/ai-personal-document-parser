import { z } from 'zod';

export const FileUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  fileSize: z.number().min(1).max(10 * 1024 * 1024), // 10MB
  documentType: z.enum(['driving_license', 'passport', 'id_card']),
});

export const ProcessingRequestSchema = z.object({
  documentId: z.string().min(1),
  frontImageUrl: z.string().url(),
  backImageUrl: z.string().url().optional(),
  modelPreference: z.enum(['gemini', 'openai', 'dual']).default('gemini'),
});

export type FileUploadRequest = z.infer<typeof FileUploadSchema>;
export type ProcessingRequest = z.infer<typeof ProcessingRequestSchema>;