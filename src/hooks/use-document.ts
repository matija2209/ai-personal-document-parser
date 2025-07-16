'use client';

import { useState, useEffect } from 'react';
import { Document, ApiResponse } from '../lib/types';

export function useDocument(documentId: string) {
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDocument() {
      try {
        setLoading(true);
        const response = await fetch(`/api/documents/${documentId}`);
        const data: ApiResponse<Document> = await response.json();
        
        if (data.success && data.data) {
          setDocument(data.data);
        } else {
          setError(data.error || 'Failed to fetch document');
        }
      } catch (err) {
        setError('Network error occurred');
      } finally {
        setLoading(false);
      }
    }

    if (documentId) {
      fetchDocument();
    }
  }, [documentId]);

  return { document, loading, error };
}

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDocuments() {
      try {
        setLoading(true);
        const response = await fetch('/api/documents');
        const data: ApiResponse<Document[]> = await response.json();
        
        if (data.success && data.data) {
          setDocuments(data.data);
        } else {
          setError(data.error || 'Failed to fetch documents');
        }
      } catch (err) {
        setError('Network error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchDocuments();
  }, []);

  return { documents, loading, error, refetch: () => window.location.reload() };
}