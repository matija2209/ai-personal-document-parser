import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GuestTable } from '@/components/results/GuestTable';
import { GuestData } from '@/lib/ai/types';
import { DocumentImageDisplay } from '@/components/results/DocumentImageDisplay';

interface PageProps {
  params: { id: string };
}

export default async function GuestFormResultsPage({ params }: PageProps) {
  const { userId } = await auth();

  if (!userId) {
    return notFound();
  }

  // Fetch document with guest extractions and template
  const document = await prisma.document.findFirst({
    where: {
      id: params.id,
      userId: userId,
      documentType: 'guest-form',
    },
    include: {
      formTemplate: true,
      guestExtractions: {
        orderBy: {
          guestIndex: 'asc',
        },
      },
      extractions: {
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
      },
    },
  });

  if (!document) {
    return notFound();
  }

  // Convert guest extractions to GuestData format
  const guests: GuestData[] = document.guestExtractions.map(extraction => 
    extraction.extractedData as GuestData
  );

  const isProcessing = document.status === 'processing';
  const hasFailed = document.status === 'failed';
  const hasResults = guests.length > 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard" className="flex items-center">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          
          <div className="border-l pl-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Guest Form Results
            </h1>
            <p className="text-sm text-gray-600">
              Document ID: {document.id}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant={document.status === 'completed' ? 'default' : 'secondary'}>
            {document.status}
          </Badge>
          
          {hasResults && (
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Document Image */}
      <DocumentImageDisplay document={document} />

      {/* Document Info */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm font-medium text-gray-700">Template</div>
            <div className="text-sm text-gray-900">
              {document.formTemplate?.name || 'Unknown Template'}
            </div>
          </div>
          
          <div>
            <div className="text-sm font-medium text-gray-700">Date Processed</div>
            <div className="text-sm text-gray-900">
              {new Date(document.createdAt).toLocaleDateString()}
            </div>
          </div>
          
          <div>
            <div className="text-sm font-medium text-gray-700">Guests Found</div>
            <div className="text-sm text-gray-900">
              {guests.length} guest{guests.length !== 1 ? 's' : ''}
              {document.guestCount && ` (expected ${document.guestCount})`}
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {isProcessing && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg font-medium text-gray-900 mb-2">
            Processing your guest form...
          </div>
          <div className="text-gray-600">
            AI is extracting guest information from your form. This may take a few moments.
          </div>
        </div>
      )}

      {hasFailed && (
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="text-red-600 mb-2">
              <FileText className="h-12 w-12 mx-auto mb-4" />
            </div>
            <div className="text-lg font-medium text-red-900 mb-2">
              Processing Failed
            </div>
            <div className="text-red-700">
              We encountered an error while processing your guest form. Please try uploading it again.
            </div>
            <div className="mt-4">
              <Button asChild variant="outline">
                <Link href="/camera">
                  Try Again
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {hasResults && (
        <GuestTable 
          guests={guests}
          template={document.formTemplate ? {
            name: document.formTemplate.name,
            fields: document.formTemplate.fields as string[],
          } : undefined}
        />
      )}

      {!isProcessing && !hasFailed && !hasResults && (
        <div className="text-center py-12">
          <div className="text-gray-500">
            No guest data extracted from this form yet.
          </div>
        </div>
      )}

      {/* Additional Info */}
      {document.extractions[0]?.confidenceScore && (
        <div className="mt-6 text-center">
          <div className="text-sm text-gray-600">
            Extraction Confidence: {Math.round(document.extractions[0].confidenceScore * 100)}%
          </div>
        </div>
      )}
    </div>
  );
}