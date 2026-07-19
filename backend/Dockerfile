# --- Build stage ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# --- Production stage ---
FROM node:20-alpine
WORKDIR /app

# Run as a non-root user -- a container compromise doesn't get root on
# the host, and it's an expected baseline in most container security scans.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src

USER appuser

ENV NODE_ENV=production
EXPOSE 4000

# Container-level health check so `docker ps` / ECS can see unhealthy
# containers without relying only on the ALB target group check.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "src/server.js"]
