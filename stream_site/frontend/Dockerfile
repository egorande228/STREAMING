FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY apps/main/package.json apps/main/package.json
COPY apps/stream/package.json apps/stream/package.json
RUN npm ci

FROM node:20-alpine AS builder
ARG APP_WORKSPACE
ARG BACKEND_URL
ARG HLS_PROXY_URL=""
ARG NEXT_PUBLIC_STREAM_SITE_URL=""
ENV BACKEND_URL=$BACKEND_URL
ENV HLS_PROXY_URL=$HLS_PROXY_URL
ENV NEXT_PUBLIC_STREAM_SITE_URL=$NEXT_PUBLIC_STREAM_SITE_URL
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build -w ${APP_WORKSPACE}

FROM node:20-alpine AS runner
ARG APP_PATH
ENV NODE_ENV=production
ENV APP_PATH=$APP_PATH
WORKDIR /app
RUN apk add --no-cache wget
COPY --from=builder /app/${APP_PATH}/public ./${APP_PATH}/public
COPY --from=builder /app/${APP_PATH}/.next/static ./${APP_PATH}/.next/static
COPY --from=builder /app/${APP_PATH}/.next/standalone ./
EXPOSE 3000
CMD ["sh", "-c", "node ${APP_PATH}/server.js"]
