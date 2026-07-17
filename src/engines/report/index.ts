import type { EvaluationResult } from "../../models/evaluation";
import type { Evaluation } from "../../models/evaluation";
import { callGemini, type GeminiEnv } from "../../providers/gemini/client";
import {
  CLASS_ANALYSIS_SYSTEM_PROMPT,
  buildClassAnalysisUserPrompt,
} from "../../prompts/classAnalysis";

export interface PersonalReport {
  studentAnswerId: string;
  result: EvaluationResult;
  strengths: string[];
  improvements: string[];
}

export interface ClassReport {
  averageScore: number;
  understandingRate: number;
  frequentMistakes: string[];
  count: number;
  misconceptions: string[];
  teachingImprovementSuggestions: string[];
}

/**
 * 個人レポートを生成する（ローカル整形のみ、AI呼ばない）。
 */
export function buildPersonalReport(
  evaluation: Evaluation,
  result: EvaluationResult
): PersonalReport {
  const strengths: string[] = [];
  const improvements: string[] = [];

  const items: [string, number][] = [
    ["理解度", evaluation.understanding],
    ["正確性", evaluation.accuracy],
    ["論理性", evaluation.logic],
    ["表現力", evaluation.expression],
  ];

  for (const [label, score] of items) {
    if (score >= 80) strengths.push(label);
    if (score < 50) improvements.push(label);
  }

  return {
    studentAnswerId: evaluation.studentAnswerId,
    result,
    strengths,
    improvements,
  };
}

/**
 * クラス分析を1回だけ集計する（Rule10）。よくある誤答はコメント頻出語から簡易集計。
 */
export async function buildClassReport(
  env: GeminiEnv,
  evaluations: Evaluation[]
): Promise<ClassReport> {
  const count = evaluations.length;
  if (count === 0) {
    return {
      averageScore: 0,
      understandingRate: 0,
      frequentMistakes: [],
      count: 0,
      misconceptions: [],
      teachingImprovementSuggestions: [],
    };
  }

  const avgOf = (key: keyof Evaluation) =>
    evaluations.reduce((sum, e) => sum + (e[key] as number), 0) / count;

  const averageScore = Math.round(
    (avgOf("understanding") + avgOf("accuracy") + avgOf("logic") + avgOf("expression")) / 4
  );
  const understandingRate = Math.round(avgOf("understanding"));

  const commentCounts = new Map<string, number>();
  for (const e of evaluations) {
    commentCounts.set(e.comment, (commentCounts.get(e.comment) ?? 0) + 1);
  }
  const frequentMistakes = [...commentCounts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([comment]) => comment);

  // Rule10: クラス分析はここで最後に1回だけGeminiを呼ぶ
  const raw = await callGemini(
    env,
    CLASS_ANALYSIS_SYSTEM_PROMPT,
    buildClassAnalysisUserPrompt(evaluations.map((e) => e.comment))
  );
  const parsed = JSON.parse(raw) as {
    misconceptions: string[];
    teachingImprovementSuggestions: string[];
  };

  return {
    averageScore,
    understandingRate,
    frequentMistakes,
    count,
    misconceptions: parsed.misconceptions,
    teachingImprovementSuggestions: parsed.teachingImprovementSuggestions,
  };
}
