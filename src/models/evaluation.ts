export interface Evaluation {
  studentAnswerId: string;
  // 内部評価（4軸、各0-100点）。コメント生成・クラス分析の根拠として使用。
  understanding: number;
  accuracy: number;
  logic: number;
  expression: number;
  // 3つの評価視点（知識・思考・態度）× 3つの到達度段階（基礎・標準・応用）= 9スコア。
  // 各0-100の整数。「三観点評価（ABC）」表示の元データになる。
  knowledgeBasic: number;
  knowledgeStandard: number;
  knowledgeAdvanced: number;
  thinkingBasic: number;
  thinkingStandard: number;
  thinkingAdvanced: number;
  attitudeBasic: number;
  attitudeStandard: number;
  attitudeAdvanced: number;
  // 生徒の回答のどの部分を根拠に評価したかを具体的に示すコメント。
  comment: string;
  // 今後に向けた具体的な改善提案。
  improvementSuggestion: string;
}

export type Rank = "A" | "B" | "C";

export type EvaluationScale = "hundred" | "fiveScale" | "abc" | "rubric";

export interface EvaluationResult {
  studentAnswerId: string;
  scale: EvaluationScale;
  value: string | number;
  comment: string;
}

/** 三観点評価（ABC）：知識・思考・態度それぞれのランク。 */
export interface ThreePerspectiveResult {
  knowledge: Rank;
  thinking: Rank;
  attitude: Rank;
}

/** 結果確認画面・出力（Excel/Spreadsheet）で使う、3方式を同時に含む評価結果。 */
export interface CombinedEvaluationResult {
  studentAnswerId: string;
  threePerspective: ThreePerspectiveResult;
  fiveScale: number; // 1-5
  hundred: number; // 0-100
  comment: string;
  improvementSuggestion: string;
}
