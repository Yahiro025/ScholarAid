---
Task ID: 1
Agent: Main Agent
Task: Analyze the whole project and fix issues causing blank display

Work Log:
- Checked dev server status: server was crashed, not running
- Analyzed all component files: hero-section, ai-scholarship-matcher, eligibility-checker, scholarship-browser, ai-chatbot, ai-reviewer, footer - all code looks correct
- Checked API routes: chat, matcher, reviewer, eligibility, scholarships - all look correct
- Checked LangChain integration: models.ts, schemas.ts, prompts.ts, tools.ts - all properly configured
- Checked database: 26 scholarships present, Prisma schema in sync
- Verified lint passes clean with no errors
- Identified root cause: the Next.js server process keeps getting killed by the sandbox environment
- Server works correctly when running: returns 200 with 102KB HTML, correct title, API endpoints return correct data
- The page title "ScholarAId - AI-Powered Scholarship Finder for Filipino Students" renders correctly
- All 26 scholarships load from the database
- Eligibility API correctly returns 15 eligible scholarships for a STEM student with 85% GPA
- Updated .zscripts/dev.sh to use production build with auto-restart and signal trapping
- Production build is stable and uses ~100MB RAM vs dev server's ~1GB

Stage Summary:
- All code is correct - no bugs found in components, API routes, or LangChain integration
- The "not displaying" issue is caused by the server process being killed, not by code errors
- The dev.sh now uses production build (more stable, less memory) with auto-restart loop
- When server is running, everything works: page renders, APIs respond, database has data
- Key fix: dev.sh uses `node .next/standalone/server.js` with auto-restart instead of `bun run dev`
