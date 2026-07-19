export type CriteriaTier = "basic" | "standard" | "advanced";

export interface TieredCriteria {
  basic: string[];
  standard: string[];
  advanced: string[];
}

export interface Assignment {
  id: string;
  subject: string;
  unit: string;
  learningGoals: string[];
  // 評価観点は「基礎・標準・応用」の3段階に分けて保持する。
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
