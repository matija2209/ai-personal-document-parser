import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getActiveTemplates, createTemplate } from '@/lib/services/form-template.service';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = await getActiveTemplates();
    return NextResponse.json({ templates });

  } catch (error) {
    console.error('Failed to fetch form templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
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

    const body = await request.json();
    const { name, description, fields, maxGuests } = body;

    if (!name || !description || !fields || !Array.isArray(fields)) {
      return NextResponse.json(
        { error: 'Missing or invalid required fields' },
        { status: 400 }
      );
    }

    const template = await createTemplate({
      name,
      description,
      fields,
      maxGuests,
    });

    return NextResponse.json({ template });

  } catch (error) {
    console.error('Failed to create form template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}