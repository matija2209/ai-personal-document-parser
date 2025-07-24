'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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

export function DocumentResults({ document, hasErrors }: DocumentResultsProps) {
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {document.documentType.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </h1>
          <p className="text-gray-600 mt-1">
            Processed on {new Date(document.createdAt).toLocaleDateString()}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={handleExport} variant="outline" className="w-full sm:w-auto">
            Export {isGuestForm ? 'CSV' : 'JSON'}
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleting} className="w-full sm:w-auto">
                {isDeleting ? <LoadingSpinner size="sm" /> : 'Delete'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Document</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the document 
                  and all its associated data and files.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Delete Permanently
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Status Card */}
      <DocumentStatus 
        status={document.status}
        hasErrors={hasErrors}
        confidenceScore={extraction?.confidenceScore}
        modelName={extraction?.modelName}
      />

      {/* Guest Form Information */}
      {isGuestForm && (
        <Card>
          <CardHeader>
            <CardTitle>Guest Form Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-700">Template</div>
                <div className="text-sm text-gray-900">
                  {document.formTemplate?.name || 'Unknown Template'}
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-700">Guests Found</div>
                <div className="text-sm text-gray-900">
                  {document.guestExtractions?.length || 0} guest{(document.guestExtractions?.length || 0) !== 1 ? 's' : ''}
                  {document.guestCount && ` (expected ${document.guestCount})`}
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-700">Processing Status</div>
                <div className="flex items-center gap-2">
                  <Badge variant={document.status === 'completed' ? 'default' : 'secondary'}>
                    {document.status}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Images */}
      {document.files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Document Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {document.files.map((file) => (
                <ImagePreview 
                  key={file.id}
                  fileKey={file.fileKey}
                  fileName={file.originalFileName}
                  fileType={file.fileType}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing States for Guest Forms */}
      {isGuestForm && isProcessing && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="text-lg font-medium text-gray-900 mb-2">
              Processing your guest form...
            </div>
            <div className="text-gray-600">
              AI is extracting guest information from your form. This may take a few moments.
            </div>
          </CardContent>
        </Card>
      )}

      {isGuestForm && hasFailed && (
        <Card>
          <CardContent className="text-center py-12">
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Data Table */}
      {(!isGuestForm || (isGuestForm && hasGuestData && !isProcessing && !hasFailed)) && (
        <EditableDataTable 
          document={document}
          onDataUpdate={handleDataUpdate}
        />
      )}

      {/* Empty state for guest forms */}
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