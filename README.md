# ScholarAid: AI-Powered Scholarship Assistance

ScholarAid is a comprehensive platform designed to help Filipino students (specifically PUP "Iskolars ng Bayan") navigate the complex landscape of scholarships. It leverages AI to provide personalized matching, eligibility checking, and application review.

## Project Structure

```text
ScholarAid/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/             # API Route Handlers
│   │   │   ├── chat/        # Chatbot API
│   │   │   ├── eligibility/ # Scholarship eligibility checking
│   │   │   ├── matcher/     # Scholarship matching
│   │   │   ├── reviewer/    # Application review
│   │   │   └── scholarships/# Scholarship management
│   ├── components/          # Reusable UI components
│   ├── hooks/               # Custom React hooks
│   └── lib/                 # Utility functions and AI logic
├── prisma/                  # Prisma schema and migrations
├── public/                  # Static assets (including /docs)
└── scripts/                 # Development and deployment scripts
```

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- Bun (for faster installation and execution)
- PostgreSQL database (Vercel Postgres, Supabase, etc.)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd ScholarAid
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Set up environment variables:
   Create a `.env` file and fill in the required values:
   ```env
   DATABASE_URL="your-postgresql-url"
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="https://your-app.vercel.app"
   GOOGLE_API_KEY="your-google-api-key"
   GROQ_API_KEY="your-groq-api-key"
   ```

4. Initialize the database:
   ```bash
   bun run db:generate
   bun run db:push
   ```

### Running the Development Server

```bash
bun run dev
```

The application will be available at `http://localhost:3000`.

## Configuration & Environment Notes

- **Tailwind CSS 4**: Modern, high-performance styling.
- **Prisma**: Configured with PostgreSQL for Vercel/Cloud compatibility.
- **AI Models**: Uses Google Gemini and Groq via LangChain.
- **Environment Variables**: Ensure `DATABASE_URL`, `NEXTAUTH_SECRET`, `GOOGLE_API_KEY`, and `GROQ_API_KEY` are set in your deployment dashboard.

## Known Issues/Limitations

- AI features require valid API keys for external services.
- Static documents (like the project paper) are served from `public/docs/`.
- For dynamic file uploads in production, Vercel Blob or similar cloud storage is recommended.
