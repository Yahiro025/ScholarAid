import { NextRequest, NextResponse } from "next/server";
import { getStructuredModel } from "@/lib/langchain";
import { reviewerPrompt } from "@/lib/langchain/prompts";
import { ReviewerQuestionsSchema, type ExamQuestion } from "@/lib/langchain/schemas";

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

    // Use LangChain structured model for reliable JSON output
    const model = getStructuredModel().withStructuredOutput(ReviewerQuestionsSchema);

    const result = await model.invoke(
      await reviewerPrompt.format({
        num_questions: questionCount,
        scholarship_name: scholarshipName,
        exam_type: examType,
        exam_subjects: examSubjects,
      })
    );

    const questions: ExamQuestion[] = result.questions || [];

    if (questions.length === 0) {
      console.error(
        "[Reviewer API] Could not extract any questions from AI response"
      );
      return NextResponse.json(
        {
          error:
            "Failed to generate valid questions. Please try again.",
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
