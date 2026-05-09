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

// ─── Caching ────────────────────────────────────────────────────────────────

let scholarshipsContext: string | null = null;
let scholarshipsCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Web search cache (short-lived)
const webSearchCache = new Map<string, { results: string; sources: SourceReference[]; timestamp: number }>();
const WEB_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function getScholarshipsContext(): Promise<string> {
  const now = Date.now();
  if (scholarshipsContext && now - scholarshipsCacheTime < CACHE_TTL) {
    return scholarshipsContext;
  }

  const scholarships = await db.scholarship.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const lines = scholarships.map((s) => {
    const incomeInfo = s.maxAnnualIncome
      ? `Max annual family income: PHP ${s.maxAnnualIncome.toLocaleString()}`
      : "No income limit";
    const examInfo =
      s.examType && s.examType !== "none"
        ? `Exam type: ${s.examType}, Subjects: ${s.examSubjects || "N/A"}`
        : "No entrance exam required";
    return [
      `--- ${s.name} ---`,
      `Provider: ${s.provider}`,
      `Type: ${s.scholarshipType} | Coverage: ${s.coverage}`,
      `Coverage Details: ${s.coverageDetails || "Standard coverage"}`,
      `Eligible Strands: ${s.eligibleStrands}`,
      `Minimum GPA: ${s.minGPA}%`,
      incomeInfo,
      `Requirements: ${s.requirements}`,
      `Deadline: ${s.deadline}`,
      examInfo,
      `Website: ${s.websiteUrl || "N/A"}`,
      `Description: ${s.description}`,
    ].join("\n");
  });

  scholarshipsContext = lines.join("\n\n");
  scholarshipsCacheTime = now;
  return scholarshipsContext;
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
1. If the question is about one of the listed scholarships AND asks for info that would be in our database (requirements, GPA, income, coverage, deadline, exam, strands), respond: needs_search=false
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
1. **Scholarship Information** — Details about any scholarship in our database (requirements, deadlines, coverage, eligibility)
2. **Eligibility Checking** — Help students understand if they qualify for specific scholarships based on their GPA, strand, and income
3. **Application Guidance** — Tips on preparing applications, documents needed, and how to stand out
4. **Exam Preparation** — Advice on how to review for scholarship entrance exams (aptitude tests, academic exams, interviews)
5. **Website Navigation** — How to use the Eligibility Checker, Scholarship Browser, and AI Exam Reviewer features
6. **General Advice** — Motivational support, study tips, and career guidance for SHS students

WEBSITE FEATURES YOU CAN EXPLAIN:
- **Eligibility Checker**: Students input their GPA, strand, income, and preferences → the system matches them with eligible scholarships
- **Scholarship Browser**: Browse and filter all scholarships by type (government/private/merit), coverage (full/partial), and strand (STEM/ABM/HUMSS/GAS/TVL)
- **AI Exam Reviewer**: Generate AI-powered practice questions tailored to specific scholarship exams with instant feedback and explanations
- **AI Chatbot (that's me!)**: Ask any question about scholarships, eligibility, the website, or get study tips

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

    // Get scholarships context
    const scholarshipsContext = await getScholarshipsContext();

    // Get scholarship names for classification
    const scholarshipNames = (await db.scholarship.findMany({
      where: { isActive: true },
      select: { name: true },
    })).map((s) => s.name);

    // Step 1: Classify the query to determine if web search is needed
    const classification = await classifyQuery(
      zai,
      message,
      scholarshipNames
    );

    // Step 2: Perform web search if needed
    let webSearchContext = "";
    let allSources: SourceReference[] = [];

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

    // Step 3: Read web page if needed
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
      "{SCHOLARSHIPS_CONTEXT}",
      scholarshipsContext
    ).replace("{WEB_SEARCH_CONTEXT}", webSearchContext);

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

    // Step 4: Generate response with thinking enabled for better reasoning
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
