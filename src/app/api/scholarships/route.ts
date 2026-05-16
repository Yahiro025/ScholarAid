import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const strand = searchParams.get("strand");
    const type = searchParams.get("type");
    const coverage = searchParams.get("coverage");
    const search = searchParams.get("search");
    const minGPA = searchParams.get("minGPA");
    const maxIncome = searchParams.get("maxIncome");
    const accepting = searchParams.get("accepting");

    // Build where clause using AND conditions for correct logical grouping
    const andConditions: Record<string, unknown>[] = [{ isActive: true }];

    // Filter by strand - check if the comma-separated eligibleStrands contains the strand
    if (strand) {
      andConditions.push({ eligibleStrands: { contains: strand } });
    }

    // Filter by scholarship type (handle virtual types)
    if (type) {
      switch (type) {
        case "university":
          // University-funded: scholarships directly typed as university
          andConditions.push({ scholarshipType: "university" });
          break;
        case "stem-focused":
          // STEM-focused: scholarships typed as stem-focused
          andConditions.push({ scholarshipType: "stem-focused" });
          break;
        case "financial-need":
          // Need-based: includes financial-need type
          andConditions.push({
            OR: [
              { scholarshipType: "financial-need" },
              { scholarshipType: "need-based" },
            ],
          });
          break;
        default:
          // Direct match for: government, private, merit, etc.
          andConditions.push({ scholarshipType: type });
          break;
      }
    }

    // Filter by coverage
    if (coverage) {
      andConditions.push({ coverage });
    }

    // Filter by application status
    if (accepting !== null) {
      andConditions.push({ isAcceptingApplications: accepting === "true" });
    }

    // Text search on name and provider (OR within this group)
    if (search) {
      andConditions.push({
        OR: [
          { name: { contains: search } },
          { provider: { contains: search } },
        ],
      });
    }

    // Filter by GPA - find scholarships where minGPA <= student's GPA
    if (minGPA) {
      const gpa = parseFloat(minGPA);
      if (!isNaN(gpa)) {
        andConditions.push({ minGPA: { lte: gpa } });
      }
    }

    // Filter by income - find scholarships where maxAnnualIncome >= student's income OR maxAnnualIncome is null
    if (maxIncome) {
      const income = parseFloat(maxIncome);
      if (!isNaN(income)) {
        andConditions.push({
          OR: [
            { maxAnnualIncome: { gte: income } },
            { maxAnnualIncome: null },
          ],
        });
      }
    }

    const where = andConditions.length === 1 ? andConditions[0] : { AND: andConditions };

    const scholarships = await db.scholarship.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json(scholarships);
  } catch (error) {
    console.error("Error fetching scholarships:", error);
    return NextResponse.json(
      { error: "Failed to fetch scholarships" },
      { status: 500 }
    );
  }
}
