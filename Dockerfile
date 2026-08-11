# Build stage
FROM node:22-slim AS build
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml* bun.lockb* ./
RUN npm install --include=dev

COPY . .
ENV NODE_ENV=production
RUN npm run build

# Production stage
FROM node:22-slim AS release
RUN corepack enable
WORKDIR /app

# O Nitro/TanStack Start precisa do node_modules para as server functions
# e para as dependências que não foram inlined no bundle.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.output ./.output
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/package.json ./package.json

# Variáveis críticas para o Easypanel
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
# Algumas infraestruturas pedem explicitamente a escuta em todas as interfaces
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000

EXPOSE 3000

# Healthcheck para o Easypanel
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"


# Iniciamos diretamente o entrypoint do Nitro
CMD ["node", ".output/server/index.mjs"]

