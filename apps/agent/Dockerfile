# Multi-stage build for AI worker
FROM node:20-slim AS builder

RUN npm install -g pnpm@9.15.0

WORKDIR /app

COPY package.json ./
RUN pnpm install

COPY . .
RUN pnpm run build

# Production stage
FROM node:20-slim

# Install git, curl, and basic dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@9.15.0

WORKDIR /app

COPY package.json ./
RUN pnpm install --prod

COPY --from=builder /app/dist ./dist

# Install Playwright browser and system dependencies
ENV PLAYWRIGHT_BROWSERS_PATH=/app/ms-playwright
RUN npx playwright install --with-deps chromium

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs -d /app nodejs && \
    chown -R nodejs:nodejs /app

USER nodejs

CMD ["node", "dist/index.js"]
