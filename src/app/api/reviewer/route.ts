import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import type { ExamQuestion } from "@/lib/langchain/schemas";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ReviewerRequest {
  scholarshipId: string;
  scholarshipName: string;
  examType: string;
  examSubjects: string;
  numQuestions: number;
}

// ─── Direct z-ai LLM call with retry ──────────────────────────────────────────

async function callZAI(
  messages: { role: "assistant" | "user"; content: string }[],
  retries = 3
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages,
        thinking: { type: "disabled" },
      });

      const content = completion.choices?.[0]?.message?.content;
      if (!content || content.trim().length === 0) {
        throw new Error("Empty response from AI");
      }

      return content;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(
        `[Reviewer API] z-ai call attempt ${attempt} failed:`,
        lastError.message
      );

      if (attempt < retries) {
        // Wait before retry (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  throw lastError || new Error("Failed to get AI response after retries");
}

// ─── JSON Parser for AI responses ──────────────────────────────────────────

function extractQuestionsFromResponse(
  responseContent: string,
  examSubjects: string
): ExamQuestion[] {
  // Strategy 1: Try to find valid JSON in the response
  try {
    let jsonStr = responseContent.trim();

    // Remove markdown code block if present
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    // Try to find JSON array or object in the response
    const jsonArrayMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (jsonArrayMatch) {
      jsonStr = jsonArrayMatch[0];
    }

    const parsed = JSON.parse(jsonStr);
    const rawQuestions = Array.isArray(parsed)
      ? parsed
      : parsed.questions || [];

    if (rawQuestions.length > 0) {
      return validateQuestions(rawQuestions, examSubjects);
    }
  } catch {
    // JSON parsing failed, try markdown parsing
  }

  // Strategy 2: Parse markdown-formatted questions
  return parseMarkdownQuestions(responseContent, examSubjects);
}

function validateQuestions(
  rawQuestions: Record<string, unknown>[],
  examSubjects: string
): ExamQuestion[] {
  return rawQuestions
    .map((q, index) => {
      if (!q.question || !Array.isArray(q.options) || q.options.length < 2) {
        console.warn(`[Reviewer API] Question ${index + 1} has invalid format, skipping`);
        return null;
      }

      // Ensure exactly 4 options
      let options = (q.options as string[]).map(String);
      while (options.length < 4) {
        options.push(`Option ${options.length + 1}`);
      }
      options = options.slice(0, 4);

      // Parse correct answer - can be index (0-3) or letter (A-D)
      let correctAnswer = 0;
      if (typeof q.correctAnswer === "number") {
        correctAnswer = Math.min(Math.max(q.correctAnswer, 0), 3);
      } else if (typeof q.correctAnswer === "string") {
        const letter = q.correctAnswer.toUpperCase().trim();
        const letterIndex = letter.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
        if (letterIndex >= 0 && letterIndex <= 3) {
          correctAnswer = letterIndex;
        } else {
          // Try parsing as number string
          const num = parseInt(letter);
          if (!isNaN(num)) {
            correctAnswer = Math.min(Math.max(num, 0), 3);
          }
        }
      }

      return {
        question: String(q.question),
        options,
        correctAnswer,
        subject: String(q.subject || examSubjects.split(",")[0]?.trim() || "General"),
        explanation: String(q.explanation || "No explanation provided"),
      } satisfies ExamQuestion;
    })
    .filter((q): q is ExamQuestion => q !== null);
}

function parseMarkdownQuestions(
  content: string,
  examSubjects: string
): ExamQuestion[] {
  const questions: ExamQuestion[] = [];
  const subjects = examSubjects.split(",").map((s) => s.trim());
  let currentSubject = subjects[0] || "General";

  // Split by question markers
  const questionBlocks = content.split(/(?=\*\*Question\s+\d+)/i);

  for (const block of questionBlocks) {
    if (!block.trim()) continue;

    // Extract question text
    const questionMatch = block.match(
      /\*\*Question\s+\d+[:\s]*\*\*\s*(?:\*\*Subject:\s*([^*]+)\*\*)?\s*\n([\s\S]*?)(?=\n\s*A[)\.])/i
    );
    if (!questionMatch) continue;

    if (questionMatch[1]) {
      currentSubject = questionMatch[1].trim();
    }
    const questionText = questionMatch[2].trim();
    if (!questionText) continue;

    // Extract options (A, B, C, D)
    const options: string[] = [];
    const optionPattern = /([A-D])[)\.]\s*(.*?)(?=\n\s*[A-D][)\.]|\n\s*\*\*Correct|$)/gi;
    let match;
    while ((match = optionPattern.exec(block)) !== null && options.length < 4) {
      options.push(match[2].trim());
    }

    if (options.length < 2) continue;

    // Pad options to 4
    while (options.length < 4) {
      options.push(`Option ${options.length + 1}`);
    }

    // Extract correct answer
    let correctAnswer = 0;
    const correctMatch = block.match(
      /\*\*Correct Answer:\s*([A-D])\*\*/i
    );
    if (correctMatch) {
      const letter = correctMatch[1].toUpperCase();
      correctAnswer = letter.charCodeAt(0) - 65;
    }

    // Extract explanation
    let explanation = "No explanation provided";
    const explanationMatch = block.match(
      /\*\*Explanation[:\s]*\*\*\s*([\s\S]*?)(?=\n---|\n\*\*Question|\n\n\*\*|$)/i
    );
    if (explanationMatch) {
      explanation = explanationMatch[1].trim();
    }

    questions.push({
      question: questionText,
      options: options.slice(0, 4),
      correctAnswer,
      subject: currentSubject,
      explanation,
    });
  }

  return questions;
}

// ─── Main Handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body: ReviewerRequest = await request.json();
    const {
      scholarshipId,
      scholarshipName,
      examType,
      examSubjects,
      numQuestions,
    } = body;

    // Validate required fields
    if (
      !scholarshipId ||
      !scholarshipName ||
      !examType ||
      !examSubjects ||
      !numQuestions
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: scholarshipId, scholarshipName, examType, examSubjects, numQuestions",
        },
        { status: 400 }
      );
    }

    const questionCount = Math.min(
      Math.max(parseInt(String(numQuestions)) || 10, 1),
      50
    );

    // Use z-ai-web-dev-sdk directly with a JSON-requesting prompt
    const messages: { role: "assistant" | "user"; content: string }[] = [
      {
        role: "assistant",
        content: `You are a scholarship exam reviewer generator for Filipino students. Generate multiple-choice questions that are similar to actual scholarship entrance exams in the Philippines.

Guidelines:
- Questions should be challenging but fair
- Distribute questions across the subjects mentioned
- Make options plausible (no obviously wrong answers)
- Include detailed explanations for each correct answer
- Consider the Philippine educational context (DepEd curriculum, Filipino terms, local context)
- For math questions, use realistic scenarios relevant to Filipino students
- For language questions, include Filipino/English bilingual contexts

CRITICAL: You MUST respond with valid JSON only. No markdown, no extra text.
Return a JSON object with a "questions" array. Each question object must have:
- "question": string (the question text)
- "options": array of exactly 4 strings (the answer choices)
- "correctAnswer": number (0-based index: 0=A, 1=B, 2=C, 3=D)
- "subject": string (the subject area)
- "explanation": string (why the correct answer is right)

Example format:
{"questions":[{"question":"What is 2+2?","options":["3","4","5","6"],"correctAnswer":1,"subject":"Mathematics","explanation":"2+2 equals 4."}]}`,
      },
      {
        role: "user",
        content: `Generate ${questionCount} multiple-choice questions for the ${scholarshipName} scholarship exam.

Exam type: ${examType}
Subjects covered: ${examSubjects}

Return ONLY valid JSON with the questions array. No other text.`,
      },
    ];

    // Call z-ai directly
    const responseContent = await callZAI(messages);

    // Parse the response
    const questions = extractQuestionsFromResponse(
      responseContent,
      examSubjects
    );

    if (questions.length === 0) {
      console.error(
        "[Reviewer API] Could not extract any questions from AI response"
      );
      console.error("[Reviewer API] Raw response:", responseContent.substring(0, 500));
      return NextResponse.json(
        {
          error:
            "Failed to generate valid questions. The AI response could not be parsed. Please try again.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      questions,
      scholarshipId,
      scholarshipName,
      examType,
      examSubjects,
      totalQuestions: questions.length,
    });
  } catch (error) {
    console.error("[Reviewer API] Error generating reviewer:", error);
    return NextResponse.json(
      { error: "Failed to generate reviewer. Please try again." },
      { status: 500 }
    );
  }
}
