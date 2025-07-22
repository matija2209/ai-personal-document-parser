'use client';

import { GuestData } from '@/lib/ai/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface GuestTableProps {
  guests: GuestData[];
  template?: {
    name: string;
    fields: string[];
  };
  className?: string;
}

export function GuestTable({ guests, template, className = '' }: GuestTableProps) {
  if (!guests || guests.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        No guest data found
      </div>
    );
  }

  // Get all unique fields from guests and template
  const allFields = template?.fields || [];
  const fieldsFromData = guests.reduce((acc, guest) => {
    Object.keys(guest).forEach(key => {
      if (!acc.includes(key)) acc.push(key);
    });
    return acc;
  }, [] as string[]);

  const displayFields = allFields.length > 0 ? allFields : fieldsFromData;

  // Convert camelCase field names to readable labels
  const getFieldLabel = (field: string): string => {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {template && (
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
          <p className="text-sm text-gray-600">
            {guests.length} guest{guests.length !== 1 ? 's' : ''} extracted
          </p>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Guest</TableHead>
              {displayFields.map((field) => (
                <TableHead key={field}>
                  {getFieldLabel(field)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {guests.map((guest, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">
                  #{index + 1}
                </TableCell>
                {displayFields.map((field) => (
                  <TableCell key={field}>
                    {guest[field as keyof GuestData] || (
                      <span className="text-gray-400 italic">—</span>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {guests.some(guest => 
        Object.values(guest).some(value => value === null || value === '')
      ) && (
        <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
          ⚠️ Some fields were not extracted. This may be due to unclear handwriting or missing information in the original form.
        </div>
      )}
    </div>
  );
}

export function GuestTableSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="animate-pulse space-y-2">
        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <div className="animate-pulse">
          <div className="bg-gray-100 p-4">
            <div className="grid grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
          <div className="divide-y">
            {[...Array(3)].map((_, rowIndex) => (
              <div key={rowIndex} className="p-4">
                <div className="grid grid-cols-5 gap-4">
                  {[...Array(5)].map((_, colIndex) => (
                    <div key={colIndex} className="h-4 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}