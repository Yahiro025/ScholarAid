---
Task ID: 1
Agent: Main Agent
Task: Fix AI Reviewer and Chatbot errors + Add scholarship type filters

Work Log:
- Investigated why AI chatbot and reviewer were failing
- Found root causes:
  1. **AI Reviewer**: The ZAIChatModel doesn't support `withStructuredOutput()`, and the z-ai model returns markdown-formatted questions instead of JSON. The manual JSON parser couldn't find valid JSON in the response.
  2. **AI Chatbot**: No retry logic, no per-step error handling. If any step (DB query, classification, web search, LLM call) failed, the whole request would return a 500 error.
  3. **ZAIChatModel**: Created new `ZAI.create()` instance on every call (expensive), no retry logic.
- Rewrote `/api/reviewer/route.ts` to use z-ai-web-dev-sdk directly with a JSON-requesting prompt, plus robust markdown fallback parser
- Rewrote `/api/chat/route.ts` to add per-step try/catch, retry logic for LLM calls (3 attempts), cached ZAI instance, and better error messages (503 vs 500)
- Updated `ZAIChatModel` in `/lib/langchain/models.ts` to cache ZAI instance, add retry logic (2 retries with exponential backoff)
- Updated `ai-chatbot.tsx` to show contextual error messages (retryable vs non-retryable)
- Updated scholarship type filter labels: "All" → "All Types", "Government" → "Government Scholarships"
- Added 3 financial-need (Need-Based) scholarships to seed data: PUP Iskolar ng Bayan Program, DSWD AICS, OVP Educational Assistance
- Re-seeded database with new scholarships

Stage Summary:
- AI Reviewer now works: returns properly structured JSON questions via direct z-ai SDK call with markdown fallback parser
- AI Chatbot now works: retry logic, per-step error handling, cached ZAI instance
- Scholarship type filters already existed; updated labels and added Need-Based scholarships to DB
- All lint checks pass
