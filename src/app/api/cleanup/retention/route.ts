import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_CONFIG } from '@/lib/r2-client';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { documentId, retentionDays } = await request.json();
    
    if (documentId) {
      // Update specific document retention
      if (!retentionDays || retentionDays < 1 || retentionDays > 365) {
        return NextResponse.json(
          { error: 'Retention days must be between 1 and 365' },
          { status: 400 }
        );
      }
      
      const document = await prisma.document.findFirst({
        where: {
          id: documentId,
          userId,
        },
      });
      
      if (!document) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }
      
      const updatedDocument = await prisma.document.update({
        where: { id: documentId },
        data: {
          retentionDays,
        },
      });
      
      return NextResponse.json({
        success: true,
        document: updatedDocument,
      });
    } else {
      // Run cleanup for expired documents
      const now = new Date();
      const expiredDocuments = await prisma.document.findMany({
        where: {
          retentionDays: {
            not: null,
          },
          createdAt: {
            lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // Default 30 days
          },
        },
        include: {
          files: true,
        },
      });
      
      let deletedDocuments = 0;
      let deletedFiles = 0;
      let failedDeletions = 0;
      
      for (const document of expiredDocuments) {
        try {
          // Delete files from R2
          const deletePromises = document.files.map(async (file: any) => {
            try {
              const deleteCommand = new DeleteObjectCommand({
                Bucket: R2_CONFIG.bucketName,
                Key: file.fileKey,
              });
              
              await r2Client.send(deleteCommand);
              deletedFiles++;
            } catch (error) {
              console.warn(`Failed to delete file ${file.fileKey}:`, error);
            }
          });
          
          await Promise.allSettled(deletePromises);
          
          // Delete document from database
          await prisma.document.delete({
            where: { id: document.id },
          });
          
          deletedDocuments++;
        } catch (error) {
          console.error(`Failed to delete document ${document.id}:`, error);
          failedDeletions++;
        }
      }
      
      return NextResponse.json({
        success: true,
        deletedDocuments,
        deletedFiles,
        failedDeletions,
        totalExpired: expiredDocuments.length,
      });
    }
    
  } catch (error) {
    console.error('Error in retention cleanup:', error);
    return NextResponse.json(
      { error: 'Failed to process retention request' },
      { status: 500 }
    );
  }
}