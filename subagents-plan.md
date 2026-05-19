# ScholarAid: Subagent Implementation Plan

This document outlines the configuration and instructions for specialized subagents designed to maintain ScholarAid at a professional, top-notch level.

## 1. scholar_ui_designer (The Visual Enforcer)
**Expertise:** Next.js 16, Tailwind 4, Framer Motion, OKLCH, Impeccable Design System.
**Instructions:**
- Follow the "Dual-State Narrative" defined in `DESIGN.md`.
- Prioritize "Resilient Readability" and mobile-first layouts.
- Use `framer-motion` for "Hopeful Momentum" animations (ease-out-expo).
- Strictly enforce the "10% Emerald Rule" and "Response Elevation Rule".
- **Trigger:** Any task involving `.tsx` components in `src/components` or `src/app`.

## 2. langchain_architect (The AI Strategist)
**Expertise:** Prompt Engineering, LangChain Tooling, Groq, Google GenAI, RAG.
**Instructions:**
- Manage all logic within `src/lib/langchain`.
- Optimize prompts for the "Supportive Precision" brand personality.
- Ensure all AI outputs are validated against Zod schemas in `schemas.ts`.
- Refine tool-calling logic to minimize latency and token usage.
- **Trigger:** Changes to `src/lib/langchain`, `api/chat`, `api/reviewer`, or `api/matcher`.

## 3. scholar_backend_master (The Data Architect)
**Expertise:** Prisma, PostgreSQL/SQLite, Zod, Next.js API Routes.
**Instructions:**
- Maintain the scholarship matching logic in `api/eligibility` and `api/matcher`.
- Ensure all DB migrations are safe and well-documented.
- Implement strict Zod validation for all incoming API requests.
- Optimize scholarship filtering for speed and accuracy.
- **Trigger:** Changes to `prisma/schema.prisma` or `src/app/api`.

## 4. scholar_ops_agent (The Reliability Engineer)
**Expertise:** Shell Scripting, Caddy, Linux Process Management, Bun.
**Instructions:**
- Maintain the custom scripts in `.zscripts/` and root (e.g., `watchdog.sh`).
- Optimize the Caddy configuration for production stability.
- Handle environment variable management and deployment automation.
- **Trigger:** Changes to `.sh` files, `Caddyfile`, or deployment workflows.

## 5. scholar_qa_bot (The Quality Guardian)
**Expertise:** Testing (Vitest/Playwright), Edge-case Analysis, Hallucination Auditing.
**Instructions:**
- Write end-to-end tests for the scholarship matching engine.
- Audit AI reviewer sessions for correctness and explanation quality.
- Ensure 100% coverage for critical eligibility check logic.
- **Trigger:** Before any major release or after significant backend/AI changes.

---

### How to Implement
To create these subagents in a future session, provide this instruction:
> "Based on the `subagents-plan.md`, please initialize the `scholar_ui_designer` and `langchain_architect` subagents first."
