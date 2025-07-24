import { 
  DocumentWithRelations, 
  EditableTableData, 
  TableColumn, 
  TableRow, 
  DocumentDataType 
} from '@/types/document-data';
import { toast } from 'sonner';

// Transform extraction data into table format
export function transformDocumentToTableData(document: DocumentWithRelations): EditableTableData {
  const isGuestForm = document.documentType === 'guest-form' || document.documentType === 'guest_form';
  
  if (isGuestForm) {
    return transformGuestFormData(document);
  } else {
    return transformSingleDocumentData(document);
  }
}

// Transform single document extraction data
function transformSingleDocumentData(document: DocumentWithRelations): EditableTableData {
  const extraction = document.extractions[0];
  
  if (!extraction?.extractionData) {
    return {
      columns: [],
      rows: [],
      documentType: 'single',
      documentId: document.id,
    };
  }
  
  const columns = generateColumnsFromData([extraction.extractionData], document.formTemplate);
  const row: TableRow = {
    id: extraction.id,
    data: extraction.extractionData,
    isModified: false,
  };
  
  return {
    columns,
    rows: [row],
    documentType: 'single',
    documentId: document.id,
  };
}

// Transform guest form data
function transformGuestFormData(document: DocumentWithRelations): EditableTableData {
  const guestExtractions = document.guestExtractions || [];
  
  if (guestExtractions.length === 0) {
    return {
      columns: [],
      rows: [],
      documentType: 'guest-form',
      documentId: document.id,
    };
  }
  
  // Collect all data for column generation
  const allGuestData = guestExtractions.map(ge => ge.extractedData);
  const columns = generateColumnsFromData(allGuestData, document.formTemplate);
  
  // Add guest number column at the beginning
  const guestNumberColumn: TableColumn = {
    key: 'guestNumber',
    label: 'Guest #',
    type: 'number',
    required: true,
  };
  columns.unshift(guestNumberColumn);
  
  // Create rows
  const rows: TableRow[] = guestExtractions.map(ge => ({
    id: ge.id,
    data: {
      guestNumber: ge.guestIndex,
      ...ge.extractedData,
    },
    isModified: false,
  }));
  
  return {
    columns,
    rows,
    documentType: 'guest-form',
    documentId: document.id,
  };
}

// Generate dynamic column definitions from data
export function generateColumnsFromData(
  dataArray: Record<string, any>[], 
  template?: { fields: string[] } | null
): TableColumn[] {
  const fieldSet = new Set<string>();
  
  // Use template fields if available
  if (template?.fields) {
    template.fields.forEach(field => fieldSet.add(field));
  }
  
  // Extract all unique fields from data
  dataArray.forEach(data => {
    Object.keys(data).forEach(key => fieldSet.add(key));
  });
  
  // Convert to columns with proper formatting and types
  return Array.from(fieldSet).map(field => {
    const fieldType = inferFieldType(field, dataArray);
    return {
      key: field,
      label: formatFieldLabel(field),
      type: fieldType,
      required: isFieldRequired(field),
      options: fieldType === 'select' ? getFieldOptions(field) : undefined,
    };
  });
}

// Format field labels (camelCase to Title Case)
export function formatFieldLabel(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/Id$/, 'ID')
    .replace(/Url$/, 'URL');
}

// Infer field type from field name and data - very lenient, defaults to text
function inferFieldType(field: string, dataArray: Record<string, any>[]): TableColumn['type'] {
  const fieldLower = field.toLowerCase();
  
  // Only very specific number fields
  if (fieldLower === 'guestnumber') {
    return 'number';
  }
  
  // Only very specific date fields
  if (fieldLower === 'date' || fieldLower === 'birthdate' || fieldLower === 'dateofbirth') {
    return 'date';
  }
  
  // Only gender gets select treatment
  if (fieldLower === 'gender') {
    return 'select';
  }
  
  // Everything else is text - keep it simple!
  return 'text';
}

// Determine if a field is required
function isFieldRequired(field: string): boolean {
  const requiredFields = [
    'firstName', 'lastName', 'fullName', 'name',
    'documentId', 'documentNumber', 'licenseNumber', 'passportNumber',
    'guestNumber'
  ];
  
  return requiredFields.some(req => field.toLowerCase().includes(req.toLowerCase()));
}

// Copy value to clipboard
export async function copyToClipboard(value: any, fieldName?: string): Promise<void> {
  try {
    let textToCopy: string;
    
    if (typeof value === 'object' && value !== null) {
      textToCopy = JSON.stringify(value, null, 2);
    } else {
      textToCopy = String(value || '');
    }
    
    await navigator.clipboard.writeText(textToCopy);
    toast.success(`${fieldName || 'Value'} copied to clipboard`);
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    toast.error('Failed to copy to clipboard');
  }
}

// Format value for display in table cells
export function formatCellValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  return String(value);
}

// Validate row data before saving
export function validateRowData(
  data: Record<string, any>, 
  columns: TableColumn[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  columns.forEach(column => {
    const value = data[column.key];
    
    // Check required fields
    if (column.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      errors.push(`${column.label} is required`);
      return;
    }
    
    // Skip validation for empty optional fields
    if (!value && !column.required) {
      return;
    }
    
    // Type-specific validation
    switch (column.type) {
      case 'date':
        if (value && !isValidDate(value)) {
          errors.push(`${column.label} must be a valid date (YYYY-MM-DD)`);
        }
        break;
      case 'number':
        if (value && isNaN(Number(value))) {
          errors.push(`${column.label} must be a valid number`);
        }
        break;
      case 'select':
        if (value && column.options && !column.options.includes(value)) {
          errors.push(`${column.label} must be one of: ${column.options.join(', ')}`);
        }
        break;
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Check if a string is a valid date
function isValidDate(dateString: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

// Create a new empty row for guest forms
export function createNewGuestRow(guestIndex: number, columns: TableColumn[]): TableRow {
  const data: Record<string, any> = {};
  
  columns.forEach(column => {
    if (column.key === 'guestNumber') {
      data[column.key] = guestIndex;
    } else {
      data[column.key] = '';
    }
  });
  
  return {
    id: `new-guest-${guestIndex}`,
    data,
    isNew: true,
    isModified: false,
  };
}

// Update a row's data
export function updateRowData(
  rows: TableRow[], 
  rowId: string, 
  field: string, 
  value: any
): TableRow[] {
  return rows.map(row => {
    if (row.id === rowId) {
      return {
        ...row,
        data: {
          ...row.data,
          [field]: value,
        },
        isModified: true,
      };
    }
    return row;
  });
}

// Detect document type from document data
export function detectDocumentType(document: DocumentWithRelations): DocumentDataType {
  return document.documentType === 'guest-form' || document.documentType === 'guest_form' 
    ? 'guest-form' 
    : 'single';
}

// Get field options for select fields - now includes dynamic current value
export function getFieldOptions(fieldKey: string, currentValue?: string): string[] | undefined {
  const optionsMap: Record<string, string[]> = {
    gender: ['M', 'F', 'Male', 'Female', 'Other', 'Not Specified'],
    documentType: ['Passport', 'ID Card', 'Driver License', 'Other'],
    eyeColor: ['Brown', 'Blue', 'Green', 'Hazel', 'Gray', 'Other'],
    hairColor: ['Black', 'Brown', 'Blonde', 'Red', 'Gray', 'White', 'Other'],
  };
  
  const fieldLower = fieldKey.toLowerCase();
  
  for (const [key, options] of Object.entries(optionsMap)) {
    if (fieldLower.includes(key)) {
      let finalOptions = [...options];
      
      // If we have a current value and it's not in the options, add it
      if (currentValue && !finalOptions.some(opt => 
        opt.toLowerCase() === currentValue.toLowerCase()
      )) {
        finalOptions.unshift(currentValue); // Add current value at the beginning
      }
      
      return finalOptions;
    }
  }
  
  return undefined;
}