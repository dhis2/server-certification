FROM node:23-alpine AS builder
ARG VITE_API_URL
RUN corepack enable && corepack prepare yarn --activate
WORKDIR /app
COPY .yarnrc.yml package.json yarn.lock ./
RUN yarn install --immutable
COPY . .
RUN yarn build

FROM node:23-alpine AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/build ./build
CMD ["yarn", "start"]

