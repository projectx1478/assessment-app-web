export interface Assignment {
  id: string;
  subject: string;
  unit: string;
  learningGoals: string[];
  evaluationCriteria: string[];
  modelAnswer: string;
  commonMistakes: string[];
  createdAt: string;
}

export interface StudentAnswer {
  id: string;
  assignmentId: string;
  answerText: string;
}
