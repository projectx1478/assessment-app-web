export interface Evaluation {
  studentAnswerId: string;
  understanding: number;
  accuracy: number;
  logic: number;
  expression: number;
  comment: string;
}

export type EvaluationScale = "hundred" | "fiveScale" | "abc" | "rubric";

export interface EvaluationResult {
  studentAnswerId: string;
  scale: EvaluationScale;
  value: string | number;
  comment: string;
}
