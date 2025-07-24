
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DocumentWithRelations } from '@/types/document-data';

interface GuestFormInformationProps {
  document: DocumentWithRelations;
}

export function GuestFormInformation({ document }: GuestFormInformationProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Guest Form Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm font-medium text-gray-700">Template</div>
            <div className="text-sm text-gray-900">
              {document.formTemplate?.name || 'Unknown Template'}
            </div>
          </div>
          
          <div>
            <div className="text-sm font-medium text-gray-700">Guests Found</div>
            <div className="text-sm text-gray-900">
              {document.guestExtractions?.length || 0} guest{(document.guestExtractions?.length || 0) !== 1 ? 's' : ''}
              {document.guestCount && ` (expected ${document.guestCount})`}
            </div>
          </div>
          
          <div>
            <div className="text-sm font-medium text-gray-700">Processing Status</div>
            <div className="flex items-center gap-2">
              <Badge variant={document.status === 'completed' ? 'default' : 'secondary'}>
                {document.status}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
