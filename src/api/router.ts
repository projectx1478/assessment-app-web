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

type Env = GeminiEnv & AssignmentCacheEnv & AnswerCacheEnv & UsageStatsEnv;

const app = new Hono<{ Bindings: Env }>();
app.use("*", requestLogger);

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
  return c.json({ evaluations });
});

app.post("/analyzeClass", zValidator("json", analyzeClassSchema), async (c) => {
  const { evaluations } = c.req.valid("json");
  const report = await buildClassReport(c.env, evaluations);
  return c.json(report);
});

export default app;
