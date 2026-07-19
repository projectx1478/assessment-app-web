import { z } from "zod";

export const analyzeAssignmentSchema = z.object({
  rawContent: z.string().min(1),
});

export const gradeSchema = z.object({
  assignmentId: z.string().min(1),
  studentAnswers: z
    .array(
      z.object({
        id: z.string().min(1),
        answerText: z.string(),
      })
    )
    .min(1),
});

export const analyzeClassSchema = z.object({
  evaluations: z
    .array(
      z.object({
        studentAnswerId: z.string(),
        understanding: z.number().min(0).max(100),
        accuracy: z.number().min(0).max(100),
        logic: z.number().min(0).max(100),
        expression: z.number().min(0).max(100),
        basicScore: z.number().min(0).max(100),
        standardScore: z.number().min(0).max(100),
        advancedScore: z.number().min(0).max(100),
        comment: z.string(),
      })
    )
    .min(1),
});

const criteriaTierSchema = z.array(z.string().min(1));

export const updateCriteriaSchema = z.object({
  assignmentId: z.string().min(1),
  evaluationCriteria: z
    .object({
      basic: criteriaTierSchema,
      standard: criteriaTierSchema,
      advanced: criteriaTierSchema,
    })
    .refine(
      (v) => v.basic.length + v.standard.length + v.advanced.length > 0,
      { message: "少なくとも1つの評価観点を選択してください" }
    ),
});
