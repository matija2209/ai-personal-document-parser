export type DocumentType = 'driving_license' | 'passport' | 'id_card';

export type DocumentStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  id: string;
  userId: string;
  type: DocumentType;
  status: DocumentStatus;
  frontImageUrl?: string;
  backImageUrl?: string;
  retentionDays?: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export interface Extraction {
  id: string;
  documentId: string;
  extractedData: Record<string, any>;
  confidence: number;
  modelUsed: string;
  isManuallyCorrected: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessingError {
  id: string;
  documentId: string;
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  createdAt: Date;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  success: boolean;
}

export interface UploadRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
  documentType: DocumentType;
}

export interface UploadResponse {
  uploadUrl: string;
  fileUrl: string;
  fileKey: string;
}