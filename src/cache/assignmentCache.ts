import type { Assignment } from "../models/assignment";
import { generateAssignmentId } from "../utils/hash";

const KEY_PREFIX = "assignment:";

export interface AssignmentCacheEnv {
  ASSIGNMENT_KV: KVNamespace;
}

function isTieredCriteria(value: unknown): value is Assignment["evaluationCriteria"] {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Array.isArray((value as Record<string, unknown>).basic)
  );
}

/**
 * ハッシュ一致する既存課題があれば返す。無ければnull。
 * 評価観点の形式変更（string[] → 基礎/標準/応用のtiered形式）より前に保存された
 * 旧形式のキャッシュは互換性がないため、キャッシュミス扱いにして再解析させる。
 */
export async function findCachedAssignment(
  env: AssignmentCacheEnv,
  rawContent: string
): Promise<Assignment | null> {
  const id = await generateAssignmentId(rawContent);
  const raw = await env.ASSIGNMENT_KV.get(KEY_PREFIX + id);
  if (!raw) return null;

  const parsed = JSON.parse(raw) as Assignment;
  if (!isTieredCriteria(parsed.evaluationCriteria)) return null;
  return parsed;
}

/** 課題解析結果を永久保存する（Layer1）。 */
export async function saveAssignment(
  env: AssignmentCacheEnv,
  assignment: Assignment
): Promise<void> {
  await env.ASSIGNMENT_KV.put(
    KEY_PREFIX + assignment.id,
    JSON.stringify(assignment)
  );
}
