# Multi-stage build for platform worker
FROM node:20-alpine AS builder

RUN corepack enable pnpm

WORKDIR /app

COPY package.json ./
RUN pnpm install

COPY . .
RUN pnpm run build

# Production stage
FROM node:20-alpine

RUN corepack enable pnpm

WORKDIR /app

COPY package.json ./
RUN pnpm install --prod

COPY --from=builder /app/dist ./dist

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

CMD ["node", "dist/index.js"]
