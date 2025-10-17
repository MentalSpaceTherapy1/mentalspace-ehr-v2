# Multi-stage Dockerfile for MentalSpace EHR Backend
# Optimized for production deployment

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

# Stage 2: Production - use Debian slim for better OpenSSL compatibility with Prisma
FROM node:20-slim

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

# Start application with ts-node (transpile-only skips type checking)
CMD ["npx", "ts-node", "--transpile-only", "src/index.ts"]
