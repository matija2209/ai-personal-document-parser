'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { EditDialogData } from '@/types/document-data';
import { validateRowData, getFieldOptions } from '@/lib/utils/document-data-utils';
import { createFieldSchema } from '@/lib/validations/document-schemas';

interface EditDataDialogProps {
  data: EditDialogData;
  onSave: (rowId: string, updatedData: Record<string, any>) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

export function EditDataDialog({ data, onSave, onClose, isLoading = false }: EditDataDialogProps) {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Create dynamic schema based on the columns
  const createFormSchema = () => {
    const schemaFields: Record<string, z.ZodSchema<any>> = {};
    
    data.columns.forEach(column => {
      // Skip guest number for new rows - it's auto-generated
      if (column.key === 'guestNumber') {
        schemaFields[column.key] = z.number().or(z.string().transform(val => parseInt(val, 10)));
        return;
      }
      
      const options = column.options || getFieldOptions(column.key);
      schemaFields[column.key] = createFieldSchema(
        column.key, 
        column.type,
        {
          required: column.required,
          selectOptions: options,
        }
      );
    });
    
    return z.object(schemaFields);
  };

  const formSchema = createFormSchema();
  type FormData = z.infer<typeof formSchema>;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: data.rowData as FormData,
  });

  // Reset form when data changes
  useEffect(() => {
    form.reset(data.rowData as FormData);
    setValidationErrors([]);
  }, [data, form]);

  const handleSave = async (formData: FormData) => {
    // Additional validation using our custom validator
    const validation = validateRowData(formData, data.columns);
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setValidationErrors([]);
    
    try {
      await onSave(data.rowId, formData);
    } catch (error) {
      console.error('Error in dialog save:', error);
    }
  };

  const handleCancel = () => {
    form.reset();
    setValidationErrors([]);
    onClose();
  };

  const renderFormField = (column: any) => {
    const currentValue = data.rowData[column.key];
    const fieldOptions = column.options || getFieldOptions(column.key, currentValue);
    
    return (
      <FormField
        key={column.key}
        control={form.control}
        name={column.key}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              {column.label}
              {column.required && (
                <Badge variant="secondary" className="text-xs">
                  Required
                </Badge>
              )}
            </FormLabel>
            <FormControl>
              {column.type === 'select' && fieldOptions ? (
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value?.toString() || ''}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${column.label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldOptions.map((option: string) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  {...field}
                  value={field.value?.toString() || ''}
                  type={column.type === 'number' ? 'number' : column.type === 'date' ? 'date' : 'text'}
                  placeholder={`Enter ${column.label.toLowerCase()}`}
                  disabled={column.key === 'guestNumber' && data.documentType === 'guest-form'}
                />
              )}
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit {data.documentType === 'guest-form' ? 'Guest' : 'Document'} Data
          </DialogTitle>
          <DialogDescription>
            Make changes to the extracted data. Required fields are marked with a badge.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
            {/* Custom validation errors */}
            {validationErrors.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-red-600">⚠️</span>
                  <span className="font-medium text-red-800">Validation Errors</span>
                </div>
                <ul className="text-sm text-red-700 list-disc list-inside">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.columns.map(renderFormField)}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}