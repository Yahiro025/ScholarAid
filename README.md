# ScholarAid

A Next.js application for managing scholarship applications with AI-powered assistance.

## Tech Stack

- **Framework**: Next.js 16.1.1 (React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4 with shadcn/ui components
- **Database**: PostgreSQL (via Prisma ORM)
- **Authentication**: NextAuth.js
- **State Management**: Zustand
- **Data Fetching**: TanStack React Query
- **AI Integration**: LangChain with Google Gemini and Groq providers
- **Other Key Dependencies**: 
  - React Hook Form
  - Framer Motion
  - Sonner (toasts)
  - UUID
  - Zod (validation)

## Project Structure

```
ScholarAid/
├── src/
│   ├── app/                 # Next.js app router
│   │   ├── api/             # API routes
│   │   │   ├── chat/        # Chatbot API
│   │   │   ├── eligibility/ # Scholarship eligibility checking
│   │   │   ├── matcher/     # Scholarship matching
│   │   │   ├── reviewer/    # Application review
│   │   │   ├── scholarships/# Scholarship management
│   │   │   └── route.ts     # General API route
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Home page
│   ├── components/          # Reusable components
│   │   └── ui/              # shadcn/ui components
│   ├── hooks/               # Custom React hooks
│   └── lib/                 # Utility functions and libraries
├── prisma/                  # Prisma schema and migrations
├── db/                      # Database seed scripts
├── public/                  # Static assets
├── upload/                  # File upload storage
├── download/                # File download storage
└── scripts/                 # Development and deployment scripts
```

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- Bun (for faster installation and execution)
- PostgreSQL database

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
   Copy `.env.example` to `.env` and fill in the required values:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/scholaraid"
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   GOOGLE_GENAI_API_KEY="your-google-api-key"
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

### Building for Production

```bash
bun run build
```

### Starting Production Server

```bash
bun run start
```

## Deployment & Hosting

The application can be deployed to any platform that supports Node.js applications (Vercel, Docker, etc.).

For Docker deployment, you can use the provided scripts:
- `dev.sh` - Development mode
- `run-dev.sh` - Development with watchdog
- `run-server.sh` - Production server

## API/Routes Overview

### Authentication
- `/api/auth/*` - NextAuth authentication routes

### Core Features
- `/api/chat` - AI chatbot for scholarship assistance
- `/api/eligibility` - Check eligibility for scholarships
- `/api/matcher` - Match user profile with scholarships
- `/api/reviewer` - Review and improve scholarship applications
- `/api/scholarships` - CRUD operations for scholarship listings

## Configuration & Environment Notes

- The application uses Tailwind CSS 4 with the `@tailwindcss/postcss` plugin
- shadcn/ui components are configured via `components.json`
- Prisma is configured with PostgreSQL provider
- NextAuth is configured with Credentials and OAuth providers
- Environment variables must be set for:
  - Database connection
  - NextAuth secrets
  - AI service API keys (Google Gemini, Groq)

## Known Issues/Limitations

- File upload/download functionality depends on server storage paths (`./upload` and `./download`)
- AI features require valid API keys for external services
- Some UI components may require additional configuration for specific use cases