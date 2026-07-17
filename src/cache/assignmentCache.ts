import type { Assignment } from "../models/assignment";
import { generateAssignmentId } from "../utils/hash";

const KEY_PREFIX = "assignment:";

export interface AssignmentCacheEnv {
  ASSIGNMENT_KV: KVNamespace;
}

/** ハッシュ一致する既存課題があれば返す。無ければnull。 */
export async function findCachedAssignment(
  env: AssignmentCacheEnv,
  rawContent: string
): Promise<Assignment | null> {
  const id = await generateAssignmentId(rawContent);
  const raw = await env.ASSIGNMENT_KV.get(KEY_PREFIX + id);
  return raw ? (JSON.parse(raw) as Assignment) : null;
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
