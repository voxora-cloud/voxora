FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# ✅ Copy public folder into dist/public
COPY src/public dist/public


# Expose port
EXPOSE 3002

# Start application
CMD ["node", "dist/index.js"]
