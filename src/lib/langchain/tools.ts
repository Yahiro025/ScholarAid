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

// ─── Dummy Tools (ZAI Disabled) ──────────────────────────────────────────────

export const webSearchTool = new DynamicStructuredTool({
  name: "web_search",
  description: "DISABLED. Do not use.",
  schema: z.object({ query: z.string() }),
  func: async () => "External web search is currently disabled. Please rely on the scholarship database.",
});

export const pageReaderTool = new DynamicStructuredTool({
  name: "page_reader",
  description: "DISABLED. Do not use.",
  schema: z.object({ url: z.string() }),
  func: async () => "Web page reading is currently disabled.",
});

// ─── Tool Collections ────────────────────────────────────────────────────────

/** All tools available for the chat assistant */
export const chatTools = [
  scholarshipDatabaseTool,
];

/** Tools for the matcher (database only, no web search needed) */
export const matcherTools = [scholarshipDatabaseTool];

/** Tools for the reviewer (no tools needed, just structured output) */
export const reviewerTools: DynamicStructuredTool[] = [];
