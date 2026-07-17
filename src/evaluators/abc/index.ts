import type { Evaluator } from "../../models/evaluator";
import type { Evaluation, EvaluationResult } from "../../models/evaluation";

function toRank(score: number): "A" | "B" | "C" {
  if (score >= 80) return "A";
  if (score >= 50) return "B";
  return "C";
}

export const abcEvaluator: Evaluator = {
  scale: "abc",
  convert(evaluation: Evaluation): EvaluationResult {
    const { understanding, accuracy, logic, expression } = evaluation;
    const avg = (understanding + accuracy + logic + expression) / 4;
    return {
      studentAnswerId: evaluation.studentAnswerId,
      scale: "abc",
      value: toRank(avg),
      comment: evaluation.comment,
    };
  },
};
