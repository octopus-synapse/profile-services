# ==================================
# Stage 1: Dependencies (cached when package.json doesn't change)
# ==================================
FROM oven/bun:1.3.10-alpine AS deps

WORKDIR /app

# Layer 1: Copy ONLY package files (changes rarely)
COPY package.json bun.lock* ./
COPY prisma ./prisma
COPY prisma.config.ts ./

# Layer 2: Install dependencies (cached by BuildKit)
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile && \
    bunx prisma generate

# ==================================
# Stage 2: Build (only reruns when src/ changes)
# ==================================
FROM deps AS builder

# Copy source files (this layer rebuilds when src changes)
COPY src ./src
COPY tsconfig*.json ./
COPY prisma.config.ts ./
COPY data ./data

# Build application
RUN bun run build

# Clean dev dependencies
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --production --frozen-lockfile

# ==================================
# Stage 3: Production Runtime
# ==================================
FROM oven/bun:1.3.10-alpine AS runner

# Install runtime dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    tini

ENV NODE_ENV=production \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy only production artifacts
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

# Install Prisma CLI globally
RUN bun install -g prisma@7

USER nestjs

ARG PORT=3001
EXPOSE ${PORT}

ENV PORT=${PORT} \
    HOSTNAME="0.0.0.0"

LABEL maintainer="ProFile Services" \
      description="ProFile Backend API - NestJS Application" \
      version="1.0.0"

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD bun -e "const port = process.env.PORT || 3001; fetch(\`http://localhost:\${port}/api/health\`).then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]

CMD ["bun", "run", "dist/src/main.js"]
