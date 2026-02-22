# Multi-stage build for Next.js
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Remove workspace dependencies that don't exist in npm
RUN sed -i '/@repo\//d' package.json || true

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build with placeholder values — replaced at container startup by entrypoint.sh
ENV NEXT_PUBLIC_API_URL=__NEXT_PUBLIC_API_URL__
ENV NEXT_PUBLIC_SOCKET_URL=__NEXT_PUBLIC_SOCKET_URL__
ENV NEXT_PUBLIC_CDN_URL=__NEXT_PUBLIC_CDN_URL__

# Build Next.js app
RUN npm run build

# Production stage — standalone output is self-contained, no npm install needed
FROM node:20-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy built Next.js standalone bundle (includes pruned node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Entrypoint: replaces __PLACEHOLDER__ strings with real env vars at startup
COPY --chown=nextjs:nodejs entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nextjs

# Expose port
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start Next.js server
CMD ["./entrypoint.sh"]
