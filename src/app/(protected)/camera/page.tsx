'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CameraCapture } from '@/components/camera/CameraCapture';
import { DocumentCapture } from '@/components/camera/DocumentCapture';
import { CapturedImage } from '@/types/camera';
import { triggerAIProcessing } from '@/lib/client/ai-processing';

export default function CameraPage() {
  const [useDocumentFlow, setUseDocumentFlow] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [processingError, setProcessingError] = useState<string | null>(null);
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

  const handleAIProcessing = async (documentId: string, uploadResult: any) => {
    try {
      setProcessingStep('Starting AI processing...');
      
      const result = await triggerAIProcessing(documentId, false); // Single verification for now
      
      if (result.success) {
        setProcessingStep('AI processing completed successfully!');
        
        // Show success message with extraction info
        const successMessage = `Document processed successfully!\n` +
          `Document ID: ${documentId}\n` +
          `Extraction ID: ${result.extractionId}\n` +
          `Confidence Score: ${result.confidenceScore?.toFixed(2) || 'N/A'}`;
        
        let finalMessage = successMessage;
        if (result.fieldsToReview && result.fieldsToReview.length > 0) {
          finalMessage += `\nFields for review: ${result.fieldsToReview.join(', ')}`;
        }
        
        alert(finalMessage);
        
        // Redirect to dashboard after success
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } else {
        throw new Error(result.error || 'AI processing failed');
      }
    } catch (error) {
      console.error('AI processing error:', error);
      setProcessingError(error instanceof Error ? error.message : 'Unknown error');
      setProcessingStep('AI processing failed');
      
      // Show error but don't prevent navigation
      alert(`AI processing failed: ${error instanceof Error ? error.message : 'Unknown error'}\nYou can retry processing from the dashboard.`);
    }
  };

  const handleImageConfirmed = async (image: CapturedImage) => {
    try {
      setIsProcessing(true);
      setProcessingError(null);
      
      console.log('Image captured:', image);
      
      if (image.uploadResult?.success) {
        setProcessingStep('Upload completed successfully!');
        
        // Show upload success
        const uploadMessage = `Image uploaded successfully!\n` +
          `File URL: ${image.uploadResult.fileUrl}\n` +
          `Compression: ${image.uploadResult.originalSize} → ${image.uploadResult.compressedSize} bytes`;
        
        console.log(uploadMessage);
        
        // Get documentId from the upload result if it was associated
        const documentId = image.uploadResult.documentId;
        if (documentId) {
          // Trigger AI processing
          await handleAIProcessing(documentId, image.uploadResult);
        } else {
          throw new Error('No document ID found in upload result');
        }
        
      } else {
        throw new Error(image.uploadResult?.error || 'Upload failed');
      }
      
    } catch (error) {
      console.error('Failed to process image:', error);
      setProcessingError(error instanceof Error ? error.message : 'Unknown error');
      alert('Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDocumentComplete = async (front: CapturedImage, back?: CapturedImage) => {
    try {
      setIsProcessing(true);
      setProcessingError(null);
      
      console.log('Front image:', front);
      if (back) console.log('Back image:', back);
      
      let message = `Document uploaded!\n`;
      let processingReady = false;
      
      const documentId = front.uploadResult?.documentId || back?.uploadResult?.documentId;
      if (documentId) {
        message += `Document ID: ${documentId}\n`;
      }
      
      if (front.uploadResult?.success) {
        message += `Front: ${front.uploadResult.fileUrl}\n`;
        processingReady = true;
      }
      
      if (back?.uploadResult?.success) {
        message += `Back: ${back.uploadResult.fileUrl}\n`;
      }
      
      if (!front.uploadResult?.success || (back && !back.uploadResult?.success)) {
        message += 'Some uploads failed. Check console for details.';
        processingReady = false;
      }
      
      setProcessingStep('Upload completed successfully!');
      console.log(message);
      
      // Trigger AI processing if at least front image uploaded successfully
      if (processingReady && documentId) {
        await handleAIProcessing(documentId, front.uploadResult);
      } else {
        throw new Error('Upload failed - cannot process document');
      }
      
    } catch (error) {
      console.error('Failed to process document:', error);
      setProcessingError(error instanceof Error ? error.message : 'Unknown error');
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
          <p className="text-gray-600 mb-4">
            {processingStep || 'Preparing document for processing...'}
          </p>
          
          {processingError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <p className="text-red-800 text-sm">
                Error: {processingError}
              </p>
            </div>
          )}
          
          <div className="text-sm text-gray-500">
            This may take a few moments. Please don't close this page.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8">
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