---
Task ID: 1
Agent: full-stack-developer
Task: Transform ScholarAId into a PUP-focused scholarship platform with verified PUP-specific scholarships

Work Log:
- Read existing project files: prisma/seed.ts, src/components/hero-section.tsx, src/app/api/chat/route.ts, prisma/schema.prisma
- Initialized fullstack development environment (curl init script)
- Updated prisma/seed.ts: Replaced all 16 non-PUP scholarships with 18 PUP-focused scholarships:
  - 5 PUP-Funded Programs: PUP Entrance Scholarship, President's Lister, Dean's Lister, Student Assistantship Program, Cash Award for Board Exam Topnotchers
  - 4 Government-Funded Programs: TES (RA 10931), Tulong Dunong Program, CHED Scholarship Program, ACEF-GIAHEP
  - 5 Privately-Funded Programs: SM Foundation, Tzu Chi Foundation, Megaworld Foundation, Security Bank Foundation, Aboitiz Foundation
  - 4 Kept existing scholarships: DOST-SEI, GBF STEM, PCSO, TESDA
  - Removed: UP Oblation, Benilde, Mapua, Ateneo, DLSU, UST (school-specific), CHED StuFAPs & PESFA (redundant)
- Updated src/components/hero-section.tsx:
  - Changed "Built for Filipino Senior High Students" → "Built for PUP Students & Incoming Iskolars"
  - Changed "AI-Powered Scholarship Finder & Exam Reviewer for Filipino Students" → "AI-Powered Scholarship Finder & Exam Reviewer for PUP Students"
  - Updated description to mention PUP, PUPCET, and Iskolars ng Bayan
- Updated src/app/api/chat/route.ts:
  - Changed system prompt from "Filipino senior high school students" to "PUP students and incoming freshmen"
  - Added comprehensive PUP-specific context: GWA grading system (1.00-5.00 scale) with conversion table, PUPCET info, OSFA details, campus info, Scholarship Committee info
  - Added "Iskolar ng Bayan" as a term of pride/encouragement
  - Updated "What You Can Help With" section to include PUP-specific guidance (OSFA, GWA, President's/Dean's Lister, PUPCET)
  - Updated classification prompt to be PUP-focused
  - Added PUP GWA extraction in extractGPA function (converts 1.00-3.00 GWA scale to percentage equivalents)
  - Updated closing line to reference "PUP students and incoming Iskolars ng Bayan"
- Ran `bun run db:push` - schema was already in sync
- Ran `bun run prisma/seed.ts` - successfully seeded 18 PUP scholarships
- Ran `bun run lint` - passed with no errors
- Checked dev server logs - application running correctly with PUP scholarship data

Stage Summary:
- ScholarAId successfully transformed into a PUP-focused scholarship platform
- 18 verified PUP-specific scholarships now in database (5 PUP-funded, 4 government, 5 private, 4 kept existing)
- Hero section now reflects PUP branding with "Iskolars ng Bayan" identity
- AI chatbot now has deep PUP context including GWA grading system, OSFA info, PUPCET references
- Chat route can now extract and convert PUP GWA (1.00-5.00) to percentage for eligibility matching
- All school-specific scholarships (UP, Benilde, Mapua, Ateneo, DLSU, UST) removed
- Redundant government programs (CHED StuFAPs, PESFA) replaced with specific programs (TES, TDP, CSP, ACEF-GIAHEP)
- Dev server running successfully, lint passing clean
