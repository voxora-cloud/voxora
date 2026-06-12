# Multi-stage build for Vite
FROM node:20-alpine AS builder

RUN npm install -g pnpm@9.15.0

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Set production environment
ENV NODE_ENV=production

# Build with placeholder values — replaced at container startup by entrypoint.sh
ENV VITE_API_URL=__VITE_API_URL__
ENV VITE_WIDGET_URL=__VITE_WIDGET_URL__
ENV VITE_SOCKET_URL=__VITE_SOCKET_URL__
ENV VITE_PUBLIC_ENV=__VITE_PUBLIC_ENV__
ENV VITE_INTERAONE_MODE=__VITE_INTERAONE_MODE__

# Build Vite app
RUN npm run build

# Production stage — static assets served by nginx
FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Entrypoint: replaces __PLACEHOLDER__ strings with real env vars at startup
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000 || exit 1

# Start nginx
CMD ["/entrypoint.sh"]
