/**
 * Zod Schemas for LangChain Structured Output
 *
 * These schemas define the expected output format for each AI feature,
 * ensuring reliable JSON parsing and type safety.
 */

import { z } from "zod";

// ─── Chat Response ───────────────────────────────────────────────────────────

export const ChatSourceSchema = z.object({
  type: z.enum(["database", "web_search", "web_page"]),
  name: z.string(),
  url: z.string().optional(),
});

export type ChatSource = z.infer<typeof ChatSourceSchema>;

// ─── Matcher Analysis ────────────────────────────────────────────────────────

export const ProfileInsightSchema = z.object({
  strengths: z
    .array(z.string())
    .describe("Student's key strengths relevant to scholarship applications"),
  weaknesses: z
    .array(z.string())
    .describe("Areas where the student could improve their scholarship chances"),
  opportunities: z
    .array(z.string())
    .describe("External opportunities or timing advantages"),
  overallAssessment: z
    .string()
    .describe("2-3 sentence personalized assessment of scholarship prospects"),
});

export const TopRecommendationSchema = z.object({
  scholarshipName: z.string(),
  matchReason: z
    .string()
    .describe("1-2 sentences explaining WHY this is a good fit"),
  applicationStrategy: z
    .string()
    .describe("1-2 sentences of specific strategy for this application"),
  readinessLevel: z.enum(["high", "medium", "low"]),
  keyAction: z
    .string()
    .describe("The single most important thing to do to strengthen the application"),
});

export const ApplicationReadinessSchema = z.object({
  overallScore: z.number().min(0).max(100),
  breakdown: z.object({
    academicReadiness: z.number().min(0).max(100),
    documentReadiness: z.number().min(0).max(100),
    examReadiness: z.number().min(0).max(100),
    timelineReadiness: z.number().min(0).max(100),
  }),
  missingDocuments: z.array(z.string()),
  improvementTips: z.array(z.string()),
});

export const NearMissAnalysisSchema = z.object({
  scholarshipName: z.string(),
  whatToImprove: z
    .string()
    .describe("What the student needs to do to become eligible"),
  realisticTimeline: z
    .string()
    .describe("How long it might take to become eligible"),
});

export const ApplicationTimelineSchema = z.object({
  scholarshipName: z.string(),
  deadlineNote: z.string(),
  priority: z.enum(["urgent", "high", "medium", "low"]),
});

export const MatcherAnalysisSchema = z.object({
  profileInsight: ProfileInsightSchema,
  topRecommendations: z.array(TopRecommendationSchema).max(5),
  applicationReadiness: ApplicationReadinessSchema,
  nearMissAnalysis: z.array(NearMissAnalysisSchema).max(3),
  applicationTimeline: z.array(ApplicationTimelineSchema),
});

export type MatcherAnalysis = z.infer<typeof MatcherAnalysisSchema>;

// ─── Exam Reviewer ───────────────────────────────────────────────────────────

export const ExamQuestionSchema = z.object({
  question: z.string().describe("The question text"),
  options: z
    .array(z.string())
    .length(4)
    .describe("Four answer options (A, B, C, D)"),
  correctAnswer: z
    .number()
    .min(0)
    .max(3)
    .describe("0-based index of the correct option"),
  subject: z
    .string()
    .describe("The specific subject area this question covers"),
  explanation: z
    .string()
    .describe("Brief explanation of why the correct answer is right"),
});

export const ReviewerQuestionsSchema = z.object({
  questions: z.array(ExamQuestionSchema),
});

export type ExamQuestion = z.infer<typeof ExamQuestionSchema>;

// ─── Query Classification ────────────────────────────────────────────────────

export const QueryClassificationSchema = z.object({
  needsWebSearch: z
    .boolean()
    .describe("Whether the query requires a web search to answer accurately"),
  searchQuery: z
    .string()
    .describe(
      "If needsWebSearch is true, the optimized search query. Otherwise 'none'"
    ),
  needsPageRead: z
    .boolean()
    .describe("Whether the query requires reading a specific web page"),
  pageUrl: z
    .string()
    .describe("If needsPageRead is true, the URL to read. Otherwise 'none'"),
  intent: z
    .enum([
      "scholarship_info",
      "eligibility_check",
      "application_help",
      "exam_prep",
      "website_help",
      "general_advice",
      "external_info",
    ])
    .describe("The primary intent of the user's query"),
});

export type QueryClassification = z.infer<typeof QueryClassificationSchema>;
