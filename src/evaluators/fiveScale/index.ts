import type { Evaluator } from "../../models/evaluator";
import type { Evaluation, EvaluationResult } from "../../models/evaluation";

export const fiveScaleEvaluator: Evaluator = {
  scale: "fiveScale",
  convert(evaluation: Evaluation): EvaluationResult {
    const { understanding, accuracy, logic, expression } = evaluation;
    const avg = (understanding + accuracy + logic + expression) / 4;
    const value = Math.min(5, Math.max(1, Math.round(avg / 20)));
    return {
      studentAnswerId: evaluation.studentAnswerId,
      scale: "fiveScale",
      value,
      comment: evaluation.comment,
    };
  },
};
