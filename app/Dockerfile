FROM node:24.13.0-alpine3.23 AS base

RUN apk add --no-cache dumb-init

# Deps
FROM base AS deps

WORKDIR /app

COPY api/package*.json ./

RUN npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force

FROM base AS dev-deps

WORKDIR /app

COPY api/package*.json ./

RUN npm ci --ignore-scripts && \
    npm cache clean --force

# Build
FROM base AS build

WORKDIR /app

COPY --from=dev-deps /app/node_modules ./node_modules
COPY api/ .

RUN npm run build && \
    find ./dist -name "*.map" -type f -delete

# Runtime
FROM base AS runtime

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --chown=nodejs:nodejs api/package.json ./
RUN mkdir -p /app/logs && \
    chown -R nodejs:nodejs /app/logs

ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=2048"

EXPOSE 3001

USER nodejs

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/main.js"]