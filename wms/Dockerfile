# Dockerfile para Next.js Staff Frontend
FROM node:22-alpine AS base

# Instalar dependencias
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_R2_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_BYPASS_AUTH=false
ARG NEXT_PUBLIC_AUTH_DEBUG=false
ARG NEXT_PUBLIC_ENABLE_LOGS=false
ARG API_PROXY_URL
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_R2_PUBLIC_BASE_URL=${NEXT_PUBLIC_R2_PUBLIC_BASE_URL}
ENV NEXT_PUBLIC_BYPASS_AUTH=${NEXT_PUBLIC_BYPASS_AUTH}
ENV NEXT_PUBLIC_AUTH_DEBUG=${NEXT_PUBLIC_AUTH_DEBUG}
ENV NEXT_PUBLIC_ENABLE_LOGS=${NEXT_PUBLIC_ENABLE_LOGS}
ENV API_PROXY_URL=${API_PROXY_URL}
RUN npm run build && node copy-assets.js

# Runtime
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copiar contenido de standalone (incluye server.js y node_modules)
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

# Exponer puerto
EXPOSE 3000

# Ejecutar servidor directamente del standalone build
USER node
CMD ["node", "server.js"]
