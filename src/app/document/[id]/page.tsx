export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Document Details</h1>
      <p className="text-gray-600 mb-4">Phase 1 Placeholder - Document ID: {id}</p>
      <p className="text-gray-600">Document viewing and editing will be implemented in Phase 7</p>
    </div>
  );
}