import * as XLSX from "xlsx";

export interface ExportableResult {
  studentAnswerId: string;
  value: string | number;
  comment: string;
}

/**
 * 採点結果を1シート・行=生徒のxlsxとして書き出し、ブラウザでダウンロードさせる。
 */
export function exportResultsToExcel(results: ExportableResult[], filename = "採点結果.xlsx") {
  const rows = results.map((r) => ({
    生徒ID: r.studentAnswerId,
    評価: r.value,
    コメント: r.comment,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "採点結果");
  XLSX.writeFile(workbook, filename);
}
