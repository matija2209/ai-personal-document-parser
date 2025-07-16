import { CameraConfig, CameraError } from '@/types/camera';

export const getCameraPermission = async (): Promise<boolean> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('Camera permission denied:', error);
    return false;
  }
};

export const initializeCamera = async (config: CameraConfig): Promise<MediaStream> => {
  const constraints = {
    video: {
      facingMode: config.facingMode,
      width: { ideal: config.width },
      height: { ideal: config.height }
    }
  };
  
  return await navigator.mediaDevices.getUserMedia(constraints);
};

export const stopCamera = (stream: MediaStream | null): void => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
};

export const handleCameraError = (error: Error): string => {
  switch (error.name) {
    case 'NotAllowedError':
      return 'Camera access denied. Please enable camera permissions in your browser settings.';
    case 'NotFoundError':
      return 'No camera found. Please ensure your device has a camera.';
    case 'NotSupportedError':
      return 'Camera not supported. Please try a different browser.';
    case 'OverconstrainedError':
      return 'Camera constraints cannot be satisfied. Please try again.';
    default:
      return 'Camera error occurred. Please try again.';
  }
};

export const getCameraCapabilities = (): boolean => {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
};

export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error = new Error('Operation failed');
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};