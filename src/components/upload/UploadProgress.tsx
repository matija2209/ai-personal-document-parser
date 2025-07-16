import { UploadProgress as UploadProgressType } from '@/types/upload';

interface UploadProgressProps {
  progress: UploadProgressType;
  fileName: string;
  className?: string;
}

export function UploadProgress({ progress, fileName, className = '' }: UploadProgressProps) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const formatSpeed = (bytesPerSecond: number) => {
    return `${formatBytes(bytesPerSecond)}/s`;
  };
  
  const estimatedTimeRemaining = () => {
    if (progress.speed > 0 && progress.total > progress.loaded) {
      const remaining = (progress.total - progress.loaded) / progress.speed;
      if (remaining < 60) {
        return `${Math.round(remaining)}s remaining`;
      } else {
        return `${Math.round(remaining / 60)}m remaining`;
      }
    }
    return '';
  };
  
  return (
    <div className={`w-full space-y-2 ${className}`}>
      <div className="flex justify-between text-sm text-gray-600">
        <span className="truncate">{fileName}</span>
        <span>{progress.percentage}%</span>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
      
      <div className="flex justify-between text-xs text-gray-500">
        <span>{formatBytes(progress.loaded)} / {formatBytes(progress.total)}</span>
        <span>
          {progress.speed > 0 && formatSpeed(progress.speed)}
          {estimatedTimeRemaining() && ` • ${estimatedTimeRemaining()}`}
        </span>
      </div>
    </div>
  );
}