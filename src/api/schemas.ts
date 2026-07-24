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
        knowledgeBasic: z.number().min(0).max(100),
        knowledgeStandard: z.number().min(0).max(100),
        knowledgeAdvanced: z.number().min(0).max(100),
        thinkingBasic: z.number().min(0).max(100),
        thinkingStandard: z.number().min(0).max(100),
        thinkingAdvanced: z.number().min(0).max(100),
        attitudeBasic: z.number().min(0).max(100),
        attitudeStandard: z.number().min(0).max(100),
        attitudeAdvanced: z.number().min(0).max(100),
        comment: z.string(),
        improvementSuggestion: z.string(),
      })
    )
    .min(1),
});

const criteriaTierSchema = z.array(z.string().min(1));
const criteriaPerspectiveSchema = z.object({
  basic: criteriaTierSchema,
  standard: criteriaTierSchema,
  advanced: criteriaTierSchema,
});

export const updateCriteriaSchema = z.object({
  assignmentId: z.string().min(1),
  evaluationCriteria: z
    .object({
      knowledge: criteriaPerspectiveSchema,
      thinking: criteriaPerspectiveSchema,
      attitude: criteriaPerspectiveSchema,
    })
    .refine(
      (v) =>
        v.knowledge.basic.length +
          v.knowledge.standard.length +
          v.knowledge.advanced.length +
          v.thinking.basic.length +
          v.thinking.standard.length +
          v.thinking.advanced.length +
          v.attitude.basic.length +
          v.attitude.standard.length +
          v.attitude.advanced.length >
        0,
      { message: "少なくとも1つの評価観点を選択してください" }
    ),
});
