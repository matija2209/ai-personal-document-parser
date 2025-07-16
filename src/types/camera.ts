export interface CameraConfig {
  facingMode: 'user' | 'environment';
  width: number;
  height: number;
}

export interface CapturedImage {
  file: File;
  preview: string;
  timestamp: number;
  quality: QualityMetrics;
}

export interface QualityMetrics {
  blurScore: number;
  isBlurry: boolean;
  resolution: { width: number; height: number };
  fileSize: number;
}

export interface CameraState {
  isActive: boolean;
  stream: MediaStream | null;
  error: string | null;
  isCapturing: boolean;
  capturedImages: CapturedImage[];
}

export interface DocumentCaptureState {
  currentSide: 'front' | 'back';
  frontImage: CapturedImage | null;
  backImage: CapturedImage | null;
  isBackRequired: boolean;
}

export type CameraError = 
  | 'NotAllowedError'
  | 'NotFoundError'
  | 'NotSupportedError'
  | 'OverconstrainedError'
  | 'UnknownError';

export interface CameraCapabilities {
  hasCamera: boolean;
  supportsGetUserMedia: boolean;
  supportsFacingMode: boolean;
  supportsConstraints: boolean;
}