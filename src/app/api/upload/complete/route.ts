import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { R2_CONFIG } from '@/lib/r2-client';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
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
    
    // Validate required fields
    if (!fileKey || !originalFileName || !compressedSize || !originalSize || !documentType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Save upload record to database
    const uploadRecord = await prisma.documentFile.create({
      data: {
        fileKey,
        filePath: fileKey,
        originalFileName,
        compressedSize,
        originalSize,
        mimeType: 'image/jpeg',
        documentId: documentId || null,
        userId,
      },
    });
    
    // Construct file URL
    const fileUrl = R2_CONFIG.publicUrl 
      ? `${R2_CONFIG.publicUrl}/${fileKey}`
      : `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_CONFIG.bucketName}/${fileKey}`;
    
    return NextResponse.json({
      success: true,
      uploadId: uploadRecord.id,
      fileUrl,
      fileKey,
      originalSize,
      compressedSize,
      compressionRatio: (originalSize - compressedSize) / originalSize,
    });
    
  } catch (error) {
    console.error('Error completing upload:', error);
    return NextResponse.json(
      { error: 'Failed to complete upload' },
      { status: 500 }
    );
  }
}