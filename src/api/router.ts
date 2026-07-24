import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { analyzeAssignmentSchema, gradeSchema, analyzeClassSchema, updateCriteriaSchema } from "./schemas";
import { analyzeAssignment } from "../engines/analysis";
import { gradeStudents } from "../engines/assessment";
import { buildClassReport } from "../engines/report";
import { requestLogger } from "../middleware/requestLogger";
import { getUsageStats } from "../cache/usageStats";
import type { GeminiEnv } from "../providers/gemini/client";
import type { AssignmentCacheEnv } from "../cache/assignmentCache";
import type { AnswerCacheEnv } from "../cache/answerCache";
import type { UsageStatsEnv } from "../cache/usageStats";
import { importFromFile, type ManualColumnOverride } from "../engines/import";
import { hundredEvaluator } from "../evaluators/hundred";
import { fiveScaleEvaluator } from "../evaluators/fiveScale";
import { toThreePerspective } from "../evaluators/threePerspective";
import type { CombinedEvaluationResult } from "../models/evaluation";

type Env = GeminiEnv & AssignmentCacheEnv & AnswerCacheEnv & UsageStatsEnv & {
  GOOGLE_CLIENT_ID?: string;
};

const app = new Hono<{ Bindings: Env }>();
app.use("*", requestLogger);

// フロントがビルド時ではなく起動時に取得するための公開設定値。
// GOOGLE_CLIENT_IDは秘匿情報ではないため公開して問題ない
// （Google OAuthのクライアントIDはブラウザJSに公開される前提の値）。
app.get("/config", async (c) => {
  return c.json({ googleClientId: c.env.GOOGLE_CLIENT_ID ?? "" });
});

app.post("/updateCriteria", zValidator("json", updateCriteriaSchema), async (c) => {
  const { assignmentId, evaluationCriteria } = c.req.valid("json");
  const raw = await c.env.ASSIGNMENT_KV.get(`assignment:${assignmentId}`);
  if (!raw) return c.json({ error: "assignment not found" }, 404);

  const assignment = JSON.parse(raw);
  assignment.evaluationCriteria = evaluationCriteria;
  await c.env.ASSIGNMENT_KV.put(`assignment:${assignmentId}`, JSON.stringify(assignment));
  return c.json(assignment);
});

app.post("/importFile", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];
  const assignmentId = body["assignmentId"];
  const overrideRaw = body["override"];

  if (!(file instanceof File) || typeof assignmentId !== "string") {
    return c.json({ error: "file and assignmentId are required" }, 400);
  }

  const override: ManualColumnOverride | undefined =
    typeof overrideRaw === "string" ? JSON.parse(overrideRaw) : undefined;

  const buffer = await file.arrayBuffer();
  // サーバー側にファイル・生徒データは保存しない（列判定→PII除外→即返却のみ）
  const result = importFromFile(buffer, file.name, assignmentId, override);
  return c.json(result);
});

app.get("/usage", async (c) => {
  const stats = await getUsageStats(c.env);
  return c.json(stats);
});

app.post("/analyzeAssignment", zValidator("json", analyzeAssignmentSchema), async (c) => {
  const { rawContent } = c.req.valid("json");
  const assignment = await analyzeAssignment(c.env, rawContent);
  return c.json(assignment);
});

app.post("/grade", zValidator("json", gradeSchema), async (c) => {
  const { assignmentId, studentAnswers } = c.req.valid("json");
  const assignment = await c.env.ASSIGNMENT_KV.get(`assignment:${assignmentId}`);
  if (!assignment) {
    return c.json({ error: "assignment not found" }, 404);
  }
  const evaluations = await gradeStudents(
    c.env,
    JSON.parse(assignment),
    studentAnswers.map((s) => ({ ...s, assignmentId }))
  );

  // 内部評価（4軸・3段階スコア）から、三観点評価(ABC)・5段階・100点法の
  // 3方式を同時に生成して返す。
  const combined: CombinedEvaluationResult[] = evaluations.map((evaluation) => ({
    studentAnswerId: evaluation.studentAnswerId,
    threePerspective: toThreePerspective(evaluation),
    fiveScale: fiveScaleEvaluator.convert(evaluation).value as number,
    hundred: hundredEvaluator.convert(evaluation).value as number,
    comment: evaluation.comment,
    improvementSuggestion: evaluation.improvementSuggestion,
  }));

  return c.json({ evaluations: combined });
});

app.post("/analyzeClass", zValidator("json", analyzeClassSchema), async (c) => {
  const { evaluations } = c.req.valid("json");
  const report = await buildClassReport(c.env, evaluations);
  return c.json(report);
});

export default app;
