import type { Evaluation, EvaluationResult, EvaluationScale } from "./evaluation";

export interface Evaluator {
  scale: EvaluationScale;
  convert(evaluation: Evaluation): EvaluationResult;
}
