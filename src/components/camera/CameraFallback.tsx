'use client';

import { CapturedImage } from '@/types/camera';
import { compressImage } from '@/lib/camera/imageCompression';
import { calculateQualityMetrics } from '@/lib/camera/qualityValidation';

interface CameraFallbackProps {
  onImageCaptured: (image: CapturedImage) => void;
  onError: (error: string) => void;
  documentType?: string;
}

export const CameraFallback: React.FC<CameraFallbackProps> = ({
  onImageCaptured,
  onError,
  documentType = 'document'
}) => {
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file');
      }

      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File too large. Please select an image smaller than 10MB');
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

      onImageCaptured(capturedImage);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to process image');
    }

    event.target.value = '';
  };

  return (
    <div className="camera-fallback bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
      <div className="mb-4">
        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Camera not available
      </h3>
      
      <p className="text-gray-600 mb-6">
        Upload an image of your {documentType} from your device instead.
      </p>
      
      <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        Upload Image
        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </label>
      
      <div className="mt-4 text-xs text-gray-500">
        Supports JPG, PNG, WebP • Max 10MB
      </div>
    </div>
  );
};