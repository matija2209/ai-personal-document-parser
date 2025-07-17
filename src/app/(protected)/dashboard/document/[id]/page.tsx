import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { DocumentResults } from '@/components/document/DocumentResults';

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
        take: 1,
      },
      errors: {
        where: { resolved: false },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  
  if (!document) {
    notFound();
  }
  
  const extraction = document.extractions[0];
  
  return (
    <div className="container mx-auto px-4 py-4 sm:py-8 max-w-4xl">
      <DocumentResults 
        document={document}
        extraction={extraction}
        hasErrors={document.errors.length > 0}
      />
    </div>
  );
}