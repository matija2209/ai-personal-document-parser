'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CameraCapture } from '@/components/camera/CameraCapture';
import { DocumentCapture } from '@/components/camera/DocumentCapture';
import { DocumentTypeSelector, DocumentTypeOption } from '@/components/camera/DocumentTypeSelector';
import { TemplateSelector } from '@/components/camera/TemplateSelector';
import { CapturedImage } from '@/types/camera';
import { triggerAIProcessing } from '@/lib/client/ai-processing';

export default function CameraPage() {
  const [useDocumentFlow, setUseDocumentFlow] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [documentTypeChoice, setDocumentTypeChoice] = useState<DocumentTypeOption>('personal-document');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [guestCount, setGuestCount] = useState<number | undefined>(undefined);
  const router = useRouter();


  const triggerBackgroundProcessing = async (documentId: string) => {
    console.log('🚀 triggerBackgroundProcessing called for documentId:', documentId);
    try {
      setProcessingStep('Scheduling AI processing...');
      
      // Just trigger the processing but don't wait for completion
      console.log('📡 Sending background processing request...');
      fetch('/api/documents/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          enableDualVerification: false,
        }),
      }).catch((error) => {
        console.warn('Background processing request failed:', error);
        // Don't throw - processing will still be triggered
      });
      
      setProcessingStep('Upload completed! Processing in background...');
      
      // Show success message and redirect immediately
      const successMessage = `Document uploaded successfully!\n` +
        `Document ID: ${documentId}\n` +
        `AI processing has been started in the background.\n` +
        `Check your dashboard for processing status.`;
      
      alert(successMessage);
      
      // Redirect immediately to dashboard
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh(); // Force refresh to show updated data
      }, 1500);
      
    } catch (error) {
      console.error('Failed to schedule processing:', error);
      setProcessingError(error instanceof Error ? error.message : 'Unknown error');
      setProcessingStep('Failed to schedule processing');
      
      // Show error but still allow navigation
      alert(`Failed to schedule processing: ${error instanceof Error ? error.message : 'Unknown error'}\nYou can retry processing from the dashboard.`);
      
      // Still redirect to dashboard
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 2000);
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
          // Trigger background AI processing
          await triggerBackgroundProcessing(documentId);
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
      
      // Trigger background AI processing if at least front image uploaded successfully
      if (processingReady && documentId) {
        await triggerBackgroundProcessing(documentId);
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

  // Validation: if guest form is selected, template must be chosen
  const canProceedToCapture = documentTypeChoice === 'personal-document' || 
    (documentTypeChoice === 'guest-form' && selectedTemplate);

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8">
      <div className="max-w-md mx-auto mb-6 space-y-6">
        {/* Document Type Selection */}
        <DocumentTypeSelector
          value={documentTypeChoice}
          onChange={(type) => {
            setDocumentTypeChoice(type);
            if (type === 'personal-document') {
              setSelectedTemplate(null);
              setGuestCount(undefined);
            }
          }}
        />

        {/* Template Selection for Guest Forms */}
        {documentTypeChoice === 'guest-form' && (
          <TemplateSelector
            value={selectedTemplate}
            onChange={setSelectedTemplate}
            guestCount={guestCount}
            onGuestCountChange={setGuestCount}
          />
        )}

        {/* Capture Mode Selection - only show if ready to proceed */}
        {canProceedToCapture && (
          <>
            <div className="border-t pt-4">
              <div className="text-sm font-medium text-gray-700 mb-2">
                Capture Mode
              </div>
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
          </>
        )}
      </div>

      {/* Camera/Capture Components */}
      {canProceedToCapture && (
        <>
          {useDocumentFlow ? (
            <DocumentCapture 
              onDocumentComplete={handleDocumentComplete}
              documentType={documentTypeChoice === 'guest-form' ? 'guest-form' : 'document'}
              formTemplateId={documentTypeChoice === 'guest-form' ? selectedTemplate : null}
              guestCount={documentTypeChoice === 'guest-form' ? guestCount : null}
            />
          ) : (
            <CameraCapture 
              onImageConfirmed={handleImageConfirmed}
              documentType={documentTypeChoice === 'guest-form' ? 'guest-form' : 'document'}
              formTemplateId={documentTypeChoice === 'guest-form' ? selectedTemplate : null}
              guestCount={documentTypeChoice === 'guest-form' ? guestCount : null}
            />
          )}
        </>
      )}

      {/* Info message when guest form is selected but no template */}
      {documentTypeChoice === 'guest-form' && !selectedTemplate && (
        <div className="max-w-md mx-auto text-center py-8">
          <div className="text-gray-500">
            Please select a form template to continue
          </div>
        </div>
      )}
    </div>
  );
}