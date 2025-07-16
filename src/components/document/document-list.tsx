import { DocumentCard, DocumentCardProps } from './document-card';

export interface DocumentListProps {
  documents: DocumentCardProps[];
}

export function DocumentList({ documents }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No documents found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {documents.map((doc) => (
        <DocumentCard key={doc.id} {...doc} />
      ))}
    </div>
  );
}