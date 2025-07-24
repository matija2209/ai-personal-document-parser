import { prisma } from '@/lib/prisma';
import { DocumentUpdateRequest, UpdateResponse, FieldValidationError } from '@/types/document-data';
import { validateTableData, getDocumentSchema } from '@/lib/validations/document-schemas';

export class DocumentUpdateService {
  /**
   * Update document extraction data
   */
  static async updateDocumentData(request: DocumentUpdateRequest): Promise<UpdateResponse> {
    try {
      // Validate the request
      const validation = await this.validateUpdateRequest(request);
      if (!validation.success) {
        return {
          success: false,
          errors: validation.errors,
        };
      }

      // Get the document to determine its type
      const document = await prisma.document.findUnique({
        where: { id: request.documentId },
        include: {
          extractions: true,
          guestExtractions: true,
        },
      });

      if (!document) {
        return {
          success: false,
          errors: [{ field: 'documentId', message: 'Document not found' }],
        };
      }

      // Handle single document updates
      if (request.extractionData) {
        return await this.updateSingleDocumentExtraction(document, request.extractionData);
      }

      // Handle guest form updates
      if (request.guestData) {
        return await this.updateGuestExtractions(document, request.guestData);
      }

      return {
        success: false,
        errors: [{ field: 'general', message: 'No data provided for update' }],
      };
    } catch (error) {
      console.error('Error updating document data:', error);
      return {
        success: false,
        errors: [{ field: 'general', message: 'Internal server error' }],
      };
    }
  }

  /**
   * Update single document extraction
   */
  private static async updateSingleDocumentExtraction(
    document: any, 
    extractionData: Record<string, any>
  ): Promise<UpdateResponse> {
    const latestExtraction = document.extractions[0]; // Assuming ordered by latest

    if (!latestExtraction) {
      return {
        success: false,
        errors: [{ field: 'general', message: 'No extraction found to update' }],
      };
    }

    // Validate the extraction data
    const validation = validateTableData(extractionData, document.documentType);
    if (!validation.success) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    // Update the extraction
    const updatedExtraction = await prisma.extraction.update({
      where: { id: latestExtraction.id },
      data: {
        extractionData: validation.data as any,
        isManuallyCorrected: true,
        updatedAt: new Date(),
      },
    });

    // Also update the document status if needed
    await this.updateDocumentStatus(document.id);

    return {
      success: true,
      data: {
        extraction: updatedExtraction,
        documentId: document.id,
        type: 'single',
      },
    };
  }

  /**
   * Update guest extractions
   */
  private static async updateGuestExtractions(
    document: any, 
    guestData: Array<{ guestIndex: number; data: Record<string, any> }>
  ): Promise<UpdateResponse> {
    const results = [];
    const errors: FieldValidationError[] = [];

    for (const guest of guestData) {
      try {
        // Validate guest data
        const validation = validateTableData(guest.data, document.documentType);
        if (!validation.success) {
          errors.push(...validation.errors.map(err => ({
            ...err,
            field: `guest${guest.guestIndex}.${err.field}`,
          })));
          continue;
        }

        // Find existing guest extraction or create new one
        const existingGuest = document.guestExtractions.find(
          (ge: any) => ge.guestIndex === guest.guestIndex
        );

        let updatedGuest;
        if (existingGuest) {
          // Update existing guest
          updatedGuest = await prisma.guestExtraction.update({
            where: { id: existingGuest.id },
            data: {
              extractedData: validation.data as any,
            },
          });
        } else {
          // Create new guest extraction
          updatedGuest = await prisma.guestExtraction.create({
            data: {
              documentId: document.id,
              guestIndex: guest.guestIndex,
              extractedData: validation.data as any,
            },
          });
        }

        results.push(updatedGuest);
      } catch (error) {
        console.error(`Error updating guest ${guest.guestIndex}:`, error);
        errors.push({
          field: `guest${guest.guestIndex}`,
          message: 'Failed to update guest data',
        });
      }
    }

    if (errors.length > 0 && results.length === 0) {
      return {
        success: false,
        errors,
      };
    }

    // Update document status
    await this.updateDocumentStatus(document.id);

    return {
      success: true,
      data: {
        guestExtractions: results,
        documentId: document.id,
        type: 'guest-form',
        partialErrors: errors.length > 0 ? errors : undefined,
      },
    };
  }

  /**
   * Validate update request structure
   */
  private static async validateUpdateRequest(request: DocumentUpdateRequest): Promise<{
    success: boolean;
    errors: FieldValidationError[];
  }> {
    const errors: FieldValidationError[] = [];

    // Check document ID
    if (!request.documentId || typeof request.documentId !== 'string') {
      errors.push({ field: 'documentId', message: 'Document ID is required' });
    }

    // Check that at least one data type is provided
    if (!request.extractionData && !request.guestData) {
      errors.push({ 
        field: 'general', 
        message: 'Either extractionData or guestData must be provided' 
      });
    }

    // Validate guest data structure if provided
    if (request.guestData) {
      if (!Array.isArray(request.guestData)) {
        errors.push({ field: 'guestData', message: 'Guest data must be an array' });
      } else {
        request.guestData.forEach((guest, index) => {
          if (typeof guest.guestIndex !== 'number' || guest.guestIndex < 1) {
            errors.push({
              field: `guestData[${index}].guestIndex`,
              message: 'Guest index must be a positive number',
            });
          }
          if (!guest.data || typeof guest.data !== 'object') {
            errors.push({
              field: `guestData[${index}].data`,
              message: 'Guest data must be an object',
            });
          }
        });
      }
    }

    return {
      success: errors.length === 0,
      errors,
    };
  }

  /**
   * Update document processing status
   */
  private static async updateDocumentStatus(documentId: string): Promise<void> {
    // Get document with extractions to check completion status
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        extractions: true,
        guestExtractions: true,
      },
    });

    if (!document) return;

    // Mark as manually corrected if it has extractions/guest extractions
    const hasData = document.extractions.length > 0 || document.guestExtractions.length > 0;
    if (hasData && document.status !== 'completed') {
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'completed',
          updatedAt: new Date(),
        },
      });
    }
  }

  /**
   * Get document with full related data for editing
   */
  static async getDocumentForEditing(documentId: string) {
    try {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: {
          files: true,
          extractions: {
            orderBy: { createdAt: 'desc' },
          },
          guestExtractions: {
            orderBy: { guestIndex: 'asc' },
          },
          formTemplate: true,
          errors: {
            where: { resolved: false },
          },
        },
      });

      return document;
    } catch (error) {
      console.error('Error fetching document for editing:', error);
      return null;
    }
  }

  /**
   * Delete guest extraction
   */
  static async deleteGuestExtraction(documentId: string, guestIndex: number): Promise<UpdateResponse> {
    try {
      // Find the guest extraction
      const guestExtraction = await prisma.guestExtraction.findFirst({
        where: {
          documentId,
          guestIndex,
        },
      });

      if (!guestExtraction) {
        return {
          success: false,
          errors: [{ field: 'guestIndex', message: 'Guest not found' }],
        };
      }

      // Delete the extraction
      await prisma.guestExtraction.delete({
        where: { id: guestExtraction.id },
      });

      return {
        success: true,
        data: {
          deletedGuestIndex: guestIndex,
          documentId,
        },
      };
    } catch (error) {
      console.error('Error deleting guest extraction:', error);
      return {
        success: false,
        errors: [{ field: 'general', message: 'Failed to delete guest' }],
      };
    }
  }

  /**
   * Reorder guest extractions (useful after deletions)
   */
  static async reorderGuestExtractions(documentId: string): Promise<UpdateResponse> {
    try {
      const guests = await prisma.guestExtraction.findMany({
        where: { documentId },
        orderBy: { guestIndex: 'asc' },
      });

      // Update guest indices to be sequential starting from 1
      const updates = guests.map((guest, index) => 
        prisma.guestExtraction.update({
          where: { id: guest.id },
          data: { guestIndex: index + 1 },
        })
      );

      await Promise.all(updates);

      return {
        success: true,
        data: {
          reorderedCount: guests.length,
          documentId,
        },
      };
    } catch (error) {
      console.error('Error reordering guest extractions:', error);
      return {
        success: false,
        errors: [{ field: 'general', message: 'Failed to reorder guests' }],
      };
    }
  }
}