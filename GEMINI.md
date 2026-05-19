# ScholarAid Agent Ecosystem

## Internal Commands
- `\learn [query]`: When this command is used in a chat session, you MUST delegate the task to the `generalist` subagent using the `invoke_agent` tool. 
  1. Read the contents of `.agents/learn.md`.
  2. Invoke the `generalist` agent with that content as the system prompt and the user's `[query]` as the task.
  3. This ensures the "Learn" meta-agent operates with full focus on RCA without bloating the main session history.

## Proactive Delegation Mandate
- **Autonomous Delegation**: You are explicitly authorized and REQUIRED to autonomously delegate domain-specific sub-tasks to the relevant subagents. 
- **Trigger**: As soon as a plan involves UI design, AI logic, backend architecture, or QA testing, use `invoke_agent` with the corresponding `.agents/*.md` context immediately for that phase.
- **Goal**: Maintain the highest signal-to-noise ratio in the main session while ensuring domain experts handle specialized implementation.

## Auto-Delegation Rules
- **UI/UX Design**: Use `.agents/scholar_ui_designer.md`. (Mandatory for any `.tsx` or CSS changes).
- **AI/LangChain**: Use `.agents/langchain_architect.md`. (Mandatory for logic in `src/lib/langchain` or AI routes).
- **Backend/Data**: Use `.agents/scholar_backend_master.md`. (Mandatory for Prisma or DB-heavy logic).
- **Ops/Watchdog**: Use `.agents/scholar_ops_agent.md`. (Mandatory for shell scripts or server config).
- **Testing/QA**: Use `.agents/scholar_qa_bot.md`. (Mandatory for test creation and regression checks).
