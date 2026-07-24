import * as XLSX from "xlsx";

export interface ExportableResult {
  studentAnswerId: string;
  threePerspective: { knowledge: string; thinking: string; attitude: string };
  fiveScale: number;
  hundred: number;
  comment: string;
  improvementSuggestion: string;
}

/**
 * 採点結果を1シート・行=生徒のxlsxとして書き出し、ブラウザでダウンロードさせる。
 * 三観点評価(ABC)・5段階評価・100点法の3方式をすべて列として含める。
 */
export function exportResultsToExcel(results: ExportableResult[], filename = "採点結果.xlsx") {
  const rows = results.map((r) => ({
    生徒ID: r.studentAnswerId,
    "三観点評価（知識）": r.threePerspective.knowledge,
    "三観点評価（思考）": r.threePerspective.thinking,
    "三観点評価（態度）": r.threePerspective.attitude,
    "5段階評価": r.fiveScale,
    "100点法": r.hundred,
    コメント: r.comment,
    改善提案: r.improvementSuggestion,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "採点結果");
  XLSX.writeFile(workbook, filename);
}
