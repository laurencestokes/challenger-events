# Multi-stage Dockerfile for Next.js on Cloud Run

# 1) Install production dependencies (cache-friendly)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# 2) Build the app
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build

# 3) Runtime image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV NEXT_TELEMETRY_DISABLED=1

# Copy built app
COPY --from=builder /app .

# Cloud Run listens on $PORT
EXPOSE 8080
# Start your custom server (must read PORT from process.env)
CMD ["node","server.js"]
