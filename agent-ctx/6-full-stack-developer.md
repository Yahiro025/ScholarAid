---
Task ID: 6
Agent: full-stack-developer
Task: Create backend API routes for scholarships, eligibility, and reviewer

Work Log:
- Reviewed existing Prisma schema (Scholarship and ReviewerSession models) and seed data (16 Philippine scholarships)
- Created GET /api/scholarships route at src/app/api/scholarships/route.ts
  - Supports query params: strand, type, coverage, search, minGPA, maxIncome
  - Uses Prisma where clause with contains for strand filtering, lte for GPA, gte/null for income
- Created POST /api/eligibility route at src/app/api/eligibility/route.ts
  - Accepts gpa, strand, annualIncome, scholarshipTypes in request body
  - Checks 3 criteria per scholarship: GPA >= minGPA, strand in eligibleStrands, income <= maxAnnualIncome (or null)
  - Returns eligible (all 3 match) and ineligible arrays with eligibilityMatch and matchScore
  - Includes summary with totalChecked, eligibleCount, ineligibleCount
- Created POST /api/reviewer route at src/app/api/reviewer/route.ts
  - Uses z-ai-web-dev-sdk for AI question generation
  - Accepts scholarshipId, scholarshipName, examType, examSubjects, numQuestions
  - System prompt: scholarship exam reviewer generator for Filipino students
  - Robust JSON parsing: handles markdown code blocks, extracts JSON arrays, validates question format
  - Clamps numQuestions between 1-50, validates correctAnswer index 0-3
- All routes tested successfully with curl

Stage Summary:
- All 3 API routes created and functional
- Scholarships route supports filtering by strand, type, coverage, search, GPA, and income
- Eligibility route calculates match scores (percentage of 3 criteria matched) and returns eligible/ineligible lists
- Reviewer route uses z-ai-web-dev-sdk to generate scholarship-specific exam questions with robust parsing
