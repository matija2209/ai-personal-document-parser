'use client';

import { useState, useCallback } from 'react';
import { UploadState, UploadResult, UploadProgress } from '@/types/upload';
import { compressImageFile, validateImageFile } from '@/lib/image-compression';
import { retryWithBackoff, isRetryableError, UploadError } from '@/lib/upload-retry';

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
      
      // Get presigned URL with retry
      const { presignedUrl, fileKey, filePath } = await retryWithBackoff(async () => {
        const presignedResponse = await fetch('/api/upload/presigned-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileType: compressedFile.type,
            fileSize: compressedFile.size,
            documentType,
          }),
        });
        
        if (!presignedResponse.ok) {
          const errorData = await presignedResponse.json();
          const isRetryable = presignedResponse.status >= 500 || presignedResponse.status === 429;
          throw new UploadError(
            errorData.error || 'Failed to get upload URL',
            isRetryable,
            presignedResponse.status
          );
        }
        
        return presignedResponse.json();
      });
      
      // Upload to R2 with progress tracking and retry
      await retryWithBackoff(async () => {
        await uploadToR2(compressedFile, presignedUrl, (progress) => {
          setUploadState(prev => ({
            ...prev,
            progress,
          }));
        });
      });
      
      // Complete upload with retry
      const { fileUrl, compressionRatio } = await retryWithBackoff(async () => {
        const completeResponse = await fetch('/api/upload/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileKey,
            originalFileName: file.name,
            compressedSize,
            originalSize,
            documentType,
            documentId,
          }),
        });
        
        if (!completeResponse.ok) {
          const errorData = await completeResponse.json();
          const isRetryable = completeResponse.status >= 500 || completeResponse.status === 429;
          throw new UploadError(
            errorData.error || 'Failed to complete upload',
            isRetryable,
            completeResponse.status
          );
        }
        
        return completeResponse.json();
      });
      
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
        reject(new Error(`Upload failed with status: ${xhr.status}`));
      }
    });
    
    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });
    
    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'));
    });
    
    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}