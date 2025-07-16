'use client';

import { useState } from 'react';
import { CapturedImage, DocumentCaptureState } from '@/types/camera';
import { CameraCapture } from './CameraCapture';
import { ImagePreview } from './ImagePreview';
import { QualityIndicator } from './QualityIndicator';

interface DocumentCaptureProps {
  onDocumentComplete: (front: CapturedImage, back?: CapturedImage) => void;
  documentType?: string;
}

export const DocumentCapture: React.FC<DocumentCaptureProps> = ({
  onDocumentComplete,
  documentType = 'document'
}) => {
  const [captureState, setCaptureState] = useState<DocumentCaptureState>({
    currentSide: 'front',
    frontImage: null,
    backImage: null,
    isBackRequired: false
  });

  const [showBackPrompt, setShowBackPrompt] = useState(false);

  const handleFrontCaptured = (image: CapturedImage) => {
    setCaptureState(prev => ({ ...prev, frontImage: image }));
    setShowBackPrompt(true);
  };

  const handleBackCaptured = (image: CapturedImage) => {
    setCaptureState(prev => ({ ...prev, backImage: image }));
    completeDocumentCapture(captureState.frontImage!, image);
  };

  const handleBackRequired = (required: boolean) => {
    setShowBackPrompt(false);
    
    if (required) {
      setCaptureState(prev => ({
        ...prev,
        currentSide: 'back',
        isBackRequired: true
      }));
    } else {
      completeDocumentCapture(captureState.frontImage!);
    }
  };

  const completeDocumentCapture = (front: CapturedImage, back?: CapturedImage) => {
    onDocumentComplete(front, back);
  };

  const handleRetakeBack = () => {
    if (captureState.backImage?.preview) {
      URL.revokeObjectURL(captureState.backImage.preview);
    }
    setCaptureState(prev => ({
      ...prev,
      backImage: null,
      currentSide: 'back'
    }));
  };

  if (showBackPrompt) {
    return (
      <BackSidePrompt
        documentType={documentType}
        frontImage={captureState.frontImage!}
        onYes={() => handleBackRequired(true)}
        onNo={() => handleBackRequired(false)}
      />
    );
  }

  if (captureState.currentSide === 'front') {
    return (
      <div className="document-capture">
        <div className="mb-4 text-center">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            Step 1 of 2 • Front Side
          </div>
        </div>
        
        <CameraCapture
          onImageConfirmed={handleFrontCaptured}
          documentType={`${documentType} (front side)`}
        />
      </div>
    );
  }

  if (captureState.currentSide === 'back') {
    return (
      <div className="document-capture">
        <div className="mb-4 text-center">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            Step 2 of 2 • Back Side
          </div>
        </div>

        {captureState.frontImage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-3">
              <span className="text-green-600">✅</span>
              <span className="font-medium text-green-800">Front side captured</span>
            </div>
            <div className="w-32 mx-auto">
              <ImagePreview image={captureState.frontImage} />
            </div>
          </div>
        )}
        
        <CameraCapture
          onImageConfirmed={handleBackCaptured}
          documentType={`${documentType} (back side)`}
        />
      </div>
    );
  }

  return null;
};

interface BackSidePromptProps {
  documentType: string;
  frontImage: CapturedImage;
  onYes: () => void;
  onNo: () => void;
}

const BackSidePrompt: React.FC<BackSidePromptProps> = ({
  documentType,
  frontImage,
  onYes,
  onNo
}) => {
  return (
    <div className="back-side-prompt max-w-md mx-auto p-4">
      <div className="text-center mb-6">
        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 mb-4">
          ✅ Front Side Captured
        </div>
        
        <div className="w-48 mx-auto mb-4">
          <ImagePreview image={frontImage} />
        </div>
        
        <QualityIndicator quality={frontImage.quality} className="mb-6" />
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-gray-900 mb-2">
          Does your {documentType} have important information on the back?
        </h3>
        <p className="text-sm text-gray-600">
          This might include signatures, endorsements, additional details, or security features.
        </p>
      </div>

      <div className="prompt-actions space-y-3">
        <button
          onClick={onYes}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          📷 Yes, capture back side
        </button>
        <button
          onClick={onNo}
          className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
        >
          ✅ No, continue with front only
        </button>
      </div>
    </div>
  );
};