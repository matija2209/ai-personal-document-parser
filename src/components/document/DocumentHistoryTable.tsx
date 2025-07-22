'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { toast } from 'sonner';

interface Document {
  id: string;
  documentType: string;
  status: string;
  createdAt: string | Date;
  formTemplate?: {
    name: string;
  } | null;
  guestCount?: number | null;
  extractions: Array<{
    confidenceScore: number | null;
  }>;
}

interface DocumentHistoryTableProps {
  initialDocuments: Document[];
}

export function DocumentHistoryTable({ initialDocuments }: DocumentHistoryTableProps) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize state from URL params
  useEffect(() => {
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || 'all';
    setSearchTerm(search);
    setSelectedType(type);
  }, [searchParams]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      updateURL();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, selectedType]);

  const updateURL = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (selectedType !== 'all') params.set('type', selectedType);
    
    const query = params.toString();
    const newPath = query ? `/dashboard?${query}` : '/dashboard';
    
    router.push(newPath, { scroll: false });
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = searchTerm === '' || 
      doc.documentType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = selectedType === 'all' || doc.documentType === selectedType;
    
    return matchesSearch && matchesType;
  });

  const handleDelete = async (documentId: string) => {
    setDeletingId(documentId);
    try {
      const response = await fetch('/api/documents/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentId }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      // Remove from local state
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      toast.success('Document deleted successfully');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDocumentType = (type: string, formTemplate?: { name: string } | null, guestCount?: number | null) => {
    if (type === 'guest-form' && formTemplate) {
      let displayName = formTemplate.name;
      if (guestCount) {
        displayName += ` (${guestCount} guests)`;
      }
      return displayName;
    }
    return type.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getUniqueDocumentTypes = () => {
    const types = new Set(documents.map(doc => doc.documentType));
    return Array.from(types);
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        
        <div className="w-full sm:w-48">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {getUniqueDocumentTypes().map(type => (
                <SelectItem key={type} value={type}>
                  {formatDocumentType(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        Showing {filteredDocuments.length} of {documents.length} documents
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document Type</TableHead>
              <TableHead>Date Processed</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDocuments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  {searchTerm || selectedType !== 'all' 
                    ? 'No documents found matching your criteria'
                    : 'No documents yet. Start by scanning your first document!'
                  }
                </TableCell>
              </TableRow>
            ) : (
              filteredDocuments.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">
                    {formatDocumentType(doc.documentType, doc.formTemplate, doc.guestCount)}
                  </TableCell>
                  <TableCell>
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(doc.status)}
                  </TableCell>
                  <TableCell>
                    {doc.extractions[0]?.confidenceScore !== null && doc.extractions[0]?.confidenceScore !== undefined
                      ? `${Math.round(doc.extractions[0].confidenceScore * 100)}%`
                      : '—'
                    }
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={doc.documentType === 'guest-form' ? `/dashboard/document/${doc.id}/guests` : `/dashboard/document/${doc.id}`}>
                          View
                        </Link>
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            disabled={deletingId === doc.id}
                          >
                            {deletingId === doc.id ? <LoadingSpinner size="sm" /> : 'Delete'}
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
                            <AlertDialogAction onClick={() => handleDelete(doc.id)}>
                              Delete Permanently
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}