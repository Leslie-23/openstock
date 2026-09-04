export interface ExportColumn {
  key: string;
  label: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function buildExportFilename(title: string, ext: string, dateLabel?: string): string {
  const rawDate = dateLabel || new Date().toISOString().split('T')[0];
  const safeDate = rawDate.replace(/[^a-z0-9_-]/gi, '-');
  return `${slugify(title)}-${safeDate}.${ext}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

export function exportRowsToCSV(
  title: string,
  columns: ExportColumn[],
  rows: Record<string, unknown>[],
  dateLabel?: string,
) {
  const header = columns.map((c) => csvEscape(c.label)).join(',');
  const body = rows.map((row) => columns.map((c) => csvEscape(row[c.key])).join(','));
  const csv = [header, ...body].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, buildExportFilename(title, 'csv', dateLabel));
}

export async function exportRowsToExcel(
  title: string,
  columns: ExportColumn[],
  rows: Record<string, unknown>[],
  dateLabel?: string,
) {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(title.slice(0, 31) || 'Report');
  sheet.columns = columns.map((c) => ({
    header: c.label,
    key: c.key,
    width: Math.max(c.label.length + 4, 14),
  }));
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) sheet.addRow(row);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, buildExportFilename(title, 'xlsx', dateLabel));
}

export async function exportRowsToPDF(
  title: string,
  columns: ExportColumn[],
  rows: Record<string, unknown>[],
  dateLabel?: string,
  subtitle?: string,
) {
  const { default: JsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new JsPDF({ orientation: columns.length > 6 ? 'landscape' : 'portrait' });

  doc.setFontSize(14);
  doc.text(title, 14, 16);
  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(subtitle, 14, 22);
    doc.setTextColor(0);
  }

  autoTable(doc, {
    startY: subtitle ? 28 : 22,
    head: [columns.map((c) => c.label)],
    body: rows.map((row) => columns.map((c) => String(row[c.key] ?? ''))),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [31, 41, 55] },
  });

  doc.save(buildExportFilename(title, 'pdf', dateLabel));
}
