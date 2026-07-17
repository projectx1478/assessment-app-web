import * as XLSX from "xlsx";

export interface ParsedSheet {
  headers: string[];
  rows: Record<string, string>[];
}

/**
 * Excel(.xlsx)またはCSVファイルをパースする。
 * Google Spreadsheetは将来対応（別途Sheets API連携が必要）。
 */
export function parseSpreadsheetFile(
  buffer: ArrayBuffer,
  filename: string
): ParsedSheet {
  const type = filename.toLowerCase().endsWith(".csv") ? "string" : "array";
  const data = type === "string" ? new TextDecoder().decode(buffer) : buffer;

  const workbook = XLSX.read(data, { type: type === "string" ? "string" : "array" });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];

  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    defval: "",
    raw: false,
  });
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  return { headers, rows };
}
