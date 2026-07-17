import type { Evaluator } from "../../models/evaluator";
import type { Evaluation, EvaluationResult } from "../../models/evaluation";

export const hundredEvaluator: Evaluator = {
  scale: "hundred",
  convert(evaluation: Evaluation): EvaluationResult {
    const { understanding, accuracy, logic, expression } = evaluation;
    // 内部評価は各項目0-100点（確定）
    const score = Math.round(
      (understanding + accuracy + logic + expression) / 4
    );
    return {
      studentAnswerId: evaluation.studentAnswerId,
      scale: "hundred",
      value: Math.min(100, Math.max(0, score)),
      comment: evaluation.comment,
    };
  },
};
