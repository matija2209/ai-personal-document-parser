import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, R2_CONFIG } from '@/lib/r2-client';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { fileName, fileType, fileSize, documentType } = await request.json();
    
    // Validate required fields
    if (!fileName || !fileType || !fileSize || !documentType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate file type
    if (!R2_CONFIG.allowedMimeTypes.includes(fileType)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
        { status: 400 }
      );
    }
    
    // Validate file size
    if (fileSize > R2_CONFIG.maxFileSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${Math.round(R2_CONFIG.maxFileSize / 1024 / 1024)}MB.` },
        { status: 400 }
      );
    }
    
    // Generate unique file key
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const fileId = nanoid(10);
    const fileExtension = fileName.split('.').pop() || 'jpg';
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