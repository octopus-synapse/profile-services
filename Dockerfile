# ==================================
# Stage 1: Dependencies
# ==================================
FROM node:20-alpine AS deps

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

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# ==================================
# Stage 2: Builder
# ==================================
FROM node:20-alpine AS builder

# Install Chromium and dependencies for build stage
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source files
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build NestJS application
RUN npm run build

# Clean up dev dependencies
RUN npm prune --production

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
    tini

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
