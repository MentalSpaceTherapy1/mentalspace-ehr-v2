# Multi-stage Dockerfile for MentalSpace EHR Backend
# Optimized for production deployment

# Build arguments for deployment tracking
ARG GIT_SHA=unknown
ARG BUILD_TIME=unknown

# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy root package files
COPY package*.json ./
COPY tsconfig.json ./

# Copy workspace package files
COPY packages/backend/package*.json ./packages/backend/
COPY packages/database/package*.json ./packages/database/
COPY packages/shared/package*.json ./packages/shared/

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code for all packages
COPY packages/backend ./packages/backend
COPY packages/database ./packages/database
COPY packages/shared ./packages/shared

# Generate Prisma Client
WORKDIR /app/packages/database
RUN npx prisma generate

# Build shared package first
WORKDIR /app/packages/shared
RUN npx tsc

# Build TypeScript to JavaScript using esbuild (fast, no type-checking)
WORKDIR /app/packages/backend
RUN npm run build

# Stage 2: Production - use Debian slim for better OpenSSL compatibility with Prisma
FROM node:20-slim

# Re-declare build arguments for this stage
ARG GIT_SHA=unknown
ARG BUILD_TIME=unknown

# Set as environment variables for runtime access
ENV GIT_SHA=${GIT_SHA}
ENV BUILD_TIME=${BUILD_TIME}

# Install curl for health checks and OpenSSL for Prisma
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy everything from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

# Copy entrypoint script and make it executable
COPY packages/backend/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Create non-root user for security
RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home nodejs && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3001/api/v1/health/live || exit 1

# Set working directory to backend
WORKDIR /app/packages/backend

# Use entrypoint script that runs migrations then starts the app
ENTRYPOINT ["/app/docker-entrypoint.sh"]
