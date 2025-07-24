'use client';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { DocumentWithRelations } from '@/types/document-data';

interface DocumentHeaderProps {
  document: DocumentWithRelations;
  isDeleting: boolean;
  onDelete: () => void;
  onExport: () => void;
}

export function DocumentHeader({ document, isDeleting, onDelete, onExport }: DocumentHeaderProps) {
  const isGuestForm = document.documentType === 'guest-form' || document.documentType === 'guest_form';

  return (
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
        <Button onClick={onExport} variant="outline" className="w-full sm:w-auto">
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
              <AlertDialogAction onClick={onDelete}>
                Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}