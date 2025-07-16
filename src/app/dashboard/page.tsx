export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      <p className="text-gray-600 mb-4">Phase 1 Placeholder - Document management will be implemented in Phase 7</p>
      {params.search && (
        <p className="text-sm text-gray-500">Search parameter: {params.search}</p>
      )}
    </div>
  );
}