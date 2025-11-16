# Clipping.AI

AI-Powered Competitive Intelligence Platform - delivering personalized, automated reports that blow minds in the first 30 seconds.

## Features

- 🚀 **Amazing First 30s**: Smart company detection from work email → instant report suggestions
- 🤖 **AI-Powered**: Claude Agent SDK for intelligent report generation
- 📊 **Three Report Types**: Competitor landscape, market landscape, and media monitoring
- ❤️ **Feedback System**: Like/dislike articles + detailed feedback to improve future reports
- 🔗 **Viral Sharing**: Public links optimized for WhatsApp and social sharing
- 📧 **Email Delivery**: Beautiful emails with TL;DR and full reports

## Tech Stack

- **Frontend**: Vite + React + TypeScript + Tailwind CSS
- **Backend**: Express + TypeScript
- **Database**: Neon (PostgreSQL) + Prisma ORM
- **AI**: Anthropic Claude Agent SDK
- **Monorepo**: pnpm workspaces
- **Deploy**: Google Cloud Platform

## Project Structure

```
clippingai/
├── apps/
│   ├── web/              # Vite + React frontend
│   └── api/              # Express.js backend
├── packages/
│   ├── database/         # Prisma schema & migrations
│   └── shared/           # Shared types & utilities
├── pnpm-workspace.yaml   # Monorepo configuration
└── package.json          # Root package.json
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- Neon database account

### Installation

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your credentials
3. Install dependencies:
   ```bash
   pnpm install
   ```

4. Set up the database:
   ```bash
   cd packages/database
   pnpm prisma migrate dev
   ```

5. Start the development servers:
   ```bash
   pnpm dev
   ```

This will start:
- Frontend at http://localhost:5173
- Backend at http://localhost:3001

## Environment Variables

See `.env.example` for required environment variables.

## Development Workflow

- `pnpm dev` - Start all services in development mode
- `pnpm build` - Build all packages
- `pnpm lint` - Lint all packages

## License

MIT
