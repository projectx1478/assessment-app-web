export const ANALYSIS_SYSTEM_PROMPT = `あなたは高校教員の課題設計を支援するアシスタントです。
入力された課題内容を解析し、以下のJSON形式のみを出力してください。説明文は一切禁止します。

{
  "subject": string,
  "unit": string,
  "learningGoals": string[],
  "evaluationCriteria": string[],
  "modelAnswer": string,
  "commonMistakes": string[]
}`;

export function buildAnalysisUserPrompt(rawContent: string): string {
  return `以下は生徒に出題した課題の内容です。上記フォーマットで解析してください。\n\n---\n${rawContent}`;
}
