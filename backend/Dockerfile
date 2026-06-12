# ============================================================
# Cloud Lib — Backend Dockerfile
# Multi-stage build for production Node.js deployment
# Targets: AWS Elastic Beanstalk (Docker platform)
# ============================================================

# ── Stage 1: Install dependencies ────────────────────────────
FROM node:20-alpine AS deps

# Set working directory
WORKDIR /app

# Copy package manifests first for better layer caching
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# ── Stage 2: Production image ─────────────────────────────────
FROM node:20-alpine AS runner

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 cloudlib

WORKDIR /app

# Copy installed dependencies from deps stage
COPY --from=deps --chown=cloudlib:nodejs /app/node_modules ./node_modules

# Copy application source code
COPY --chown=cloudlib:nodejs . .

# Switch to non-root user
USER cloudlib

# Expose the API port (must match PORT env var)
EXPOSE 5000

# Health check so ALB/EB can detect unhealthy containers
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

# Start the server
CMD ["node", "server.js"]
