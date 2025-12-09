# Dockerfile para Next.js Staff Frontend
FROM node:18-alpine AS base

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
ENV NODE_ENV=production
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
CMD ["node", "server.js"]

