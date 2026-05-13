---
Task ID: 1
Agent: Main Agent
Task: Integrate LangChain into ScholarAId for better free LLM models

Work Log:
- Installed LangChain packages: langchain, @langchain/core, @langchain/google-genai, @langchain/groq, @langchain/community
- Created LangChain utility module at src/lib/langchain/ with:
  - models.ts: Custom ZAIChatModel wrapper + Google Gemini/Groq support + auto-selection
  - tools.ts: LangChain DynamicStructuredTools for web search, page reader, scholarship DB
  - schemas.ts: Zod schemas for structured output (MatcherAnalysis, ExamQuestion, QueryClassification)
  - prompts.ts: ChatPromptTemplates for chat, classification, matcher, reviewer
  - index.ts: Barrel exports
- Refactored chat API (src/app/api/chat/route.ts) to use LangChain:
  - Uses LangChain model abstraction for all LLM calls
  - Still injects scholarship context directly into prompt (proven anti-hallucination approach)
  - Web search and page reader via z-ai-web-dev-sdk functions
  - Query classification via LangChain model
  - Returns model info (provider, name) in response
- Refactored matcher API (src/app/api/matcher/route.ts) to use LangChain:
  - Uses getStructuredModel() for deterministic JSON output
  - withStructuredOutput() for Gemini/Groq, manual JSON parsing fallback for z-ai
  - Graceful fallback analysis if AI fails
- Refactored reviewer API (src/app/api/reviewer/route.ts) to use LangChain:
  - Uses getChatModel() with creative temperature for varied questions
  - withStructuredOutput() for Gemini/Groq, manual JSON parsing fallback
- Updated AI chatbot component to show model provider indicator
- Added .env documentation for GOOGLE_API_KEY and GROQ_API_KEY
- Verified: Homepage 200, Chat API working, Scholarships API working, No hallucination

Stage Summary:
- LangChain integration complete with multi-provider support
- Default: z-ai-web-dev-sdk (no API key needed, always works)
- Google Gemini 2.5 Flash: Best free model (just add GOOGLE_API_KEY to .env)
- Groq Llama 3.3 70B: Fastest free model (just add GROQ_API_KEY to .env)
- All APIs working correctly with LangChain model abstraction
- Chat API correctly filters scholarships by GPA and avoids hallucination
