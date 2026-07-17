import { isPiiColumn, stripPiiColumns } from "../../utils/piiFilter";
import type { StudentAnswer } from "../../models/assignment";
import { parseSpreadsheetFile, type ParsedSheet } from "./fileParser";

export type ColumnRole = "name" | "number" | "question" | "freeText" | "unknown";

const NUMBER_KEYWORDS = ["番号", "no", "no.", "出席番号", "id"];
const QUESTION_KEYWORDS = ["設問", "問題", "問", "question"];
const FREE_TEXT_KEYWORDS = ["回答", "記述", "解答", "answer", "自由記述"];

/**
 * ヘッダー名からローカルにロール判定する（AI呼ばない、Rule準拠）。
 * 氏名列は"name"として検出されるが、内容はstripPiiColumnsで必ず除外すること。
 */
export function detectColumnRole(header: string): ColumnRole {
  const h = header.trim().toLowerCase();
  if (isPiiColumn(header)) return "name";
  if (NUMBER_KEYWORDS.some((k) => h.includes(k))) return "number";
  if (QUESTION_KEYWORDS.some((k) => h.includes(k))) return "question";
  if (FREE_TEXT_KEYWORDS.some((k) => h.includes(k))) return "freeText";
  return "unknown";
}

export interface DetectedColumns {
  nameHeader?: string;
  numberHeader?: string;
  questionHeaders: string[];
  freeTextHeaders: string[];
  unknownHeaders: string[];
}

export interface ManualColumnOverride {
  nameHeader?: string;
  numberHeader?: string;
  questionHeaders?: string[];
  freeTextHeaders?: string[];
}

/**
 * unknownHeadersが残った場合、教員が手動割当した内容で上書きする。
 */
export function applyManualOverride(
  detected: DetectedColumns,
  override: ManualColumnOverride
): DetectedColumns {
  const assigned = new Set([
    ...(override.questionHeaders ?? []),
    ...(override.freeTextHeaders ?? []),
    override.nameHeader,
    override.numberHeader,
  ]);
  return {
    nameHeader: override.nameHeader ?? detected.nameHeader,
    numberHeader: override.numberHeader ?? detected.numberHeader,
    questionHeaders: [
      ...detected.questionHeaders,
      ...(override.questionHeaders ?? []),
    ],
    freeTextHeaders: [
      ...detected.freeTextHeaders,
      ...(override.freeTextHeaders ?? []),
    ],
    unknownHeaders: detected.unknownHeaders.filter((h) => !assigned.has(h)),
  };
}

export interface ImportResult {
  columns: DetectedColumns;
  studentAnswers: StudentAnswer[];
}

/**
 * Excel/CSVを読み込み、列判定→PII除外→StudentAnswer抽出まで行う。
 * unknownHeadersが残る場合はUI側でapplyManualOverrideを呼んでから再実行する。
 */
export function importFromFile(
  buffer: ArrayBuffer,
  filename: string,
  assignmentId: string,
  override?: ManualColumnOverride
): ImportResult {
  const { headers, rows }: ParsedSheet = parseSpreadsheetFile(buffer, filename);
  let columns = detectColumns(headers);
  if (override) columns = applyManualOverride(columns, override);

  const studentAnswers: StudentAnswer[] = rows.map((row, i) => {
    const safeRow = stripPiiColumns(row, headers);
    const answerText = columns.freeTextHeaders.map((h) => String(safeRow[h] ?? "")).join("\n");
    const idSource = columns.numberHeader ? String(row[columns.numberHeader]) : String(i);
    return { id: idSource, assignmentId, answerText };
  });

  return { columns, studentAnswers };
}

export function detectColumns(headers: string[]): DetectedColumns {
  const result: DetectedColumns = {
    questionHeaders: [],
    freeTextHeaders: [],
    unknownHeaders: [],
  };
  for (const header of headers) {
    const role = detectColumnRole(header);
    if (role === "name") result.nameHeader = header;
    else if (role === "number") result.numberHeader = header;
    else if (role === "question") result.questionHeaders.push(header);
    else if (role === "freeText") result.freeTextHeaders.push(header);
    else result.unknownHeaders.push(header);
  }
  return result;
}
