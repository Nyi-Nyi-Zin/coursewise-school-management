export type ReportColumn<Row extends Record<string, unknown>> = { key: keyof Row; label: string };

function download(content: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function text(value: unknown) { return value === null || value === undefined ? "" : String(value); }
function escapeCsv(value: unknown) { return `"${text(value).replaceAll('"', '""')}"`; }
function escapeXml(value: unknown) { return text(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[character] ?? character)); }

export function downloadCsv<Row extends Record<string, unknown>>(filename: string, columns: ReportColumn<Row>[], rows: Row[]) {
  const csv = [columns.map(column => escapeCsv(column.label)).join(","), ...rows.map(row => columns.map(column => escapeCsv(row[column.key])).join(","))].join("\n");
  download(`\uFEFF${csv}`, `${filename}.csv`, "text/csv;charset=utf-8");
}

export function downloadExcelXml<Row extends Record<string, unknown>>(filename: string, title: string, columns: ReportColumn<Row>[], rows: Row[]) {
  const cells = (values: unknown[], header = false) => values.map(value => `<Cell${header ? ' ss:StyleID="header"' : ""}><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`).join("");
  const xml = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#143D36" ss:Pattern="Solid"/></Style></Styles><Worksheet ss:Name="Report"><Table><Row>${cells([title])}</Row><Row>${cells(columns.map(column => column.label), true)}</Row>${rows.map(row => `<Row>${cells(columns.map(column => row[column.key]))}</Row>`).join("")}</Table></Worksheet></Workbook>`;
  download(xml, `${filename}.xls`, "application/vnd.ms-excel;charset=utf-8");
}

export function printReport<Row extends Record<string, unknown>>(title: string, subtitle: string, columns: ReportColumn<Row>[], rows: Row[]) {
  const popup = window.open("", "_blank", "noopener,noreferrer,width=1100,height=800");
  if (!popup) throw new Error("Your browser blocked the report window. Please allow pop-ups and try again.");
  popup.document.write(`<!doctype html><html><head><title>${escapeXml(title)}</title><style>body{font-family:Arial,sans-serif;color:#173c35;padding:30px}h1{margin:0;font-family:Georgia,serif}p{color:#65756f}table{width:100%;border-collapse:collapse;margin-top:24px;font-size:12px}th{background:#143d36;color:#fff;text-align:left;padding:10px}td{border-bottom:1px solid #d7e4df;padding:9px}@media print{body{padding:0}}</style></head><body><h1>${escapeXml(title)}</h1><p>${escapeXml(subtitle)} · Generated ${escapeXml(new Date().toLocaleString())}</p><table><thead><tr>${columns.map(column => `<th>${escapeXml(column.label)}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${columns.map(column => `<td>${escapeXml(row[column.key])}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${columns.length}">No records available for this scope.</td></tr>`}</tbody></table><script>window.onload=()=>window.print();<\/script></body></html>`);
  popup.document.close();
}
