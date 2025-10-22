# Multi-stage Dockerfile for Next.js on Cloud Run with private npm support

# Accept NPM token for GitHub Packages (or other registries)
ARG NPM_TOKEN
# Accept commit hash from Cloud Build
ARG SHORT_SHA
# Accept environment variables for build
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
ARG FIREBASE_PROJECT_ID
ARG FIREBASE_CLIENT_EMAIL
ARG FIREBASE_PRIVATE_KEY
ARG SOCKET_SECRET
ARG ERG_API_SECRET
ARG RESEND_API_KEY
ARG FROM_EMAIL
ARG NEXT_PUBLIC_APP_URL
ARG REVALIDATE_SECRET

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
# Accept environment variables for build
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
ARG FIREBASE_PROJECT_ID
ARG FIREBASE_CLIENT_EMAIL
ARG FIREBASE_PRIVATE_KEY
ARG SOCKET_SECRET
ARG ERG_API_SECRET
ARG RESEND_API_KEY
ARG FROM_EMAIL
ARG NEXT_PUBLIC_APP_URL
ARG REVALIDATE_SECRET

# Set environment variables for build
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID
ENV NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
ENV FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID
ENV FIREBASE_CLIENT_EMAIL=$FIREBASE_CLIENT_EMAIL
ENV FIREBASE_PRIVATE_KEY=$FIREBASE_PRIVATE_KEY
ENV SOCKET_SECRET=$SOCKET_SECRET
ENV ERG_API_SECRET=$ERG_API_SECRET
ENV RESEND_API_KEY=$RESEND_API_KEY
ENV FROM_EMAIL=$FROM_EMAIL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV REVALIDATE_SECRET=$REVALIDATE_SECRET
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
# Set all environment variables for build
RUN echo "NEXT_PUBLIC_FIREBASE_API_KEY=${NEXT_PUBLIC_FIREBASE_API_KEY}" >> .env.local
RUN echo "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}" >> .env.local
RUN echo "NEXT_PUBLIC_FIREBASE_PROJECT_ID=${NEXT_PUBLIC_FIREBASE_PROJECT_ID}" >> .env.local
RUN echo "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}" >> .env.local
RUN echo "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}" >> .env.local
RUN echo "NEXT_PUBLIC_FIREBASE_APP_ID=${NEXT_PUBLIC_FIREBASE_APP_ID}" >> .env.local
RUN echo "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=${NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID}" >> .env.local
RUN echo "FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}" >> .env.local
RUN echo "FIREBASE_CLIENT_EMAIL=${FIREBASE_CLIENT_EMAIL}" >> .env.local
RUN echo "FIREBASE_PRIVATE_KEY=${FIREBASE_PRIVATE_KEY}" >> .env.local
RUN echo "SOCKET_SECRET=${SOCKET_SECRET}" >> .env.local
RUN echo "ERG_API_SECRET=${ERG_API_SECRET}" >> .env.local
RUN echo "RESEND_API_KEY=${RESEND_API_KEY}" >> .env.local
RUN echo "FROM_EMAIL=${FROM_EMAIL}" >> .env.local
RUN echo "NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}" >> .env.local
RUN echo "REVALIDATE_SECRET=${REVALIDATE_SECRET}" >> .env.local
# Run Next.js build directly (bypassing prebuild script)
RUN npx next build
RUN rm -f /root/.npmrc || true

# 3) Runtime image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV NEXT_TELEMETRY_DISABLED=1

# Copy built app only (no npm credentials)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.js ./server.js

# Cloud Run listens on $PORT
EXPOSE 8080
# Start your custom server (must read PORT from process.env)
CMD ["node","server.js"]
