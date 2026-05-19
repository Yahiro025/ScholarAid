# ScholarAid Agent Ecosystem

## Internal Commands
- `\learn [query]`: When this command is used in a chat session, you MUST delegate the task to the `generalist` subagent using the `invoke_agent` tool. 
  1. Read the contents of `.agents/learn.md`.
  2. Invoke the `generalist` agent with that content as the system prompt and the user's `[query]` as the task.
  3. This ensures the "Learn" meta-agent operates with full focus on RCA without bloating the main session history.

## Auto-Delegation Rules
When tasks involve significant changes or research in the following areas, prioritize delegating to the `generalist` subagent with the corresponding `.agents/*.md` context:
- **UI/UX Design**: Use `.agents/scholar_ui_designer.md`. (Recommended skills: `impeccable`, `emil-design-eng`, `vercel-react-best-practices`).
- **AI/LangChain**: Use `.agents/langchain_architect.md`.
- **Backend/Data**: Use `.agents/scholar_backend_master.md`.
- **Ops/Watchdog**: Use `.agents/scholar_ops_agent.md`.
- **Testing/QA**: Use `.agents/scholar_qa_bot.md`.
