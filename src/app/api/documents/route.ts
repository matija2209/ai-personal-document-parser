import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentType, retentionDays, formTemplateId, guestCount } = await request.json();

    if (!documentType) {
      return NextResponse.json({ error: 'Document type is required' }, { status: 400 });
    }

    // Validate guest form requirements
    if (documentType === 'guest-form' && !formTemplateId) {
      return NextResponse.json({ error: 'Form template is required for guest forms' }, { status: 400 });
    }

    // Ensure user exists in database
    await prisma.user.upsert({
      where: { clerkId: userId },
      update: {},
      create: {
        clerkId: userId,
        email: '', // Will be updated when we have user info
      },
    });

    const document = await prisma.document.create({
      data: {
        userId,
        documentType,
        retentionDays: retentionDays || null,
        formTemplateId: formTemplateId || null,
        guestCount: guestCount || null,
        status: 'processing',
      },
    });

    return NextResponse.json({ documentId: document.id });
  } catch (error) {
    console.error('Failed to create document:', error);
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
}