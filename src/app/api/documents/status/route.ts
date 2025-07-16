import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const url = new URL(request.url);
    const documentId = url.searchParams.get('id');
    
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }
    
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
        errors: {
          where: { resolved: false },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });
    
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      id: document.id,
      status: document.status,
      documentType: document.documentType,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      latestExtraction: document.extractions[0] || null,
      activeErrors: document.errors,
    });
    
  } catch (error) {
    console.error('Failed to get document status:', error);
    return NextResponse.json(
      { error: 'Failed to get document status' },
      { status: 500 }
    );
  }
}