# MedPredict AI — Disease Prediction Platform

AI-powered disease prediction platform that analyzes symptoms, structured health data, and medical reports using Google Gemini to provide health insights.

## Architecture

```
project/
├── apps/
│   ├── web/              # Next.js 15 frontend (App Router)
│   └── api/              # Express.js backend API
├── packages/
│   ├── db/               # Prisma schema and database client
│   └── shared/           # Shared types, schemas, validation
├── infra/
│   └── docker-compose.yml
├── package.json          # Root workspace config
├── pnpm-workspace.yaml
└── README.md
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | Express.js + TypeScript |
| AI | Google Gemini API (gemini-2.0-flash) |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Validation | Zod |
| Containerization | Docker + Docker Compose |

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) >= 9
- [Docker](https://www.docker.com/) and Docker Compose
- [Google Gemini API Key](https://makersuite.google.com/app/apikey)

## Quick Start (Docker)

The fastest way to run the full stack:

### 1. Clone and configure

```bash
cd "Ai disease prediction."

# Create environment files
cp infra/.env.example infra/.env
# Edit infra/.env and add your GEMINI_API_KEY
```

### 2. Start all services

```bash
cd infra
docker compose up --build
```

This starts:
- **PostgreSQL** on `localhost:5432`
- **Backend API** on `localhost:4000`
- **Frontend** on `localhost:3000`

### 3. Initialize the database

In a separate terminal, run the Prisma migration:

```bash
# From the project root
docker compose -f infra/docker-compose.yml exec api npx prisma db push --schema=/app/packages/db/prisma/schema.prisma
```

### 4. Open the app

Visit [http://localhost:3000](http://localhost:3000)

## Local Development (Without Docker)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up environment variables

```bash
# Backend
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your GEMINI_API_KEY and DATABASE_URL

# Frontend
cp apps/web/.env.example apps/web/.env.local
```

### 3. Start PostgreSQL

You can use Docker for just the database:

```bash
docker run -d \
  --name dp-postgres \
  -e POSTGRES_DB=disease_prediction \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:16-alpine
```

### 4. Generate Prisma client and push schema

```bash
pnpm db:generate
pnpm db:push
```

### 5. Start development servers

```bash
# Terminal 1 — Backend
pnpm dev:api

# Terminal 2 — Frontend
pnpm dev:web
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/v1/predict` | Create a new prediction |
| GET | `/api/v1/predictions` | List all predictions |
| GET | `/api/v1/predictions/:id` | Get prediction by ID |

### POST /api/v1/predict — Request Body

```json
{
  "inputType": "symptom",
  "payload": {
    "symptoms": "I have a persistent headache and mild fever for 3 days",
    "duration": "3 days",
    "severity": "moderate"
  }
}
```

### Prediction Response Format

```json
{
  "riskLevel": "moderate",
  "possibleConditions": [
    {
      "name": "Tension Headache",
      "probability": "60%",
      "description": "A common headache often caused by stress or fatigue"
    }
  ],
  "summary": "Based on the symptoms described...",
  "recommendation": "Consider consulting a healthcare provider...",
  "redFlags": ["Severe headache that worsens suddenly"]
}
```

## Input Types

### 1. Symptom Input
Free-text description of symptoms with optional duration and severity.

### 2. Structured Input
Structured health data including age, gender, symptom selection, medical history, medications, and vitals.

### 3. Report Input
Medical report text (lab results, diagnostic findings) with optional report type.

## Project Structure Details

### Backend (`apps/api/src/`)
```
src/
├── config/         # Environment configuration
├── controllers/    # HTTP request handlers
├── middlewares/     # Error handling, validation
├── repositories/   # Database operations (Prisma)
├── routes/         # API route definitions
├── services/       # Business logic, Gemini integration
├── utils/          # Helper functions
└── app.ts          # Express application entry point
```

### Frontend (`apps/web/src/`)
```
src/
├── app/            # Next.js App Router pages
│   ├── predict/    # Prediction input page
│   └── history/    # Prediction history page
├── components/
│   ├── layout/     # Navbar, layout components
│   ├── prediction/ # Form and result components
│   └── ui/         # shadcn/ui base components
└── lib/            # API client, utilities
```

## Environment Variables

### Backend (`apps/api/.env`)
| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `4000` |
| `NODE_ENV` | Environment | `development` |
| `DATABASE_URL` | PostgreSQL connection string | — |
| `GEMINI_API_KEY` | Google Gemini API key | — |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |

### Frontend (`apps/web/.env.local`)
| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:4000` |

## License

MIT
