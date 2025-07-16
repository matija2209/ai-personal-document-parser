import { CapturedImage } from '@/types/camera';

interface ImagePreviewProps {
  image: CapturedImage;
  className?: string;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({ 
  image, 
  className = '' 
}) => {
  return (
    <div className={`image-preview ${className}`}>
      <div className="relative bg-gray-100 rounded-lg overflow-hidden">
        <img
          src={image.preview}
          alt="Captured document"
          className="w-full h-auto max-h-96 object-contain"
          onLoad={() => {
            console.log('Image preview loaded');
          }}
          onError={() => {
            console.error('Failed to load image preview');
          }}
        />
        
        <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
          {image.quality.resolution.width} × {image.quality.resolution.height}
        </div>
      </div>
      
      <div className="mt-2 text-xs text-gray-500 text-center">
        Captured {new Date(image.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
};