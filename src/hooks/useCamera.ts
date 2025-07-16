'use client';

import { useState, useEffect, useRef } from 'react';
import { CameraState, CameraConfig, CapturedImage } from '@/types/camera';
import { initializeCamera, stopCamera, handleCameraError } from '@/lib/camera/cameraUtils';
import { compressImage } from '@/lib/camera/imageCompression';
import { calculateQualityMetrics } from '@/lib/camera/qualityValidation';

export const useCamera = () => {
  const [cameraState, setCameraState] = useState<CameraState>({
    isActive: false,
    stream: null,
    error: null,
    isCapturing: false,
    capturedImages: []
  });

  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = async (config: CameraConfig) => {
    try {
      setCameraState(prev => ({ ...prev, error: null }));
      
      const stream = await initializeCamera(config);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setCameraState(prev => ({
        ...prev,
        isActive: true,
        stream,
        error: null
      }));
    } catch (error) {
      const errorMessage = handleCameraError(error as Error);
      setCameraState(prev => ({
        ...prev,
        error: errorMessage,
        isActive: false,
        stream: null
      }));
    }
  };

  const stopCameraStream = () => {
    stopCamera(cameraState.stream);
    setCameraState(prev => ({
      ...prev,
      isActive: false,
      stream: null
    }));
  };

  const captureImage = async (): Promise<CapturedImage> => {
    if (!videoRef.current || !cameraState.stream) {
      throw new Error('Camera not active');
    }

    setCameraState(prev => ({ ...prev, isCapturing: true }));

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      
      ctx.drawImage(videoRef.current, 0, 0);
      
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        }, 'image/jpeg', 0.8);
      });

      const file = new File([blob], `capture-${Date.now()}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      const compressedFile = await compressImage(file);
      const quality = await calculateQualityMetrics(compressedFile);
      const preview = URL.createObjectURL(compressedFile);

      const capturedImage: CapturedImage = {
        file: compressedFile,
        preview,
        timestamp: Date.now(),
        quality
      };

      setCameraState(prev => ({
        ...prev,
        capturedImages: [...prev.capturedImages, capturedImage],
        isCapturing: false
      }));

      return capturedImage;
    } catch (error) {
      setCameraState(prev => ({ ...prev, isCapturing: false }));
      throw error;
    }
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  return {
    cameraState,
    videoRef,
    startCamera,
    stopCamera: stopCameraStream,
    captureImage
  };
};