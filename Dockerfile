# ==================================
# Stage 1: Build Contracts
# ==================================
FROM oven/bun:1.2.23-alpine AS contracts-builder

WORKDIR /contracts

# Copy contracts package files
COPY profile-contracts/package.json ./
COPY profile-contracts/bun.lockb* ./

# Install contracts dependencies
RUN bun install --frozen-lockfile

# Copy contracts source
COPY profile-contracts/ .

# Build contracts
RUN bun run build

# ==================================
# Stage 2: Dependencies
# ==================================
FROM oven/bun:1.2.23-alpine AS deps

# Install system dependencies including Chromium for Puppeteer
RUN apk add --no-cache \
    libc6-compat \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Puppeteer to skip installing Chrome, use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Copy built contracts from contracts-builder stage
COPY --from=contracts-builder /contracts /profile-contracts

# Copy package files
COPY profile-services/package.json ./
COPY profile-services/bun.lockb* ./

# Install dependencies with GitHub Packages authentication using secrets
RUN --mount=type=secret,id=github_token \
    if [ -s /run/secrets/github_token ]; then \
      GITHUB_TOKEN=$(cat /run/secrets/github_token) && \
      echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" > .npmrc && \
      echo "@octopus-synapse:registry=https://npm.pkg.github.com" >> .npmrc; \
    fi && \
    bun install && \
    rm -f .npmrc

# ==================================
# Stage 3: Builder
# ==================================
FROM node:20-alpine AS builder

# Install Chromium and dependencies for build stage
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    curl \
    unzip \
    bash

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash && \
    ln -s /root/.bun/bin/bun /usr/local/bin/bun && \
    ln -s /root/.bun/bin/bunx /usr/local/bin/bunx

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Copy built contracts to /profile-contracts (required for symlink in node_modules)
COPY --from=contracts-builder /contracts /profile-contracts

# Copy dependencies from deps stage (includes symlink to ../profile-contracts)
COPY --from=deps /app/node_modules ./node_modules

# Copy source files
COPY profile-services/ .

# Generate Prisma Client
RUN bunx prisma generate

# Build NestJS application
RUN bun run build

# Clean up dev dependencies (reinstall with production flag)
RUN bun install --production --frozen-lockfile

# ==================================
# Stage 3: Runner (Production)
# ==================================
FROM node:20-alpine AS runner

# Install Chromium and dependencies for runtime
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    tini \
    curl \
    unzip \
    bash

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash && \
    ln -s /root/.bun/bin/bun /usr/local/bin/bun && \
    ln -s /root/.bun/bin/bunx /usr/local/bin/bunx

WORKDIR /app

# Set environment variables
ENV NODE_ENV=production \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy necessary files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/data ./dist/data
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Install Prisma CLI globally using Bun (no need for ts-node/typescript)
RUN bun install -g prisma@6.17.1

# Change ownership to nestjs user
RUN chown -R nestjs:nodejs /app

# Switch to nestjs user
USER nestjs

# Expose backend port
ARG PORT=3001
EXPOSE ${PORT}

ENV PORT=${PORT} \
    HOSTNAME="0.0.0.0"

# Add labels
LABEL maintainer="ProFile Services" \
      description="ProFile Backend API - NestJS Application" \
      version="1.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "const port = process.env.PORT || 3001; require('http').get(\`http://localhost:\${port}/api/health\`, (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "dist/src/main"]
