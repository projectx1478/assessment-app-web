import type { Assignment } from "../models/assignment";

export const ASSESSMENT_SYSTEM_PROMPT = `あなたは高校教員の採点を支援するアシスタントです。
課題情報と生徒の回答一覧を受け取り、各生徒について以下のJSON配列のみを出力してください。説明文は一切禁止します。
点数ではなく内部評価情報を生成してください。理解度・正確性・論理性・表現力は0-100の整数で評価してください。
コメントは80文字以内にしてください。

[
  {
    "studentAnswerId": string,
    "understanding": number,
    "accuracy": number,
    "logic": number,
    "expression": number,
    "comment": string
  }
]`;

export function buildAssessmentUserPrompt(
  assignment: Assignment,
  batch: { id: string; answerText: string }[]
): string {
  return `【課題情報】
教科: ${assignment.subject}
単元: ${assignment.unit}
学習目標: ${assignment.learningGoals.join(" / ")}
評価観点: ${assignment.evaluationCriteria.join(" / ")}
模範回答: ${assignment.modelAnswer}
よくある誤答: ${assignment.commonMistakes.join(" / ")}

【生徒回答】
${batch.map((b) => `- id:${b.id} 回答:${b.answerText}`).join("\n")}`;
}
