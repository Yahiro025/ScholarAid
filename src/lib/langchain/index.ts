/**
 * ScholarAId LangChain Service
 *
 * Main service module that provides LangChain-powered AI capabilities:
 * - Chat with tool use (web search, page reader, database)
 * - Structured scholarship matching analysis
 * - Exam reviewer question generation
 * - Query classification
 *
 * This replaces the direct z-ai-web-dev-sdk calls with LangChain's
 * structured chains, tools, and output parsing for more reliable results.
 */

export { getChatModel, getStructuredModel, getCreativeModel, getActiveModelInfo, ZAIChatModel } from "./models";
export type { ModelProvider, ModelConfig } from "./models";

export { chatTools, matcherTools, webSearchTool, pageReaderTool, scholarshipDatabaseTool } from "./tools";

export {
  ChatSourceSchema,
  MatcherAnalysisSchema,
  ExamQuestionSchema,
  ReviewerQuestionsSchema,
  QueryClassificationSchema,
} from "./schemas";
export type { ChatSource, MatcherAnalysis, ExamQuestion, QueryClassification } from "./schemas";

export {
  chatSystemPrompt,
  classificationPrompt,
  matcherAnalysisPrompt,
  reviewerPrompt,
} from "./prompts";
