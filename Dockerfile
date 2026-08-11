# Dockerfile para TanStack Start + Node.js (Vite 6/8 compatibility)
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# Instalar dependências
FROM base AS install
COPY package.json pnpm-lock.yaml* bun.lockb* ./
# Usamos npm para compatibilidade máxima se não houver lockfile pnpm
RUN npm install

# Build da aplicação
FROM base AS build
COPY --from=install /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
# Vite 6+ pode ter problemas com parseEnv no Bun 1.1.26, então buildamos com Node
RUN npm run build

# Execução da aplicação
FROM base AS release
COPY --from=build /app/.output ./.output
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/package.json ./package.json

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Comando para iniciar o servidor
CMD ["node", ".output/server/index.mjs"]

