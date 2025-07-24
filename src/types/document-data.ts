// Unified data types for document processing and editing

export interface Document {
  id: string;
  userId: string;
  documentType: string;
  status: string;
  retentionDays: number | null;
  formTemplateId: string | null;
  guestCount: number | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface DocumentFile {
  id: string;
  documentId: string | null;
  userId: string;
  fileKey: string;
  filePath: string;
  fileType: string | null;
  originalFileName: string;
  compressedSize: number;
  originalSize: number;
  mimeType: string;
  uploadedAt: Date;
  createdAt: Date;
}

export interface Extraction {
  id: string;
  documentId: string;
  modelName: string;
  extractionData: Record<string, any>;
  fieldsForReview: string[] | null;
  confidenceScore: number | null;
  processingTimeMs: number | null;
  isManuallyCorrected: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GuestExtraction {
  id: string;
  documentId: string;
  guestIndex: number;
  extractedData: Record<string, any>;
  createdAt: Date;
}

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  fields: string[];
  maxGuests: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessingError {
  id: string;
  documentId: string | null;
  errorType: string;
  errorMessage: string;
  errorDetails: Record<string, any> | null;
  stepFailed: string;
  retryCount: number;
  resolved: boolean;
  createdAt: Date;
}

// Extended types for components
export interface DocumentWithRelations extends Document {
  files: DocumentFile[];
  extractions: Extraction[];
  guestExtractions: GuestExtraction[];
  formTemplate: FormTemplate | null;
  errors: ProcessingError[];
}

// Table data structures
export interface TableColumn {
  key: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'select';
  required?: boolean;
  options?: string[]; // For select types
}

export interface TableRow {
  id: string;
  data: Record<string, any>;
  isNew?: boolean;
  isModified?: boolean;
}

export interface EditableTableData {
  columns: TableColumn[];
  rows: TableRow[];
  documentType: 'single' | 'guest-form';
  documentId: string;
}

// Update request types
export interface DocumentUpdateRequest {
  documentId: string;
  extractionData?: Record<string, any>;
  guestData?: Array<{
    guestIndex: number;
    data: Record<string, any>;
  }>;
}

export interface FieldValidationError {
  field: string;
  message: string;
}

export interface UpdateResponse {
  success: boolean;
  data?: any;
  errors?: FieldValidationError[];
}

// Utility types
export type DocumentDataType = 'single' | 'guest-form';

export interface DataCellProps {
  value: any;
  field: string;
  rowId: string;
  onEdit: (rowId: string, field: string, value: any) => void;
  isEditable: boolean;
  fieldType: TableColumn['type'];
}

export interface EditDialogData {
  rowId: string;
  rowData: Record<string, any>;
  columns: TableColumn[];
  documentType: DocumentDataType;
}