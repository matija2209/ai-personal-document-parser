'use client';

import { useState, useCallback } from 'react';
import { UploadState, UploadResult, UploadProgress } from '@/types/upload';
import { compressImageFile, validateImageFile } from '@/lib/image-compression';
import { retryWithBackoff, isRetryableError, isRetryableStatus, UploadError } from '@/lib/upload-retry';

export function useFileUpload() {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: null,
    error: null,
    result: null,
  });
  
  const uploadFile = useCallback(async (
    file: File,
    documentType: string,
    documentId?: string
  ): Promise<UploadResult> => {
    try {
      // Reset state
      setUploadState({
        isUploading: true,
        progress: null,
        error: null,
        result: null,
      });
      
      // Validate file
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }
      
      // Compress image
      const { compressedFile, originalSize, compressedSize } = await compressImageFile(file);
      
      // Upload directly to server with retry
      const uploadResult = await retryWithBackoff(async () => {
        const formData = new FormData();
        formData.append('file', compressedFile);
        formData.append('documentType', documentType);
        if (documentId) formData.append('documentId', documentId);

        const uploadResponse = await fetch('/api/upload/direct', {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          const isRetryable = uploadResponse.status >= 500 || uploadResponse.status === 429;
          throw new UploadError(
            errorData.error || 'Failed to upload file',
            isRetryable,
            uploadResponse.status
          );
        }
        
        return uploadResponse.json();
      });

      const { fileUrl, fileKey, filePath } = uploadResult;
      
      const result: UploadResult = {
        success: true,
        fileUrl,
        fileKey,
        filePath,
        originalFileName: file.name,
        compressedSize,
        originalSize,
      };
      
      setUploadState({
        isUploading: false,
        progress: null,
        error: null,
        result,
      });
      
      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setUploadState({
        isUploading: false,
        progress: null,
        error: errorMessage,
        result: null,
      });
      
      return {
        success: false,
        fileKey: '',
        filePath: '',
        originalFileName: file.name,
        compressedSize: 0,
        originalSize: file.size,
        error: errorMessage,
      };
    }
  }, []);
  
  const resetUpload = useCallback(() => {
    setUploadState({
      isUploading: false,
      progress: null,
      error: null,
      result: null,
    });
  }, []);
  
  return {
    uploadState,
    uploadFile,
    resetUpload,
  };
}

async function uploadToR2(
  file: File,
  presignedUrl: string,
  onProgress: (progress: UploadProgress) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const startTime = Date.now();
    
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const elapsed = Date.now() - startTime;
        const speed = elapsed > 0 ? event.loaded / (elapsed / 1000) : 0;
        
        const progress: UploadProgress = {
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100),
          speed,
        };
        onProgress(progress);
      }
    });
    
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        resolve();
      } else {
        const errorMessage = getUploadErrorMessage(xhr.status, xhr.responseText);
        console.error('Upload failed:', {
          status: xhr.status,
          statusText: xhr.statusText,
          responseText: xhr.responseText,
          presignedUrl: presignedUrl.split('?')[0] // Log URL without query params
        });
        reject(new UploadError(errorMessage, isRetryableStatus(xhr.status), xhr.status));
      }
    });
    
    xhr.addEventListener('error', () => {
      // Check if this is a CORS error (status 0 usually indicates CORS block)
      if (xhr.status === 0) {
        console.error('CORS error detected during upload:', {
          readyState: xhr.readyState,
          status: xhr.status,
          presignedUrl: presignedUrl.split('?')[0]
        });
        reject(new UploadError(
          'Upload blocked by CORS policy. Please check your R2 bucket CORS configuration.',
          false, // Don't retry CORS errors
          0
        ));
      } else {
        console.error('Network error during upload:', {
          status: xhr.status,
          readyState: xhr.readyState
        });
        reject(new UploadError('Network error during upload. Please check your connection.', true, xhr.status));
      }
    });
    
    xhr.addEventListener('abort', () => {
      reject(new UploadError('Upload was cancelled', false, 0));
    });
    
    xhr.addEventListener('timeout', () => {
      reject(new UploadError('Upload timed out. Please try again.', true, 0));
    });
    
    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.timeout = 300000; // 5 minutes timeout
    xhr.send(file);
  });
}

function getUploadErrorMessage(status: number, responseText: string): string {
  switch (status) {
    case 400:
      return 'Invalid file or request. Please check the file format and try again.';
    case 403:
      return 'Access denied. The upload link may have expired.';
    case 404:
      return 'Upload destination not found. Please try again.';
    case 413:
      return 'File too large. Please reduce the file size and try again.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Server error. Please try again in a moment.';
    default:
      // Try to parse error from response
      try {
        const errorData = JSON.parse(responseText);
        return errorData.message || errorData.error || `Upload failed with status ${status}`;
      } catch {
        return `Upload failed with status ${status}. Please try again.`;
      }
  }
}