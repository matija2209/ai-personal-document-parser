import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const UpdateExtractionSchema = z.object({
  documentId: z.string(),
  extractionData: z.record(z.any()),
});

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { documentId, extractionData } = UpdateExtractionSchema.parse(body);
    
    // Verify document exists and belongs to user
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: userId,
      },
      include: {
        extractions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    
    const latestExtraction = document.extractions[0];
    
    if (!latestExtraction) {
      return NextResponse.json({ error: 'No extraction data found' }, { status: 404 });
    }
    
    // Update the extraction with manual corrections
    const updatedExtraction = await prisma.extraction.update({
      where: { id: latestExtraction.id },
      data: {
        extractionData,
        isManuallyCorrected: true,
        updatedAt: new Date(),
      },
    });
    
    return NextResponse.json({
      success: true,
      extraction: updatedExtraction,
    });
    
  } catch (error) {
    console.error('Error updating extraction data:', error);
    return NextResponse.json(
      { error: 'Failed to update extraction data' },
      { status: 500 }
    );
  }
}