/**
 * 個人情報（氏名等）を判定するためのヘッダーキーワード。
 * この列の値はGemini APIへ絶対に送信しない。
 */
const NAME_HEADER_KEYWORDS = ["氏名", "名前", "name", "生徒名", "フルネーム"];
const EMAIL_HEADER_KEYWORDS = ["メール", "mail"];

export function isNameColumn(header: string): boolean {
  const normalized = header.trim().toLowerCase();
  return NAME_HEADER_KEYWORDS.some((k) => normalized.includes(k.toLowerCase()));
}

export function isEmailColumn(header: string): boolean {
  const normalized = header.trim().toLowerCase();
  return EMAIL_HEADER_KEYWORDS.some((k) => normalized.includes(k.toLowerCase()));
}

/**
 * 氏名・メールアドレスなど、Gemini APIへ絶対に送信してはいけない列かどうか。
 */
export function isPiiColumn(header: string): boolean {
  return isNameColumn(header) || isEmailColumn(header);
}

/**
 * 行データからPII列を取り除いたコピーを返す。
 * Analysis EngineやAssessment Engineに渡す前に必ずこれを通す。
 */
export function stripPiiColumns<T extends Record<string, unknown>>(
  row: T,
  headers: string[]
): Partial<T> {
  const result: Partial<T> = { ...row };
  for (const header of headers) {
    if (isPiiColumn(header)) {
      delete result[header as keyof T];
    }
  }
  return result;
}
