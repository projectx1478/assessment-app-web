import type { Assignment } from "../../models/assignment";
import type { Evaluation } from "../../models/evaluation";
import type { StudentAnswer } from "../../models/assignment";
import { callGemini, type GeminiEnv } from "../../providers/gemini/client";
import {
  ASSESSMENT_SYSTEM_PROMPT,
  buildAssessmentUserPrompt,
} from "../../prompts/assessment";
import {
  findCachedEvaluation,
  saveEvaluation,
  type AnswerCacheEnv,
} from "../../cache/answerCache";
import { recordGeminiCall, recordCacheHit, type UsageStatsEnv } from "../../cache/usageStats";

type Env = GeminiEnv & AnswerCacheEnv & UsageStatsEnv;

const BATCH_SIZE = 8; // 5〜10人の範囲内（デフォルト値、要件書Rule6）

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

export async function gradeStudents(
  env: Env,
  assignment: Assignment,
  answers: StudentAnswer[]
): Promise<Evaluation[]> {
  const results: Evaluation[] = [];
  const uncached: StudentAnswer[] = [];

  // Rule9: 同じ回答はキャッシュを優先し、AIを呼ばない
  for (const answer of answers) {
    const cached = await findCachedEvaluation(env, assignment.id, answer.answerText);
    if (cached) {
      await recordCacheHit(env);
      results.push(cached);
    } else {
      uncached.push(answer);
    }
  }

  for (const batch of chunk(uncached, BATCH_SIZE)) {
    const raw = await callGemini(
      env,
      ASSESSMENT_SYSTEM_PROMPT,
      buildAssessmentUserPrompt(assignment, batch)
    );
    await recordGeminiCall(env);
    const parsed = JSON.parse(raw) as Evaluation[];

    for (const evaluation of parsed) {
      const answer = batch.find((b) => b.id === evaluation.studentAnswerId);
      if (!answer) continue;
      await saveEvaluation(env, assignment.id, answer.answerText, evaluation);
      results.push(evaluation);
    }
  }

  return results;
}
