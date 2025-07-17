import { DocumentSkeleton } from '@/components/ui/Skeleton';

export default function DocumentLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <DocumentSkeleton />
    </div>
  );
}