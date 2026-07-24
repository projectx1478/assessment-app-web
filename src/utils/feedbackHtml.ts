export type FeedbackGradeScale = "abc" | "fiveScale" | "hundred";

export interface FeedbackGradeInput {
  threePerspective: { knowledge: string; thinking: string; attitude: string };
  fiveScale: number;
  hundred: number;
}

export function formatGradeLabel(result: FeedbackGradeInput, scale: FeedbackGradeScale): string {
  if (scale === "hundred") return `${result.hundred}点`;
  if (scale === "fiveScale") return `5段階評価: ${result.fiveScale}`;
  return `三観点評価　知識:${result.threePerspective.knowledge} / 思考:${result.threePerspective.thinking} / 態度:${result.threePerspective.attitude}`;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAndBreak(text: string): string {
  return escapeHtml(text).replace(/\n/g, "<br>");
}

export interface FeedbackEmailContent {
  assignmentLabel: string;
  assignmentText: string;
  answerText: string;
  comment: string;
  improvementSuggestion: string;
  // undefined/空文字なら成績セクションを表示しない
  gradeLabel?: string;
}

/**
 * 生徒向けフィードバックメールのHTML本文を組み立てる。
 * 課題文・生徒の回答を表形式で転記し、評価根拠・改善提案を別セクションで示す。
 */
export function buildFeedbackEmailHtml(content: FeedbackEmailContent): string {
  const { assignmentLabel, assignmentText, answerText, comment, improvementSuggestion, gradeLabel } =
    content;

  return `<div style="font-family: sans-serif; color:#222; line-height:1.7;">
  <p>${escapeHtml(assignmentLabel)} の評価フィードバックです。</p>
  <table style="border-collapse:collapse; width:100%; margin:12px 0;">
    <tr>
      <th style="text-align:left; background:#f3f3f3; border:1px solid #ccc; padding:8px; width:120px;">課題</th>
      <td style="border:1px solid #ccc; padding:8px;">${escapeAndBreak(assignmentText)}</td>
    </tr>
    <tr>
      <th style="text-align:left; background:#f3f3f3; border:1px solid #ccc; padding:8px;">あなたの回答</th>
      <td style="border:1px solid #ccc; padding:8px;">${escapeAndBreak(answerText)}</td>
    </tr>
  </table>
  ${gradeLabel ? `<p><strong>評価: ${escapeHtml(gradeLabel)}</strong></p>` : ""}
  <h3 style="margin-bottom:4px;">評価コメント</h3>
  <p>${escapeAndBreak(comment)}</p>
  <h3 style="margin-bottom:4px;">今後に向けた改善点</h3>
  <p>${escapeAndBreak(improvementSuggestion)}</p>
</div>`;
}
