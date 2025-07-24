
import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';

interface GuestFormProcessingStatusProps {
  isProcessing: boolean;
  hasFailed: boolean;
}

export function GuestFormProcessingStatus({ isProcessing, hasFailed }: GuestFormProcessingStatusProps) {
  if (isProcessing) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg font-medium text-gray-900 mb-2">
            Processing your guest form...
          </div>
          <div className="text-gray-600">
            AI is extracting guest information from your form. This may take a few moments.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (hasFailed) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="text-red-600 mb-2">
              <FileText className="h-12 w-12 mx-auto mb-4" />
            </div>
            <div className="text-lg font-medium text-red-900 mb-2">
              Processing Failed
            </div>
            <div className="text-red-700">
              We encountered an error while processing your guest form. Please try uploading it again.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
