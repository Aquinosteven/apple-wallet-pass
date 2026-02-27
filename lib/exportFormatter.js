function escapeCsvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

export function buildCsvBuffer(rows) {
  const safeRows = Array.isArray(rows) ? rows : [];
  if (!safeRows.length) {
    return Buffer.from("no_data\n", "utf8");
  }

  const header = Object.keys(safeRows[0]);
  const lines = [header.join(",")];
  for (const row of safeRows) {
    lines.push(header.map((key) => escapeCsvCell(row[key])).join(","));
  }
  return Buffer.from(lines.join("\n"), "utf8");
}

function xmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function buildSpreadsheetXmlBuffer(rows) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const header = safeRows.length ? Object.keys(safeRows[0]) : ["no_data"];
  const matrix = [header, ...safeRows.map((row) => header.map((key) => row[key] ?? ""))];

  const xmlRows = matrix
    .map((cells) => {
      const xmlCells = cells
        .map((cell) => `<Cell><Data ss:Type="String">${xmlEscape(cell)}</Data></Cell>`)
        .join("");
      return `<Row>${xmlCells}</Row>`;
    })
    .join("");

  const workbook = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Export">
  <Table>${xmlRows}</Table>
 </Worksheet>
</Workbook>`;

  return Buffer.from(workbook, "utf8");
}
