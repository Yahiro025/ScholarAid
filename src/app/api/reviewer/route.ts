import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

interface ReviewerRequest {
  scholarshipId: string;
  scholarshipName: string;
  examType: string;
  examSubjects: string;
  numQuestions: number;
}

interface ExamQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  subject: string;
  explanation: string;
}

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

    // Validate numQuestions is a reasonable number
    const questionCount = Math.min(Math.max(parseInt(String(numQuestions)) || 10, 1), 50);

    // Initialize the AI SDK
    const zai = await ZAI.create();

    const systemPrompt = "You are a scholarship exam reviewer generator for Filipino students. Generate multiple-choice questions that are similar to actual scholarship entrance exams in the Philippines.";

    const userPrompt = `Generate ${questionCount} multiple-choice questions for the ${scholarshipName} scholarship exam. The exam type is ${examType} and covers these subjects: ${examSubjects}. 

Format your response as a JSON array with the following structure for each question:
{
  "question": "The question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": 0,
  "subject": "The specific subject area",
  "explanation": "A brief explanation of why the correct answer is right"
}

The correctAnswer should be the 0-based index of the correct option (0, 1, 2, or 3).
Make the questions challenging but fair, similar to actual Philippine scholarship entrance exams.
Ensure questions are distributed across the subjects mentioned.
Return ONLY the JSON array, no additional text or markdown formatting.`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      thinking: { type: "disabled" },
    });

    // Extract the response content
    const responseContent = completion.choices?.[0]?.message?.content;

    if (!responseContent) {
      return NextResponse.json(
        { error: "AI failed to generate questions" },
        { status: 500 }
      );
    }

    // Parse the JSON questions from the response
    let questions: ExamQuestion[];
    try {
      // Try to extract JSON from the response - it might be wrapped in markdown code blocks
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

      questions = JSON.parse(jsonStr);

      // Validate the parsed questions
      if (!Array.isArray(questions)) {
        throw new Error("Response is not an array");
      }

      // Validate each question has required fields
      questions = questions.map((q: Record<string, unknown>, index: number) => {
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
      console.error("Failed to parse AI response:", parseError);
      console.error("Raw AI response:", responseContent);
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
    console.error("Error generating reviewer:", error);
    return NextResponse.json(
      { error: "Failed to generate reviewer" },
      { status: 500 }
    );
  }
}
