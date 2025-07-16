import { z } from 'zod';

export const DocumentCreateSchema = z.object({
  documentType: z.enum(['driving_license', 'passport', 'id_card']),
  retentionDays: z.number().min(1).max(365).nullable().optional(),
});

export const DocumentUpdateSchema = z.object({
  retentionDays: z.number().min(1).max(365).nullable().optional(),
});

export const DocumentDeleteSchema = z.object({
  id: z.string().min(1),
});

export type DocumentCreateRequest = z.infer<typeof DocumentCreateSchema>;
export type DocumentUpdateRequest = z.infer<typeof DocumentUpdateSchema>;
export type DocumentDeleteRequest = z.infer<typeof DocumentDeleteSchema>;