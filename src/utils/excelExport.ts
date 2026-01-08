import * as XLSX from 'xlsx';

/**
 * Export data to Excel file
 * @param data - Array of objects to export
 * @param filename - Name of the file (without extension)
 * @param sheetName - Name of the Excel sheet (default: 'Sheet1')
 */
export const exportToExcel = (
  data: any[],
  filename: string,
  sheetName: string = 'Sheet1'
) => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Convert data to worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Auto-size columns
  const maxWidth = 50; // Maximum column width
  const minWidth = 10; // Minimum column width
  const colWidths = Object.keys(data[0]).map((key) => {
    const maxLength = Math.max(
      key.length,
      ...data.map((row) => {
        const value = row[key];
        return value ? String(value).length : 0;
      })
    );
    return {
      wch: Math.min(Math.max(maxLength + 2, minWidth), maxWidth),
    };
  });
  worksheet['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generate Excel file and trigger download
  const timestamp = new Date().toISOString().split('T')[0];
  const fullFilename = `${filename}_${timestamp}.xlsx`;
  XLSX.writeFile(workbook, fullFilename);
};

