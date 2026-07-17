import type { Evaluator } from "../../models/evaluator";
import type { Evaluation, EvaluationResult } from "../../models/evaluation";

type Level = "S" | "A" | "B" | "C";

function toLevel(score: number): Level {
  if (score >= 90) return "S";
  if (score >= 75) return "A";
  if (score >= 50) return "B";
  return "C";
}

export const rubricEvaluator: Evaluator = {
  scale: "rubric",
  convert(evaluation: Evaluation): EvaluationResult {
    const breakdown = {
      understanding: toLevel(evaluation.understanding),
      accuracy: toLevel(evaluation.accuracy),
      logic: toLevel(evaluation.logic),
      expression: toLevel(evaluation.expression),
    };
    return {
      studentAnswerId: evaluation.studentAnswerId,
      scale: "rubric",
      value: JSON.stringify(breakdown),
      comment: evaluation.comment,
    };
  },
};
