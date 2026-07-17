export interface UsageStatsEnv {
  ASSIGNMENT_KV: KVNamespace;
}

const GEMINI_CALL_KEY = "stats:geminiCallCount";
const CACHE_HIT_KEY = "stats:cacheHitCount";

async function increment(env: UsageStatsEnv, key: string): Promise<void> {
  const current = await env.ASSIGNMENT_KV.get(key);
  const next = (current ? parseInt(current, 10) : 0) + 1;
  await env.ASSIGNMENT_KV.put(key, String(next));
}

/** Geminiを実際に呼び出した回数を記録する（CLAUDE.md: Log API usage）。 */
export async function recordGeminiCall(env: UsageStatsEnv): Promise<void> {
  await increment(env, GEMINI_CALL_KEY);
}

/** キャッシュ流用によりGeminiを呼ばずに済んだ回数を記録する。 */
export async function recordCacheHit(env: UsageStatsEnv): Promise<void> {
  await increment(env, CACHE_HIT_KEY);
}

export async function getUsageStats(
  env: UsageStatsEnv
): Promise<{ geminiCallCount: number; cacheHitCount: number }> {
  const [calls, hits] = await Promise.all([
    env.ASSIGNMENT_KV.get(GEMINI_CALL_KEY),
    env.ASSIGNMENT_KV.get(CACHE_HIT_KEY),
  ]);
  return {
    geminiCallCount: calls ? parseInt(calls, 10) : 0,
    cacheHitCount: hits ? parseInt(hits, 10) : 0,
  };
}
