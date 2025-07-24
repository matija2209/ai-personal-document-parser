'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';

import { DocumentHeader } from './document-details/document-header';
import { GuestFormInformation } from './document-details/guest-form-information';
import { DocumentImages } from './document-details/document-images';
import { GuestFormProcessingStatus } from './document-details/guest-form-processing-status';

import { LoadingSpinner } from '@/components/LoadingSpinner';
import { DocumentStatus } from './DocumentStatus';
import { ImagePreview } from './ImagePreview';
import { EditableDataTable } from './EditableDataTable';
import { DocumentWithRelations } from '@/types/document-data';
import { Download, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface DocumentResultsProps {
  document: DocumentWithRelations;
  hasErrors: boolean;
}

export function DocumentPageWrapper({ document, hasErrors }: DocumentResultsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  
  // Get the latest extraction for compatibility
  const extraction = document.extractions?.[0];
  
  // Check if this is a guest form
  const isGuestForm = document.documentType === 'guest-form' || document.documentType === 'guest_form';
  const hasGuestData = document.guestExtractions && document.guestExtractions.length > 0;
  const isProcessing = document.status === 'processing';
  const hasFailed = document.status === 'failed';

  const handleDataUpdate = (updatedData: any) => {
    // Refresh the page to show updated data
    router.refresh();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch('/api/documents/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentId: document.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      router.push('/dashboard');
      router.refresh();
      toast.success('Document deleted successfully');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = () => {
    const dataToExport = {
      documentId: document.id,
      documentType: document.documentType,
      processedAt: extraction?.createdAt,
      confidenceScore: extraction?.confidenceScore,
      extractedData: extraction?.extractionData,
      guestData: document.guestExtractions?.map(ge => ({
        guestIndex: ge.guestIndex,
        data: ge.extractedData,
      })),
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json',
    });
    
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `document-${document.id}-data.json`;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Data exported successfully!');
  };


  return (
    <div className="space-y-6">
      <DocumentHeader
        document={document}
        isDeleting={isDeleting}
        onDelete={handleDelete}
        onExport={handleExport}
      />

      <DocumentStatus
        status={document.status}
        hasErrors={hasErrors}
        confidenceScore={extraction?.confidenceScore}
        modelName={extraction?.modelName}
      />

      {isGuestForm && <GuestFormInformation document={document} />}

      {document.files.length > 0 && <DocumentImages document={document} />}

      <GuestFormProcessingStatus isProcessing={isProcessing} hasFailed={hasFailed} />

      {(!isGuestForm || (isGuestForm && hasGuestData && !isProcessing && !hasFailed)) && (
        <EditableDataTable
          document={document}
          onDataUpdate={handleDataUpdate}
        />
      )}

      {isGuestForm && !hasGuestData && !isProcessing && !hasFailed && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-gray-500">
              No guest data extracted from this form yet.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}