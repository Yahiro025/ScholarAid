import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface EligibilityRequest {
  gpa: number;
  strand: string;
  annualIncome: number;
  scholarshipTypes?: string[];
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
  requirements: string;
  deadline: string;
  examType: string | null;
  examSubjects: string | null;
  websiteUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  eligibilityMatch: {
    gpa: boolean;
    strand: boolean;
    income: boolean;
  };
  matchScore: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: EligibilityRequest = await request.json();
    const { gpa, strand, annualIncome, scholarshipTypes } = body;

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

      // Calculate match score (percentage of criteria matched)
      const matchedCriteria = [gpaMatch, strandMatch, incomeMatch].filter(Boolean).length;
      const totalCriteria = 3;
      const matchScore = Math.round((matchedCriteria / totalCriteria) * 100);

      const scholarshipWithEligibility: ScholarshipEligibility = {
        ...scholarship,
        createdAt: scholarship.createdAt.toISOString(),
        updatedAt: scholarship.updatedAt.toISOString(),
        eligibilityMatch: {
          gpa: gpaMatch,
          strand: strandMatch,
          income: incomeMatch,
        },
        matchScore,
      };

      // A scholarship is "eligible" only if ALL criteria are met
      if (gpaMatch && strandMatch && incomeMatch) {
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
