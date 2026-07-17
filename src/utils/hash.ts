/**
 * 課題内容を正規化してSHA-256ハッシュを生成し、assignmentIdとする。
 * 同一内容の課題は常に同じIDになり、Analysis Engineの再実行を回避する。
 */
export async function generateAssignmentId(rawContent: string): Promise<string> {
  const normalized = rawContent.trim().replace(/\s+/g, " ");
  const data = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(digest));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
