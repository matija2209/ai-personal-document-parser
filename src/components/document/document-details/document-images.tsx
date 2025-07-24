
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImagePreview } from '@/components/document/ImagePreview';
import { DocumentWithRelations } from '@/types/document-data';

interface DocumentImagesProps {
  document: DocumentWithRelations;
}

export function DocumentImages({ document }: DocumentImagesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Images</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {document.files.map((file) => (
            <ImagePreview 
              key={file.id}
              fileKey={file.fileKey}
              fileName={file.originalFileName}
              fileType={file.fileType}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
