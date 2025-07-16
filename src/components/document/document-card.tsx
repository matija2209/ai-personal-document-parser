import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface DocumentCardProps {
  id: string;
  type: string;
  dateProcessed: string;
  status: 'completed' | 'processing' | 'failed';
}

export function DocumentCard({ id, type, dateProcessed, status }: DocumentCardProps) {
  const statusColors = {
    completed: 'text-green-600',
    processing: 'text-yellow-600',
    failed: 'text-red-600'
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{type}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-2">
          Processed: {dateProcessed}
        </p>
        <p className={`text-sm font-medium mb-4 ${statusColors[status]}`}>
          Status: {status}
        </p>
        <div className="flex space-x-2">
          <Button size="sm" variant="outline">
            View
          </Button>
          <Button size="sm" variant="outline">
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}