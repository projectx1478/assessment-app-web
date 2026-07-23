import { isEmailColumn, isNameColumn, stripPiiColumns } from "../../utils/piiFilter";
import type { StudentAnswer } from "../../models/assignment";
import { parseSpreadsheetFile, type ParsedSheet } from "./fileParser";

export type ColumnRole = "name" | "email" | "number" | "question" | "freeText" | "unknown";

const NUMBER_KEYWORDS = ["番号", "no", "no.", "出席番号", "id"];
const QUESTION_KEYWORDS = ["設問", "問題", "問", "question"];
const FREE_TEXT_KEYWORDS = ["回答", "記述", "解答", "answer", "自由記述"];

/**
 * ヘッダー名からローカルにロール判定する（AI呼ばない、Rule準拠）。
 * 氏名・メールアドレス列は検出されるが、内容はstripPiiColumnsで必ず除外すること。
 */
export function detectColumnRole(header: string): ColumnRole {
  const h = header.trim().toLowerCase();
  if (isEmailColumn(header)) return "email";
  if (isNameColumn(header)) return "name";
  if (NUMBER_KEYWORDS.some((k) => h.includes(k))) return "number";
  // 「設問1：回答」のように両方のキーワードを含む列名は、採点対象である
  // freeText（回答本文）を優先する。設問キーワードのみ含む列はquestionのまま。
  if (FREE_TEXT_KEYWORDS.some((k) => h.includes(k))) return "freeText";
  if (QUESTION_KEYWORDS.some((k) => h.includes(k))) return "question";
  return "unknown";
}

export interface DetectedColumns {
  nameHeader?: string;
  emailHeader?: string;
  numberHeader?: string;
  questionHeaders: string[];
  freeTextHeaders: string[];
  unknownHeaders: string[];
}

export interface ManualColumnOverride {
  nameHeader?: string;
  emailHeader?: string;
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
    override.emailHeader,
    override.numberHeader,
  ]);
  return {
    nameHeader: override.nameHeader ?? detected.nameHeader,
    emailHeader: override.emailHeader ?? detected.emailHeader,
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
  // 生徒番号 → メールアドレス。Gemini APIには送信せず、Classroom連携等の
  // クライアントサイド処理でのみ使用する（PROJECT.md PII方針に準拠）。
  emailByStudentId: Record<string, string>;
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

  const emailByStudentId: Record<string, string> = {};

  const studentAnswers: StudentAnswer[] = rows.map((row, i) => {
    const safeRow = stripPiiColumns(row, headers);
    const answerText = columns.freeTextHeaders.map((h) => String(safeRow[h] ?? "")).join("\n");
    const idSource = columns.numberHeader ? String(row[columns.numberHeader]) : String(i);

    if (columns.emailHeader) {
      const email = String(row[columns.emailHeader] ?? "").trim();
      if (email) emailByStudentId[idSource] = email;
    }

    return { id: idSource, assignmentId, answerText };
  });

  return { columns, studentAnswers, emailByStudentId };
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
    else if (role === "email") result.emailHeader = header;
    else if (role === "number") result.numberHeader = header;
    else if (role === "question") result.questionHeaders.push(header);
    else if (role === "freeText") result.freeTextHeaders.push(header);
    else result.unknownHeaders.push(header);
  }
  return result;
}
