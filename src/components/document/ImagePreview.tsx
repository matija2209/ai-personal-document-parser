import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ImagePreviewProps {
  fileKey: string;
  fileName: string;
  fileType?: string | null;
}

export function ImagePreview({ fileKey, fileName, fileType }: ImagePreviewProps) {
  // Construct the image URL
  const imageUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL 
    ? `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${fileKey}`
    : `https://${process.env.NEXT_PUBLIC_R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.NEXT_PUBLIC_R2_BUCKET_NAME}/${fileKey}`;

  const getFileTypeBadge = () => {
    if (!fileType) return null;
    
    const displayType = fileType === 'front' ? 'Front' : fileType === 'back' ? 'Back' : fileType;
    const variant = fileType === 'front' ? 'default' : 'secondary';
    
    return <Badge variant={variant} className="text-xs">{displayType}</Badge>;
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="relative">
          <img
            src={imageUrl}
            alt={fileName}
            className="w-full h-48 object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/placeholder-image.png'; // You might want to add a placeholder
              target.alt = 'Image failed to load';
            }}
          />
          
          {fileType && (
            <div className="absolute top-2 right-2">
              {getFileTypeBadge()}
            </div>
          )}
        </div>
        
        <div className="p-3">
          <p className="text-sm text-gray-600 truncate">{fileName}</p>
        </div>
      </CardContent>
    </Card>
  );
}