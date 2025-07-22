import { prisma } from '@/lib/prisma';
import { FormTemplate } from '@/lib/ai/types';

export async function getActiveTemplates(): Promise<FormTemplate[]> {
  const templates = await prisma.formTemplate.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  return templates.map(template => ({
    ...template,
    fields: template.fields as string[],
  }));
}

export async function getTemplateById(id: string): Promise<FormTemplate | null> {
  const template = await prisma.formTemplate.findUnique({
    where: { id },
  });

  if (!template) return null;

  return {
    ...template,
    fields: template.fields as string[],
  };
}

export async function createTemplate(data: {
  name: string;
  description: string;
  fields: string[];
  maxGuests?: number;
}): Promise<FormTemplate> {
  const template = await prisma.formTemplate.create({
    data: {
      name: data.name,
      description: data.description,
      fields: data.fields,
      maxGuests: data.maxGuests || 5,
    },
  });

  return {
    ...template,
    fields: template.fields as string[],
  };
}

export async function updateTemplate(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    fields: string[];
    maxGuests: number;
    isActive: boolean;
  }>
): Promise<FormTemplate> {
  const template = await prisma.formTemplate.update({
    where: { id },
    data,
  });

  return {
    ...template,
    fields: template.fields as string[],
  };
}

export async function deleteTemplate(id: string): Promise<void> {
  await prisma.formTemplate.update({
    where: { id },
    data: { isActive: false },
  });
}

export async function createDefaultTemplates(): Promise<void> {
  const existingTemplates = await prisma.formTemplate.count();
  
  if (existingTemplates > 0) {
    console.log('Default templates already exist, skipping creation');
    return;
  }

  const defaultTemplates = [
    {
      name: 'Basic Guest Registration',
      description: '5-guest table with: first name, last name, birth date, country, document type, document ID',
      fields: ['firstName', 'lastName', 'birthDate', 'country', 'documentType', 'documentId'],
      maxGuests: 5,
    },
    {
      name: 'Hotel Check-in Form',
      description: '5-guest table with: first name, last name, document ID, country, room assignment',
      fields: ['firstName', 'lastName', 'documentId', 'country', 'roomNumber'],
      maxGuests: 5,
    },
    {
      name: 'Event Registration',
      description: '3-guest table with: full name, email, phone number',
      fields: ['fullName', 'email', 'phoneNumber'],
      maxGuests: 3,
    },
  ];

  for (const template of defaultTemplates) {
    await prisma.formTemplate.create({
      data: template,
    });
  }

  console.log('Default form templates created successfully');
}