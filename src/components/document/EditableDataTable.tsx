'use client';

import { useState, useCallback } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil, Copy, Plus } from 'lucide-react';
import { DocumentWithRelations, EditableTableData, TableRow as TableRowType } from '@/types/document-data';
import { 
  transformDocumentToTableData, 
  copyToClipboard, 
  formatCellValue,
  createNewGuestRow,
  updateRowData
} from '@/lib/utils/document-data-utils';
import { EditDataDialog } from './EditDataDialog';
import { toast } from 'sonner';

interface EditableDataTableProps {
  document: DocumentWithRelations;
  onDataUpdate?: (updatedData: any) => void;
  className?: string;
}

export function EditableDataTable({ 
  document, 
  onDataUpdate,
  className 
}: EditableDataTableProps) {
  const [tableData, setTableData] = useState<EditableTableData>(() => 
    transformDocumentToTableData(document)
  );
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Handle row hover for edit button display
  const handleRowMouseEnter = useCallback((rowId: string) => {
    setHoveredRow(rowId);
  }, []);

  const handleRowMouseLeave = useCallback(() => {
    setHoveredRow(null);
  }, []);

  // Handle cell click for copy functionality
  const handleCellClick = useCallback(async (value: any, fieldName: string) => {
    await copyToClipboard(value, fieldName);
  }, []);

  // Handle edit button click
  const handleEditClick = useCallback((rowId: string) => {
    setEditingRow(rowId);
  }, []);

  // Handle dialog close
  const handleDialogClose = useCallback(() => {
    setEditingRow(null);
  }, []);

  // Handle data save from dialog
  const handleDataSave = useCallback(async (rowId: string, updatedData: Record<string, any>) => {
    setIsLoading(true);
    try {
      // Update local state
      const updatedRows = updateRowData(tableData.rows, rowId, '', updatedData);
      const updatedTableData = { ...tableData, rows: updatedRows };
      setTableData(updatedTableData);

      // Prepare data for API call
      const requestData = {
        documentId: document.id,
        ...(tableData.documentType === 'single' 
          ? { extractionData: updatedData }
          : { 
              guestData: [{
                guestIndex: updatedData.guestNumber || 1,
                data: { ...updatedData }
              }]
            }
        )
      };

      // Call API to save changes
      const response = await fetch(`/api/documents/${document.id}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error('Failed to save changes');
      }

      const result = await response.json();
      
      // Call parent update handler
      if (onDataUpdate) {
        onDataUpdate(result.data);
      }

      toast.success('Changes saved successfully!');
      setEditingRow(null);
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save changes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [tableData, document.id, onDataUpdate]);

  // Handle adding new guest row
  const handleAddGuestRow = useCallback(() => {
    if (tableData.documentType !== 'guest-form') return;
    
    const nextGuestIndex = Math.max(...tableData.rows.map(r => r.data.guestNumber || 0)) + 1;
    const newRow = createNewGuestRow(nextGuestIndex, tableData.columns);
    
    setTableData(prev => ({
      ...prev,
      rows: [...prev.rows, newRow]
    }));
  }, [tableData]);

  // Get edit dialog data for current editing row
  const getEditDialogData = useCallback(() => {
    if (!editingRow) return null;
    
    const row = tableData.rows.find(r => r.id === editingRow);
    if (!row) return null;
    
    return {
      rowId: editingRow,
      rowData: row.data,
      columns: tableData.columns,
      documentType: tableData.documentType,
    };
  }, [editingRow, tableData]);

  // Render empty state
  if (tableData.columns.length === 0 || tableData.rows.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Document Data</CardTitle>
          <CardDescription>
            {document.status === 'processing' 
              ? 'Document is still being processed...' 
              : 'No extraction data available'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">
            {document.status === 'processing' 
              ? 'Please wait while we extract the data from your document.' 
              : 'No data has been extracted from this document yet.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Document Data</CardTitle>
            <CardDescription>
              {tableData.documentType === 'guest-form' 
                ? `Guest form data (${tableData.rows.length} guests)`
                : 'Extracted document information'
              }
            </CardDescription>
          </div>
          
          {tableData.documentType === 'guest-form' && (
            <Button 
              onClick={handleAddGuestRow}
              variant="outline" 
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Guest
            </Button>
          )}
        </CardHeader>

        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {tableData.columns.map((column) => (
                    <TableHead key={column.key}>
                      <div className="flex items-center gap-2">
                        {column.label}
                        {column.required && (
                          <Badge variant="secondary" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              
              <TableBody>
                {tableData.rows.map((row) => (
                  <TableRow
                    key={row.id}
                    onMouseEnter={() => handleRowMouseEnter(row.id)}
                    onMouseLeave={handleRowMouseLeave}
                    className={`group transition-colors cursor-pointer
                      ${row.isNew ? 'bg-blue-50 hover:bg-blue-100' : ''}
                      ${row.isModified ? 'bg-yellow-50 hover:bg-yellow-100' : ''}
                      ${!row.isNew && !row.isModified ? 'hover:bg-muted/50' : ''}
                    `}
                  >
                    {tableData.columns.map((column) => (
                      <TableCell
                        key={column.key}
                        onClick={() => handleCellClick(row.data[column.key], column.label)}
                        className="relative transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate max-w-[200px]" title={formatCellValue(row.data[column.key])}>
                            {formatCellValue(row.data[column.key]) || (
                              <span className="text-muted-foreground italic">
                                No data
                              </span>
                            )}
                          </span>
                          
                          {hoveredRow === row.id && (
                            <></>
                            // <Copy className="h-3 w-3 text-muted-foreground ml-2 opacity-50 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </TableCell>
                    ))}
                    
                    <TableCell>
                      {hoveredRow === row.id && (
                        // <></>
                        <button
                          // variant="ghost"
                          // size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(row.id);
                          }}
                          // className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Instructions */}
          <div className="mt-4 text-sm text-muted-foreground">
            <p>
              • Click any cell to copy its value to the clipboard
              • Hover over a row and click the edit button to modify data
              {tableData.documentType === 'guest-form' && (
                <span> • Use "Add Guest" to include additional guest entries</span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingRow && (
        <EditDataDialog
          data={getEditDialogData()!}
          onSave={handleDataSave}
          onClose={handleDialogClose}
          isLoading={isLoading}
        />
      )}
    </>
  );
}