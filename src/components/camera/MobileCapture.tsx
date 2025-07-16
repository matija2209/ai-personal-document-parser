'use client';

import { useRef } from 'react';
import { CapturedImage } from '@/types/camera';
import { compressImage } from '@/lib/camera/imageCompression';
import { calculateQualityMetrics } from '@/lib/camera/qualityValidation';

interface MobileCaptureProps {
  onCapture: (image: CapturedImage) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

export const MobileCapture: React.FC<MobileCaptureProps> = ({ 
  onCapture, 
  onError, 
  disabled = false 
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const processImageFile = async (file: File) => {
    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('Invalid file type. Please select an image.');
      }
      
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File too large. Please select an image smaller than 10MB.');
      }
      
      const compressedFile = await compressImage(file);
      const quality = await calculateQualityMetrics(compressedFile);
      const preview = URL.createObjectURL(compressedFile);

      const capturedImage: CapturedImage = {
        file: compressedFile,
        preview,
        timestamp: Date.now(),
        quality
      };

      onCapture(capturedImage);
      
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to process image');
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleCaptureClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  };

  return (
    <div className="mobile-capture">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      <button
        onClick={handleCaptureClick}
        disabled={disabled}
        className={`
          w-full py-4 px-6 rounded-lg font-medium text-lg
          ${disabled 
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
            : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
          }
          transition-colors duration-200
        `}
      >
        {disabled ? 'Processing...' : '📷 Take Photo'}
      </button>
      
      <p className="mt-2 text-sm text-gray-600 text-center">
        This will open your device's camera app
      </p>
    </div>
  );
};