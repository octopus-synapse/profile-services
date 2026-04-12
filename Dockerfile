# Stage 1: Dependencies (cached when package.json doesn't change)
FROM oven/bun:1.3.11-alpine AS deps

WORKDIR /app

COPY package.json bun.lock* ./
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile && \
    bunx prisma generate

RUN apk add --no-cache xz && \
    wget -qO- https://github.com/typst/typst/releases/download/v0.13.1/typst-x86_64-unknown-linux-musl.tar.xz \
    | tar -xJ -C /usr/local/bin/ --strip-components=1 typst-x86_64-unknown-linux-musl/typst && \
    apk del xz

# Stage: Witness worker (lightweight, no Typst needed)
FROM oven/bun:1.3.11-alpine AS witness

RUN apk add --no-cache bash git tar gzip openssl

WORKDIR /app

COPY package.json bun.lock* ./
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile && \
    bunx prisma generate

COPY src ./src
COPY scripts ./scripts
COPY tsconfig*.json ./

CMD ["bun", "run", "attestation:witness:worker"]

# Stage 2: Build (only reruns when src/ changes)
FROM deps AS builder

COPY src ./src
COPY tsconfig*.json ./
COPY prisma.config.ts ./
COPY data ./data
COPY fonts ./fonts

RUN bun run build

RUN mkdir -p dist/templates/typst && \
    cp -r src/bounded-contexts/export/infrastructure/typst/templates/* dist/templates/typst/

RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --production --frozen-lockfile

# Stage 3: Production Runtime
FROM oven/bun:1.3.11-alpine AS runner

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    tini \
    xz

RUN wget -qO- https://github.com/typst/typst/releases/download/v0.13.1/typst-x86_64-unknown-linux-musl.tar.xz \
    | tar -xJ -C /usr/local/bin/ --strip-components=1 typst-x86_64-unknown-linux-musl/typst && \
    apk del xz

ENV NODE_ENV=production \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/fonts /usr/share/fonts/resume-fonts

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
