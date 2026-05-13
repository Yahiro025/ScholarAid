import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import ZAI from "z-ai-web-dev-sdk";
import {
  getChatModel,
  getActiveModelInfo,
  type ModelProvider,
} from "@/lib/langchain";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  message: string;
  history?: ChatMessage[];
}

interface SourceReference {
  type: "database" | "web_search" | "web_page";
  name: string;
  url?: string;
  snippet?: string;
}

// ─── GPA Extraction ─────────────────────────────────────────────────────────

function extractGPA(message: string): number | null {
  const gwaPatterns = [
    /(?:my\s+)?gwa\s*(?:of|is|:)?\s*(1\.[0-9]{1,2}|2\.[0-9]{1,2}|3\.0)/i,
    /(?:my\s+)?general\s+weighted\s+average\s*(?:of|is|:)?\s*(1\.[0-9]{1,2}|2\.[0-9]{1,2}|3\.0)/i,
    /(?:i\s+(?:have|got)\s+(?:a\s+)?)(1\.[0-9]{1,2}|2\.[0-9]{1,2}|3\.0)\s*gwa/i,
  ];

  const gwaToPercent: Record<string, number> = {
    "1.00": 97, "1.25": 95, "1.50": 92, "1.75": 90,
    "2.00": 86, "2.25": 83, "2.50": 80, "2.75": 77, "3.00": 75,
  };

  for (const pattern of gwaPatterns) {
    const match = message.match(pattern);
    if (match) {
      const gwa = match[1];
      const rounded = Math.round(parseFloat(gwa) * 4) / 4;
      const gwaKey = rounded.toFixed(2);
      if (gwaToPercent[gwaKey]) return gwaToPercent[gwaKey];
      const gwaNum = parseFloat(gwa);
      if (gwaNum >= 1.0 && gwaNum <= 3.0) {
        return Math.round(97 - (gwaNum - 1.0) * 11);
      }
    }
  }

  const normalized = message
    .replace(/%/, "")
    .replace(/general average/gi, "gpa")
    .replace(/grade/gi, "gpa");

  const gpaExplicitMatch = normalized.match(
    /(?:gpa\s*(?:of|is|:)?\s*)(\d+(?:\.\d+)?)/i
  );
  if (gpaExplicitMatch) {
    const val = parseFloat(gpaExplicitMatch[1]);
    if (val >= 50 && val <= 100) return val;
  }

  const gpaBeforeMatch = normalized.match(
    /(\d+(?:\.\d+)?)\s*(?:%?\s*gpa|%?\s*general\s*average|%?\s*gwa)/i
  );
  if (gpaBeforeMatch) {
    const val = parseFloat(gpaBeforeMatch[1]);
    if (val >= 50 && val <= 100) return val;
  }

  const contextPatterns = [
    /(?:i\s*(?:have|got|earn|achiev)\s*(?:a|an)?\s*)(\d+(?:\.\d+)?)/i,
    /(?:my\s*(?:gpa|grade|average|gwa)\s*(?:is|of|:)\s*)(\d+(?:\.\d+)?)/i,
    /(?:with\s*(?:a|an)?\s*)(\d+(?:\.\d+)?)(?:\s*(?:gpa|grade|average|percent|%))/i,
  ];

  for (const pattern of contextPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      const val = parseFloat(match[1]);
      if (val >= 50 && val <= 100) return val;
    }
  }

  return null;
}

function extractStrand(message: string): string | null {
  const strandPatterns: [RegExp, string][] = [
    [/\bSTEM\b/i, "STEM"],
    [/\bABM\b/i, "ABM"],
    [/\bHUMSS\b/i, "HUMSS"],
    [/\bGAS\b/i, "GAS"],
    [/\bTVL\b/i, "TVL"],
  ];
  for (const [pattern, strand] of strandPatterns) {
    if (pattern.test(message)) return strand;
  }
  return null;
}

// ─── Scholarship Context Builder ────────────────────────────────────────────

function buildScholarshipsContext(
  scholarships: {
    name: string;
    provider: string;
    scholarshipType: string;
    coverage: string;
    coverageDetails: string | null;
    isAcceptingApplications: boolean;
    eligibleStrands: string;
    minGPA: number;
    maxAnnualIncome: number | null;
    priorityCourses: string | null;
    requirements: string;
    deadline: string;
    examType: string | null;
    examSubjects: string | null;
    websiteUrl: string | null;
    description: string;
  }[]
): string {
  return scholarships
    .map((s) => {
      const incomeInfo = s.maxAnnualIncome
        ? `Max annual family income: PHP ${s.maxAnnualIncome.toLocaleString()}`
        : "No income limit";
      const examInfo =
        s.examType && s.examType !== "none"
          ? `Exam type: ${s.examType}, Subjects: ${s.examSubjects || "N/A"}`
          : "No entrance exam required";
      const priorityInfo = s.priorityCourses
        ? `Priority Courses: ${s.priorityCourses}`
        : "Open to all courses";
      return [
        `--- ${s.name} ---`,
        `Provider: ${s.provider}`,
        `Type: ${s.scholarshipType} | Coverage: ${s.coverage}`,
        `Currently Accepting Applications: ${s.isAcceptingApplications ? "YES" : "NO"}`,
        `Coverage Details: ${s.coverageDetails || "Standard coverage"}`,
        `Eligible Strands: ${s.eligibleStrands}`,
        `Minimum GPA Required: ${s.minGPA}%  ← STUDENT MUST HAVE GPA ≥ ${s.minGPA}% TO BE ELIGIBLE`,
        incomeInfo,
        priorityInfo,
        `Requirements: ${s.requirements}`,
        `Deadline: ${s.deadline}`,
        examInfo,
        `Application Page: ${s.websiteUrl || "N/A"}`,
        `Description: ${s.description}`,
      ].join("\n");
    })
    .join("\n\n");
}

// ─── Caching ────────────────────────────────────────────────────────────────

let allScholarshipsContext: string | null = null;
let allScholarshipsCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

const webSearchCache = new Map<string, { results: string; sources: SourceReference[]; timestamp: number }>();
const WEB_CACHE_TTL = 10 * 60 * 1000;

async function getAllScholarshipsContext(): Promise<string> {
  const now = Date.now();
  if (allScholarshipsContext && now - allScholarshipsCacheTime < CACHE_TTL) {
    return allScholarshipsContext;
  }
  const scholarships = await db.scholarship.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  allScholarshipsContext = buildScholarshipsContext(scholarships);
  allScholarshipsCacheTime = now;
  return allScholarshipsContext;
}

async function getFilteredScholarshipsContext(
  userGPA: number,
  userStrand?: string | null
): Promise<{
  context: string;
  eligibleCount: number;
  totalCount: number;
  ineligible: { name: string; minGPA: number }[];
}> {
  const allScholarships = await db.scholarship.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const totalCount = allScholarships.length;
  const eligible = allScholarships.filter((s) => s.minGPA <= userGPA);
  const ineligible = allScholarships
    .filter((s) => s.minGPA > userGPA)
    .map((s) => ({ name: s.name, minGPA: s.minGPA }));

  let filtered = eligible;
  if (userStrand) {
    filtered = eligible.filter(
      (s) =>
        s.eligibleStrands.includes(userStrand) ||
        s.eligibleStrands.includes("All")
    );
  }

  const context = buildScholarshipsContext(filtered);
  return { context, eligibleCount: filtered.length, totalCount, ineligible };
}

// ─── Web Search & Page Reading (using z-ai-web-dev-sdk) ─────────────────────

async function performWebSearch(
  query: string
): Promise<{ context: string; sources: SourceReference[] }> {
  const cacheKey = query.toLowerCase().trim();
  const cached = webSearchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < WEB_CACHE_TTL) {
    return { context: cached.results, sources: cached.sources };
  }

  try {
    const zai = await ZAI.create();
    const searchResults = await zai.functions.invoke("web_search", {
      query,
      num: 5,
    });

    if (!Array.isArray(searchResults) || searchResults.length === 0) {
      return { context: "", sources: [] };
    }

    const sources: SourceReference[] = searchResults
      .slice(0, 5)
      .map((r: { name: string; url: string; snippet: string }) => ({
        type: "web_search" as const,
        name: r.name,
        url: r.url,
        snippet: r.snippet,
      }));

    const context = searchResults
      .slice(0, 5)
      .map(
        (r: { name: string; url: string; snippet: string }, i: number) =>
          `[Source ${i + 1}] ${r.name}\nURL: ${r.url}\n${r.snippet}`
      )
      .join("\n\n");

    webSearchCache.set(cacheKey, { results: context, sources, timestamp: Date.now() });
    return { context, sources };
  } catch (error) {
    console.error("[Chat API] Web search failed:", error);
    return { context: "", sources: [] };
  }
}

async function readWebPage(
  url: string
): Promise<{ context: string; source: SourceReference | null }> {
  try {
    const zai = await ZAI.create();
    const result = await zai.functions.invoke("page_reader", { url });

    if (!result?.data?.html) {
      return { context: "", source: null };
    }

    const plainText = result.data.html
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 3000);

    const source: SourceReference = {
      type: "web_page",
      name: result.data.title || url,
      url,
    };

    return { context: plainText, source };
  } catch (error) {
    console.error("[Chat API] Page reading failed:", error);
    return { context: "", source: null };
  }
}

// ─── Query Classification (using LangChain) ─────────────────────────────────

async function classifyQuery(
  message: string,
  scholarshipNames: string[]
): Promise<{
  needsWebSearch: boolean;
  searchQuery: string;
  needsPageRead: boolean;
  pageUrl: string;
}> {
  try {
    const model = getChatModel();
    const classificationPrompt = `You are a query classifier for a PUP-focused scholarship chatbot. Analyze the user's message and determine if it requires a web search.

AVAILABLE SCHOLARSHIP NAMES in our database:
${scholarshipNames.join(", ")}

CLASSIFICATION RULES:
1. If the question is about one of the listed scholarships AND asks for info in our database → needs_search=false
2. If the question asks about scholarships NOT in our list, current/upcoming dates, external info → needs_search=true
3. If the question asks about website features, exam tips, general advice → needs_search=false

Respond in this EXACT format only:
needs_search: true|false
search_query: [if true, provide search query, otherwise "none"]
needs_page_read: true|false
page_url: [if needs_page_read, provide URL, otherwise "none"]`;

    const response = await model.invoke([
      new SystemMessage(classificationPrompt),
      new HumanMessage(message),
    ]);

    const text =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    const needsWebSearch = /needs_search:\s*true/i.test(text);
    const needsPageRead = /needs_page_read:\s*true/i.test(text);
    const searchQueryMatch = text.match(/search_query:\s*(.+)/i);
    const pageUrlMatch = text.match(/page_url:\s*(.+)/i);

    return {
      needsWebSearch,
      searchQuery: searchQueryMatch?.[1]?.trim() || message,
      needsPageRead,
      pageUrl: pageUrlMatch?.[1]?.trim() || "",
    };
  } catch {
    return {
      needsWebSearch: false,
      searchQuery: message,
      needsPageRead: false,
      pageUrl: "",
    };
  }
}

// ─── System Prompt ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are ScholarAId Assistant, a friendly and knowledgeable AI chatbot for the ScholarAId website — an AI-powered scholarship platform built specifically for PUP (Polytechnic University of the Philippines) students and incoming freshmen. You help PUP students find scholarships, understand eligibility requirements, prepare for the PUPCET and other exams, and navigate the website.

YOUR PERSONALITY:
- Warm, encouraging, and supportive — like a helpful "ate/kuya" (older sibling) who wants the best for the student
- Use Filipino-friendly language when appropriate (you may mix in Filipino phrases like "Kayang-kaya yan!", "Sige, tulungan kita", etc.)
- Be empathetic to students who may be struggling financially or academically
- Celebrate their achievements and encourage them to apply
- You may refer to PUP students as "Iskolar ng Bayan" as a term of pride and encouragement

PUP-SPECIFIC CONTEXT:
- PUP stands for Polytechnic University of the Philippines, the largest state university in the Philippines by enrollment
- PUP students are called "Iskolars ng Bayan" (Scholars of the Nation)
- The PUP College Entrance Test (PUPCET) is the entrance exam for incoming freshmen
- PUP uses a grading system based on General Weighted Average (GWA) on a 1.00-5.00 scale:
  • 1.00 = highest grade (equivalent to ~97-100%)
  • 1.25 = ~94-96%
  • 1.50 = ~91-93% (President's Lister threshold)
  • 1.75 = ~88-90% (Dean's Lister threshold)
  • 2.00 = ~85-87%
  • 2.25 = ~82-84%
  • 2.50 = ~79-81%
  • 3.00 = ~75-78% (passing)
  • 5.00 = failing grade
- When students mention their GWA (e.g., "1.50"), convert it approximately to a percentage for eligibility checking:
  • GWA 1.00 ≈ 97%, GWA 1.25 ≈ 95%, GWA 1.50 ≈ 92%, GWA 1.75 ≈ 90%
  • GWA 2.00 ≈ 86%, GWA 2.25 ≈ 83%, GWA 2.50 ≈ 80%, GWA 3.00 ≈ 75%
- The Office of Student Financial Assistance (OSFA) is PUP's office that handles scholarships and financial aid
- PUP is a State University and College (SUC), which means tuition is already subsidized
- Many scholarships at PUP are coursed through OSFA (Room M-307, Main Building, PUP Sta. Mesa)

═══════════════════════════════════════════════════════════════
CRITICAL ELIGIBILITY RULES (MUST FOLLOW STRICTLY):
═══════════════════════════════════════════════════════════════

1. **GPA ELIGIBILITY IS STRICT**: A student with GPA X can ONLY be eligible for scholarships where "Minimum GPA Required" is ≤ X.
   - Student with 85% GPA → eligible for scholarships with minGPA 85% or LOWER
   - Student with 85% GPA → NOT eligible for scholarships with minGPA 88%, 90%, 92%

2. **NEVER recommend a scholarship the student is NOT eligible for** based on GPA.

3. **If the scholarship database section has been PRE-FILTERED** (indicated by a note), then ALL scholarships listed are ones the student IS GPA-eligible for.

4. **For each recommended scholarship, always state:**
   - The minimum GPA required (confirming the student meets it)
   - Whether it's currently accepting applications
   - The eligible strands
   - Priority courses (if the student mentions their intended course)
   - Application deadline

═══════════════════════════════════════════════════════════════
CRITICAL ANTI-HALLUCINATION RULES (MUST FOLLOW):
═══════════════════════════════════════════════════════════════

1. **NEVER fabricate or invent scholarship names, requirements, deadlines, or details.** If a scholarship is not in the SCHOLARSHIP DATABASE section below, do NOT claim it exists.

2. **ONLY use information explicitly provided in the context below.** Do not add details from your training data that conflict with what's provided.

3. **When you are NOT sure about something, explicitly say so.**

4. **If asked about a scholarship NOT in our database, be honest:**
   - "That scholarship isn't in our current database."
   - If web search results are provided, clearly label them as "from web search"

5. **For time-sensitive information, always add a disclaimer** that the student should verify on the official website.

6. **Do NOT extrapolate or infer specific numbers, dates, or requirements** unless they are explicitly stated in the provided context.

═══════════════════════════════════════════════════════════════

{ELIGIBILITY_NOTE}

SCHOLARSHIP DATABASE:
{SCHOLARSHIPS_CONTEXT}

{WEB_SEARCH_CONTEXT}

Remember: You are here to empower PUP students and incoming Iskolars ng Bayan. Every interaction should leave the student feeling more confident and informed. When in doubt, be honest — students trust you more when you admit what you don't know rather than making something up.`;

// ─── Main Handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, history = [] } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Step 0: Extract GPA and strand
    const userGPA = extractGPA(message);
    const userStrand = extractStrand(message);

    // Step 1: Get scholarship context (filtered if GPA was mentioned)
    let scholarshipsContext: string;
    let eligibilityNote = "";
    const allSources: SourceReference[] = [];

    if (userGPA !== null) {
      const filtered = await getFilteredScholarshipsContext(userGPA, userStrand);
      scholarshipsContext = filtered.context;

      eligibilityNote = [
        `═══════════════════════════════════════════════════════════════`,
        `PRE-FILTERED SCHOLARSHIP DATABASE (based on student's GPA: ${userGPA}%)`,
        `═══════════════════════════════════════════════════════════════`,
        ``,
        `The student mentioned they have a GPA of ${userGPA}%.`,
        userStrand ? `The student mentioned they are from the ${userStrand} strand.` : "",
        `The scholarships listed below have been PRE-FILTERED to only include ones where the minimum GPA requirement is ≤ ${userGPA}%.`,
        `This means the student IS GPA-eligible for ALL ${filtered.eligibleCount} scholarships listed below.`,
        `There are ${filtered.ineligible.length} scholarships NOT shown because the student's GPA does not meet their minimum requirement:`,
        ...filtered.ineligible.map((s) => `  - ${s.name} (requires ${s.minGPA}% GPA)`),
        ``,
        `IMPORTANT: Do NOT recommend any of the ineligible scholarships listed above as options the student can currently apply for.`,
        `═══════════════════════════════════════════════════════════════`,
      ].join("\n");

      allSources.push({
        type: "database",
        name: `ScholarAId Database (${filtered.eligibleCount} eligible for ${userGPA}% GPA)`,
      });
    } else {
      scholarshipsContext = await getAllScholarshipsContext();
    }

    // Step 2: Classify query for web search
    const scholarshipNames = (
      await db.scholarship.findMany({
        where: { isActive: true },
        select: { name: true },
      })
    ).map((s) => s.name);

    const classification = await classifyQuery(message, scholarshipNames);

    // Step 3: Perform web search if needed
    let webSearchContext = "";
    if (classification.needsWebSearch) {
      const searchResult = await performWebSearch(classification.searchQuery);
      webSearchContext = searchResult.context
        ? `\n\nWEB SEARCH RESULTS (use these carefully — they may not be fully verified):\n${searchResult.context}`
        : "";
      allSources.push(...searchResult.sources);
    }

    // Step 4: Read web page if needed
    if (classification.needsPageRead && classification.pageUrl) {
      const pageResult = await readWebPage(classification.pageUrl);
      if (pageResult.context) {
        webSearchContext += `\n\nWEB PAGE CONTENT from ${classification.pageUrl}:\n${pageResult.context}`;
        if (pageResult.source) {
          allSources.push(pageResult.source);
        }
      }
    }

    // Step 5: Build the system prompt with all context
    const systemPrompt = SYSTEM_PROMPT.replace(
      "{ELIGIBILITY_NOTE}",
      eligibilityNote
    )
      .replace("{SCHOLARSHIPS_CONTEXT}", scholarshipsContext)
      .replace("{WEB_SEARCH_CONTEXT}", webSearchContext);

    // Step 6: Build messages for the LangChain model
    const model = getChatModel();
    const messages = [
      new SystemMessage(systemPrompt),
      ...history.slice(-16).map((m) =>
        m.role === "user"
          ? new HumanMessage(m.content)
          : new AIMessage(m.content)
      ),
      new HumanMessage(message),
    ];

    // Step 7: Generate response using LangChain
    const response = await model.invoke(messages);

    let responseContent = "";
    if (typeof response.content === "string") {
      responseContent = response.content;
    } else if (Array.isArray(response.content)) {
      // Handle multi-part content from Gemini/other models
      const textParts = response.content.filter(
        (part: Record<string, unknown>) =>
          part.type === "text" && typeof (part as { text: string }).text === "string"
      );
      responseContent = textParts
        .map((part: Record<string, unknown>) => (part as { text: string }).text)
        .join("\n");
    }

    if (!responseContent) {
      return NextResponse.json(
        { error: "AI failed to generate a response" },
        { status: 500 }
      );
    }

    // Get model info
    const modelInfo = getActiveModelInfo();

    return NextResponse.json({
      response: responseContent,
      timestamp: new Date().toISOString(),
      sources: allSources.map((s) => ({
        type: s.type,
        name: s.name,
        url: s.url || undefined,
      })),
      model: {
        provider: modelInfo.provider,
        name: modelInfo.model,
      },
    });
  } catch (error) {
    console.error("[Chat API] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate response. Please try again." },
      { status: 500 }
    );
  }
}
