# Complete Guide: Adding Cloudflare R2 Storage to Next.js

This guide walks you through integrating Cloudflare R2 (S3-compatible) storage into your Next.js application, with real-world examples from our document parser implementation.

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [R2 Client Configuration](#r2-client-configuration)
3. [Environment Configuration](#environment-configuration)
4. [File Upload Implementation](#file-upload-implementation)
5. [Integration with Frontend Components](#integration-with-frontend-components)
6. [Error Handling & Debugging](#error-handling--debugging)
7. [Best Practices](#best-practices)

---

## Initial Setup

### 1. Install Required Dependencies

```bash
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
pnpm add @aws-sdk/lib-storage  # For multipart uploads
```

### 2. Cloudflare R2 Setup

1. Create a Cloudflare account and navigate to R2 Storage
2. Create a new R2 bucket
3. Generate API tokens with the following permissions:
   - `Object Read & Write` for your bucket
   - Note down your Account ID, Access Key ID, and Secret Access Key

---

## R2 Client Configuration

Create `src/lib/r2-client.ts`:

```typescript
import { S3Client, HeadBucketCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

// Basic R2 client configuration
// 🚨 CRITICAL: Check your bucket region in Cloudflare dashboard URL
// EU region: /r2/eu/buckets/ → use .eu.r2.cloudflarestorage.com
// Auto region: /r2/buckets/ → use .r2.cloudflarestorage.com
const getR2Endpoint = () => {
  const accountId = process.env.R2_ACCOUNT_ID!;
  const isEuRegion = process.env.R2_REGION === 'eu' || process.env.R2_BUCKET_REGION === 'eu';
  return isEuRegion 
    ? `https://${accountId}.eu.r2.cloudflarestorage.com`
    : `https://${accountId}.r2.cloudflarestorage.com`;
};

export const r2Client = new S3Client({
  region: 'auto', // R2 requires 'auto' region
  endpoint: getR2Endpoint(),
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true, // Important for R2 compatibility
});

// Configuration constants
export const R2_CONFIG = {
  bucketName: process.env.R2_BUCKET_NAME!,
  publicUrl: process.env.R2_PUBLIC_URL,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  presignedUrlExpiry: 300, // 5 minutes
};

// Health check function
export async function testR2Connection(): Promise<boolean> {
  try {
    await r2Client.send(new HeadBucketCommand({
      Bucket: R2_CONFIG.bucketName,
    }));
    return true;
  } catch (error) {
    console.error('R2 connection test failed:', error);
    return false;
  }
}

// Error handling utility
export function handleR2Error(error: any): string {
  if (error.name === 'NoSuchBucket') {
    return 'Bucket does not exist. Please check your bucket name.';
  }
  if (error.name === 'InvalidAccessKeyId') {
    return 'Invalid access key. Please check your R2 credentials.';
  }
  if (error.name === 'SignatureDoesNotMatch') {
    return 'Authentication failed. Please check your secret key.';
  }
  if (error.name === 'AccessDenied') {
    return 'Access denied. Please check your API token permissions.';
  }
  return `R2 operation failed: ${error.message || 'Unknown error'}`;
}
```

## Environment Configuration

### Critical: Dual Environment Variables Required

Next.js requires **both** server-side and client-side environment variables:

Create or update your `.env.local`:

```bash
# Cloudflare R2 Configuration - Server-side (API routes, server components)
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://your-custom-domain.com  # Optional: for public access

# Client-side accessible (NEXT_PUBLIC_ prefix required for browser access)
NEXT_PUBLIC_R2_ACCOUNT_ID=your_cloudflare_account_id
NEXT_PUBLIC_R2_BUCKET_NAME=your_bucket_name
NEXT_PUBLIC_R2_PUBLIC_URL=https://your-custom-domain.com
```

**🚨 Common Gotcha**: Missing `NEXT_PUBLIC_` variables cause URLs like `undefined.r2.cloudflarestorage.com/undefined/...` in client-side components.

Update your `.env.example`:

```bash
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://your-custom-domain.com
```

---

## File Upload Implementation

### 1. Presigned URL API Route

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
    // Authentication check (using Clerk in this example)
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
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

### 2. File Upload Hook

Create `src/hooks/useFileUpload.ts`:

```typescript
import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UploadResult {
  success: boolean;
  fileUrl?: string;
  fileKey?: string;
  error?: string;
  documentId?: string;
}

interface UploadState {
  isUploading: boolean;
  progress: UploadProgress | null;
  error: string | null;
  result: UploadResult | null;
}

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
      
      // Get presigned URL
      toast.info('Preparing upload...');
      const presignedResponse = await fetch('/api/upload/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          documentType,
        }),
      });
      
      if (!presignedResponse.ok) {
        const errorData = await presignedResponse.json();
        throw new Error(errorData.error || 'Failed to get upload URL');
      }
      
      const { presignedUrl, fileKey, filePath } = await presignedResponse.json();
      
      // Upload to R2 with progress tracking
      toast.info('Uploading to cloud storage...');
      await uploadToR2(file, presignedUrl, (progress) => {
        setUploadState(prev => ({
          ...prev,
          progress,
        }));
      });
      
      // Generate file URL
      const fileUrl = R2_CONFIG.publicUrl 
        ? `${R2_CONFIG.publicUrl}/${fileKey}`
        : `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_CONFIG.bucketName}/${fileKey}`;
      
      const result: UploadResult = {
        success: true,
        fileUrl,
        fileKey,
        documentId,
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
        error: errorMessage,
      };
    }
  }, []);
  
  return {
    uploadState,
    uploadFile,
  };
}

// Helper function to upload file to R2 using presigned URL
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
    
    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}
```

---

## Integration with Frontend Components

This section demonstrates how to integrate R2 uploads into a real-world application using our **AI Personal Document Parser** as an example. In this application, users can either:
- **Take photos** using their device camera (mobile-first design)
- **Upload images** from their device gallery
- **Process documents** like IDs, receipts, or forms using AI

The uploaded images are stored in Cloudflare R2, then processed by AI to extract structured data. This pattern works for any application that needs to handle user-uploaded images with cloud storage.

### 1. Camera Component Integration

Based on our existing `camera/page.tsx`, here's how R2 upload integrates into the photo capture workflow:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useFileUpload } from '@/hooks/useFileUpload';

export default function CameraPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const { uploadFile, uploadState } = useFileUpload();
  const router = useRouter();

  const handleImageConfirmed = async (image: CapturedImage) => {
    try {
      setIsProcessing(true);
      setProcessingStep('Preparing upload...');
      
      // First, create a document entry in the database
      const documentResponse = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: 'personal-document',
          retentionDays: null, // Keep forever by default
        }),
      });
      
      if (!documentResponse.ok) {
        throw new Error('Failed to create document entry');
      }
      
      const { documentId } = await documentResponse.json();
      
      // Upload the image to R2
      setProcessingStep('Uploading to cloud storage...');
      const uploadResult = await uploadFile(
        image.file,
        'personal-document',
        documentId
      );
      
      if (uploadResult.success) {
        setProcessingStep('Upload completed successfully!');
        
        // Show success message
        toast.success('Document uploaded successfully!', {
          description: `Document ID: ${documentId}. Processing will begin shortly.`
        });
        
        // Trigger background AI processing
        await triggerBackgroundProcessing(documentId);
        
        // Redirect to dashboard
        setTimeout(() => {
          router.push('/dashboard');
          router.refresh();
        }, 1500);
        
      } else {
        throw new Error(uploadResult.error || 'Upload failed');
      }
      
    } catch (error) {
      console.error('Failed to process image:', error);
      toast.error('Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerBackgroundProcessing = async (documentId: string) => {
    try {
      setProcessingStep('Scheduling AI processing...');
      
      // Trigger processing but don't wait for completion
      fetch('/api/documents/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          enableDualVerification: false,
        }),
      }).catch((error) => {
        console.warn('Background processing request failed:', error);
      });
      
      setProcessingStep('Upload completed! Processing in background...');
      
    } catch (error) {
      console.error('Failed to schedule processing:', error);
      toast.error('Failed to schedule processing');
    }
  };

  // ... rest of component
}
```

### 2. Upload Progress Component

Create `src/components/UploadProgress.tsx`:

```typescript
interface UploadProgressProps {
  progress: {
    loaded: number;
    total: number;
    percentage: number;
  };
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
  
  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between text-sm text-gray-600">
        <span className="truncate">{fileName}</span>
        <span>{progress.percentage}%</span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
      
      <div className="flex justify-between text-xs text-gray-500">
        <span>{formatBytes(progress.loaded)} / {formatBytes(progress.total)}</span>
        <span>Uploading...</span>
      </div>
    </div>
  );
}
```

---

## Error Handling & Debugging

### 1. Connection Testing API

Create `src/app/api/test/r2-connection/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { testR2Connection, handleR2Error } from '@/lib/r2-client';

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
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
    const errorMessage = handleR2Error(error);
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
```

### 2. Debug Utility

Create `src/lib/debug/r2-debug.ts`:

```typescript
import { r2Client, R2_CONFIG } from '@/lib/r2-client';
import { ListObjectsV2Command, HeadBucketCommand } from '@aws-sdk/client-s3';

export async function debugR2Setup() {
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
  
  // Test list objects permission
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

---

## Critical Gotchas & Solutions

### 1. "NoSuchBucket" Error (Most Common)

**Problem**: 99% of "NoSuchBucket" errors are due to **region endpoint mismatch**.

**Solution**:
1. Check your R2 dashboard URL:
   - EU region: `https://dash.cloudflare.com/{account_id}/r2/eu/buckets/{bucket_name}`
   - Auto region: `https://dash.cloudflare.com/{account_id}/r2/buckets/{bucket_name}`

2. Update your endpoint accordingly:
```typescript
// ❌ Wrong - missing .eu for EU bucket
endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`

// ✅ Correct - for EU region bucket  
endpoint: `https://${process.env.R2_ACCOUNT_ID}.eu.r2.cloudflarestorage.com`
```

### 2. CORS Nightmare: Dashboard vs API Endpoints

**Problem**: CORS configured in Cloudflare dashboard **doesn't apply to presigned URLs**.

**Why**: 
- Dashboard CORS = Public URLs only
- Presigned URLs = Direct R2 API endpoints (different CORS)
- R2 API endpoints need separate CORS configuration

**Solutions**:

**Option A: Server-side uploads (Recommended)**
```typescript
// Client sends file to your API
const response = await fetch('/api/upload/direct', {
  method: 'POST',
  body: formData
});
// Server uploads to R2, returns public URL
```

**Option B: Programmatic CORS (if client-side uploads needed)**
```bash
# Install Wrangler CLI
npm install -g wrangler

# Configure CORS for R2 API endpoints
wrangler r2 bucket cors put your-bucket --rules '[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
    "AllowedMethods": ["PUT", "POST", "OPTIONS"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]'
```

### 3. Environment Variables Not Updating

**Problem**: Changes to `.env` don't take effect.

**Solution**:
```bash
# Kill all Next.js processes
pkill -f "next dev"

# Start fresh
npm run dev  # or pnpm dev
```

### 4. Images Loading with "undefined" URLs

**Problem**: Missing `NEXT_PUBLIC_` prefixed variables for client components.

**Debugging**:
```typescript
// Add to any client component to debug
console.log('Client env:', process.env.NEXT_PUBLIC_R2_ACCOUNT_ID);
console.log('Server env would be undefined here');
```

### 5. Server-side vs Client-side Upload Trade-offs

**Client-side (Presigned URLs)**:
- ❌ Complex CORS setup that often fails
- ❌ CORS configuration inconsistencies  
- ❌ Security concerns
- ❌ Browser limitations

**Server-side (Recommended)**:
- ✅ No CORS issues
- ✅ Better security
- ✅ Consistent behavior
- ✅ Can add compression, validation
- ✅ Easier error handling

## Best Practices

### 1. File Naming Strategy

```typescript
// Generate organized file paths
function generateFileKey(userId: string, documentType: string, fileName: string): string {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const fileId = nanoid(10);
  const fileExtension = fileName.split('.').pop();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  return `${userId}/${timestamp}/${documentType}/${fileId}_${sanitizedFileName}`;
}
```

### 2. File Size and Type Validation

```typescript
function validateFile(file: File): { isValid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Invalid file type. Please upload JPEG, PNG, or WebP images.',
    };
  }
  
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'File too large. Maximum size is 10MB.',
    };
  }
  
  return { isValid: true };
}
```

### 3. Multipart Upload for Large Files

```typescript
import { Upload } from '@aws-sdk/lib-storage';

export async function uploadLargeFile(file: File, key: string): Promise<string> {
  const upload = new Upload({
    client: r2Client,
    params: {
      Bucket: R2_CONFIG.bucketName,
      Key: key,
      Body: file,
      ContentType: file.type,
    },
    queueSize: 4, // Concurrent parts
    partSize: 1024 * 1024 * 5, // 5MB parts
    leavePartsOnError: false,
  });
  
  const result = await upload.done();
  return result.Location || '';
}
```

### 4. Environment-Specific Configuration

```typescript
// Development vs Production configuration
const isDevelopment = process.env.NODE_ENV === 'development';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
  // Development-specific options
  logger: isDevelopment ? console : undefined,
  maxAttempts: isDevelopment ? 1 : 3,
});

// Environment-specific bucket naming
const bucketSuffix = process.env.NODE_ENV === 'production' ? '' : '-dev';
export const R2_CONFIG = {
  bucketName: `${process.env.R2_BUCKET_NAME}${bucketSuffix}`,
  // ... other config
};
```

## Complete Troubleshooting Reference

### R2 Connection Issues

**"SignatureDoesNotMatch" Error**
- **Cause**: Incorrect secret key (older docs mentioned SHA-256 hashing)
- **Solution**: Use raw secret key - newer AWS SDK handles signing automatically

**"NoSuchBucket" Error (99% region mismatch)**
- **Cause**: Wrong endpoint for bucket region
- **Debug**: Check dashboard URL for `/r2/eu/` (EU) vs `/r2/` (auto)
- **Solution**: Use correct regional endpoint

**"AccessDenied" Error**
- **Cause**: API token lacks permissions
- **Solution**: Ensure token has "Object Read and Write" for the bucket

### CORS Issues (Client-side uploads)

**CORS Error (Status 0)**
- **Cause**: Dashboard CORS ≠ API endpoint CORS
- **Solution**: Use server-side uploads or configure API CORS via Wrangler CLI

**Preflight Request Failure**
- **Cause**: Missing OPTIONS method or headers in CORS config
- **Solution**: Include all required methods and headers in API CORS

### Environment & Configuration

**Images showing "undefined" URLs**
- **Cause**: Missing `NEXT_PUBLIC_` variables for client components
- **Solution**: Add `NEXT_PUBLIC_` prefixed variables to `.env`

**Environment changes not taking effect**
- **Cause**: Next.js caches environment variables
- **Solution**: Kill all processes and restart dev server

### Upload Flow Issues

**Uploads timeout or fail silently**
- **Cause**: Network issues, large files, or server limits
- **Solution**: Implement retry logic and progress tracking

**Files upload but can't be accessed**
- **Cause**: Incorrect public URL construction
- **Solution**: Verify public URL format matches your R2 setup

---

## Testing Your Implementation

1. **Test R2 Connection**: Visit `/api/test/r2-connection`
2. **Debug Setup**: Use the `debugR2Setup()` function
3. **Upload Test**: Try uploading a small image file
4. **Check R2 Dashboard**: Verify files appear in your bucket
5. **Monitor Network Tab**: Check for any failed requests

This guide provides a complete foundation for integrating Cloudflare R2 with Next.js. Customize the implementation based on your specific requirements and use cases.