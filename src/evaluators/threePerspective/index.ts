import type { Evaluation, Rank, ThreePerspectiveResult } from "../../models/evaluation";

function toRank(score: number): Rank {
  if (score >= 80) return "A";
  if (score >= 50) return "B";
  return "C";
}

/**
 * 三観点評価（ABC）：3つの評価視点（知識・思考・態度）それぞれの到達度をABCランクに変換する。
 * 各視点の「標準」レベルのスコアをもとにランク付けを行う。
 * ランク境界（80/50点）は評価基準の確認画面で提示する3段階の考え方と対応させている。
 */
export function toThreePerspective(evaluation: Evaluation): ThreePerspectiveResult {
  return {
    knowledge: toRank(evaluation.knowledgeStandard),
    thinking: toRank(evaluation.thinkingStandard),
    attitude: toRank(evaluation.attitudeStandard),
  };
}
