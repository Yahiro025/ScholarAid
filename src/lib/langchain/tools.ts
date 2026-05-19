/**
 * LangChain Tools for ScholarAId
 *
 * Custom tools that the AI can use to enhance its responses:
 * - Scholarship Database: Query the local scholarship database
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { db } from "@/lib/db";

// ─── Scholarship Database Tool ───────────────────────────────────────────────

export const scholarshipDatabaseTool = new DynamicStructuredTool({
  name: "scholarship_database",
  description:
    "Search the local ScholarAId scholarship database. Use this to find scholarships by name, provider, type, strand eligibility, GPA requirement, or coverage. This database contains PUP-specific and general Philippine scholarships.",
  schema: z.object({
    search: z
      .string()
      .optional()
      .describe("Search term for scholarship name or provider"),
    minGPA: z
      .number()
      .optional()
      .describe(
        "Student's GPA percentage (returns scholarships where minGPA <= this value)"
      ),
    strand: z
      .string()
      .optional()
      .describe(
        "Academic strand: STEM, ABM, HUMSS, GAS, TVL, or All"
      ),
    type: z
      .string()
      .optional()
      .describe(
        "Scholarship type: government, private, merit, need-based"
      ),
    coverage: z
      .string()
      .optional()
      .describe("Coverage type: full, partial"),
    acceptingOnly: z
      .boolean()
      .optional()
      .describe("Only return scholarships currently accepting applications"),
  }),
  func: async ({ search, minGPA, strand, type, coverage, acceptingOnly }) => {
    try {
      // Build where clause
      const andConditions: Record<string, unknown>[] = [{ isActive: true }];

      if (search) {
        andConditions.push({
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { provider: { contains: search, mode: 'insensitive' } },
          ],
        });
      }

      if (minGPA) {
        andConditions.push({ minGPA: { lte: minGPA } });
      }

      if (strand) {
        andConditions.push({ eligibleStrands: { contains: strand } });
      }

      if (type) {
        andConditions.push({ scholarshipType: type });
      }

      if (coverage) {
        andConditions.push({ coverage });
      }

      if (acceptingOnly) {
        andConditions.push({ isAcceptingApplications: true });
      }

      const where =
        andConditions.length === 1
          ? andConditions[0]
          : { AND: andConditions };

      const scholarships = await db.scholarship.findMany({
        where,
        orderBy: { name: "asc" },
        take: 20,
      });

      if (scholarships.length === 0) {
        return "No scholarships found matching the criteria in our database.";
      }

      return scholarships
        .map(
          (s) =>
            `--- ${s.name} ---
Provider: ${s.provider} | Type: ${s.scholarshipType} | Coverage: ${s.coverage}
${s.coverageDetails || "Standard coverage"}
Accepting Applications: ${s.isAcceptingApplications ? "YES" : "NO"}
Eligible Strands: ${s.eligibleStrands}
Min GPA Required: ${s.minGPA}%
${s.maxAnnualIncome ? `Max Annual Income: PHP ${s.maxAnnualIncome.toLocaleString()}` : "No income limit"}
${s.priorityCourses ? `Priority Courses: ${s.priorityCourses}` : "Open to all courses"}
Requirements: ${s.requirements}
Deadline: ${s.deadline}
${s.examType && s.examType !== "none" ? `Exam: ${s.examType} - ${s.examSubjects || "N/A"}` : "No entrance exam"}
${s.websiteUrl ? `Application Page: ${s.websiteUrl}` : "No application page listed"}
Description: ${s.description}`
        )
        .join("\n\n");
    } catch (error) {
      console.error("[LangChain Tool] Database query failed:", error);
      return "Failed to query the scholarship database. Please try again.";
    }
  },
});

import ZAI from "z-ai-web-dev-sdk";

// ─── ZAI Functions Wrapper ───────────────────────────────────────────────────

/**
 * Shared ZAI client for tools to avoid redundant creation
 */
let zaiClient: ZAI | null = null;

async function getZAIClient(): Promise<ZAI> {
  if (!zaiClient) {
    zaiClient = await ZAI.create();
  }
  return zaiClient;
}

// ─── Scholarship Database Tool ───────────────────────────────────────────────
// ... (scholarshipDatabaseTool remains same)

// ─── Web Search Tool ─────────────────────────────────────────────────────────

export const webSearchTool = new DynamicStructuredTool({
  name: "web_search",
  description: "Search the web for current scholarship info, announcements, or details not in the local database. Returns snippets from the web.",
  schema: z.object({ query: z.string() }),
  func: async ({ query }) => {
    try {
      console.log(`[LangChain Tool] Web searching: ${query}`);
      const client = await getZAIClient();
      const results = await client.functions.invoke("web_search", { query, num: 5 });
      
      if (!results || results.length === 0) {
        return "No web search results found for this query.";
      }
      
      return results
        .map(
          (r, i) => 
            `Result ${i+1}: ${r.name}\nURL: ${r.url}\nSnippet: ${r.snippet}`
        )
        .join("\n\n");
    } catch (error) {
      console.error("[LangChain Tool] Web search failed:", error);
      return `Error searching the web: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});

// ─── Page Reader Tool ────────────────────────────────────────────────────────

export const pageReaderTool = new DynamicStructuredTool({
  name: "page_reader",
  description: "Read the content of a scholarship's official website or application page to get more detailed information, requirements, or updates. Use this ONLY when you have a specific URL.",
  schema: z.object({ url: z.string().url() }),
  func: async ({ url }) => {
    try {
      console.log(`[LangChain Tool] Reading page (ZAI): ${url}`);
      const client = await getZAIClient();
      const result = await client.functions.invoke("page_reader", { url });
      
      if (result.status !== 200 || !result.data) {
        return `Failed to read page: Status ${result.status}`;
      }
      
      // The ZAI SDK might return HTML or cleaned text. 
      // Based on type defs, result.data.html contains the content.
      let text = result.data.html
        .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, "")
        .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gmi, "")
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      return text.substring(0, 10000); // ZAI might provide better cleanup, but we still limit
    } catch (error) {
      console.error("[LangChain Tool] Page reader failed:", error);
      return `Error reading page: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});

// ─── Tool Collections ────────────────────────────────────────────────────────

/** All tools available for the chat assistant */
export const chatTools = [
  scholarshipDatabaseTool,
  webSearchTool,
  pageReaderTool,
];

/** Tools for the matcher (database only, no web search needed) */
export const matcherTools = [scholarshipDatabaseTool];

/** Tools for the reviewer (no tools needed, just structured output) */
export const reviewerTools: DynamicStructuredTool[] = [];
