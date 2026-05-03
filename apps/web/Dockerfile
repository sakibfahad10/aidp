FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate

# --- Dependencies ---
FROM base AS deps
WORKDIR /app

# Copy workspace config + all package.json files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY apps/web/package.json ./apps/web/
# Include api's package.json so pnpm can resolve the full workspace lockfile
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile || pnpm install

# --- Build ---
FROM base AS build
WORKDIR /app

# Copy the entire node_modules tree (hoisted flat structure thanks to .npmrc)
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @disease-prediction/web build

# --- Production ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=build /app/apps/web/public ./apps/web/public
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["node", "apps/web/server.js"]
