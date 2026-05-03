FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate

# --- Dependencies ---
FROM base AS deps
WORKDIR /app

# Copy workspace config + all package.json files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile || pnpm install

# --- Build ---
FROM base AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build packages in dependency order: shared → db (with prisma generate) → api
RUN pnpm --filter @disease-prediction/shared build
RUN pnpm --filter @disease-prediction/db generate
RUN pnpm --filter @disease-prediction/db build
RUN pnpm --filter @disease-prediction/api build

# --- Production ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy compiled packages
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/
COPY --from=build /app/packages/db/dist ./packages/db/dist
COPY --from=build /app/packages/db/package.json ./packages/db/
COPY --from=build /app/packages/db/prisma ./packages/db/prisma

# Copy compiled API
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/

# Copy node_modules and root config
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/pnpm-workspace.yaml ./

WORKDIR /app/apps/api
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy --schema=../../packages/db/prisma/schema.prisma && node dist/app.js"]
