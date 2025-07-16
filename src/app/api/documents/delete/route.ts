import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_CONFIG } from '@/lib/r2-client';
import { z } from 'zod';

const DeleteDocumentSchema = z.object({
  documentId: z.string(),
});

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { documentId } = DeleteDocumentSchema.parse(body);
    
    // Verify document exists and belongs to user
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: userId,
      },
      include: {
        files: true,
      },
    });
    
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    
    // Delete files from R2 storage
    const deletePromises = document.files.map(async (file) => {
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: R2_CONFIG.bucketName,
          Key: file.fileKey,
        });
        
        await r2Client.send(deleteCommand);
      } catch (error) {
        console.warn(`Failed to delete file ${file.fileKey} from R2:`, error);
      }
    });
    
    await Promise.allSettled(deletePromises);
    
    // Delete document from database (cascade will handle related records)
    await prisma.document.delete({
      where: { id: documentId },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
      deletedFiles: document.files.length,
    });
    
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}