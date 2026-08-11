# Dockerfile para TanStack Start + Bun
FROM oven/bun:1.1.26-alpine AS base
WORKDIR /app

# Instalar dependências
FROM base AS install
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Build da aplicação
FROM base AS build
COPY --from=install /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN bun run build

# Execução da aplicação
FROM base AS release
COPY --from=build /app/.output ./.output
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/package.json ./package.json

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Comando para iniciar o servidor
CMD ["bun", ".output/server/index.mjs"]
