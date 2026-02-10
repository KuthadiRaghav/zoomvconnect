# ============================================
# Stage 1: Install dependencies
# ============================================
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/signaling/package.json ./apps/signaling/
COPY packages/shared/package.json ./packages/shared/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# ============================================
# Stage 2: Build
# ============================================
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

WORKDIR /app

# Copy deps and source
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/signaling/node_modules ./apps/signaling/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

COPY pnpm-workspace.yaml package.json turbo.json tsconfig.json ./
COPY packages/shared/ ./packages/shared/
COPY apps/signaling/ ./apps/signaling/

# Build shared package first, then signaling
RUN pnpm --filter @zoomvconnect/shared build
RUN pnpm --filter @zoomvconnect/signaling build

# ============================================
# Stage 3: Production runner
# ============================================
FROM node:20-alpine AS runner

RUN apk add --no-cache dumb-init

WORKDIR /app

ENV NODE_ENV=production

# Copy built output and dependencies
COPY --from=builder /app/apps/signaling/dist ./apps/signaling/dist
COPY --from=builder /app/apps/signaling/package.json ./apps/signaling/
COPY --from=builder /app/apps/signaling/node_modules ./apps/signaling/node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 signaling
USER signaling

EXPOSE 4001

ENV SIGNALING_PORT=4001

# Use dumb-init for proper signal handling
CMD ["dumb-init", "node", "apps/signaling/dist/index.js"]
