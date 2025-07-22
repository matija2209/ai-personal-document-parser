import { Skeleton } from '@/components/ui/skeleton';

export default function DocumentLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Skeleton />
    </div>
  );
}