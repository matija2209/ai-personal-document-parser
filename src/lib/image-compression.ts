import imageCompression from 'browser-image-compression';
import { CompressionOptions, CompressionResult } from '@/types/upload';

export const DEFAULT_COMPRESSION_OPTIONS: CompressionOptions = {
  maxSizeMB: 2, // 2MB max after compression
  maxWidthOrHeight: 1920, // Max dimension for OCR accuracy
  useWebWorker: true,
  preserveExif: false, // Remove EXIF for privacy
  quality: 0.8,
};

export async function compressImageFile(
  file: File,
  options: CompressionOptions = DEFAULT_COMPRESSION_OPTIONS
): Promise<CompressionResult> {
  const originalSize = file.size;
  
  try {
    const compressionConfig = {
      maxSizeMB: options.maxSizeMB,
      maxWidthOrHeight: options.maxWidthOrHeight,
      useWebWorker: options.useWebWorker,
      fileType: 'image/jpeg',
      initialQuality: options.quality,
    };
    
    const compressedFile = await imageCompression(file, compressionConfig);
    const compressedSize = compressedFile.size;
    const compressionRatio = (originalSize - compressedSize) / originalSize;
    
    return {
      compressedFile,
      originalSize,
      compressedSize,
      compressionRatio,
    };
  } catch (error) {
    console.error('Image compression failed:', error);
    // Return original file if compression fails
    return {
      compressedFile: file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 0,
    };
  }
}

export function validateImageFile(file: File): {
  isValid: boolean;
  error?: string;
} {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSize = 50 * 1024 * 1024; // 50MB original max
  
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Invalid file type. Please upload JPEG, PNG, or WebP images.',
    };
  }
  
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'File too large. Maximum size is 50MB.',
    };
  }
  
  return { isValid: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function calculateCompressionStats(original: number, compressed: number) {
  const ratio = (original - compressed) / original;
  const percentage = Math.round(ratio * 100);
  
  return {
    ratio,
    percentage,
    savings: original - compressed,
    originalFormatted: formatFileSize(original),
    compressedFormatted: formatFileSize(compressed),
    savingsFormatted: formatFileSize(original - compressed),
  };
}