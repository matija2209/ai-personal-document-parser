'use client';

import { useState, useEffect } from 'react';
import { FormTemplate } from '@/lib/ai/types';

interface TemplateSelectorProps {
  value: string | null;
  onChange: (templateId: string | null) => void;
  guestCount: number | undefined;
  onGuestCountChange: (count: number | undefined) => void;
  className?: string;
}

export function TemplateSelector({ 
  value, 
  onChange, 
  guestCount, 
  onGuestCountChange, 
  className = '' 
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/form-templates');
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      setError('Failed to load form templates');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="text-sm font-medium text-gray-700">Loading templates...</div>
        <div className="animate-pulse bg-gray-200 h-20 rounded-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="text-sm font-medium text-red-600">{error}</div>
        <button 
          onClick={fetchTemplates}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Try again
        </button>
      </div>
    );
  }

  const selectedTemplate = templates.find(t => t.id === value);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-sm font-medium text-gray-700">
        Select Form Template
      </div>
      
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">Choose a template...</option>
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name}
          </option>
        ))}
      </select>

      {selectedTemplate && (
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-sm font-medium text-gray-900 mb-1">
            {selectedTemplate.name}
          </div>
          <div className="text-sm text-gray-600 mb-2">
            {selectedTemplate.description}
          </div>
          <div className="text-xs text-gray-500">
            Fields: {selectedTemplate.fields.join(', ')}
          </div>
          <div className="text-xs text-gray-500">
            Max guests: {selectedTemplate.maxGuests}
          </div>
        </div>
      )}

      {selectedTemplate && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Number of guests (optional hint for AI)
          </label>
          <input
            type="number"
            min="1"
            max={selectedTemplate.maxGuests}
            value={guestCount || ''}
            onChange={(e) => onGuestCountChange(e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder={`1-${selectedTemplate.maxGuests} guests`}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="text-xs text-gray-500">
            This helps the AI know how many guests to expect in the form
          </div>
        </div>
      )}
    </div>
  );
}