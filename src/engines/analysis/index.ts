import type { Assignment, TieredCriteria } from "../../models/assignment";
import { callGemini, type GeminiEnv } from "../../providers/gemini/client";
import { ANALYSIS_SYSTEM_PROMPT, buildAnalysisUserPrompt } from "../../prompts/analysis";
import { generateAssignmentId } from "../../utils/hash";
import {
  findCachedAssignment,
  saveAssignment,
  type AssignmentCacheEnv,
} from "../../cache/assignmentCache";
import { recordGeminiCall, recordCacheHit, type UsageStatsEnv } from "../../cache/usageStats";

type Env = GeminiEnv & AssignmentCacheEnv & UsageStatsEnv;

interface GeminiAnalysisJson {
  subject: string;
  unit: string;
  learningGoals: string[];
  evaluationCriteria: TieredCriteria;
  modelAnswer: string;
  commonMistakes: string[];
}

/**
 * 課題を解析する。ハッシュ一致するキャッシュがあれば再利用し、
 * Geminiは呼ばない（トークン削減 Rule1・Rule9）。
 */
export async function analyzeAssignment(
  env: Env,
  rawContent: string
): Promise<Assignment> {
  const cached = await findCachedAssignment(env, rawContent);
  if (cached) {
    await recordCacheHit(env);
    return cached;
  }

  const raw = await callGemini(
    env,
    ANALYSIS_SYSTEM_PROMPT,
    buildAnalysisUserPrompt(rawContent)
  );
  await recordGeminiCall(env);
  const parsed = JSON.parse(raw) as GeminiAnalysisJson;

  const assignment: Assignment = {
    id: await generateAssignmentId(rawContent),
    subject: parsed.subject,
    unit: parsed.unit,
    learningGoals: parsed.learningGoals,
    evaluationCriteria: parsed.evaluationCriteria,
    modelAnswer: parsed.modelAnswer,
    commonMistakes: parsed.commonMistakes,
    createdAt: new Date().toISOString(),
  };

  await saveAssignment(env, assignment);
  return assignment;
}
