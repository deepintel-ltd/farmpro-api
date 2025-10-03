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

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Install contracts dependencies
RUN cd contracts && npm ci --only=production && npm cache clean --force

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

# Copy built application and dependencies
COPY --from=base --chown=nestjs:nodejs /app/dist ./dist
COPY --from=base --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=base --chown=nestjs:nodejs /app/contracts ./contracts
COPY --from=base --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=base --chown=nestjs:nodejs /app/package*.json ./

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main.js"]
