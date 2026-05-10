import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import ZAI from "z-ai-web-dev-sdk";

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

// ─── AI-Powered Analysis ────────────────────────────────────────────────────

async function generateAIAnalysis(
  studentProfile: MatcherRequest,
  eligible: RuleBasedMatch[],
  nearMiss: RuleBasedMatch[]
): Promise<string> {
  const zai = await ZAI.create();

  const eligibleContext = eligible
    .slice(0, 8)
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
    .slice(0, 4)
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

  const systemPrompt = `You are an AI Scholarship Advisor for Filipino senior high school students. You analyze student profiles and provide deeply personalized, actionable scholarship recommendations.

You are given:
1. A student's profile (GPA, strand, income, target course, interests, strengths)
2. A list of scholarships they are ELIGIBLE for (rule-based pre-filter)
3. A list of scholarships they are NEAR-MISS for (close but not fully eligible)

Your job is to provide INTELLIGENT ANALYSIS that goes far beyond what simple rule-based filtering can do. You must:

═══════════════════════════════════════════════════════════════
OUTPUT FORMAT — Respond in this EXACT JSON structure:
═══════════════════════════════════════════════════════════════

{
  "profileInsight": {
    "strengths": ["strength1", "strength2"],
    "weaknesses": ["weakness1", "weakness2"],
    "opportunities": ["opportunity1", "opportunity2"],
    "overallAssessment": "2-3 sentence personalized assessment of the student's scholarship prospects"
  },
  "topRecommendations": [
    {
      "scholarshipName": "name",
      "matchReason": "1-2 sentences explaining WHY this is a good fit for THIS specific student",
      "applicationStrategy": "1-2 sentences of specific strategy for this application",
      "readinessLevel": "high or medium or low",
      "keyAction": "The single most important thing to do to strengthen the application"
    }
  ],
  "applicationReadiness": {
    "overallScore": 0-100,
    "breakdown": {
      "academicReadiness": 0-100,
      "documentReadiness": 0-100,
      "examReadiness": 0-100,
      "timelineReadiness": 0-100
    },
    "missingDocuments": ["doc1", "doc2"],
    "improvementTips": ["tip1", "tip2"]
  },
  "nearMissAnalysis": [
    {
      "scholarshipName": "name",
      "whatToImprove": "What the student needs to do to become eligible",
      "realisticTimeline": "How long it might take to become eligible"
    }
  ],
  "applicationTimeline": [
    {
      "scholarshipName": "name",
      "deadlineNote": "When to apply / current status",
      "priority": "urgent or high or medium or low"
    }
  ]
}

ANALYSIS GUIDELINES:

1. STRENGTHS: Identify genuine strengths from the student's profile. Be specific.
2. MATCH REASONS: Go beyond "you meet the GPA requirement." Analyze HOW the student's profile aligns with the scholarship's priorities.
3. APPLICATION STRATEGY: Give SPECIFIC, ACTIONABLE advice. Not "prepare well" but concrete steps.
4. READINESS ASSESSMENT: Be realistic. Consider academic, documents, exam prep, and timeline.
5. NEAR-MISS ANALYSIS: Provide a realistic path to eligibility for close scholarships.
6. TIMELINE: Prioritize scholarships by deadline urgency and likelihood of success.
7. INTEREST ALIGNMENT: Use the student's interests to personalize recommendations.
8. FILIPINO CONTEXT: Consider the Philippine academic system, DepEd grading, CHED requirements.

CRITICAL RULES:
- ONLY recommend scholarships from the ELIGIBLE list for topRecommendations
- ONLY use scholarships from the NEAR-MISS list for nearMissAnalysis
- NEVER invent scholarship names or details
- Return ONLY valid JSON — no markdown, no comments, no extra text
- Keep all text concise but insightful
- For topRecommendations, include at most 5 scholarships, ranked by fit quality
- For nearMissAnalysis, include at most 3 scholarships`;

  const userMessage = `STUDENT PROFILE:
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
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant" as const, content: systemPrompt },
        { role: "user" as const, content: userMessage },
      ],
      thinking: { type: "enabled" },
    });

    const response = completion.choices?.[0]?.message?.content || "";

    const cleaned = response
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    return cleaned;
  } catch (error) {
    console.error("AI analysis failed:", error);
    throw new Error("AI analysis failed");
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

    // Step 2: AI-powered intelligent analysis
    let aiAnalysis = null;
    try {
      const aiResponse = await generateAIAnalysis(
        { gpa, strand, annualIncome, targetCourse, interests, strengths, scholarshipTypes },
        eligible,
        nearMiss
      );
      aiAnalysis = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error("Failed to parse AI analysis:", parseError);
      aiAnalysis = null;
    }

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
    console.error("Error in matcher API:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendations. Please try again." },
      { status: 500 }
    );
  }
}
