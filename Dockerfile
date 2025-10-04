# Use Node.js 20 LTS as base image
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install system dependencies required for Prisma, native modules, and FFmpeg
RUN apk add --no-cache \
    openssl \
    ca-certificates \
    ffmpeg \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./
COPY contracts/package*.json ./contracts/

# Install all dependencies (including dev dependencies for build)
RUN npm ci && npm cache clean --force

# Install contracts dependencies
RUN cd contracts && npm ci && npm cache clean --force

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    openssl \
    ca-certificates \
    dumb-init \
    ffmpeg \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy package files for production install
COPY --chown=nestjs:nodejs package*.json ./
COPY --chown=nestjs:nodejs contracts/package*.json ./contracts/

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force
RUN cd contracts && npm ci --only=production && npm cache clean --force

# Copy Prisma schema and generate client
COPY --from=base --chown=nestjs:nodejs /app/prisma ./prisma
RUN npx prisma generate

# Copy built application
COPY --from=base --chown=nestjs:nodejs /app/dist ./dist

# Copy startup script
COPY --chown=nestjs:nodejs scripts/start-production.sh /app/start.sh
RUN chmod +x /app/start.sh

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application using the startup script
CMD ["/app/start.sh"]
