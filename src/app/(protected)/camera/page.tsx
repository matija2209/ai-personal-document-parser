'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CameraCapture } from '@/components/camera/CameraCapture';
import { DocumentCapture } from '@/components/camera/DocumentCapture';
import { CapturedImage } from '@/types/camera';

export default function CameraPage() {
  const [useDocumentFlow, setUseDocumentFlow] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  const createDocumentEntry = async (documentType: string) => {
    const response = await fetch('/api/documents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentType,
        retentionDays: 90
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create document entry');
    }

    const { documentId } = await response.json();
    return documentId;
  };

  const handleImageConfirmed = async (image: CapturedImage) => {
    try {
      setIsProcessing(true);
      
      const documentId = await createDocumentEntry('single_document');
      
      console.log('Document created with ID:', documentId);
      console.log('Image captured:', image);
      
      if (image.uploadResult?.success) {
        alert(`Image uploaded successfully!\nDocument ID: ${documentId}\nFile URL: ${image.uploadResult.fileUrl}\nCompression: ${image.uploadResult.originalSize} → ${image.uploadResult.compressedSize} bytes`);
      } else {
        alert(`Upload failed: ${image.uploadResult?.error || 'Unknown error'}`);
      }
      
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to process image:', error);
      alert('Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDocumentComplete = async (front: CapturedImage, back?: CapturedImage) => {
    try {
      setIsProcessing(true);
      
      const documentId = await createDocumentEntry('document_with_sides');
      
      console.log('Document created with ID:', documentId);
      console.log('Front image:', front);
      if (back) console.log('Back image:', back);
      
      let message = `Document uploaded!\nDocument ID: ${documentId}\n`;
      
      if (front.uploadResult?.success) {
        message += `Front: ${front.uploadResult.fileUrl}\n`;
      }
      
      if (back?.uploadResult?.success) {
        message += `Back: ${back.uploadResult.fileUrl}\n`;
      }
      
      if (!front.uploadResult?.success || (back && !back.uploadResult?.success)) {
        message += 'Some uploads failed. Check console for details.';
      }
      
      alert(message);
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to process document:', error);
      alert('Failed to process document. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isProcessing) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="max-w-md mx-auto">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-medium text-gray-900 mb-2">
            Processing your document...
          </h2>
          <p className="text-gray-600">
            Creating database entry and preparing for upload.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto mb-6">
        <div className="flex space-x-2">
          <button
            onClick={() => setUseDocumentFlow(false)}
            className={`flex-1 py-2 px-4 rounded-lg font-medium ${
              !useDocumentFlow 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Single Photo
          </button>
          <button
            onClick={() => setUseDocumentFlow(true)}
            className={`flex-1 py-2 px-4 rounded-lg font-medium ${
              useDocumentFlow 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Front & Back
          </button>
        </div>
      </div>

      {useDocumentFlow ? (
        <DocumentCapture 
          onDocumentComplete={handleDocumentComplete}
          documentType="document"
        />
      ) : (
        <CameraCapture 
          onImageConfirmed={handleImageConfirmed}
          documentType="document"
        />
      )}
    </div>
  );
}