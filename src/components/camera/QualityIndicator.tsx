import { QualityMetrics } from '@/types/camera';

interface QualityIndicatorProps {
  quality: QualityMetrics;
  className?: string;
}

export const QualityIndicator: React.FC<QualityIndicatorProps> = ({ 
  quality, 
  className = '' 
}) => {
  const getQualityLevel = () => {
    if (quality.isBlurry) return 'poor';
    if (quality.blurScore > 15) return 'excellent';
    if (quality.blurScore > 8) return 'good';
    return 'fair';
  };

  const getQualityColor = () => {
    const level = getQualityLevel();
    switch (level) {
      case 'excellent': return 'text-green-600 bg-green-50 border-green-200';
      case 'good': return 'text-green-600 bg-green-50 border-green-200';
      case 'fair': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'poor': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getQualityIcon = () => {
    const level = getQualityLevel();
    switch (level) {
      case 'excellent':
      case 'good':
        return '✅';
      case 'fair':
        return '⚠️';
      case 'poor':
        return '❌';
      default:
        return '❓';
    }
  };

  const getQualityMessage = () => {
    const level = getQualityLevel();
    switch (level) {
      case 'excellent':
        return 'Excellent quality - perfect for processing!';
      case 'good':
        return 'Good quality - ready for processing';
      case 'fair':
        return 'Fair quality - may work, but consider retaking';
      case 'poor':
        return 'Poor quality - please retake for better results';
      default:
        return 'Quality unknown';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`quality-indicator p-3 rounded-lg border ${getQualityColor()} ${className}`}>
      <div className="flex items-center space-x-2 mb-2">
        <span className="text-lg">{getQualityIcon()}</span>
        <span className="font-medium">{getQualityMessage()}</span>
      </div>
      
      <div className="text-sm space-y-1">
        <div className="flex justify-between">
          <span>Resolution:</span>
          <span>{quality.resolution.width} × {quality.resolution.height}</span>
        </div>
        <div className="flex justify-between">
          <span>File size:</span>
          <span>{formatFileSize(quality.fileSize)}</span>
        </div>
        <div className="flex justify-between">
          <span>Sharpness score:</span>
          <span>{quality.blurScore.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
};