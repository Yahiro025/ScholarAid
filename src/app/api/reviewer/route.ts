import { NextRequest, NextResponse } from "next/server";
import { getChatModel, reviewerPrompt } from "@/lib/langchain";
import { ReviewerQuestionsSchema } from "@/lib/langchain/schemas";
import type { ExamQuestion } from "@/lib/langchain/schemas";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ReviewerRequest {
  scholarshipId: string;
  scholarshipName: string;
  examType: string;
  examSubjects: string;
  numQuestions: number;
}

// ─── Main Handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body: ReviewerRequest = await request.json();
    const { scholarshipId, scholarshipName, examType, examSubjects, numQuestions } = body;

    // Validate required fields
    if (!scholarshipId || !scholarshipName || !examType || !examSubjects || !numQuestions) {
      return NextResponse.json(
        { error: "Missing required fields: scholarshipId, scholarshipName, examType, examSubjects, numQuestions" },
        { status: 400 }
      );
    }

    const questionCount = Math.min(Math.max(parseInt(String(numQuestions)) || 10, 1), 50);

    // Get the LangChain model (use creative model for varied questions)
    const model = getChatModel(undefined, { temperature: 0.8 });

    // Format the prompt
    const promptMessages = await reviewerPrompt.formatMessages({
      num_questions: String(questionCount),
      scholarship_name: scholarshipName,
      exam_type: examType,
      exam_subjects: examSubjects,
    });

    // Try structured output first
    try {
      const structuredModel = model.withStructuredOutput?.(ReviewerQuestionsSchema);

      if (structuredModel) {
        const result = await structuredModel.invoke(promptMessages);

        // Validate each question
        const questions: ExamQuestion[] = result.questions.map((q, index) => ({
          question: String(q.question),
          options: q.options.map(String),
          correctAnswer: Math.min(Math.max(Number(q.correctAnswer), 0), 3),
          subject: String(q.subject || examSubjects.split(",")[0]?.trim() || "General"),
          explanation: String(q.explanation || "No explanation provided"),
        }));

        return NextResponse.json({
          questions,
          scholarshipId,
          scholarshipName,
          examType,
          examSubjects,
          totalQuestions: questions.length,
        });
      }
    } catch (structError) {
      console.warn("[Reviewer API] Structured output failed, falling back to manual parsing:", structError);
    }

    // Fallback: manual JSON parsing
    const response = await model.invoke(promptMessages);

    const responseContent =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    if (!responseContent) {
      return NextResponse.json(
        { error: "AI failed to generate questions" },
        { status: 500 }
      );
    }

    // Parse the JSON questions from the response
    let questions: ExamQuestion[];
    try {
      let jsonStr = responseContent.trim();

      // Remove markdown code block if present
      const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      }

      // Try to find JSON array in the response
      const jsonArrayMatch = jsonStr.match(/\[[\s\S]*\]/);
      if (jsonArrayMatch) {
        jsonStr = jsonArrayMatch[0];
      }

      const parsed = JSON.parse(jsonStr);

      // Handle both array and object with questions field
      const rawQuestions = Array.isArray(parsed) ? parsed : parsed.questions || [];

      // Validate each question
      questions = rawQuestions.map((q: Record<string, unknown>, index: number) => {
        if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || typeof q.correctAnswer !== "number") {
          throw new Error(`Question ${index + 1} is missing required fields or has invalid format`);
        }
        return {
          question: String(q.question),
          options: (q.options as string[]).map(String),
          correctAnswer: Math.min(Math.max(Number(q.correctAnswer), 0), 3),
          subject: String(q.subject || examSubjects.split(",")[0]?.trim() || "General"),
          explanation: String(q.explanation || "No explanation provided"),
        };
      });
    } catch (parseError) {
      console.error("[Reviewer API] Failed to parse AI response:", parseError);
      console.error("[Reviewer API] Raw AI response:", responseContent);
      return NextResponse.json(
        {
          error: "Failed to parse generated questions",
          rawResponse: responseContent,
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
      { error: "Failed to generate reviewer" },
      { status: 500 }
    );
  }
}
