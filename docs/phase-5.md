# Phase 5: File Upload & Storage - Detailed Implementation Plan

## Overview
Implement secure file upload pipeline from frontend to Cloudflare R2 storage using presigned URLs, with client-side image compression and comprehensive error handling.

## Success Metrics
- Images upload successfully to R2 with progress tracking
- Client-side compression reduces file size while maintaining OCR quality
- Presigned URLs work securely without exposing credentials
- Upload error handling works properly with retry mechanisms
- Orphaned file cleanup runs automatically

---

## Step 1: Install Dependencies & Setup R2 Configuration

### 1.1 Install Required Packages
```bash
pmpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
pmpm add browser-image-compression
pmpm add @types/node
```

### 1.2 Environment Variables Setup
Add to `.env.local`:
```
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://your_custom_domain.com  # Optional: for public access
```

**⚠️ CRITICAL: EU Region Bucket Configuration**
If your R2 bucket is in the **EU region**, you MUST include `.eu.` in the endpoint URL. Check your Cloudflare R2 dashboard URL:
- **EU bucket**: `https://dash.cloudflare.com/{account_id}/r2/eu/buckets/{bucket_name}`
- **S3 API URL**: `https://{account_id}.eu.r2.cloudflarestorage.com/{bucket_name}`

**If you see `.eu.` in your dashboard URL, you MUST update the R2 client endpoint accordingly!**

### 1.3 Create R2 Client Configuration
Create `src/lib/r2-client.ts`:
```typescript
import { S3Client } from '@aws-sdk/client-s3';

export const r2Client = new S3Client({
  region: 'auto',
  // ⚠️ CRITICAL: Check your bucket region!
  // For EU buckets: https://{account_id}.eu.r2.cloudflarestorage.com
  // For auto region: https://{account_id}.r2.cloudflarestorage.com
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.eu.r2.cloudflarestorage.com`, // EU region
  // endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, // Auto region
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

export const R2_CONFIG = {
  bucketName: process.env.R2_BUCKET_NAME!,
  publicUrl: process.env.R2_PUBLIC_URL,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  presignedUrlExpiry: 300, // 5 minutes
};
```

**⚠️ REGION TROUBLESHOOTING:**
- **NoSuchBucket error**: 99% of the time this is due to wrong region endpoint
- **Check your dashboard URL**: Look for `/r2/eu/` or `/r2/` in the path
- **EU region buckets**: Must use `.eu.r2.cloudflarestorage.com` endpoint
- **Auto region buckets**: Use `.r2.cloudflarestorage.com` endpoint

---

## Step 2: Create TypeScript Types & Interfaces

### 2.1 Create Upload Types
Create `src/types/upload.ts`:
```typescript
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
```

### 2.2 Extend Existing Types
Update `src/types/camera.ts` to include upload info:
```typescript
export interface CapturedImage {
  file: File;
  preview: string;
  timestamp: number;
  quality: QualityMetrics;
  uploadState?: UploadState; // Add this
}
```

---

## Step 3: Client-Side Image Compression

### 3.1 Create Compression Utility
Create `src/lib/image-compression.ts`:
```typescript
import imageCompression from 'browser-image-compression';
import { QualityMetrics } from '@/types/camera';

export interface CompressionOptions {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  useWebWorker: boolean;
  preserveExif: boolean;
}

export const DEFAULT_COMPRESSION_OPTIONS: CompressionOptions = {
  maxSizeMB: 2, // 2MB max after compression
  maxWidthOrHeight: 1920, // Max dimension for OCR accuracy
  useWebWorker: true,
  preserveExif: false, // Remove EXIF for privacy
};

export async function compressImage(
  file: File,
  options: CompressionOptions = DEFAULT_COMPRESSION_OPTIONS
): Promise<{
  compressedFile: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}> {
  const originalSize = file.size;
  
  try {
    const compressedFile = await imageCompression(file, options);
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
```

---

## Step 4: API Routes for Presigned URLs

### 4.1 Create Presigned URL Generation API
Create `src/app/api/upload/presigned-url/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, R2_CONFIG } from '@/lib/r2-client';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { fileName, fileType, fileSize, documentType } = await request.json();
    
    // Validate file type
    if (!R2_CONFIG.allowedMimeTypes.includes(fileType)) {
      return NextResponse.json(
        { error: 'Invalid file type' },
        { status: 400 }
      );
    }
    
    // Validate file size
    if (fileSize > R2_CONFIG.maxFileSize) {
      return NextResponse.json(
        { error: 'File too large' },
        { status: 400 }
      );
    }
    
    // Generate unique file key
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const fileId = nanoid(10);
    const fileExtension = fileName.split('.').pop();
    const fileKey = `${userId}/${timestamp}/${documentType}_${fileId}.${fileExtension}`;
    
    // Create presigned URL for PUT operation
    const command = new PutObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: fileKey,
      ContentType: fileType,
      ContentLength: fileSize,
      Metadata: {
        userId,
        originalFileName: fileName,
        documentType,
        uploadedAt: new Date().toISOString(),
      },
    });
    
    const presignedUrl = await getSignedUrl(r2Client, command, {
      expiresIn: R2_CONFIG.presignedUrlExpiry,
    });
    
    return NextResponse.json({
      presignedUrl,
      fileKey,
      filePath: fileKey,
      expiresAt: Date.now() + R2_CONFIG.presignedUrlExpiry * 1000,
    });
    
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}
```

### 4.2 Create Upload Completion API
Create `src/app/api/upload/complete/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { 
      fileKey, 
      originalFileName, 
      compressedSize, 
      originalSize, 
      documentType,
      documentId 
    } = await request.json();
    
    // Save upload record to database
    const uploadRecord = await prisma.documentFile.create({
      data: {
        fileKey,
        filePath: fileKey,
        originalFileName,
        compressedSize,
        originalSize,
        documentType,
        documentId,
        userId,
        uploadedAt: new Date(),
      },
    });
    
    return NextResponse.json({
      success: true,
      uploadId: uploadRecord.id,
      fileUrl: `${process.env.R2_PUBLIC_URL}/${fileKey}`,
    });
    
  } catch (error) {
    console.error('Error completing upload:', error);
    return NextResponse.json(
      { error: 'Failed to complete upload' },
      { status: 500 }
    );
  }
}
```

---

## Step 5: Upload Hook & State Management

### 5.1 Create Upload Hook
Create `src/hooks/useFileUpload.ts`:
```typescript
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { UploadState, UploadResult, PresignedUploadData } from '@/types/upload';
import { compressImage, validateImageFile } from '@/lib/image-compression';

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
      toast.info('Compressing image...');
      const { compressedFile, originalSize, compressedSize } = await compressImage(file);
      
      // Get presigned URL
      toast.info('Preparing upload...');
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
        throw new Error('Failed to get upload URL');
      }
      
      const { presignedUrl, fileKey, filePath } = await presignedResponse.json();
      
      // Upload to R2 with progress tracking
      toast.info('Uploading to cloud...');
      await uploadToR2(compressedFile, presignedUrl, (progress) => {
        setUploadState(prev => ({
          ...prev,
          progress,
        }));
      });
      
      // Complete upload
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
        throw new Error('Failed to complete upload');
      }
      
      const { fileUrl } = await completeResponse.json();
      
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
      
      toast.success('Upload completed successfully!');
      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setUploadState({
        isUploading: false,
        progress: null,
        error: errorMessage,
        result: null,
      });
      
      toast.error(errorMessage);
      
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
    
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = {
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100),
          speed: event.loaded / ((Date.now() - startTime) / 1000),
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
    
    const startTime = Date.now();
    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}
```

---

## Step 6: Upload UI Components

### 6.1 Create Upload Progress Component
Create `src/components/upload/UploadProgress.tsx`:
```typescript
import { Progress } from '@/components/ui/progress';
import { UploadProgress as UploadProgressType } from '@/types/upload';

interface UploadProgressProps {
  progress: UploadProgressType;
  fileName: string;
}

export function UploadProgress({ progress, fileName }: UploadProgressProps) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const formatSpeed = (bytesPerSecond: number) => {
    return `${formatBytes(bytesPerSecond)}/s`;
  };
  
  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between text-sm text-gray-600">
        <span className="truncate">{fileName}</span>
        <span>{progress.percentage}%</span>
      </div>
      
      <Progress value={progress.percentage} className="h-2" />
      
      <div className="flex justify-between text-xs text-gray-500">
        <span>{formatBytes(progress.loaded)} / {formatBytes(progress.total)}</span>
        <span>{formatSpeed(progress.speed)}</span>
      </div>
    </div>
  );
}
```

### 6.2 Create Upload Status Component
Create `src/components/upload/UploadStatus.tsx`:
```typescript
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Upload, Loader2 } from 'lucide-react';
import { UploadState } from '@/types/upload';
import { UploadProgress } from './UploadProgress';

interface UploadStatusProps {
  uploadState: UploadState;
  fileName?: string;
}

export function UploadStatus({ uploadState, fileName }: UploadStatusProps) {
  const { isUploading, progress, error, result } = uploadState;
  
  if (isUploading) {
    return (
      <Alert>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertDescription>
          <div className="space-y-2">
            <div>Uploading image...</div>
            {progress && fileName && (
              <UploadProgress progress={progress} fileName={fileName} />
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  if (result?.success) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Upload completed successfully! 
          {result.compressedSize !== result.originalSize && (
            <span className="text-sm text-green-600 block">
              File compressed from {formatBytes(result.originalSize)} to {formatBytes(result.compressedSize)}
            </span>
          )}
        </AlertDescription>
      </Alert>
    );
  }
  
  return null;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
```

---

## Step 7: Integrate Upload with Camera Component

### 7.1 Update Camera Hook
Update `src/hooks/useCamera.ts` to include upload functionality:
```typescript
// Add this to the existing useCamera hook
import { useFileUpload } from './useFileUpload';

export function useCamera() {
  // ... existing camera logic
  const { uploadFile, uploadState } = useFileUpload();
  
  const uploadCapturedImage = useCallback(async (
    image: CapturedImage,
    documentType: string,
    documentId?: string
  ) => {
    const result = await uploadFile(image.file, documentType, documentId);
    
    // Update the captured image with upload result
    setCapturedImages(prev => prev.map(img => 
      img.timestamp === image.timestamp 
        ? { ...img, uploadState: { ...uploadState, result } }
        : img
    ));
    
    return result;
  }, [uploadFile, uploadState]);
  
  return {
    // ... existing returns
    uploadCapturedImage,
    uploadState,
  };
}
```

---

## Step 8: Error Handling & Retry Logic

### 8.1 Create Retry Utility
Create `src/lib/retry.ts`:
```typescript
export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
};

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = DEFAULT_RETRY_OPTIONS
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt === options.maxAttempts) {
        throw lastError;
      }
      
      const delay = Math.min(
        options.baseDelay * Math.pow(options.backoffFactor, attempt - 1),
        options.maxDelay
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}
```

### 8.2 Update Upload Hook with Retry
Update `src/hooks/useFileUpload.ts`:
```typescript
import { retryWithBackoff } from '@/lib/retry';

// In the uploadFile function, wrap the upload operation:
await retryWithBackoff(
  () => uploadToR2(compressedFile, presignedUrl, (progress) => {
    setUploadState(prev => ({ ...prev, progress }));
  }),
  { maxAttempts: 3, baseDelay: 1000, maxDelay: 5000, backoffFactor: 2 }
);
```

---

## Step 9: Cleanup & Orphaned Files Management

### 9.1 Create Cleanup API
Create `src/app/api/cleanup/orphaned-files/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { r2Client, R2_CONFIG } from '@/lib/r2-client';
import { DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Find orphaned files (uploaded but not saved to documents)
    const orphanedFiles = await prisma.documentFile.findMany({
      where: {
        userId,
        documentId: null,
        uploadedAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        },
      },
    });
    
    const deletedFiles = [];
    
    for (const file of orphanedFiles) {
      try {
        // Delete from R2
        await r2Client.send(new DeleteObjectCommand({
          Bucket: R2_CONFIG.bucketName,
          Key: file.fileKey,
        }));
        
        // Delete from database
        await prisma.documentFile.delete({
          where: { id: file.id },
        });
        
        deletedFiles.push(file.fileKey);
      } catch (error) {
        console.error(`Failed to delete orphaned file ${file.fileKey}:`, error);
      }
    }
    
    return NextResponse.json({
      success: true,
      deletedCount: deletedFiles.length,
      deletedFiles,
    });
    
  } catch (error) {
    console.error('Cleanup failed:', error);
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}
```

### 9.2 Create Cleanup Utility
Create `src/lib/cleanup.ts`:
```typescript
export async function cleanupOrphanedFiles(): Promise<void> {
  try {
    const response = await fetch('/api/cleanup/orphaned-files', {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Cleanup failed');
    }
    
    const result = await response.json();
    console.log(`Cleaned up ${result.deletedCount} orphaned files`);
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

// Auto-cleanup when user leaves the page
export function setupAutoCleanup(): void {
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      cleanupOrphanedFiles();
    });
  }
}
```

---

## Step 10: Database Schema Reference

### 10.1 Schema Integration Note
**⚠️ SCHEMA NOTE**: The DocumentFile model is now defined in Phase 2 (corrected database schema). This section serves as a reference for the upload functionality requirements.

The `DocumentFile` model in the corrected schema (Phase 2) includes:
- Proper relationship with Document and User models
- Correct field naming (camelCase)
- Proper indexing for performance
- Cascade delete behavior

Refer to Phase 2 for the complete, corrected schema definition.

### 10.2 Migration Instructions
**After completing Phase 2 database setup**, the schema will already include the DocumentFile model. No additional migrations needed for this phase.

**Note**: The document retention system added in Step 12 uses the existing schema fields (`retentionDays`, `deletedAt`) already defined in Phase 2.

### 10.3 R2 Setup Verification
**After completing R2 configuration**, use the debug tools from Step 13 to verify your setup:

1. Call `/api/test/r2-connection` to test basic connectivity
2. Use the `debugR2Setup()` function to check all configuration aspects
3. Verify bucket permissions in Cloudflare dashboard
4. Test file upload with a small sample file

---

## Step 11: Testing & Validation

### 11.1 Test Upload Flow
Create manual test cases:
1. Upload valid image files (JPEG, PNG, WebP)
2. Test file size limits (reject >10MB)
3. Test invalid file types (reject PDFs, etc.)
4. Test network failures and retry logic
5. Test upload progress tracking
6. Test cleanup of orphaned files

### 11.2 Create Test Utilities
Create `src/lib/test-utils.ts`:
```typescript
export function createTestFile(
  name: string,
  type: string,
  size: number
): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

export function createTestImage(
  width: number = 1920,
  height: number = 1080
): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, height);
    
    canvas.toBlob((blob) => {
      resolve(new File([blob!], 'test-image.jpg', { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.8);
  });
}
```

---

## Phase 5 Complete Checklist

- [ ] Install required dependencies (@aws-sdk/client-s3, browser-image-compression)
- [ ] Set up R2 client configuration with proper SHA-256 secret key hashing
- [ ] Verify R2 authentication using connection test API
- [ ] Create TypeScript types for upload functionality
- [ ] Implement client-side image compression
- [ ] Create API routes for presigned URLs and upload completion
- [ ] Build upload hook with progress tracking
- [ ] Create upload UI components (progress, status)
- [ ] Integrate upload with camera component
- [ ] Add error handling and retry logic
- [ ] Implement cleanup for orphaned files
- [ ] Update database schema with DocumentFile model
- [ ] Test upload flow end-to-end
- [ ] Verify file compression works correctly
- [ ] Test error scenarios and recovery
- [ ] Confirm cleanup processes work
- [ ] R2 authentication troubleshooting tools are in place

## Move to Next Phase When:
- [ ] File upload pipeline is working end-to-end
- [ ] Images are successfully stored in R2
- [ ] Presigned URLs are generated and working
- [ ] Upload progress is displayed to users
- [ ] Error handling covers all failure scenarios
- [ ] Cleanup of orphaned files is functional
- [ ] Database correctly tracks file uploads
- [ ] All tests pass successfully
- [ ] R2 connection tests pass

## Success Metrics Met:
- [ ] Images upload successfully to R2 with progress tracking
- [ ] File URLs are accessible and working
- [ ] Upload progress is shown to user with real-time updates
- [ ] Error handling works properly with retry mechanisms
- [ ] Client-side compression reduces file size appropriately
- [ ] Orphaned file cleanup runs automatically
- [ ] Database correctly stores file metadata
- [ ] R2 authentication is properly configured and tested
- [ ] Document retention system is implemented and working

---

## Step 12: Document Retention System

### 12.1 Automatic Document Cleanup
**Goal**: Implement automatic cleanup of documents based on user-defined retention periods

**Steps**:
1. **Create Retention Service**: Create `lib/services/retention.service.ts`:
   ```typescript
   import { prisma } from '@/lib/prisma';
   import { r2Client, R2_CONFIG } from '@/lib/r2-client';
   import { DeleteObjectCommand } from '@aws-sdk/client-s3';
   
   export class DocumentRetentionService {
     static async cleanupExpiredDocuments(): Promise<{
       documentsDeleted: number;
       filesDeleted: number;
       errors: string[];
     }> {
       const now = new Date();
       const errors: string[] = [];
       let documentsDeleted = 0;
       let filesDeleted = 0;
       
       try {
         // Find documents that have expired
         const expiredDocuments = await prisma.document.findMany({
           where: {
             retentionDays: { not: null },
             createdAt: {
               lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) // At least 1 day old
             },
             deletedAt: null,
           },
           include: {
             files: true,
           },
         });
         
         for (const document of expiredDocuments) {
           const expiryDate = new Date(
             document.createdAt.getTime() + (document.retentionDays! * 24 * 60 * 60 * 1000)
           );
           
           if (now > expiryDate) {
             try {
               // Delete files from R2
               for (const file of document.files) {
                 try {
                   await r2Client.send(new DeleteObjectCommand({
                     Bucket: R2_CONFIG.bucketName,
                     Key: file.fileKey,
                   }));
                   filesDeleted++;
                 } catch (error) {
                   errors.push(`Failed to delete file ${file.fileKey}: ${error}`);
                 }
               }
               
               // Soft delete document
               await prisma.document.update({
                 where: { id: document.id },
                 data: { deletedAt: now },
               });
               
               documentsDeleted++;
             } catch (error) {
               errors.push(`Failed to delete document ${document.id}: ${error}`);
             }
           }
         }
         
         return { documentsDeleted, filesDeleted, errors };
       } catch (error) {
         throw new Error(`Retention cleanup failed: ${error}`);
       }
     }
   }
   ```

2. **Create Retention API**: Create `app/api/admin/retention/route.ts`:
   ```typescript
   import { NextRequest, NextResponse } from 'next/server';
   import { auth } from '@clerk/nextjs/server';
   import { DocumentRetentionService } from '@/lib/services/retention.service';
   
   export async function POST(request: NextRequest) {
     try {
       const { userId } = auth();
       
       if (!userId) {
         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
       }
       
       const result = await DocumentRetentionService.cleanupExpiredDocuments();
       
       return NextResponse.json({
         success: true,
         documentsDeleted: result.documentsDeleted,
         filesDeleted: result.filesDeleted,
         errors: result.errors,
       });
       
     } catch (error) {
       console.error('Retention cleanup failed:', error);
       return NextResponse.json(
         { error: 'Retention cleanup failed' },
         { status: 500 }
       );
     }
   }
   ```

3. **Create Retention Settings API**: Create `app/api/documents/[id]/retention/route.ts`:
   ```typescript
   import { NextRequest, NextResponse } from 'next/server';
   import { auth } from '@clerk/nextjs/server';
   import { prisma } from '@/lib/prisma';
   import { z } from 'zod';
   
   const RetentionUpdateSchema = z.object({
     retentionDays: z.number().min(1).max(365).nullable(),
   });
   
   export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
     try {
       const { userId } = auth();
       
       if (!userId) {
         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
       }
       
       const body = await request.json();
       const { retentionDays } = RetentionUpdateSchema.parse(body);
       
       // Verify document exists and belongs to user
       const document = await prisma.document.findFirst({
         where: {
           id: params.id,
           userId: userId,
         },
       });
       
       if (!document) {
         return NextResponse.json({ error: 'Document not found' }, { status: 404 });
       }
       
       // Update retention period
       const updatedDocument = await prisma.document.update({
         where: { id: params.id },
         data: { retentionDays },
       });
       
       return NextResponse.json({
         success: true,
         document: {
           id: updatedDocument.id,
           retentionDays: updatedDocument.retentionDays,
         },
       });
       
     } catch (error) {
       console.error('Failed to update retention settings:', error);
       return NextResponse.json(
         { error: 'Failed to update retention settings' },
         { status: 500 }
       );
     }
   }
   ```

### 12.2 Background Job for Automatic Cleanup
**Goal**: Set up automatic cleanup that runs periodically

**Steps**:
1. **Create Cron Job Handler**: Create `app/api/cron/cleanup/route.ts`:
   ```typescript
   import { NextRequest, NextResponse } from 'next/server';
   import { DocumentRetentionService } from '@/lib/services/retention.service';
   
   export async function GET(request: NextRequest) {
     try {
       // Verify this is a cron job (in production, you'd verify the cron secret)
       const authHeader = request.headers.get('authorization');
       if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
       }
       
       // Run cleanup
       const result = await DocumentRetentionService.cleanupExpiredDocuments();
       
       return NextResponse.json({
         success: true,
         documentsDeleted: result.documentsDeleted,
         filesDeleted: result.filesDeleted,
         errors: result.errors,
       });
       
     } catch (error) {
       console.error('Cron cleanup failed:', error);
       return NextResponse.json(
         { error: 'Cron cleanup failed' },
         { status: 500 }
       );
     }
   }
   ```

2. **Add Cron Secret to Environment**: Add to `.env.local` and `.env.example`:
   ```
   CRON_SECRET="your_random_cron_secret_here"
   ```

3. **Set Up Vercel Cron** (if using Vercel): Create `vercel.json`:
   ```json
   {
     "crons": [
       {
         "path": "/api/cron/cleanup",
         "schedule": "0 2 * * *"
       }
     ]
   }
   ```

**Definition of Done**: Document retention system is fully implemented with automatic cleanup, API endpoints, and background job setup.

---

## Step 13: R2 Authentication Troubleshooting & Best Practices

### 13.1 Common R2 Authentication Issues
**Goal**: Address common authentication problems and provide debugging steps

**Common Issues & Solutions**:

1. **"SignatureDoesNotMatch" Error**:
   - **Cause**: Missing SHA-256 hash of secret key
   - **Solution**: Ensure secret key is hashed as implemented in our `r2-client.ts`
   - **Debug**: Check that `hashSecretKey()` function is being called

2. **"InvalidAccessKeyId" Error**:
   - **Cause**: Wrong access key or account ID
   - **Solution**: Verify environment variables match R2 dashboard
   - **Debug**: Double-check R2_ACCOUNT_ID and R2_ACCESS_KEY_ID

3. **"NoSuchBucket" Error**:
   - **Cause**: Bucket doesn't exist, wrong name, or **WRONG REGION ENDPOINT**
   - **Solution**: 
     - ⚠️ **CHECK REGION FIRST**: If bucket is in EU region, use `.eu.r2.cloudflarestorage.com`
     - Verify bucket name and ensure it exists
     - Check dashboard URL for `/r2/eu/` vs `/r2/`
   - **Debug**: Check R2_BUCKET_NAME environment variable and endpoint region

4. **"AccessDenied" Error**:
   - **Cause**: API token doesn't have required permissions
   - **Solution**: Ensure token has "Object Read and Write" permissions
   - **Debug**: Check token permissions in Cloudflare dashboard

### 13.2 R2 Connection Testing
**Goal**: Provide tools to test R2 connection during development

**Steps**:
1. **Create R2 Test API**: Create `app/api/test/r2-connection/route.ts`:
   ```typescript
   import { NextRequest, NextResponse } from 'next/server';
   import { auth } from '@clerk/nextjs/server';
   import { testR2Connection } from '@/lib/r2-client';
   
   export async function GET(request: NextRequest) {
     try {
       const { userId } = auth();
       
       if (!userId) {
         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
       }
       
       // Test R2 connection
       const isConnected = await testR2Connection();
       
       if (isConnected) {
         return NextResponse.json({
           success: true,
           message: 'R2 connection successful',
           timestamp: new Date().toISOString(),
         });
       } else {
         return NextResponse.json({
           success: false,
           error: 'R2 connection failed',
           timestamp: new Date().toISOString(),
         }, { status: 500 });
       }
       
     } catch (error) {
       console.error('R2 connection test failed:', error);
       return NextResponse.json({
         success: false,
         error: 'R2 connection test failed',
         details: error instanceof Error ? error.message : 'Unknown error',
         timestamp: new Date().toISOString(),
       }, { status: 500 });
     }
   }
   ```

2. **Create R2 Debug Utility**: Create `lib/debug/r2-debug.ts`:
   ```typescript
   import { r2Client, R2_CONFIG } from '@/lib/r2-client';
   import { ListObjectsV2Command, HeadBucketCommand } from '@aws-sdk/client-s3';
   
   export async function debugR2Setup(): Promise<{
     success: boolean;
     checks: Array<{ name: string; status: 'pass' | 'fail'; error?: string }>;
   }> {
     const checks = [];
     
     // Check environment variables
     const envVars = {
       R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
       R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
       R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
       R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
     };
     
     for (const [key, value] of Object.entries(envVars)) {
       checks.push({
         name: `Environment variable ${key}`,
         status: value ? 'pass' : 'fail',
         error: value ? undefined : `${key} is not set`,
       });
     }
     
     // Test bucket access
     try {
       await r2Client.send(new HeadBucketCommand({
         Bucket: R2_CONFIG.bucketName,
       }));
       checks.push({
         name: 'Bucket access',
         status: 'pass',
       });
     } catch (error) {
       checks.push({
         name: 'Bucket access',
         status: 'fail',
         error: error instanceof Error ? error.message : 'Unknown error',
       });
     }
     
     // Test list objects (requires read permission)
     try {
       await r2Client.send(new ListObjectsV2Command({
         Bucket: R2_CONFIG.bucketName,
         MaxKeys: 1,
       }));
       checks.push({
         name: 'List objects permission',
         status: 'pass',
       });
     } catch (error) {
       checks.push({
         name: 'List objects permission',
         status: 'fail',
         error: error instanceof Error ? error.message : 'Unknown error',
       });
     }
     
     const success = checks.every(check => check.status === 'pass');
     return { success, checks };
   }
   ```

### 13.3 R2 Performance Optimization
**Goal**: Optimize R2 operations for better performance

**Steps**:
1. **Connection Pooling**: The AWS SDK v3 handles connection pooling automatically
2. **Multipart Upload**: For large files (>5MB), implement multipart upload:
   ```typescript
   import { Upload } from '@aws-sdk/lib-storage';
   
   export async function uploadLargeFile(file: Buffer, key: string): Promise<string> {
     const upload = new Upload({
       client: r2Client,
       params: {
         Bucket: R2_CONFIG.bucketName,
         Key: key,
         Body: file,
         ContentType: 'image/jpeg',
       },
       queueSize: 4, // optional concurrency configuration
       partSize: 1024 * 1024 * 5, // 5MB parts
       leavePartsOnError: false, // optional manually handle failed parts
     });
     
     const result = await upload.done();
     return result.Location || '';
   }
   ```

3. **Error Handling**: Implement comprehensive error handling:
   ```typescript
   export function handleR2Error(error: any): string {
     if (error.name === 'NoSuchBucket') {
       return 'Bucket does not exist. Please check your bucket name.';
     }
     if (error.name === 'InvalidAccessKeyId') {
       return 'Invalid access key. Please check your R2 credentials.';
     }
     if (error.name === 'SignatureDoesNotMatch') {
       return 'Authentication failed. Secret key may not be properly hashed.';
     }
     if (error.name === 'AccessDenied') {
       return 'Access denied. Please check your API token permissions.';
     }
     return `R2 operation failed: ${error.message || 'Unknown error'}`;
   }
   ```

### 13.4 Development vs Production Configuration
**Goal**: Provide different configurations for different environments

**Steps**:
1. **Environment-specific R2 client**: Update `lib/r2-client.ts`:
   ```typescript
   // Add environment-specific configuration
   const isDevelopment = process.env.NODE_ENV === 'development';
   
   export const r2Client = new S3Client({
     region: 'auto',
     endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
     credentials: {
       accessKeyId: process.env.R2_ACCESS_KEY_ID!,
       secretAccessKey: hashSecretKey(process.env.R2_SECRET_ACCESS_KEY!),
     },
     forcePathStyle: true,
     // Add development-specific options
     logger: isDevelopment ? console : undefined,
     maxAttempts: isDevelopment ? 1 : 3,
   });
   ```

2. **Bucket naming strategy**: Use environment-specific bucket names:
   ```typescript
   const bucketSuffix = process.env.NODE_ENV === 'production' ? '' : '-dev';
   export const R2_CONFIG = {
     bucketName: `${process.env.R2_BUCKET_NAME}${bucketSuffix}`,
     // ... other config
   };
   ```

**Definition of Done**: R2 authentication is properly implemented with debugging tools and performance optimizations.