import type { Assignment } from "../models/assignment";

export const ASSESSMENT_SYSTEM_PROMPT = `あなたは高校教員の採点を支援するアシスタントです。
課題情報と生徒の回答一覧を受け取り、各生徒について以下のJSON配列のみを出力してください。説明文は一切禁止します。
点数ではなく内部評価情報を生成してください。

- understanding（理解度）・accuracy（正確性）・logic（論理性）・expression（表現力）は0-100の整数で評価してください。
- knowledgeBasic・knowledgeStandard・knowledgeAdvanced・thinkingBasic・thinkingStandard・thinkingAdvanced・attitudeBasic・attitudeStandard・attitudeAdvancedは、
  課題情報に示された「知識」「思考」「態度」それぞれについて、「基礎」「標準」「応用」の到達度を0-100の整数で評価してください。
  上位段階（標準・応用）の観点を満たしていなくても、下位段階の到達度は独立して評価してください。
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
    "knowledgeBasic": number,
    "knowledgeStandard": number,
    "knowledgeAdvanced": number,
    "thinkingBasic": number,
    "thinkingStandard": number,
    "thinkingAdvanced": number,
    "attitudeBasic": number,
    "attitudeStandard": number,
    "attitudeAdvanced": number,
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

【評価観点】
知識・技能:
  基礎: ${criteria.knowledge.basic.join(" / ")}
  標準: ${criteria.knowledge.standard.join(" / ")}
  応用: ${criteria.knowledge.advanced.join(" / ")}
思考・判断・表現:
  基礎: ${criteria.thinking.basic.join(" / ")}
  標準: ${criteria.thinking.standard.join(" / ")}
  応用: ${criteria.thinking.advanced.join(" / ")}
主体的に学習に取り組む態度:
  基礎: ${criteria.attitude.basic.join(" / ")}
  標準: ${criteria.attitude.standard.join(" / ")}
  応用: ${criteria.attitude.advanced.join(" / ")}

模範回答: ${assignment.modelAnswer}
よくある誤答: ${assignment.commonMistakes.join(" / ")}

【生徒回答】
${batch.map((b) => `- id:${b.id} 回答:${b.answerText}`).join("\n")}`;
}
