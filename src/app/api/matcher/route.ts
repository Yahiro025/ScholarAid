import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStructuredModel, matcherAnalysisPrompt } from "@/lib/langchain";
import { MatcherAnalysisSchema } from "@/lib/langchain/schemas";
import type { MatcherAnalysis } from "@/lib/langchain/schemas";

// ─── Types ──────────────────────────────────────────────────────────────────

interface MatcherRequest {
  gpa: number;
  strand: string;
  annualIncome: number;
  targetCourse: string;
  interests: string[];
  strengths: string[];
  scholarshipTypes: string[];
}

interface RuleBasedMatch {
  id: string;
  name: string;
  provider: string;
  scholarshipType: string;
  coverage: string;
  coverageDetails: string | null;
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
  isAcceptingApplications: boolean;
  eligibilityMatch: {
    gpa: boolean;
    strand: boolean;
    income: boolean;
    course: boolean;
  };
  matchScore: number;
  gpaMargin: number;
}

// ─── Rule-Based Pre-Filtering ───────────────────────────────────────────────

async function ruleBasedFilter(
  studentProfile: MatcherRequest
): Promise<{ eligible: RuleBasedMatch[]; nearMiss: RuleBasedMatch[] }> {
  const allScholarships = await db.scholarship.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const eligible: RuleBasedMatch[] = [];
  const nearMiss: RuleBasedMatch[] = [];

  for (const s of allScholarships) {
    const gpaMatch = studentProfile.gpa >= s.minGPA;
    const strandMatch = s.eligibleStrands
      .split(",")
      .map((str) => str.trim())
      .some(
        (str) =>
          str === studentProfile.strand ||
          str === "All" ||
          str === "All strands"
      );
    const incomeMatch = s.maxAnnualIncome
      ? studentProfile.annualIncome <= s.maxAnnualIncome
      : true;

    let courseMatch = true;
    if (studentProfile.targetCourse && s.priorityCourses) {
      const courseLower = studentProfile.targetCourse.toLowerCase();
      const courses = s.priorityCourses
        .split(",")
        .map((c) => c.trim().toLowerCase());
      courseMatch = courses.some(
        (c) =>
          c.includes(courseLower) ||
          courseLower.includes(c) ||
          (courseLower.includes("computer science") &&
            (c.includes("computer science") || c.includes("comp sci"))) ||
          (courseLower.includes("engineering") && c.includes("engineering")) ||
          (courseLower.includes("nursing") && c.includes("nursing")) ||
          (courseLower.includes("education") && c.includes("education")) ||
          (courseLower.includes("accountancy") && c.includes("accountancy")) ||
          (courseLower.includes("psychology") && c.includes("psychology"))
      );
    }

    const matchCount = [gpaMatch, strandMatch, incomeMatch, courseMatch].filter(
      Boolean
    ).length;
    const matchScore = Math.round((matchCount / 4) * 100);
    const gpaMargin = studentProfile.gpa - s.minGPA;

    if (
      studentProfile.scholarshipTypes.length > 0 &&
      !studentProfile.scholarshipTypes.includes(s.scholarshipType)
    ) {
      continue;
    }

    const match: RuleBasedMatch = {
      id: s.id,
      name: s.name,
      provider: s.provider,
      scholarshipType: s.scholarshipType,
      coverage: s.coverage,
      coverageDetails: s.coverageDetails,
      eligibleStrands: s.eligibleStrands,
      minGPA: s.minGPA,
      maxAnnualIncome: s.maxAnnualIncome,
      priorityCourses: s.priorityCourses,
      requirements: s.requirements,
      deadline: s.deadline,
      examType: s.examType,
      examSubjects: s.examSubjects,
      websiteUrl: s.websiteUrl,
      description: s.description,
      isAcceptingApplications: s.isAcceptingApplications,
      eligibilityMatch: {
        gpa: gpaMatch,
        strand: strandMatch,
        income: incomeMatch,
        course: courseMatch,
      },
      matchScore,
      gpaMargin,
    };

    if (matchCount === 4) {
      eligible.push(match);
    } else if (matchCount >= 2 && matchCount <= 3) {
      nearMiss.push(match);
    }
  }

  eligible.sort((a, b) => {
    if (a.isAcceptingApplications !== b.isAcceptingApplications) {
      return a.isAcceptingApplications ? -1 : 1;
    }
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    return b.gpaMargin - a.gpaMargin;
  });

  nearMiss.sort((a, b) => b.matchScore - a.matchScore);

  return { eligible, nearMiss };
}

// ─── AI-Powered Analysis with LangChain ─────────────────────────────────────

async function generateAIAnalysis(
  studentProfile: MatcherRequest,
  eligible: RuleBasedMatch[],
  nearMiss: RuleBasedMatch[]
): Promise<MatcherAnalysis | null> {
  const model = getStructuredModel();

  const eligibleContext = eligible
    .slice(0, 5) // Reduced from 8 to 5 for speed
    .map(
      (s) =>
        `--- ${s.name} ---
Provider: ${s.provider} | Type: ${s.scholarshipType} | Coverage: ${s.coverage}
${s.coverageDetails || "Standard coverage"}
Min GPA: ${s.minGPA}% (student has ${studentProfile.gpa}%, margin: +${s.gpaMargin}%)
Strands: ${s.eligibleStrands}
Income Limit: ${s.maxAnnualIncome ? `PHP ${s.maxAnnualIncome.toLocaleString()}` : "No limit"}
Priority Courses: ${s.priorityCourses || "Open to all"}
Requirements: ${s.requirements}
Deadline: ${s.deadline}
Exam: ${s.examType && s.examType !== "none" ? `${s.examType} - ${s.examSubjects}` : "No exam"}
Accepting Applications: ${s.isAcceptingApplications ? "YES" : "NO"}
Website: ${s.websiteUrl || "N/A"}`
    )
    .join("\n\n");

  const nearMissContext = nearMiss
    .slice(0, 2) // Reduced from 4 to 2 for speed
    .map(
      (s) =>
        `--- ${s.name} ---
Min GPA: ${s.minGPA}% | Strands: ${s.eligibleStrands} | Income Limit: ${s.maxAnnualIncome ? `PHP ${s.maxAnnualIncome.toLocaleString()}` : "No limit"}
Missing criteria: ${[
          !s.eligibilityMatch.gpa ? `GPA (needs ${s.minGPA}%, student has ${studentProfile.gpa}%)` : "",
          !s.eligibilityMatch.strand ? `Strand (requires ${s.eligibleStrands})` : "",
          !s.eligibilityMatch.income ? `Income (limit PHP ${s.maxAnnualIncome?.toLocaleString()})` : "",
          !s.eligibilityMatch.course ? "Course not in priority list" : "",
        ]
          .filter(Boolean)
          .join(", ")}`
    )
    .join("\n\n");

  const studentProfileText = `STUDENT PROFILE:
- GPA: ${studentProfile.gpa}%
- Academic Strand: ${studentProfile.strand}
- Annual Family Income: PHP ${studentProfile.annualIncome.toLocaleString()}
- Target Course: ${studentProfile.targetCourse || "Not specified"}
- Interests: ${studentProfile.interests.length > 0 ? studentProfile.interests.join(", ") : "Not specified"}
- Strengths: ${studentProfile.strengths.length > 0 ? studentProfile.strengths.join(", ") : "Not specified"}
- Preferred Scholarship Types: ${studentProfile.scholarshipTypes.length > 0 ? studentProfile.scholarshipTypes.join(", ") : "All types"}

ELIGIBLE SCHOLARSHIPS (${eligible.length} found):
${eligibleContext || "None found."}

NEAR-MISS SCHOLARSHIPS (${nearMiss.length} found):
${nearMissContext || "None found."}

Analyze this student's profile and provide personalized recommendations.`;

  try {
    // Try structured output with the model
    const structuredModel = model.withStructuredOutput?.(MatcherAnalysisSchema);

    if (structuredModel) {
      const promptMessages = await matcherAnalysisPrompt.formatMessages({
        student_profile: studentProfileText,
      });
      const result = await structuredModel.invoke(promptMessages);
      return result as MatcherAnalysis;
    }

    // Fallback: manual JSON parsing
    const promptMessages = await matcherAnalysisPrompt.formatMessages({
      student_profile: studentProfileText,
    });
    const response = await model.invoke(promptMessages);

    const content =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    const cleaned = content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    return MatcherAnalysisSchema.parse(JSON.parse(cleaned));
  } catch (error) {
    console.error("[Matcher API] AI analysis failed:", error);

    // Return a basic fallback analysis
    return {
      profileInsight: {
        strengths: [`${studentProfile.gpa}% GPA`],
        weaknesses: [],
        opportunities: eligible.filter((s) => s.isAcceptingApplications).length > 0
          ? [`${eligible.filter((s) => s.isAcceptingApplications).length} scholarships currently accepting applications`]
          : [],
        overallAssessment: `Based on your profile, you are eligible for ${eligible.length} scholarships. ${eligible.filter((s) => s.isAcceptingApplications).length} are currently accepting applications.`,
      },
      topRecommendations: eligible.slice(0, 3).map((s) => ({
        scholarshipName: s.name,
        matchReason: `You meet all eligibility criteria for this scholarship.`,
        applicationStrategy: `Prepare your documents and apply before the deadline.`,
        readinessLevel: "medium" as const,
        keyAction: "Gather required documents and submit your application",
      })),
      applicationReadiness: {
        overallScore: 50,
        breakdown: {
          academicReadiness: studentProfile.gpa >= 90 ? 80 : studentProfile.gpa >= 85 ? 70 : 60,
          documentReadiness: 50,
          examReadiness: 50,
          timelineReadiness: 50,
        },
        missingDocuments: ["Updated transcript", "Certificate of enrollment"],
        improvementTips: ["Prepare all required documents early", "Review exam topics if applicable"],
      },
      nearMissAnalysis: nearMiss.slice(0, 2).map((s) => ({
        scholarshipName: s.name,
        whatToImprove: !s.eligibilityMatch.gpa
          ? `Improve GPA to at least ${s.minGPA}%`
          : "Meet the remaining eligibility criteria",
        realisticTimeline: "1-2 semesters",
      })),
      applicationTimeline: eligible.slice(0, 5).map((s) => ({
        scholarshipName: s.name,
        deadlineNote: s.isAcceptingApplications ? "Currently accepting" : `Deadline: ${s.deadline}`,
        priority: s.isAcceptingApplications ? "high" as const : "medium" as const,
      })),
    };
  }
}

// ─── Main Handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body: MatcherRequest = await request.json();
    const { gpa, strand, annualIncome, targetCourse, interests, strengths, scholarshipTypes } = body;

    if (!gpa || gpa < 50 || gpa > 100) {
      return NextResponse.json(
        { error: "GPA must be between 50 and 100" },
        { status: 400 }
      );
    }
    if (!strand) {
      return NextResponse.json(
        { error: "Academic strand is required" },
        { status: 400 }
      );
    }
    if (!annualIncome || annualIncome < 0) {
      return NextResponse.json(
        { error: "Annual income is required" },
        { status: 400 }
      );
    }

    // Step 1: Rule-based pre-filtering
    const { eligible, nearMiss } = await ruleBasedFilter({
      gpa,
      strand,
      annualIncome,
      targetCourse: targetCourse || "",
      interests: interests || [],
      strengths: strengths || [],
      scholarshipTypes: scholarshipTypes || [],
    });

    // Step 2: AI-powered intelligent analysis with LangChain
    const aiAnalysis = await generateAIAnalysis(
      { gpa, strand, annualIncome, targetCourse, interests, strengths, scholarshipTypes },
      eligible,
      nearMiss
    );

    return NextResponse.json({
      eligible,
      nearMiss,
      aiAnalysis,
      summary: {
        totalChecked: eligible.length + nearMiss.length,
        eligibleCount: eligible.length,
        nearMissCount: nearMiss.length,
        acceptingCount: eligible.filter((s) => s.isAcceptingApplications).length,
      },
    });
  } catch (error) {
    console.error("[Matcher API] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendations. Please try again." },
      { status: 500 }
    );
  }
}
