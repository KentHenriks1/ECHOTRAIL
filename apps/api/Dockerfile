# Multi-stage build for Node.js API
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy dependency files
COPY package.json pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/

# Install dependencies
RUN pnpm install --frozen-lockfile --production=false

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps ./apps
COPY --from=deps /app/packages ./packages

# Copy source code
COPY . .

# Generate Prisma client
WORKDIR /app/apps/api
RUN pnpm prisma generate

# Build the application
WORKDIR /app
RUN pnpm build --filter=api

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 echotrail && \
    adduser --system --uid 1001 echotrail --ingroup echotrail

# Copy built application
COPY --from=builder --chown=echotrail:echotrail /app/apps/api/dist ./dist
COPY --from=builder --chown=echotrail:echotrail /app/apps/api/package.json ./
COPY --from=builder --chown=echotrail:echotrail /app/apps/api/prisma ./prisma
COPY --from=builder --chown=echotrail:echotrail /app/node_modules ./node_modules

# Install production dependencies only
RUN npm install --only=production --no-dev

# Switch to non-root user
USER echotrail

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "http.get('http://localhost:3000/v1/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "dist/index.js"]
