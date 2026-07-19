import * as XLSX from "xlsx";

export interface ExportableResult {
  studentAnswerId: string;
  threePerspective: { basic: string; standard: string; advanced: string };
  fiveScale: number;
  hundred: number;
  comment: string;
}

/**
 * 採点結果を1シート・行=生徒のxlsxとして書き出し、ブラウザでダウンロードさせる。
 * 三観点評価(ABC)・5段階評価・100点法の3方式をすべて列として含める。
 */
export function exportResultsToExcel(results: ExportableResult[], filename = "採点結果.xlsx") {
  const rows = results.map((r) => ({
    生徒ID: r.studentAnswerId,
    "三観点評価（基礎）": r.threePerspective.basic,
    "三観点評価（標準）": r.threePerspective.standard,
    "三観点評価（応用）": r.threePerspective.advanced,
    "5段階評価": r.fiveScale,
    "100点法": r.hundred,
    コメント: r.comment,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "採点結果");
  XLSX.writeFile(workbook, filename);
}
