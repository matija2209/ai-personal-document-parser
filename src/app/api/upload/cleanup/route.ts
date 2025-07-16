import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_CONFIG } from '@/lib/r2-client';
import { prisma } from '@/lib/prisma';

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { fileKey } = await request.json();
    
    if (!fileKey) {
      return NextResponse.json(
        { error: 'File key is required' },
        { status: 400 }
      );
    }
    
    // Find the file record in database
    const fileRecord = await prisma.documentFile.findFirst({
      where: {
        fileKey,
        userId,
      },
    });
    
    if (!fileRecord) {
      return NextResponse.json(
        { error: 'File not found or unauthorized' },
        { status: 404 }
      );
    }
    
    // Delete from R2
    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: R2_CONFIG.bucketName,
        Key: fileKey,
      });
      
      await r2Client.send(deleteCommand);
    } catch (r2Error) {
      console.warn('Failed to delete from R2:', r2Error);
    }
    
    // Delete from database
    await prisma.documentFile.delete({
      where: {
        id: fileRecord.id,
      },
    });
    
    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });
    
  } catch (error) {
    console.error('Error cleaning up file:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup file' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { olderThanDays = 30 } = await request.json();
    
    // Find orphaned files (files without associated documents)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    const orphanedFiles = await prisma.documentFile.findMany({
      where: {
        userId,
        documentId: null,
        createdAt: {
          lt: cutoffDate,
        },
      },
    });
    
    let deletedCount = 0;
    let failedCount = 0;
    
    for (const file of orphanedFiles) {
      try {
        // Delete from R2
        const deleteCommand = new DeleteObjectCommand({
          Bucket: R2_CONFIG.bucketName,
          Key: file.fileKey,
        });
        
        await r2Client.send(deleteCommand);
        
        // Delete from database
        await prisma.documentFile.delete({
          where: { id: file.id },
        });
        
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete orphaned file ${file.fileKey}:`, error);
        failedCount++;
      }
    }
    
    return NextResponse.json({
      success: true,
      deletedCount,
      failedCount,
      totalFound: orphanedFiles.length,
    });
    
  } catch (error) {
    console.error('Error cleaning up orphaned files:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup orphaned files' },
      { status: 500 }
    );
  }
}