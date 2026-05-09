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

    // Build where clause
    const where: Record<string, unknown> = {
      isActive: true,
    };

    // Filter by strand - check if the comma-separated eligibleStrands contains the strand
    if (strand) {
      where.eligibleStrands = {
        contains: strand,
      };
    }

    // Filter by scholarship type
    if (type) {
      where.scholarshipType = type;
    }

    // Filter by coverage
    if (coverage) {
      where.coverage = coverage;
    }

    // Text search on name and provider
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { provider: { contains: search } },
      ];
    }

    // Filter by GPA - find scholarships where minGPA <= student's GPA
    // This means the student meets the GPA requirement
    if (minGPA) {
      const gpa = parseFloat(minGPA);
      if (!isNaN(gpa)) {
        where.minGPA = { lte: gpa };
      }
    }

    // Filter by income - find scholarships where maxAnnualIncome >= student's income OR maxAnnualIncome is null
    if (maxIncome) {
      const income = parseFloat(maxIncome);
      if (!isNaN(income)) {
        where.OR = Array.isArray(where.OR)
          ? [
              ...where.OR,
              { maxAnnualIncome: { gte: income } },
              { maxAnnualIncome: null },
            ]
          : [
              { maxAnnualIncome: { gte: income } },
              { maxAnnualIncome: null },
            ];
      }
    }

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
