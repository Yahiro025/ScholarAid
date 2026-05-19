import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getChatModel,
  getActiveModelInfo,
  pageReaderTool,
  webSearchTool,
} from "@/lib/langchain";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { classificationPrompt } from "@/lib/langchain/prompts";
import { QueryClassificationSchema } from "@/lib/langchain/schemas";

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
let cachedNames: string[] | null = null;
let namesCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function getScholarshipNames(): Promise<string[]> {
  const now = Date.now();
  if (cachedNames && now - namesCacheTime < CACHE_TTL) {
    return cachedNames;
  }
  const scholarships = await db.scholarship.findMany({
    where: { isActive: true },
    select: { name: true },
  });
  cachedNames = scholarships.map((s) => s.name);
  namesCacheTime = now;
  return cachedNames;
}

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
  return { context, eligibleCount: filtered.length, totalCount: allScholarships.length, ineligible };
}

// ─── Query Classification (using LangChain for accuracy) ──────────────────

async function classifyQuery(
  message: string,
  scholarshipNames: string[]
) {
  try {
    const model = getChatModel().withStructuredOutput(QueryClassificationSchema);
    const classification = await model.invoke(
      await classificationPrompt.format({
        scholarship_names: scholarshipNames.join(", "),
        message: message
      })
    );
    return classification;
  } catch (error) {
    console.error("[Chat API] Classification failed:", error);
    return {
      needsWebSearch: false,
      searchQuery: "none",
      needsPageRead: false,
      pageUrl: "none",
      intent: "general_advice" as const,
    };
  }
}

// ─── Tool Execution ─────────────────────────────────────────────────────────

async function executePageReader(url: string): Promise<string> {
  try {
    const result = await pageReaderTool.invoke({ url });
    return `\n\n[OFFICIAL PAGE CONTENT FROM ${url}]\n${result}\n[END OFFICIAL CONTENT]`;
  } catch (error) {
    console.error("[Chat API] Page reader failed:", error);
    return `\n\n[TOOL ERROR] Failed to read official page at ${url}.`;
  }
}

async function executeWebSearch(query: string): Promise<string> {
  try {
    const result = await webSearchTool.invoke({ query });
    return `\n\n[WEB SEARCH RESULTS FOR: ${query}]\n${result}\n[END WEB SEARCH]`;
  } catch (error) {
    console.error("[Chat API] Web search failed:", error);
    return `\n\n[TOOL ERROR] Failed to search the web for ${query}.`;
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

4. **If asked about a scholarship NOT in our database, be honest.**

5. **For time-sensitive information, always add a disclaimer** that the student should verify on the official website.

6. **Do NOT extrapolate or infer specific numbers, dates, or requirements** unless they are explicitly stated in the provided context.

═══════════════════════════════════════════════════════════════

{ELIGIBILITY_NOTE}

SCHOLARSHIP DATABASE:
{SCHOLARSHIPS_CONTEXT}

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

    // Step 1: Start data fetching and classification in parallel
    const scholarshipNamesPromise = getScholarshipNames();
    const scholarshipDataPromise = userGPA !== null
        ? getFilteredScholarshipsContext(userGPA, userStrand)
        : getAllScholarshipsContext().then(context => ({
            context,
            eligibleCount: 0,
            ineligible: [],
          }));

    // Start classification as soon as names are ready
    const classificationPromise = scholarshipNamesPromise.then(names => 
      classifyQuery(message, names)
    );

    const [scholarshipData, classification] = await Promise.all([
      scholarshipDataPromise,
      classificationPromise,
    ]);

    // Step 2: Tool Execution (Improved RAG)
    let toolContext = "";
    
    // Check if we need web search
    const webSearchPromise = classification.needsWebSearch && classification.searchQuery !== "none"
      ? executeWebSearch(classification.searchQuery)
      : Promise.resolve("");

    // Check if we need to read a page
    let pageReaderPromise = Promise.resolve("");
    if (classification.needsPageRead) {
      let targetUrl = classification.pageUrl;
      
      // If classifier didn't find a URL but gave a scholarship name, look it up in DB
      if (targetUrl === "none" && classification.searchQuery !== "none") {
        const scholarship = await db.scholarship.findFirst({
          where: { 
            name: { contains: classification.searchQuery, mode: 'insensitive' },
            isActive: true 
          },
          select: { websiteUrl: true }
        });
        if (scholarship?.websiteUrl) {
          targetUrl = scholarship.websiteUrl;
        }
      }
      
      if (targetUrl !== "none" && targetUrl.startsWith("http")) {
        pageReaderPromise = executePageReader(targetUrl);
      }
    }

    const [webResult, pageResult] = await Promise.all([
      webSearchPromise,
      pageReaderPromise
    ]);

    toolContext = webResult + pageResult;

    let eligibilityNote = "";
    if (userGPA !== null && "eligibleCount" in scholarshipData) {
      const data = scholarshipData as any;
      eligibilityNote = [
        `═══════════════════════════════════════════════════════════════`,
        `PRE-FILTERED SCHOLARSHIP DATABASE (based on student's GPA: ${userGPA}%)`,
        `═══════════════════════════════════════════════════════════════`,
        ``,
        `The student mentioned they have a GPA of ${userGPA}%.`,
        userStrand ? `The student mentioned they are from the ${userStrand} strand.` : "",
        `The scholarships listed below have been PRE-FILTERED to only include ones where the minimum GPA requirement is ≤ ${userGPA}%.`,
        `This means the student IS GPA-eligible for ALL ${data.eligibleCount} scholarships listed below.`,
        data.ineligible.length > 0 
          ? `There are ${data.ineligible.length} scholarships NOT shown because the student's GPA does not meet their minimum requirement.`
          : "",
        ``,
        `═══════════════════════════════════════════════════════════════`,
      ].join("\n");
    }

    // Step 3: Build the system prompt
    const finalSystemPrompt = SYSTEM_PROMPT.replace(
      "{ELIGIBILITY_NOTE}",
      eligibilityNote
    ).replace("{SCHOLARSHIPS_CONTEXT}", scholarshipData.context) + toolContext;

    // Step 4: Build messages
    const messages = [
      new SystemMessage(finalSystemPrompt),
      ...history.slice(-10).map((m) =>
        m.role === "user"
          ? new HumanMessage(m.content)
          : new AIMessage(m.content)
      ),
      new HumanMessage(message),
    ];

    // Step 5: Streaming Response
    const model = getChatModel();
    const encoder = new TextEncoder();

    const stream = await model.stream(messages);

    return new Response(
      new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const content = typeof chunk.content === 'string' 
                ? chunk.content 
                : JSON.stringify(chunk.content);
              controller.enqueue(encoder.encode(content));
            }
            controller.close();
          } catch (error) {
            console.error("[Chat API] Streaming error:", error);
            controller.error(error);
          }
        },
      }),
      {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Accel-Buffering": "no", // Disable buffering for Nginx/Vercel
        },
      }
    );
  } catch (error) {
    console.error("[Chat API] Unhandled error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
