# MicoPay API - Dockerfile para Railway
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/sdk/package*.json ./packages/sdk/
COPY packages/types/package*.json ./packages/types/

# Install dependencies with workspaces
RUN npm install

# Copy source code
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Expose port
EXPOSE 3000

# Start the API
CMD ["node", "--import", "tsx", "apps/api/src/index.ts"]