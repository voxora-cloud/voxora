# Stage 1 — build the widget JS bundle
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2 — deploy image
# Contains only the built output + deploy script.
# On startup it runs deploy-to-minio.js, then exits (restart: no in compose).
FROM node:20-alpine AS deploy

WORKDIR /app

# Only the minio client package is needed at deploy time
COPY package.json ./
RUN npm install --omit=dev

# Copy built widget files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Copy deploy script and entrypoint
COPY deploy-to-minio.js ./
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]
