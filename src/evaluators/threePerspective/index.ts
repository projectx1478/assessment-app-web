import type { Evaluation, Rank, ThreePerspectiveResult } from "../../models/evaluation";

function toRank(score: number): Rank {
  if (score >= 80) return "A";
  if (score >= 50) return "B";
  return "C";
}

/**
 * 三観点評価（ABC）：基礎・標準・応用それぞれの到達度をABCランクに変換する。
 * ランク境界（80/50点）は評価基準の確認画面で提示する3段階の考え方と対応させている。
 */
export function toThreePerspective(evaluation: Evaluation): ThreePerspectiveResult {
  return {
    basic: toRank(evaluation.basicScore),
    standard: toRank(evaluation.standardScore),
    advanced: toRank(evaluation.advancedScore),
  };
}
