'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Image as ImageIcon } from 'lucide-react';

interface DocumentImageDisplayProps {
  document: {
    imageUrl?: string | null;
    [key: string]: any;
  };
}

export function DocumentImageDisplay({ document }: DocumentImageDisplayProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!document.imageUrl) {
    return null;
  }

  return (
    <Card className="mb-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <ImageIcon className="h-5 w-5" />
                <span>Document Image</span>
              </CardTitle>
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <div className="relative w-full max-w-2xl mx-auto">
              <Image
                src={document.imageUrl}
                alt="Document image"
                width={800}
                height={600}
                className="w-full h-auto rounded-lg border shadow-sm"
                priority
              />
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}