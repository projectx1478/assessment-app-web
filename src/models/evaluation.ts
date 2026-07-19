export interface Evaluation {
  studentAnswerId: string;
  // 内部評価（4軸、各0-100点）。コメント生成・クラス分析の根拠として使用。
  understanding: number;
  accuracy: number;
  logic: number;
  expression: number;
  // 評価観点3段階（基礎・標準・応用）ごとの到達度（各0-100点）。
  // 「三観点評価（ABC）」表示の元データになる。
  basicScore: number;
  standardScore: number;
  advancedScore: number;
  comment: string;
}

export type Rank = "A" | "B" | "C";

export type EvaluationScale = "hundred" | "fiveScale" | "abc" | "rubric";

export interface EvaluationResult {
  studentAnswerId: string;
  scale: EvaluationScale;
  value: string | number;
  comment: string;
}

/** 三観点評価（ABC）：基礎・標準・応用それぞれのランク。 */
export interface ThreePerspectiveResult {
  basic: Rank;
  standard: Rank;
  advanced: Rank;
}

/** 結果確認画面・出力（Excel/Spreadsheet）で使う、3方式を同時に含む評価結果。 */
export interface CombinedEvaluationResult {
  studentAnswerId: string;
  threePerspective: ThreePerspectiveResult;
  fiveScale: number; // 1-5
  hundred: number; // 0-100
  comment: string;
}
