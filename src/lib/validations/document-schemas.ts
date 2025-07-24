import { z } from 'zod';

// Base field validation schemas
export const nameSchema = z.string().min(1, "Name is required").max(50, "Name must be less than 50 characters");
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)");
export const documentIdSchema = z.string().min(1, "Document ID is required").max(50, "Document ID must be less than 50 characters");
export const countrySchema = z.string().min(1, "Country is required").max(50, "Country name must be less than 50 characters");
export const addressSchema = z.string().min(1, "Address is required").max(200, "Address must be less than 200 characters");
export const phoneSchema = z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, "Invalid phone number format");
export const emailSchema = z.string().email("Invalid email format");

// Common document field schemas
export const commonDocumentFields = {
  firstName: nameSchema,
  lastName: nameSchema,
  fullName: z.string().min(1, "Full name is required").max(100, "Full name must be less than 100 characters"),
  dateOfBirth: dateSchema,
  birthDate: dateSchema,
  expirationDate: dateSchema,
  expiryDate: dateSchema,
  issueDate: dateSchema,
  documentNumber: documentIdSchema,
  documentId: documentIdSchema,
  licenseNumber: documentIdSchema,
  passportNumber: documentIdSchema,
  nationality: countrySchema,
  country: countrySchema,
  countryOfBirth: countrySchema,
  address: addressSchema,
  residenceAddress: addressSchema,
  phoneNumber: phoneSchema,
  email: emailSchema,
  gender: z.enum(['M', 'F', 'Male', 'Female', 'Other'], { message: "Invalid gender" }),
  height: z.string().regex(/^\d+(\.\d+)?\s*(cm|ft|in)?$/, "Invalid height format"),
  weight: z.string().regex(/^\d+(\.\d+)?\s*(kg|lbs)?$/, "Invalid weight format"),
  eyeColor: z.string().max(20, "Eye color must be less than 20 characters"),
  hairColor: z.string().max(20, "Hair color must be less than 20 characters"),
  issuingAuthority: z.string().max(100, "Issuing authority must be less than 100 characters"),
  placeOfBirth: z.string().max(100, "Place of birth must be less than 100 characters"),
};

// Dynamic schema generation for flexible field validation
export function createFieldSchema(fieldName: string, fieldType: 'text' | 'date' | 'number' | 'select', options?: {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  selectOptions?: string[];
}) {
  const opts = { required: true, minLength: 1, maxLength: 100, ...options };
  
  let schema: z.ZodSchema<any>;
  
  switch (fieldType) {
    case 'date':
      schema = dateSchema;
      break;
    case 'number':
      schema = z.string().regex(/^\d+(\.\d+)?$/, "Must be a valid number");
      break;
    case 'select':
      if (opts.selectOptions && opts.selectOptions.length > 0) {
        schema = z.enum(opts.selectOptions as [string, ...string[]], { message: "Invalid selection" });
      } else {
        schema = z.string().min(opts.minLength, `${fieldName} is required`);
      }
      break;
    default:
      let stringSchema = z.string().min(opts.minLength, `${fieldName} is required`).max(opts.maxLength, `${fieldName} must be less than ${opts.maxLength} characters`);
      if (opts.pattern) {
        stringSchema = stringSchema.regex(opts.pattern, `Invalid ${fieldName} format`);
      }
      schema = stringSchema;
  }
  
  return opts.required ? schema : schema.optional();
}

// Single document extraction schema
export const singleDocumentSchema = z.object({
  documentId: z.string().min(1, "Document ID is required"),
  extractionData: z.record(z.string(), z.any()).refine(
    (data) => Object.keys(data).length > 0,
    { message: "At least one field must be provided" }
  ),
});

// Guest form extraction schema
export const guestExtractionSchema = z.object({
  documentId: z.string().min(1, "Document ID is required"),
  guestData: z.array(z.object({
    guestIndex: z.number().min(1).max(10),
    data: z.record(z.string(), z.any()).refine(
      (data) => Object.keys(data).length > 0,
      { message: "At least one field must be provided for each guest" }
    ),
  })).min(1, "At least one guest must be provided"),
});

// Combined update schema
export const documentUpdateSchema = z.object({
  documentId: z.string().min(1, "Document ID is required"),
  extractionData: z.record(z.string(), z.any()).optional(),
  guestData: z.array(z.object({
    guestIndex: z.number().min(1).max(10),
    data: z.record(z.string(), z.any()),
  })).optional(),
}).refine(
  (data) => data.extractionData || data.guestData,
  { message: "Either extractionData or guestData must be provided" }
);

// Schema for driving license fields
export const drivingLicenseSchema = z.object({
  firstName: commonDocumentFields.firstName,
  lastName: commonDocumentFields.lastName,
  dateOfBirth: commonDocumentFields.dateOfBirth,
  expirationDate: commonDocumentFields.expirationDate,
  licenseNumber: commonDocumentFields.licenseNumber,
  address: commonDocumentFields.address,
  gender: commonDocumentFields.gender.optional(),
  height: commonDocumentFields.height.optional(),
  weight: commonDocumentFields.weight.optional(),
  eyeColor: commonDocumentFields.eyeColor.optional(),
  issuingAuthority: commonDocumentFields.issuingAuthority.optional(),
}).partial();

// Schema for passport fields
export const passportSchema = z.object({
  firstName: commonDocumentFields.firstName,
  lastName: commonDocumentFields.lastName,
  dateOfBirth: commonDocumentFields.dateOfBirth,
  expirationDate: commonDocumentFields.expirationDate,
  passportNumber: commonDocumentFields.passportNumber,
  nationality: commonDocumentFields.nationality,
  countryOfBirth: commonDocumentFields.countryOfBirth.optional(),
  placeOfBirth: commonDocumentFields.placeOfBirth.optional(),
  gender: commonDocumentFields.gender.optional(),
  issuingAuthority: commonDocumentFields.issuingAuthority.optional(),
}).partial();

// Schema for guest form fields (more flexible)
export const guestFormSchema = z.object({
  firstName: commonDocumentFields.firstName,
  lastName: commonDocumentFields.lastName,
  birthDate: commonDocumentFields.birthDate.optional(),
  country: commonDocumentFields.country.optional(),
  documentType: z.string().max(50, "Document type must be less than 50 characters").optional(),
  documentId: commonDocumentFields.documentId.optional(),
  phoneNumber: commonDocumentFields.phoneNumber.optional(),
  email: commonDocumentFields.email.optional(),
  address: commonDocumentFields.address.optional(),
}).partial();

// Function to get appropriate schema based on document type
export function getDocumentSchema(documentType: string) {
  switch (documentType.toLowerCase()) {
    case 'driving_license':
    case 'driver_license':
      return drivingLicenseSchema;
    case 'passport':
      return passportSchema;
    case 'guest-form':
    case 'guest_form':
      return guestFormSchema;
    default:
      // Generic schema for unknown document types
      return z.record(z.string(), z.any().optional());
  }
}

// Validation function for table data
export function validateTableData(
  data: Record<string, any>,
  documentType: string,
  fieldTypes?: Record<string, 'text' | 'date' | 'number' | 'select'>
) {
  const schema = getDocumentSchema(documentType);
  
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return { success: false, data: null, errors: fieldErrors };
    }
    return { success: false, data: null, errors: [{ field: 'general', message: 'Validation failed' }] };
  }
}

// Export types
export type DocumentUpdateRequest = z.infer<typeof documentUpdateSchema>;
export type SingleDocumentRequest = z.infer<typeof singleDocumentSchema>;
export type GuestExtractionRequest = z.infer<typeof guestExtractionSchema>;
export type DrivingLicenseData = z.infer<typeof drivingLicenseSchema>;
export type PassportData = z.infer<typeof passportSchema>;
export type GuestFormData = z.infer<typeof guestFormSchema>;