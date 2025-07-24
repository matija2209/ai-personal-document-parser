import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { DocumentResults } from '@/components/document/DocumentResults';
import { DocumentWithRelations } from '@/types/document-data';

interface DocumentPageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  const { id } = await params;
  const { userId } = await auth();
  
  if (!userId) {
    notFound();
  }
  
  const document = await prisma.document.findFirst({
    where: {
      id: id,
      userId: userId,
    },
    include: {
      files: true,
      extractions: {
        orderBy: { createdAt: 'desc' },
      },
      guestExtractions: {
        orderBy: { guestIndex: 'asc' },
      },
      formTemplate: true,
      errors: {
        where: { resolved: false },
        orderBy: { createdAt: 'desc' },
      },
    },
  }) as DocumentWithRelations | null;
  
  if (!document) {
    notFound();
  }
  
  return (
    <div className="container mx-auto px-4 py-4 sm:py-8 max-w-5xl">
      <DocumentResults 
        document={document}
        hasErrors={document.errors.length > 0}
      />
    </div>
  );
}