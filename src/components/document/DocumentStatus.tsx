import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DocumentStatusProps {
  status: string;
  hasErrors: boolean;
  confidenceScore?: number | null;
  modelName?: string;
}

export function DocumentStatus({ status, hasErrors, confidenceScore, modelName }: DocumentStatusProps) {
  const getStatusBadge = () => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Processing Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Status</p>
            {getStatusBadge()}
          </div>
          
          {confidenceScore !== undefined && confidenceScore !== null && (
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Confidence Score</p>
              <p className={`text-lg font-semibold ${getConfidenceColor(confidenceScore)}`}>
                {Math.round(confidenceScore * 100)}%
              </p>
            </div>
          )}
          
          {modelName && (
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">AI Model</p>
              <p className="text-sm text-gray-900">{modelName}</p>
            </div>
          )}
        </div>
        
        {hasErrors && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-red-600">❌</span>
              <span className="text-sm font-medium text-red-800">
                Processing errors detected
              </span>
            </div>
            <p className="text-sm text-red-700 mt-1">
              Some errors occurred during processing. Check the extraction carefully.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}