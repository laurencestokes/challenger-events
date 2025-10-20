# Multi-stage Dockerfile for Next.js on Cloud Run with private npm support

# Accept NPM token for GitHub Packages (or other registries)
ARG NPM_TOKEN

# 1) Install production dependencies (cache-friendly)
FROM node:20-alpine AS deps
WORKDIR /app
ARG NPM_TOKEN
# Configure temporary npm auth for GitHub Packages (scoped to @challengerco)
RUN set -eux; \
  if [ -n "$NPM_TOKEN" ]; then \
    printf "@challengerco:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=%s\nalways-auth=true\n" "$NPM_TOKEN" > /root/.npmrc; \
  fi
COPY package*.json ./
RUN npm ci --omit=dev
# Remove token after install
RUN rm -f /root/.npmrc || true

# 2) Build the app
FROM node:20-alpine AS builder
WORKDIR /app
ARG NPM_TOKEN
# Configure temporary npm auth for build step as well
RUN set -eux; \
  if [ -n "$NPM_TOKEN" ]; then \
    printf "@challengerco:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=%s\nalways-auth=true\n" "$NPM_TOKEN" > /root/.npmrc; \
  fi
COPY . .
RUN npm ci
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
