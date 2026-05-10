import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import ZAI from "z-ai-web-dev-sdk";

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

/**
 * Extracts a GPA/grade value from the user's message.
 * Returns null if no GPA is mentioned.
 */
function extractGPA(message: string): number | null {
  // Normalize: remove % signs, handle Filipino terms
  const normalized = message
    .replace(/%/, "")
    .replace(/gwa/gi, "gpa")
    .replace(/general average/gi, "gpa")
    .replace(/grade/gi, "gpa");

  // Pattern 1: "85 GPA", "GPA of 85", "GPA is 85"
  const gpaExplicitMatch = normalized.match(
    /(?:gpa\s*(?:of|is|:)?\s*)(\d+(?:\.\d+)?)/i
  );
  if (gpaExplicitMatch) {
    const val = parseFloat(gpaExplicitMatch[1]);
    if (val >= 50 && val <= 100) return val;
  }

  // Pattern 2: "85% GPA", "85 gpa", "85 general average"
  const gpaBeforeMatch = normalized.match(
    /(\d+(?:\.\d+)?)\s*(?:%?\s*gpa|%?\s*general\s*average|%?\s*gwa)/i
  );
  if (gpaBeforeMatch) {
    const val = parseFloat(gpaBeforeMatch[1]);
    if (val >= 50 && val <= 100) return val;
  }

  // Pattern 3: "I have an 85", "my gpa is 85", "with 85"
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

/**
 * Extract strand mention from the user's message
 */
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

// ─── Caching ────────────────────────────────────────────────────────────────

let allScholarshipsContext: string | null = null;
let allScholarshipsCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Web search cache (short-lived)
const webSearchCache = new Map<string, { results: string; sources: SourceReference[]; timestamp: number }>();
const WEB_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Builds the scholarship context string from a list of scholarships.
 * Includes priority courses information.
 */
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
  const lines = scholarships.map((s) => {
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
  });

  return lines.join("\n\n");
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

/**
 * Get a pre-filtered scholarship context based on the user's GPA and strand.
 * This prevents the LLM from seeing scholarships the student isn't eligible for.
 */
async function getFilteredScholarshipsContext(
  userGPA: number,
  userStrand?: string | null
): Promise<{ context: string; eligibleCount: number; totalCount: number; ineligible: { name: string; minGPA: number }[] }> {
  const allScholarships = await db.scholarship.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const totalCount = allScholarships.length;

  // Filter: scholarships where minGPA <= userGPA (student's GPA meets the minimum)
  const eligible = allScholarships.filter((s) => s.minGPA <= userGPA);
  const ineligible = allScholarships
    .filter((s) => s.minGPA > userGPA)
    .map((s) => ({ name: s.name, minGPA: s.minGPA }));

  // Further filter by strand if provided
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

// ─── Query Classification ───────────────────────────────────────────────────

async function classifyQuery(
  zai: ZAI,
  message: string,
  scholarshipNames: string[]
): Promise<{
  needsWebSearch: boolean;
  searchQuery: string;
  needsPageRead: boolean;
  pageUrl: string;
}> {
  const classificationPrompt = `You are a query classifier for a Philippine scholarship chatbot. Analyze the user's message and determine if it requires a web search to answer accurately.

AVAILABLE SCHOLARSHIP NAMES in our database:
${scholarshipNames.join(", ")}

CLASSIFICATION RULES:
1. If the question is about one of the listed scholarships AND asks for info that would be in our database (requirements, GPA, income, coverage, deadline, exam, strands, courses), respond: needs_search=false
2. If the question asks about scholarships NOT in our list, or asks about current/upcoming application dates, or asks about external information (news, other programs, specific school details not in our data), respond: needs_search=true
3. If the question asks about website features, how to use the site, exam tips, or general advice, respond: needs_search=false

Respond in this EXACT format only:
needs_search: true|false
search_query: [if true, provide a specific search query optimized for Philippine scholarships, otherwise "none"]
needs_page_read: true|false
page_url: [if needs_page_read, provide a relevant URL to read, otherwise "none"]`;

  try {
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant" as const, content: classificationPrompt },
        { role: "user" as const, content: message },
      ],
      thinking: { type: "disabled" },
    });

    const response = completion.choices?.[0]?.message?.content || "";
    const needsWebSearch = /needs_search:\s*true/i.test(response);
    const needsPageRead = /needs_page_read:\s*true/i.test(response);

    const searchQueryMatch = response.match(
      /search_query:\s*(.+)/i
    );
    const pageUrlMatch = response.match(/page_url:\s*(.+)/i);

    return {
      needsWebSearch,
      searchQuery: searchQueryMatch?.[1]?.trim() || message,
      needsPageRead,
      pageUrl: pageUrlMatch?.[1]?.trim() || "",
    };
  } catch {
    // Default: don't search, use DB only
    return {
      needsWebSearch: false,
      searchQuery: message,
      needsPageRead: false,
      pageUrl: "",
    };
  }
}

// ─── Web Search ─────────────────────────────────────────────────────────────

async function performWebSearch(
  zai: ZAI,
  query: string
): Promise<{ context: string; sources: SourceReference[] }> {
  // Check cache first
  const cacheKey = query.toLowerCase().trim();
  const cached = webSearchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < WEB_CACHE_TTL) {
    return { context: cached.results, sources: cached.sources };
  }

  try {
    const searchResults = await zai.functions.invoke("web_search", {
      query: query,
      num: 5,
    });

    if (!Array.isArray(searchResults) || searchResults.length === 0) {
      return { context: "", sources: [] };
    }

    const sources: SourceReference[] = searchResults
      .slice(0, 5)
      .map((r: { name: string; url: string; snippet: string; host_name: string }) => ({
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

    // Cache the results
    webSearchCache.set(cacheKey, { results: context, sources, timestamp: Date.now() });

    return { context, sources };
  } catch (error) {
    console.error("Web search failed:", error);
    return { context: "", sources: [] };
  }
}

// ─── Web Page Reading ───────────────────────────────────────────────────────

async function readWebPage(
  zai: ZAI,
  url: string
): Promise<{ context: string; source: SourceReference | null }> {
  try {
    const result = await zai.functions.invoke("page_reader", {
      url: url,
    });

    if (!result?.data?.html) {
      return { context: "", source: null };
    }

    // Extract text content, limiting to reasonable length
    const plainText = result.data.html
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 3000);

    const source: SourceReference = {
      type: "web_page",
      name: result.data.title || url,
      url: url,
    };

    return { context: plainText, source };
  } catch (error) {
    console.error("Page reading failed:", error);
    return { context: "", source: null };
  }
}

// ─── System Prompt ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are ScholarAId Assistant, a friendly and knowledgeable AI chatbot for the ScholarAId website — an AI-powered scholarship platform built for Filipino senior high school students. You help students find scholarships, understand eligibility requirements, prepare for exams, and navigate the website.

YOUR PERSONALITY:
- Warm, encouraging, and supportive — like a helpful "ate/kuya" (older sibling) who wants the best for the student
- Use Filipino-friendly language when appropriate (you may mix in Filipino phrases like "Kayang-kaya yan!", "Sige, tulungan kita", etc.)
- Be empathetic to students who may be struggling financially or academically
- Celebrate their achievements and encourage them to apply

═══════════════════════════════════════════════════════════════
CRITICAL ELIGIBILITY RULES (MUST FOLLOW STRICTLY):
═══════════════════════════════════════════════════════════════

When a student asks "What scholarships can I apply for?" or mentions their GPA, you MUST follow these rules:

1. **GPA ELIGIBILITY IS STRICT**: A student with GPA X can ONLY be eligible for scholarships where "Minimum GPA Required" is ≤ X.
   - Example: Student with 85% GPA → eligible for scholarships with minGPA 85% or LOWER (e.g., 75%, 80%, 83%, 85%)
   - Example: Student with 85% GPA → NOT eligible for scholarships with minGPA 88%, 90%, 92%
   - Example: Student with 92% GPA → eligible for scholarships with minGPA 92% or LOWER

2. **NEVER recommend a scholarship the student is NOT eligible for** based on GPA. If a scholarship requires 90% and the student has 85%, that scholarship is NOT an option for them.

3. **If the scholarship database section has been PRE-FILTERED** (indicated by a note saying "PRE-FILTERED"), then ALL scholarships listed are ones the student is GPA-eligible for. You can confidently recommend any of them.

4. **If there are scholarships NOT listed** (because they were filtered out due to GPA), you may MENTION them as options the student does NOT yet qualify for, but clearly label them: "You don't currently meet the GPA requirement for these scholarships, but here are ones to aim for:" — and only do this if the student asks about other options or seems ambitious.

5. **When listing eligible scholarships, also check:**
   - Strand compatibility (the student's strand must be in the "Eligible Strands" list)
   - Income requirements (if the student mentions family income, check against "Max annual family income")
   - Application status (note if "Currently Accepting Applications: NO")
   - Priority courses (mention if the scholarship has specific priority courses)

6. **For each recommended scholarship, always state:**
   - The minimum GPA required (confirming the student meets it)
   - Whether it's currently accepting applications
   - The eligible strands
   - Priority courses (if the student mentions their intended course)
   - Application deadline

═══════════════════════════════════════════════════════════════
CRITICAL ANTI-HALLUCINATION RULES (MUST FOLLOW):
═══════════════════════════════════════════════════════════════

1. **NEVER fabricate or invent scholarship names, requirements, deadlines, or details.** If a scholarship is not in the SCHOLARSHIP DATABASE section below, do NOT claim it exists.

2. **ONLY use information explicitly provided in the context below.** Do not add details from your training data that conflict with or add to what's provided.

3. **When you are NOT sure about something, explicitly say so.** Use phrases like:
   - "I'm not certain about that specific detail..."
   - "I don't have confirmed information about that..."
   - "Based on what I know, but you should verify this..."
   - "I might be wrong about this, so please double-check..."

4. **If asked about a scholarship NOT in our database, be honest:**
   - "That scholarship isn't in our current database. I'd recommend checking the official website directly or using our Scholarship Browser to see what's available."
   - If web search results are provided, you may share them but clearly label them as "from web search" and note they may not be fully verified.

5. **NEVER state uncertain information as fact.** Always qualify uncertain claims with "I believe", "typically", "as of my last update", or similar qualifiers.

6. **If you genuinely don't know the answer, say "I don't know" or "I'm not sure about that."** This is ALWAYS better than making something up.

7. **When sharing information from web search results, clearly indicate the source** by saying "According to [source name]..." or "Based on web search results from [website]..."

8. **For time-sensitive information (deadlines, dates, amounts), always add a disclaimer** that the student should verify on the official website, as these can change.

9. **Do NOT extrapolate or infer specific numbers, dates, or requirements** unless they are explicitly stated in the provided context.

═══════════════════════════════════════════════════════════════

WHAT YOU CAN HELP WITH:
1. **Scholarship Information** — Details about any scholarship in our database (requirements, deadlines, coverage, eligibility, priority courses)
2. **Eligibility Checking** — Help students understand if they qualify for specific scholarships based on their GPA, strand, income, and intended course
3. **Application Guidance** — Tips on preparing applications, documents needed, and how to stand out
4. **Exam Preparation** — Advice on how to review for scholarship entrance exams (aptitude tests, academic exams, interviews)
5. **Website Navigation** — How to use the Eligibility Checker, Scholarship Browser, and AI Exam Reviewer features
6. **General Advice** — Motivational support, study tips, and career guidance for SHS students

WEBSITE FEATURES YOU CAN EXPLAIN:
- **Eligibility Checker**: Students input their GPA, strand, income, and preferences → the system matches them with eligible scholarships
- **Scholarship Browser**: Browse and filter all scholarships by type (government/private/merit), coverage (full/partial), and strand (STEM/ABM/HUMSS/GAS/TVL)
- **AI Exam Reviewer**: Generate AI-powered practice questions tailored to specific scholarship exams with instant feedback and explanations
- **AI Chatbot (that's me!)**: Ask any question about scholarships, eligibility, the website, or get study tips

{ELIGIBILITY_NOTE}

SCHOLARSHIP DATABASE:
{SCHOLARSHIPS_CONTEXT}

{WEB_SEARCH_CONTEXT}

Remember: You are here to empower Filipino students to access the financial support they deserve for their education. Every interaction should leave the student feeling more confident and informed. When in doubt, be honest — students trust you more when you admit what you don't know rather than making something up.`;

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

    // Initialize SDK
    const zai = await ZAI.create();

    // ─── Step 0: Extract GPA and strand from the user's message ──────────
    const userGPA = extractGPA(message);
    const userStrand = extractStrand(message);

    // ─── Step 1: Get scholarship context (filtered if GPA was mentioned) ──
    let scholarshipsContext: string;
    let eligibilityNote = "";

    if (userGPA !== null) {
      // Pre-filter scholarships based on the user's GPA
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
        ...filtered.ineligible.map(
          (s) => `  - ${s.name} (requires ${s.minGPA}% GPA)`
        ),
        ``,
        `IMPORTANT: Do NOT recommend any of the ineligible scholarships listed above as options the student can currently apply for. You may mention them as aspirational goals if the student asks about improving their GPA or future opportunities.`,
        `═══════════════════════════════════════════════════════════════`,
      ].join("\n");

      // Add a database source
      const dbSource: SourceReference = {
        type: "database",
        name: `ScholarAId Database (${filtered.eligibleCount} eligible for ${userGPA}% GPA)`,
      };
      // We'll add this to sources later
    } else {
      scholarshipsContext = await getAllScholarshipsContext();
      eligibilityNote = "";
    }

    // Get scholarship names for classification
    const scholarshipNames = (await db.scholarship.findMany({
      where: { isActive: true },
      select: { name: true },
    })).map((s) => s.name);

    // Step 2: Classify the query to determine if web search is needed
    const classification = await classifyQuery(
      zai,
      message,
      scholarshipNames
    );

    // Step 3: Perform web search if needed
    let webSearchContext = "";
    let allSources: SourceReference[] = [];

    if (userGPA !== null) {
      allSources.push({
        type: "database",
        name: `ScholarAId Database (filtered by GPA ≥ ${userGPA}%)`,
      });
    }

    if (classification.needsWebSearch) {
      const searchResult = await performWebSearch(
        zai,
        classification.searchQuery
      );
      webSearchContext = searchResult.context
        ? `\n\nWEB SEARCH RESULTS (use these carefully — they may not be fully verified):\n${searchResult.context}`
        : "";
      allSources.push(...searchResult.sources);
    }

    // Step 4: Read web page if needed
    if (classification.needsPageRead && classification.pageUrl) {
      const pageResult = await readWebPage(zai, classification.pageUrl);
      if (pageResult.context) {
        webSearchContext += `\n\nWEB PAGE CONTENT from ${classification.pageUrl}:\n${pageResult.context}`;
        if (pageResult.source) {
          allSources.push(pageResult.source);
        }
      }
    }

    // Build the system prompt with all context
    const systemPrompt = SYSTEM_PROMPT.replace(
      "{ELIGIBILITY_NOTE}",
      eligibilityNote
    )
      .replace("{SCHOLARSHIPS_CONTEXT}", scholarshipsContext)
      .replace("{WEB_SEARCH_CONTEXT}", webSearchContext);

    // Build messages array for the LLM
    const messages = [
      { role: "assistant" as const, content: systemPrompt },
      // Include conversation history (limit to last 16 messages)
      ...history.slice(-16).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      // Add the current user message
      { role: "user" as const, content: message },
    ];

    // Step 5: Generate response with thinking enabled for better reasoning
    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: "enabled" },
    });

    const responseContent = completion.choices?.[0]?.message?.content;

    if (!responseContent) {
      return NextResponse.json(
        { error: "AI failed to generate a response" },
        { status: 500 }
      );
    }

    // Format sources for the frontend
    const formattedSources = allSources.map((s) => ({
      type: s.type,
      name: s.name,
      url: s.url || undefined,
    }));

    return NextResponse.json({
      response: responseContent,
      timestamp: new Date().toISOString(),
      sources: formattedSources,
      usedWebSearch: classification.needsWebSearch,
    });
  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json(
      { error: "Failed to generate response. Please try again." },
      { status: 500 }
    );
  }
}
