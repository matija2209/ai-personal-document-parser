import { CameraError } from '@/types/camera';

export const getCameraErrorType = (error: Error): CameraError => {
  switch (error.name) {
    case 'NotAllowedError':
      return 'NotAllowedError';
    case 'NotFoundError':
      return 'NotFoundError';
    case 'NotSupportedError':
      return 'NotSupportedError';
    case 'OverconstrainedError':
      return 'OverconstrainedError';
    default:
      return 'UnknownError';
  }
};

export const getCameraErrorMessage = (errorType: CameraError): string => {
  switch (errorType) {
    case 'NotAllowedError':
      return 'Camera access denied. Please enable camera permissions in your browser settings and refresh the page.';
    case 'NotFoundError':
      return 'No camera found. Please ensure your device has a camera or try uploading an image instead.';
    case 'NotSupportedError':
      return 'Camera not supported in this browser. Please try a different browser or upload an image instead.';
    case 'OverconstrainedError':
      return 'Camera settings not supported. We\'ll try with different settings.';
    case 'UnknownError':
    default:
      return 'Camera error occurred. Please try again or upload an image instead.';
  }
};

export const getCameraErrorSolution = (errorType: CameraError): string => {
  switch (errorType) {
    case 'NotAllowedError':
      return 'Enable camera permissions in your browser settings, then refresh this page.';
    case 'NotFoundError':
      return 'Use the upload option below or try a different device with a camera.';
    case 'NotSupportedError':
      return 'Try using Chrome, Safari, or Firefox, or use the upload option below.';
    case 'OverconstrainedError':
      return 'We\'ll automatically try different camera settings.';
    case 'UnknownError':
    default:
      return 'Try refreshing the page or use the upload option below.';
  }
};

export const shouldRetryCamera = (errorType: CameraError): boolean => {
  return errorType === 'OverconstrainedError' || errorType === 'UnknownError';
};

export const shouldShowFallback = (errorType: CameraError): boolean => {
  return errorType === 'NotFoundError' || errorType === 'NotSupportedError';
};

export class CameraPermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CameraPermissionError';
  }
}

export class CameraNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CameraNotFoundError';
  }
}

export class ImageProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageProcessingError';
  }
}

export const handleAsyncError = async <T>(
  operation: () => Promise<T>,
  errorMessage: string = 'Operation failed'
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    console.error(errorMessage, error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error(errorMessage);
  }
};