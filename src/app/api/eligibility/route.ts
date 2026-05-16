import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface EligibilityRequest {
  gpa: number;
  strand: string;
  annualIncome: number;
  scholarshipTypes?: string[];
  targetCourse?: string;
}

interface ScholarshipEligibility {
  id: string;
  name: string;
  provider: string;
  description: string;
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
  isActive: boolean;
  isAcceptingApplications: boolean;
  createdAt: string;
  updatedAt: string;
  eligibilityMatch: {
    gpa: boolean;
    strand: boolean;
    income: boolean;
    course: boolean;
  };
  matchScore: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: EligibilityRequest = await request.json();
    const { gpa, strand, annualIncome, scholarshipTypes, targetCourse } = body;

    // Validate required fields
    if (typeof gpa !== "number" || typeof strand !== "string" || typeof annualIncome !== "number") {
      return NextResponse.json(
        { error: "Missing required fields: gpa, strand, annualIncome" },
        { status: 400 }
      );
    }

    // Build where clause
    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (scholarshipTypes && scholarshipTypes.length > 0) {
      where.scholarshipType = { in: scholarshipTypes };
    }

    // Fetch scholarships
    const scholarships = await db.scholarship.findMany({
      where,
      orderBy: { name: "asc" },
    });

    // Check eligibility for each scholarship
    const eligible: ScholarshipEligibility[] = [];
    const ineligible: ScholarshipEligibility[] = [];

    for (const scholarship of scholarships) {
      // Check GPA: student GPA must be >= scholarship minGPA
      const gpaMatch = gpa >= scholarship.minGPA;

      // Check strand: student's strand must be in the eligible strands list
      const strandsList = scholarship.eligibleStrands
        .split(",")
        .map((s) => s.trim());
      const strandMatch = strandsList.includes(strand);

      // Check income: if maxAnnualIncome is null, no income restriction
      // Otherwise, student income must be <= maxAnnualIncome
      const incomeMatch =
        scholarship.maxAnnualIncome === null ||
        annualIncome <= scholarship.maxAnnualIncome;

      // Check course: if targetCourse is provided and scholarship has priorityCourses,
      // check if the student's target course is in the scholarship's priority courses list.
      // If the student doesn't specify a course or scholarship has no priority courses, it's considered a match.
      let courseMatch = true;
      if (targetCourse && scholarship.priorityCourses) {
        const coursesList = scholarship.priorityCourses
          .split(",")
          .map((c) => c.trim().toLowerCase());
        // Check if the target course matches any priority course (case-insensitive partial match)
        const targetLower = targetCourse.toLowerCase().trim();
        courseMatch = coursesList.some(
          (c) => c.includes(targetLower) || targetLower.includes(c)
        );
      }

      // Calculate match score (percentage of criteria matched)
      const matchedCriteria = [gpaMatch, strandMatch, incomeMatch, courseMatch].filter(Boolean).length;
      const totalCriteria = 4;
      const matchScore = Math.round((matchedCriteria / totalCriteria) * 100);

      const scholarshipWithEligibility: ScholarshipEligibility = {
        ...scholarship,
        createdAt: scholarship.createdAt.toISOString(),
        updatedAt: scholarship.updatedAt.toISOString(),
        eligibilityMatch: {
          gpa: gpaMatch,
          strand: strandMatch,
          income: incomeMatch,
          course: courseMatch,
        },
        matchScore,
      };

      // A scholarship is "eligible" only if ALL criteria are met
      if (gpaMatch && strandMatch && incomeMatch && courseMatch) {
        eligible.push(scholarshipWithEligibility);
      } else {
        ineligible.push(scholarshipWithEligibility);
      }
    }

    // Sort eligible by match score (all will be 100%), then by name
    // Sort ineligible by match score descending (closer to eligible first)
    eligible.sort((a, b) => a.name.localeCompare(b.name));
    ineligible.sort((a, b) => b.matchScore - a.matchScore);

    return NextResponse.json({
      eligible,
      ineligible,
      summary: {
        totalChecked: scholarships.length,
        eligibleCount: eligible.length,
        ineligibleCount: ineligible.length,
      },
    });
  } catch (error) {
    console.error("Error checking eligibility:", error);
    return NextResponse.json(
      { error: "Failed to check eligibility" },
      { status: 500 }
    );
  }
}
