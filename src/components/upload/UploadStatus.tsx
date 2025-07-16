import { UploadState } from '@/types/upload';
import { UploadProgress } from './UploadProgress';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface UploadStatusProps {
  uploadState: UploadState;
  fileName?: string;
  className?: string;
}

export function UploadStatus({ uploadState, fileName, className = '' }: UploadStatusProps) {
  const { isUploading, progress, error, result } = uploadState;
  
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  if (isUploading) {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <LoadingSpinner size="sm" className="text-blue-600" />
          <div className="flex-1">
            <div className="font-medium text-blue-900">Uploading image...</div>
            {progress && fileName && (
              <div className="mt-2">
                <UploadProgress progress={progress} fileName={fileName} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <div className="font-medium text-red-900">Upload Failed</div>
            <div className="text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }
  
  if (result?.success) {
    const compressionPercentage = result.originalSize > result.compressedSize 
      ? Math.round(((result.originalSize - result.compressedSize) / result.originalSize) * 100)
      : 0;
      
    return (
      <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <div className="font-medium text-green-900">Upload completed successfully!</div>
            {compressionPercentage > 0 && (
              <div className="text-sm text-green-700">
                File compressed by {compressionPercentage}% 
                ({formatBytes(result.originalSize)} → {formatBytes(result.compressedSize)})
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  return null;
}