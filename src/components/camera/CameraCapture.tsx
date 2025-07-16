'use client';

import { useState } from 'react';
import { CapturedImage } from '@/types/camera';
import { MobileCapture } from './MobileCapture';
import { ImagePreview } from './ImagePreview';
import { QualityIndicator } from './QualityIndicator';
import { CameraFallback } from './CameraFallback';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { getCameraCapabilities } from '@/lib/camera/cameraUtils';
import { useFileUpload } from '@/hooks/useFileUpload';
import { UploadStatus } from '@/components/upload/UploadStatus';

interface CameraCaptureProps {
  onImageConfirmed?: (image: CapturedImage) => void;
  documentType?: string;
}

type CaptureStep = 'capture' | 'review' | 'processing' | 'uploading';

export const CameraCapture: React.FC<CameraCaptureProps> = ({ 
  onImageConfirmed,
  documentType = 'document'
}) => {
  const [currentStep, setCurrentStep] = useState<CaptureStep>('capture');
  const [capturedImage, setCapturedImage] = useState<CapturedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(!getCameraCapabilities());
  const { uploadState, uploadFile, resetUpload } = useFileUpload();

  const handleCapture = async (image: CapturedImage) => {
    try {
      setError(null);
      setCurrentStep('processing');
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCapturedImage(image);
      setCurrentStep('review');
    } catch (error) {
      setError('Failed to process captured image');
      setCurrentStep('capture');
    }
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setCurrentStep('capture');
  };

  const handleRetake = () => {
    if (capturedImage?.preview) {
      URL.revokeObjectURL(capturedImage.preview);
    }
    setCapturedImage(null);
    setError(null);
    setCurrentStep('capture');
  };

  const handleConfirm = async () => {
    if (capturedImage) {
      try {
        setCurrentStep('uploading');
        resetUpload();
        
        const uploadResult = await uploadFile(capturedImage.file, documentType);
        
        if (uploadResult.success) {
          if (onImageConfirmed) {
            await onImageConfirmed({
              ...capturedImage,
              uploadResult
            });
          }
        } else {
          setError(uploadResult.error || 'Upload failed');
          setCurrentStep('review');
        }
      } catch (error) {
        setError('Failed to upload image');
        setCurrentStep('review');
      }
    }
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <div className="camera-capture max-w-md mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Capture {documentType}
        </h1>
        <p className="text-gray-600">
          Take a clear photo of your {documentType}. Make sure all text is visible and the image is not blurry.
        </p>
      </div>

      {error && (
        <ErrorMessage 
          error={error} 
          onDismiss={clearError}
          className="mb-4"
        />
      )}

      {currentStep === 'capture' && (
        useFallback ? (
          <CameraFallback
            onImageCaptured={handleCapture}
            onError={handleError}
            documentType={documentType}
          />
        ) : (
          <CaptureStep 
            onCapture={handleCapture}
            onError={handleError}
            onFallback={() => setUseFallback(true)}
            documentType={documentType}
          />
        )
      )}

      {currentStep === 'review' && capturedImage && (
        <ReviewStep 
          image={capturedImage} 
          onRetake={handleRetake}
          onConfirm={handleConfirm}
        />
      )}

      {currentStep === 'processing' && (
        <ProcessingStep />
      )}

      {currentStep === 'uploading' && (
        <UploadingStep 
          uploadState={uploadState}
          fileName={capturedImage?.file.name}
        />
      )}
    </div>
  );
};

const CaptureStep: React.FC<{
  onCapture: (image: CapturedImage) => void;
  onError: (error: string) => void;
  onFallback: () => void;
  documentType: string;
}> = ({ onCapture, onError, onFallback, documentType }) => {
  return (
    <div className="capture-step space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Tips for best results:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Ensure good lighting</li>
          <li>• Keep the {documentType} flat</li>
          <li>• Fill the frame with the document</li>
          <li>• Avoid shadows and glare</li>
        </ul>
      </div>
      
      <MobileCapture 
        onCapture={onCapture}
        onError={onError}
      />
      
      <div className="text-center">
        <button
          onClick={onFallback}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Having trouble? Upload an image instead
        </button>
      </div>
    </div>
  );
};

const ReviewStep: React.FC<{
  image: CapturedImage;
  onRetake: () => void;
  onConfirm: () => void;
}> = ({ image, onRetake, onConfirm }) => {
  return (
    <div className="review-step space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Review your photo
        </h2>
      </div>
      
      <ImagePreview image={image} />
      
      <QualityIndicator quality={image.quality} />
      
      <div className="review-actions space-y-3">
        <button
          onClick={onConfirm}
          className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          ✅ Use This Photo
        </button>
        <button
          onClick={onRetake}
          className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
        >
          📷 Retake Photo
        </button>
      </div>
    </div>
  );
};

const ProcessingStep: React.FC = () => {
  return (
    <div className="processing-step text-center py-8">
      <LoadingSpinner size="lg" className="mx-auto mb-4" />
      <h2 className="text-lg font-medium text-gray-900 mb-2">
        Processing your photo...
      </h2>
      <p className="text-gray-600">
        Please wait while we prepare your image.
      </p>
    </div>
  );
};

const UploadingStep: React.FC<{
  uploadState: any;
  fileName?: string;
}> = ({ uploadState, fileName }) => {
  return (
    <div className="uploading-step py-6">
      <div className="text-center mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-2">
          Uploading your document
        </h2>
        <p className="text-gray-600">
          Your image is being uploaded and processed...
        </p>
      </div>
      
      <UploadStatus 
        uploadState={uploadState} 
        fileName={fileName}
        className="mb-4"
      />
    </div>
  );
};