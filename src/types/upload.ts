export interface UploadConfig {
  maxFileSize: number;
  allowedMimeTypes: string[];
  compressionOptions: {
    maxSizeMB: number;
    maxWidthOrHeight: number;
    useWebWorker: boolean;
  };
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed: number; // bytes per second
}

export interface UploadResult {
  success: boolean;
  fileUrl?: string;
  fileKey: string;
  filePath: string;
  originalFileName: string;
  compressedSize: number;
  originalSize: number;
  error?: string;
}

export interface PresignedUploadData {
  url: string;
  fields: Record<string, string>;
  fileKey: string;
  expiresAt: number;
}

export interface UploadState {
  isUploading: boolean;
  progress: UploadProgress | null;
  error: string | null;
  result: UploadResult | null;
}

export interface CompressionOptions {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  useWebWorker: boolean;
  preserveExif: boolean;
  quality: number;
}

export interface CompressionResult {
  compressedFile: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}