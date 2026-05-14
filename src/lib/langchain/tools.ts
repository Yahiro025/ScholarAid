/**
 * LangChain Tools for ScholarAId
 *
 * Custom tools that the AI can use to enhance its responses:
 * - Web Search: Search the web for scholarship information
 * - Page Reader: Read and extract content from web pages
 * - Scholarship Database: Query the local scholarship database
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";

// ─── Caching ─────────────────────────────────────────────────────────────────

const webSearchCache = new Map<
  string,
  { results: string; timestamp: number }
>();
const WEB_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// ─── Web Search Tool ─────────────────────────────────────────────────────────

export const webSearchTool = new DynamicStructuredTool({
  name: "web_search",
  description:
    "Search the web for information about scholarships, application deadlines, requirements, or any topic not covered in the local database. Use this when the user asks about scholarships or programs not in our database, current/upcoming application dates, or external information.",
  schema: z.object({
    query: z
      .string()
      .describe(
        "A specific search query optimized for Philippine scholarships (e.g., 'DOST scholarship 2025 application requirements')"
      ),
  }),
  func: async ({ query }) => {
    try {
      // Check cache first
      const cacheKey = query.toLowerCase().trim();
      const cached = webSearchCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < WEB_CACHE_TTL) {
        return cached.results;
      }

      const zai = await ZAI.create();
      const searchResults = await zai.functions.invoke("web_search", {
        query,
        num: 5,
      });

      if (!Array.isArray(searchResults) || searchResults.length === 0) {
        return "No search results found. Try a different query.";
      }

      const formattedResults = searchResults
        .slice(0, 5)
        .map(
          (
            r: { name: string; url: string; snippet: string; host_name: string },
            i: number
          ) =>
            `[Source ${i + 1}] ${r.name}\nURL: ${r.url}\n${r.snippet}`
        )
        .join("\n\n");

      // Cache the results
      webSearchCache.set(cacheKey, {
        results: formattedResults,
        timestamp: Date.now(),
      });

      return formattedResults;
    } catch (error) {
      console.error("[LangChain Tool] Web search failed:", error);
      return "Web search failed. Please try again or rely on local database information.";
    }
  },
});

// ─── Page Reader Tool ────────────────────────────────────────────────────────

export const pageReaderTool = new DynamicStructuredTool({
  name: "page_reader",
  description:
    "Read and extract content from a web page URL. Use this to get detailed information from a specific scholarship application page or official website.",
  schema: z.object({
    url: z
      .string()
      .describe("The URL of the web page to read and extract content from"),
  }),
  func: async ({ url }) => {
    try {
      const zai = await ZAI.create();
      const result = await zai.functions.invoke("page_reader", { url });

      if (!result?.data?.html) {
        return "Could not read the page content. The page may be behind a login wall or have restricted access.";
      }

      // Extract text content, limiting to reasonable length
      const plainText = result.data.html
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 4000);

      const title = result.data.title || url;
      return `Page Title: ${title}\n\nContent:\n${plainText}`;
    } catch (error) {
      console.error("[LangChain Tool] Page reading failed:", error);
      return "Failed to read the web page. The URL may be invalid or the page may be inaccessible.";
    }
  },
});

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
            { name: { contains: search } },
            { provider: { contains: search } },
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
        return "No scholarships found matching the criteria. Try broadening your search.";
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

// ─── Tool Collections ────────────────────────────────────────────────────────

/** All tools available for the chat assistant */
export const chatTools = [
  webSearchTool,
  pageReaderTool,
  scholarshipDatabaseTool,
];

/** Tools for the matcher (database only, no web search needed) */
export const matcherTools = [scholarshipDatabaseTool];

/** Tools for the reviewer (no tools needed, just structured output) */
export const reviewerTools: DynamicStructuredTool[] = [];
