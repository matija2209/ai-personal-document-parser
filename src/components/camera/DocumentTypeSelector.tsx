'use client';

import { useState } from 'react';

export type DocumentTypeOption = 'personal-document' | 'guest-form';

interface DocumentTypeSelectorProps {
  value: DocumentTypeOption;
  onChange: (type: DocumentTypeOption) => void;
  className?: string;
}

export function DocumentTypeSelector({ value, onChange, className = '' }: DocumentTypeSelectorProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="text-sm font-medium text-gray-700 mb-2">
        What type of document are you scanning?
      </div>
      
      <div className="grid grid-cols-1 gap-2">
        <label className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="radio"
            name="documentType"
            value="personal-document"
            checked={value === 'personal-document'}
            onChange={() => onChange('personal-document')}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
          />
          <div className="flex-1">
            <div className="font-medium text-gray-900">Personal Document</div>
            <div className="text-sm text-gray-500">
              Individual passport, driving license, or ID card
            </div>
          </div>
        </label>

        <label className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="radio"
            name="documentType"
            value="guest-form"
            checked={value === 'guest-form'}
            onChange={() => onChange('guest-form')}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
          />
          <div className="flex-1">
            <div className="font-medium text-gray-900">Guest Form</div>
            <div className="text-sm text-gray-500">
              Table with multiple guests' information (registration forms, check-in sheets, etc.)
            </div>
          </div>
        </label>
      </div>
    </div>
  );
}