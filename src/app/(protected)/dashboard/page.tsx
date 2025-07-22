import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DocumentHistoryTable } from '@/components/document/DocumentHistoryTable';

// Force dynamic rendering to avoid caching stale document statuses
export const dynamic = 'force-dynamic';

interface DashboardProps {
  searchParams: Promise<{ search?: string; type?: string }>;
}

export default async function Dashboard({ searchParams }: DashboardProps) {
  const params = await searchParams;
  const { userId } = await auth();
  
  const user = await prisma.user.findUnique({
    where: { clerkId: userId! },
  });

  // Build the where clause for filtering
  const whereClause: any = { userId: userId! };
  
  if (params.search) {
    whereClause.OR = [
      {
        documentType: {
          contains: params.search,
          mode: 'insensitive',
        },
      },
      {
        id: {
          contains: params.search,
          mode: 'insensitive',
        },
      },
    ];
  }
  
  if (params.type && params.type !== 'all') {
    whereClause.documentType = params.type;
  }

  const documents = await prisma.document.findMany({
    where: whereClause,
    include: {
      files: true,
      formTemplate: {
        select: {
          name: true,
        },
      },
      extractions: {
        select: { confidenceScore: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const stats = {
    total: documents.length,
    completed: documents.filter((d: any) => d.status === 'completed').length,
    processing: documents.filter((d: any) => d.status === 'processing').length,
    failed: documents.filter((d: any) => d.status === 'failed').length,
  };

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Welcome back, {user?.name || 'User'}!
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your documents and extract information with AI
          </p>
        </div>
        
        <Button asChild className="w-full sm:w-auto">
          <Link href="/camera">
            Scan New Document
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Documents</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-2xl text-green-600">{stats.completed}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Processing</CardDescription>
            <CardTitle className="text-2xl text-blue-600">{stats.processing}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Failed</CardDescription>
            <CardTitle className="text-2xl text-red-600">{stats.failed}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Document History */}
      <Card>
        <CardHeader>
          <CardTitle>Document History</CardTitle>
          <CardDescription>
            View and manage all your processed documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentHistoryTable initialDocuments={documents} />
        </CardContent>
      </Card>
    </div>
  );
}