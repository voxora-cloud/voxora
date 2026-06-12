# Stage 1 — build the widget JS bundle
FROM node:20-alpine AS builder

RUN npm install -g pnpm@9.15.0

WORKDIR /app

COPY package.json ./
RUN pnpm install

COPY . .
RUN pnpm run build

# Stage 2 — deploy image
# Contains only the built output + deploy script.
# On startup it runs deploy-to-minio.js, then exits (restart: no in compose).
FROM node:20-alpine AS deploy

RUN npm install -g pnpm@9.15.0

WORKDIR /app

# Only the minio client package is needed at deploy time
COPY package.json ./
RUN pnpm install --prod

# Copy built widget files
COPY --from=builder /app/dist ./dist


# Copy deploy script and entrypoint
COPY deploy-to-minio.js ./
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]
