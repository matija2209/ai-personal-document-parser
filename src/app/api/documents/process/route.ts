import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { processDocument } from '@/lib/services/document-processor.service';
import { z } from 'zod';

const ProcessRequestSchema = z.object({
  documentId: z.string(),
  enableDualVerification: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { documentId, enableDualVerification } = ProcessRequestSchema.parse(body);
    
    console.log('🔄 Processing API called for document:', documentId);
    
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
    
    if (document.status === 'completed') {
      return NextResponse.json({ error: 'Document already processed' }, { status: 400 });
    }
    
    // Start processing
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'processing' },
    });
    
    // Process document
    const result = await processDocument(documentId, userId, enableDualVerification);
    
    return NextResponse.json({
      success: true,
      documentId,
      extractionId: result.extractionId,
      fieldsForReview: result.fieldsToReview,
      confidenceScore: result.confidenceScore,
    });
    
  } catch (error) {
    console.error('Document processing failed:', error);
    
    const body = await request.json().catch(() => ({}));
    const documentId = body.documentId;
    
    // Update document status to failed
    if (documentId) {
      try {
        await prisma.document.update({
          where: { id: documentId },
          data: { status: 'failed' },
        });
      } catch (updateError) {
        console.error('Failed to update document status:', updateError);
      }
    }
    
    return NextResponse.json(
      { error: 'Document processing failed' },
      { status: 500 }
    );
  }
}