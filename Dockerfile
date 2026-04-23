# MicoPay API - Dockerfile para Railway
FROM node:20-alpine

WORKDIR /app

# Copy all files first for better caching
COPY package*.json turbo.json tsconfig*.json ./
COPY packages/ ./packages/
COPY apps/api/package*.json ./apps/api/
COPY apps/api/tsconfig*.json ./apps/api/

# Install ALL dependencies (including dev for tsx)
RUN npm install

# Copy source code
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Expose port
EXPOSE 3000

# Start the API
CMD ["node", "--import", "tsx", "apps/api/src/index.ts"]