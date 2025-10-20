# Multi-stage Dockerfile for Next.js on Cloud Run with private npm support

# Accept NPM token for GitHub Packages (or other registries)
ARG NPM_TOKEN
# Accept commit hash from Cloud Build
ARG SHORT_SHA

# 1) Install production dependencies (cache-friendly)
FROM node:20-alpine AS deps
WORKDIR /app
ARG NPM_TOKEN
# Configure temporary npm auth for GitHub Packages (scoped to @challengerco)
RUN set -ex; \
  if [ -n "${NPM_TOKEN:-}" ]; then \
    echo "@challengerco:registry=https://npm.pkg.github.com" > /root/.npmrc; \
    echo "//npm.pkg.github.com/:_authToken=${NPM_TOKEN}" >> /root/.npmrc; \
    echo "always-auth=true" >> /root/.npmrc; \
  fi
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
# Remove token after install
RUN rm -f /root/.npmrc || true

# 2) Build the app
FROM node:20-alpine AS builder
WORKDIR /app
ARG NPM_TOKEN
ARG SHORT_SHA
# Configure temporary npm auth for build step as well
RUN set -ex; \
  if [ -n "${NPM_TOKEN:-}" ]; then \
    echo "@challengerco:registry=https://npm.pkg.github.com" > /root/.npmrc; \
    echo "//npm.pkg.github.com/:_authToken=${NPM_TOKEN}" >> /root/.npmrc; \
    echo "always-auth=true" >> /root/.npmrc; \
  fi
COPY . .
RUN npm ci
# Set commit hash from Cloud Build environment variable
RUN echo "NEXT_PUBLIC_COMMIT_HASH=${SHORT_SHA:-unknown}" > .env.local
RUN npm run build
RUN rm -f /root/.npmrc || true

# 3) Runtime image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV NEXT_TELEMETRY_DISABLED=1

# Copy built app only (no npm credentials)
COPY --from=builder /app .

# Cloud Run listens on $PORT
EXPOSE 8080
# Start your custom server (must read PORT from process.env)
CMD ["node","server.js"]
