/**
 * Password export utilities for JSON, CSV, and PDF formats
 */

/**
 * Export passwords as JSON
 */
export function exportAsJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `${filename}.json`);
}

/**
 * Export passwords as CSV
 */
export function exportAsCSV(passwords, filename) {
  // CSV header
  const headers = ['Name', 'Username/Email', 'Password', 'Website', 'Category', 'Notes', 'Space', 'Created', 'Updated'];
  
  // Convert passwords to CSV rows
  const rows = passwords.map(pwd => {
    const escapeCSV = (str) => {
      if (!str) return '';
      const stringValue = String(str);
      // Escape quotes and wrap in quotes if contains comma, newline, or quote
      if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    return [
      escapeCSV(pwd.displayName || ''),
      escapeCSV(pwd.username || ''),
      escapeCSV(pwd.password || ''),
      escapeCSV(pwd.website || ''),
      escapeCSV(pwd.category || ''),
      escapeCSV(pwd.notes || ''),
      escapeCSV(pwd.spaceId || ''),
      escapeCSV(pwd.createdAt || ''),
      escapeCSV(pwd.updatedAt || '')
    ].join(',');
  });

  // Combine headers and rows
  const csvContent = [headers.join(','), ...rows].join('\n');
  
  // Add BOM for Excel compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Export passwords as PDF (simple text-based PDF)
 */
export function exportAsPDF(passwords, exportData, filename) {
  // Create a simple PDF-like structure using text
  // For a more advanced PDF, you'd use jspdf, but this works without dependencies
  let pdfContent = `AllOne Password Export\n`;
  pdfContent += `Export Date: ${exportData.exportDate || new Date().toISOString()}\n`;
  pdfContent += `Total Passwords: ${exportData.totalPasswords || passwords.length}\n`;
  pdfContent += `\n${'='.repeat(80)}\n\n`;

  passwords.forEach((pwd, index) => {
    pdfContent += `Password ${index + 1}\n`;
    pdfContent += `${'-'.repeat(40)}\n`;
    pdfContent += `Name: ${pwd.displayName || 'N/A'}\n`;
    pdfContent += `Username/Email: ${pwd.username || 'N/A'}\n`;
    pdfContent += `Password: ${pwd.password || 'N/A'}\n`;
    pdfContent += `Website: ${pwd.website || 'N/A'}\n`;
    pdfContent += `Category: ${pwd.category || 'N/A'}\n`;
    if (pwd.notes) {
      pdfContent += `Notes: ${pwd.notes}\n`;
    }
    pdfContent += `Space: ${pwd.spaceId || 'N/A'}\n`;
    if (pwd.createdAt) {
      pdfContent += `Created: ${new Date(pwd.createdAt).toLocaleString()}\n`;
    }
    pdfContent += `\n`;
  });

  // Create a simple text file (can be opened as PDF or converted)
  // For a true PDF, we'd need jspdf, but this provides a readable format
  const blob = new Blob([pdfContent], { type: 'text/plain' });
  downloadBlob(blob, `${filename}.txt`);
  
  // Note: For true PDF generation, install jspdf:
  // npm install jspdf
  // Then use: import jsPDF from 'jspdf';
}

/**
 * Helper function to download a blob
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Main export function that handles all formats
 */
export function exportPasswords(decryptedPasswords, exportData, format = 'json') {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `allone-passwords-export-${dateStr}`;

  const finalExport = {
    ...exportData,
    passwords: decryptedPasswords
  };

  try {
    switch (format.toLowerCase()) {
      case 'json':
        exportAsJSON(finalExport, filename);
        break;
      case 'csv':
        exportAsCSV(decryptedPasswords, filename);
        break;
      case 'pdf':
        exportAsPDF(decryptedPasswords, exportData, filename);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
    return true;
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
}

