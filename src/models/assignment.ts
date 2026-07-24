export type EvaluationPerspective = "knowledge" | "thinking" | "attitude";
export type ProficiencyLevel = "basic" | "standard" | "advanced";

export interface TieredCriteria {
  knowledge: { basic: string[]; standard: string[]; advanced: string[] };
  thinking: { basic: string[]; standard: string[]; advanced: string[] };
  attitude: { basic: string[]; standard: string[]; advanced: string[] };
}

export interface Assignment {
  id: string;
  subject: string;
  unit: string;
  learningGoals: string[];
  // 評価観点は3つの視点（知識・思考・態度）× 3段階（基礎・標準・応用）で保持する。
  evaluationCriteria: TieredCriteria;
  modelAnswer: string;
  commonMistakes: string[];
  createdAt: string;
}

export interface StudentAnswer {
  id: string;
  assignmentId: string;
  answerText: string;
}
