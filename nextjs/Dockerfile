# Dockerfile para Next.js Staff Frontend
FROM node:18-alpine AS base

# Instalar dependencias solo cuando sea necesario
FROM base AS deps
WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# Rebuild el código fuente solo cuando sea necesario
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build de producción
ENV NODE_ENV=production
RUN npm run build

# Imagen de producción, copiar todo y ejecutar
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copiar archivos necesarios
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Exponer puerto
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Ejecutar servidor
CMD ["node", "server.js"]

