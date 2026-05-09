import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import ZAI from "z-ai-web-dev-sdk";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  message: string;
  history?: ChatMessage[];
}

// Cache scholarships context to avoid repeated DB queries
let scholarshipsContext: string | null = null;
let scholarshipsCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
    const examInfo = s.examType && s.examType !== "none"
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

const SYSTEM_PROMPT = `You are ScholarAId Assistant, a friendly and knowledgeable AI chatbot for the ScholarAId website — an AI-powered scholarship platform built for Filipino senior high school students. You help students find scholarships, understand eligibility requirements, prepare for exams, and navigate the website.

YOUR PERSONALITY:
- Warm, encouraging, and supportive — like a helpful "ate/kuya" (older sibling) who wants the best for the student
- Use Filipino-friendly language when appropriate (you may mix in Filipino phrases like "Kayang-kaya yan!", "Sige, tulungan kita", etc.)
- Be empathetic to students who may be struggling financially or academically
- Celebrate their achievements and encourage them to apply

WHAT YOU CAN HELP WITH:
1. **Scholarship Information** — Details about any scholarship in our database (requirements, deadlines, coverage, eligibility)
2. **Eligibility Checking** — Help students understand if they qualify for specific scholarships based on their GPA, strand, and income
3. **Application Guidance** — Tips on preparing applications, documents needed, and how to stand out
4. **Exam Preparation** — Advice on how to review for scholarship entrance exams (aptitude tests, academic exams, interviews)
5. **Website Navigation** — How to use the Eligibility Checker, Scholarship Browser, and AI Exam Reviewer features
6. **General Advice** — Motivational support, study tips, and career guidance for SHS students

IMPORTANT RULES:
- ONLY provide information about scholarships that are in the database provided below. Do NOT fabricate or invent scholarships.
- If asked about a scholarship not in the database, honestly say you don't have information about it but suggest checking the Scholarship Browser for available options.
- When a student shares their GPA, strand, or income, proactively suggest scholarships they may be eligible for.
- Always be specific — mention actual scholarship names, actual GPA requirements, actual deadlines.
- If a student seems unsure about their strand or qualifications, guide them through understanding their options.
- Keep responses concise but informative. Use bullet points or numbered lists for clarity.
- If you don't know something, say so honestly rather than guessing.

WEBSITE FEATURES YOU CAN EXPLAIN:
- **Eligibility Checker**: Students input their GPA, strand, income, and preferences → the system matches them with eligible scholarships
- **Scholarship Browser**: Browse and filter all scholarships by type (government/private/merit), coverage (full/partial), and strand (STEM/ABM/HUMSS/GAS/TVL)
- **AI Exam Reviewer**: Generate AI-powered practice questions tailored to specific scholarship exams with instant feedback and explanations

SCHOLARSHIP DATABASE:
{SCHOLARSHIPS_CONTEXT}

Remember: You are here to empower Filipino students to access the financial support they deserve for their education. Every interaction should leave the student feeling more confident and informed.`;

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

    // Get scholarships context
    const scholarshipsContext = await getScholarshipsContext();

    // Build the system prompt with scholarship data
    const systemPrompt = SYSTEM_PROMPT.replace(
      "{SCHOLARSHIPS_CONTEXT}",
      scholarshipsContext
    );

    // Build messages array for the LLM
    const messages = [
      { role: "assistant" as const, content: systemPrompt },
      // Include conversation history (limit to last 20 messages to avoid token overflow)
      ...history.slice(-20).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      // Add the current user message
      { role: "user" as const, content: message },
    ];

    // Initialize the AI SDK and generate response
    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: "disabled" },
    });

    const responseContent = completion.choices?.[0]?.message?.content;

    if (!responseContent) {
      return NextResponse.json(
        { error: "AI failed to generate a response" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      response: responseContent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json(
      { error: "Failed to generate response. Please try again." },
      { status: 500 }
    );
  }
}
