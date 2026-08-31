# Multi-stage Dockerfile for Dora Web & Central Backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json* ./

# Install all dependencies including devDependencies for build
RUN npm ci || npm install

# Copy source files
COPY . .

# Build Vite frontend & Bundle Express TypeScript server to dist/server.cjs
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy built frontend assets and bundled server from builder stage
COPY --from=builder /app/dist ./dist

# Expose port 3000 (Cloud Run default ingress port)
EXPOSE 3000

# Start compiled server
CMD ["node", "dist/server.cjs"]
