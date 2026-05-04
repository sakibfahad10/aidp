# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`ai-disease-prediction` (MedPredict AI) is a full-stack disease-prediction platform: users submit health data (symptoms, structured vitals, or a medical report) and Google Gemini returns a risk assessment. It's a pnpm monorepo (Node >=20, pnpm 11.5.2; CI runs Node 22).

## Commands

```bash
# Dev (run in separate terminals)
pnpm dev:api          # builds packages first, then tsx-watches Express on :4000
pnpm dev:web          # Next.js dev on :3000

# Build — build:packages MUST run before typecheck or building the API
pnpm build:packages   # shared build → db prisma generate → db build
pnpm build            # build:packages, then all workspaces

# Quality
pnpm check            # Biome: lint + format + import organization (read-only)
pnpm check:fix        # Biome: same, with --write
pnpm typecheck        # tsc --noEmit across all workspaces

# Database
pnpm db:generate      # prisma generate
pnpm db:push          # prisma db push
pnpm db:migrate       # prisma migrate

# Single workspace
pnpm --filter @disease-prediction/<api|web|shared|db> <script>
```

**No test framework is configured** — there are no test files or runner.

CI (`.github/workflows/ci.yml`): `pnpm biome ci .` → `build:packages` → `typecheck`. Pre-commit (lefthook) runs `biome check --write` on staged files.

## Architecture

Four workspaces (`apps/*`, `packages/*`), linked via `workspace:*`:

- `apps/web` — Next.js 15 App Router, React 19, Tailwind, shadcn/ui, Clerk auth
- `apps/api` — Express + Gemini + Clerk
- `packages/shared` — Zod schemas + TypeScript types; the **single source of truth** and contract between front and back
- `packages/db` — Prisma client singleton wrapping `@prisma/client`

**Dependency direction:** `web → shared`; `api → shared + db`; `db → @prisma/client`.

**Prediction flow:** form (React Hook Form + Zod) → POST `/api/v1/predict` with a Clerk Bearer token → controller extracts `userId` → `PredictionService` → `GeminiService` (builds an input-type-aware prompt, validates Gemini's JSON with `aiPredictionResponseSchema`) → `PredictionRepository` persists to Postgres → returns `ApiResponse<Prediction>`.

**Input-type polymorphism (core concept):** the `InputType` enum (symptom / structured / report) drives a Zod `discriminatedUnion` in `packages/shared/src/schemas.ts`, a `switch` in `GeminiService.buildUserPrompt()`, and three separate frontend forms. One endpoint handles three input shapes, type-safe end to end.

**Auth sync:** Clerk posts a webhook to `/api/v1/webhooks/clerk` (raw body, signature-verified) that creates/updates the Postgres `User` on `user.created`/`user.updated`. Predictions are scoped by `userId`.

**Entry points:** `apps/api/src/app.ts`, `apps/web/src/app/`, `packages/db/prisma/schema.prisma`.

## Conventions & gotchas

- Strict TypeScript everywhere (`noUncheckedIndexedAccess`, `noImplicitReturns`, etc.). Biome enforces `noExplicitAny`, `useImportType`, `noNonNullAssertion`, and `noConsole` — `console` is allowed **only** in `apps/api`.
- Always run `build:packages` before `typecheck` or API work: `shared`/`db` must be compiled and Prisma generated, or downstream type resolution fails (CI does this).
- Biome replaces ESLint + Prettier — see `docs/adr/0001-adopt-biome-over-eslint-prettier.md`.
- `infra/docker-compose.yml` runs the full stack: Postgres (5433), API (4000), Web (3000).
