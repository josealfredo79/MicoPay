FROM node:20-alpine AS base
WORKDIR /app

RUN apk add --no-cache curl

FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts && npm cache clean --force

FROM base AS builder
COPY package*.json ./
RUN npm ci && npm cache clean --force
COPY . .
RUN npm run build || npx tsc

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000

RUN apk add --no-cache netcat-openbsd dumb-init

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist 2>/dev/null || true
COPY package*.json ./
COPY src ./src
COPY tsconfig.json ./

RUN chmod +x /app/entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "--import", "tsx", "src/index.ts"]
