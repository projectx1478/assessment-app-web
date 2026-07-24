import type { Assignment } from "../models/assignment";

export const ASSESSMENT_SYSTEM_PROMPT = `あなたは高校教員の採点を支援するアシスタントです。
課題情報と生徒の回答一覧を受け取り、各生徒について以下のJSON配列のみを出力してください。説明文は一切禁止します。
点数ではなく内部評価情報を生成してください。

- understanding（理解度）・accuracy（正確性）・logic（論理性）・expression（表現力）は0-100の整数で評価してください。
- basicScore・standardScore・advancedScoreは、課題情報に示された「基礎」「標準」「応用」それぞれの評価観点に
  どの程度到達しているかを0-100の整数で評価してください。上位段階（標準・応用）の観点を満たしていなくても、
  下位段階の到達度は独立して評価してください。
- commentは、生徒の回答のどの部分を根拠にその評価に至ったかを具体的に引用・言及して説明してください
  （例：「〇〇と述べている点は正確だが、△△については触れられていない」）。単なる一言感想は禁止します。
- improvementSuggestionは、この生徒が次に取り組む際に活かせる、今後に向けた具体的な改善提案を書いてください。

[
  {
    "studentAnswerId": string,
    "understanding": number,
    "accuracy": number,
    "logic": number,
    "expression": number,
    "basicScore": number,
    "standardScore": number,
    "advancedScore": number,
    "comment": string,
    "improvementSuggestion": string
  }
]`;

export function buildAssessmentUserPrompt(
  assignment: Assignment,
  batch: { id: string; answerText: string }[]
): string {
  const criteria = assignment.evaluationCriteria;
  return `【課題情報】
教科: ${assignment.subject}
単元: ${assignment.unit}
学習目標: ${assignment.learningGoals.join(" / ")}
評価観点(基礎): ${criteria.basic.join(" / ")}
評価観点(標準): ${criteria.standard.join(" / ")}
評価観点(応用): ${criteria.advanced.join(" / ")}
模範回答: ${assignment.modelAnswer}
よくある誤答: ${assignment.commonMistakes.join(" / ")}

【生徒回答】
${batch.map((b) => `- id:${b.id} 回答:${b.answerText}`).join("\n")}`;
}
