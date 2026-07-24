import type { Evaluation } from "../models/evaluation";
import { generateAssignmentId } from "../utils/hash";

const KEY_PREFIX = "evaluation:";

export interface AnswerCacheEnv {
  ASSIGNMENT_KV: KVNamespace;
}

async function buildKey(assignmentId: string, answerText: string): Promise<string> {
  const answerHash = await generateAssignmentId(answerText);
  return `${KEY_PREFIX}${assignmentId}:${answerHash}`;
}

/**
 * 同一回答の採点結果がキャッシュにあれば返す（Rule9）。
 * 評価データに9段階スコア（知識・思考・態度 × 基礎・標準・応用）が無い旧形式のキャッシュは
 * 互換性がないため、キャッシュミス扱いにして再採点させる。
 */
export async function findCachedEvaluation(
  env: AnswerCacheEnv,
  assignmentId: string,
  answerText: string
): Promise<Evaluation | null> {
  const key = await buildKey(assignmentId, answerText);
  const raw = await env.ASSIGNMENT_KV.get(key);
  if (!raw) return null;

  const parsed = JSON.parse(raw) as Evaluation;
  if (typeof parsed.knowledgeBasic !== "number") return null;
  return parsed;
}

/** 採点結果を保存する。再採点時は上書きされる想定。 */
export async function saveEvaluation(
  env: AnswerCacheEnv,
  assignmentId: string,
  answerText: string,
  evaluation: Evaluation
): Promise<void> {
  const key = await buildKey(assignmentId, answerText);
  await env.ASSIGNMENT_KV.put(key, JSON.stringify(evaluation));
}
