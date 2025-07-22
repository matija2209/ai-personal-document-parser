'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { FormTemplate } from '@/lib/ai/types';

const templateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().min(1, 'Description is required').max(500, 'Description must be less than 500 characters'),
  fields: z.string().min(1, 'Fields are required'),
  maxGuests: z.number().min(1, 'Must allow at least 1 guest').max(20, 'Cannot exceed 20 guests'),
});

type TemplateFormData = z.infer<typeof templateSchema>;

export function TemplateManagement() {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FormTemplate | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      description: '',
      fields: '',
      maxGuests: 5,
    },
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/form-templates');
      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      setError(error instanceof Error ? error.message : 'Failed to load templates');
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: TemplateFormData) => {
    setSubmitting(true);
    try {
      const fields = data.fields.split(',').map(f => f.trim()).filter(f => f);
      
      const payload = {
        name: data.name,
        description: data.description,
        fields: fields,
        maxGuests: data.maxGuests,
      };

      let response;
      if (editingTemplate) {
        response = await fetch(`/api/form-templates/${editingTemplate.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch('/api/form-templates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save template');
      }

      const result = await response.json();
      
      if (editingTemplate) {
        setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? result.template : t));
        toast.success('Template updated successfully');
        setEditingTemplate(null);
      } else {
        setTemplates(prev => [...prev, result.template]);
        toast.success('Template created successfully');
        setShowCreateForm(false);
      }
      
      form.reset();
    } catch (error) {
      console.error('Failed to save template:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save template');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (template: FormTemplate) => {
    setEditingTemplate(template);
    setShowCreateForm(false);
    form.reset({
      name: template.name,
      description: template.description,
      fields: template.fields.join(', '),
      maxGuests: template.maxGuests,
    });
  };

  const handleDelete = async (templateId: string) => {
    try {
      const response = await fetch(`/api/form-templates/${templateId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete template');
      }

      setTemplates(prev => prev.filter(t => t.id !== templateId));
      toast.success('Template deleted successfully');
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error('Failed to delete template');
    }
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingTemplate(null);
    form.reset();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse bg-gray-200 h-8 rounded w-1/3"></div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 h-24 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Form Templates</h2>
          <p className="text-sm text-gray-500">
            Manage templates for guest form processing
          </p>
        </div>
        
        {!showCreateForm && !editingTemplate && (
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Template
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="text-sm text-red-700">
              {error}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchTemplates}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {(showCreateForm || editingTemplate) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </CardTitle>
            <CardDescription>
              Define the fields and structure for your guest form template
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Hotel Check-in Form" {...field} />
                      </FormControl>
                      <FormDescription>
                        A descriptive name for this template
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="e.g., 5-guest table with: first name, last name, document ID, country, room assignment"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Describe what this template is used for and what fields it contains
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fields"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fields (comma-separated)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="firstName, lastName, birthDate, country, documentType, documentId"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        List the fields that will be extracted from the form, separated by commas
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxGuests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Guests</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          max="20" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum number of guests this template can handle
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex space-x-2">
                  <Button type="submit" disabled={submitting}>
                    <Save className="h-4 w-4 mr-2" />
                    {submitting ? 'Saving...' : editingTemplate ? 'Update' : 'Create'} Template
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {templates.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            No templates found. Create your first template to get started.
          </div>
        )}
        
        {templates.map((template) => (
          <Card key={template.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{template.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                  
                  <div className="mt-3 space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {template.fields.map((field, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {field}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      Max guests: {template.maxGuests} • Created: {new Date(template.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(template)}
                    disabled={editingTemplate !== null}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Template</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{template.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(template.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}