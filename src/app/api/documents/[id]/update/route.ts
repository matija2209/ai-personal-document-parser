import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { DocumentUpdateService } from '@/lib/services/document-update.service';
import { documentUpdateSchema } from '@/lib/validations/document-schemas';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: documentId } = await params;
    const body = await request.json();

    // Add documentId to the request body
    const updateRequest = { ...body, documentId };

    // Validate the request
    try {
      documentUpdateSchema.parse(updateRequest);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json({
          error: 'Validation failed',
          details: validationError.errors,
        }, { status: 400 });
      }
      throw validationError;
    }

    // Verify document exists and belongs to user
    const document = await DocumentUpdateService.getDocumentForEditing(documentId);
    
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (document.userId !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Process the update
    const result = await DocumentUpdateService.updateDocumentData(updateRequest);

    if (!result.success) {
      return NextResponse.json({
        error: 'Update failed',
        details: result.errors,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });

  } catch (error) {
    console.error('Error in document update API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: documentId } = await params;

    // Get document with full data for editing
    const document = await DocumentUpdateService.getDocumentForEditing(documentId);
    
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (document.userId !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: document,
    });

  } catch (error) {
    console.error('Error fetching document for editing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: documentId } = await params;
    const { searchParams } = new URL(request.url);
    const guestIndex = searchParams.get('guestIndex');

    // Verify document exists and belongs to user
    const document = await DocumentUpdateService.getDocumentForEditing(documentId);
    
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (document.userId !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Handle guest deletion
    if (guestIndex) {
      const guestIndexNum = parseInt(guestIndex, 10);
      if (isNaN(guestIndexNum)) {
        return NextResponse.json({ error: 'Invalid guest index' }, { status: 400 });
      }

      const result = await DocumentUpdateService.deleteGuestExtraction(documentId, guestIndexNum);
      
      if (!result.success) {
        return NextResponse.json({
          error: 'Failed to delete guest',
          details: result.errors,
        }, { status: 400 });
      }

      // Reorder remaining guests
      await DocumentUpdateService.reorderGuestExtractions(documentId);

      return NextResponse.json({
        success: true,
        data: result.data,
      });
    }

    return NextResponse.json({ error: 'No operation specified' }, { status: 400 });

  } catch (error) {
    console.error('Error in document delete API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}