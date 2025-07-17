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
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { DocumentStatus } from './DocumentStatus';
import { ImagePreview } from './ImagePreview';
import { toast } from 'sonner';

interface DocumentResultsProps {
  document: {
    id: string;
    documentType: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    files: Array<{
      id: string;
      fileKey: string;
      originalFileName: string;
      fileType?: string | null;
    }>;
  };
  extraction?: {
    id: string;
    extractionData: any;
    fieldsForReview: any;
    confidenceScore: number | null;
    modelName: string;
    createdAt: Date;
  };
  hasErrors: boolean;
}

export function DocumentResults({ document, extraction, hasErrors }: DocumentResultsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(extraction?.extractionData || {});
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (!isEditing) {
      setFormData(extraction?.extractionData || {});
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData(extraction?.extractionData || {});
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/documents/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          documentId: document.id,
          extractionData: formData 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save changes');
      }

      setIsEditing(false);
      router.refresh();
      toast.success('Changes saved successfully!');
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save changes. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
      extractedData: formData,
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

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const formatFieldLabel = (field: string) => {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  const isFieldForReview = (field: string) => {
    return Array.isArray(extraction?.fieldsForReview) && 
           extraction.fieldsForReview.includes(field);
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
            Export JSON
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

      {/* Extracted Data */}
      {extraction ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>Extracted Information</CardTitle>
              <CardDescription>
                Data extracted and processed by AI models
              </CardDescription>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              {isEditing ? (
                <>
                  <Button 
                    onClick={handleCancel} 
                    variant="outline" 
                    disabled={isLoading}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSave} 
                    disabled={isLoading}
                    className="w-full sm:w-auto"
                  >
                    {isLoading ? <LoadingSpinner size="sm" /> : 'Save Changes'}
                  </Button>
                </>
              ) : (
                <Button onClick={handleEditToggle} className="w-full sm:w-auto">
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          
          <CardContent>
            {Array.isArray(extraction.fieldsForReview) && extraction.fieldsForReview.length > 0 && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-yellow-600">⚠️</span>
                  <span className="font-medium text-yellow-800">Fields Requiring Review</span>
                </div>
                <p className="text-sm text-yellow-700">
                  The following fields had conflicting values from different AI models. 
                  Please review them carefully: {extraction.fieldsForReview.join(', ')}
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(formData).map(([field, value]) => (
                <div key={field} className="space-y-2">
                  <Label htmlFor={field} className="flex items-center space-x-2">
                    <span>{formatFieldLabel(field)}</span>
                    {isFieldForReview(field) && (
                      <Badge variant="destructive" className="text-xs">
                        Review
                      </Badge>
                    )}
                  </Label>
                  
                  {isEditing ? (
                    <Input
                      id={field}
                      value={value?.toString() || ''}
                      onChange={(e) => handleFieldChange(field, e.target.value)}
                      className={isFieldForReview(field) ? 'border-yellow-400' : ''}
                    />
                  ) : (
                    <div className={`p-3 bg-gray-50 rounded-md min-h-[40px] flex items-center ${
                      isFieldForReview(field) ? 'bg-yellow-50 border border-yellow-200' : ''
                    }`}>
                      {value?.toString() || <span className="text-gray-400">No data</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-600">
              {document.status === 'processing' 
                ? 'Document is still being processed...' 
                : 'No extraction data available'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}