import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_CONFIG } from '@/lib/r2-client';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('documentType') as string;
    
    if (!file || !documentType) {
      return NextResponse.json(
        { error: 'Missing file or document type' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!R2_CONFIG.allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > R2_CONFIG.maxFileSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${Math.round(R2_CONFIG.maxFileSize / 1024 / 1024)}MB.` },
        { status: 400 }
      );
    }

    // Generate unique file key
    const timestamp = new Date().toISOString().split('T')[0];
    const fileId = nanoid(10);
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileKey = `${userId}/${timestamp}/${documentType}_${fileId}.${fileExtension}`;

    // Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Upload to R2
    const command = new PutObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: fileKey,
      Body: fileBuffer,
      ContentType: file.type,
      ContentLength: file.size,
      Metadata: {
        userId,
        originalFileName: file.name,
        documentType,
        uploadedAt: new Date().toISOString(),
      },
    });

    await r2Client.send(command);

    // Return public URL for accessing the file
    const fileUrl = `${R2_CONFIG.publicUrl}/${fileKey}`;

    return NextResponse.json({
      success: true,
      fileUrl,
      fileKey,
      filePath: fileKey,
      originalFileName: file.name,
      compressedSize: file.size,
      originalSize: file.size,
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file', details: error.message },
      { status: 500 }
    );
  }
}