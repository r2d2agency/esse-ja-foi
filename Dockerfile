# Dockerfile para TanStack Start + Node.js (Vite 6/7 compatibility)
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# Instalar dependências
FROM base AS install
COPY package.json pnpm-lock.yaml* bun.lockb* ./
RUN npm install

# Build da aplicação
FROM base AS build
COPY --from=install /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
# Definimos variáveis de build se necessário, mas DATABASE_URL é runtime
RUN npm run build

# Execução da aplicação
FROM base AS release
COPY --from=build /app/.output ./.output
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/package.json ./package.json

ENV NODE_ENV=production
# O Easypanel geralmente espera porta 3000 ou 8080. 
# O TanStack Start/Nitro por padrão usa 3000 se não definido.
ENV PORT=3000
EXPOSE 3000

# Comando para iniciar o servidor
# Usamos node para rodar a saída do build (Nitro/Vinxi)
CMD ["node", ".output/server/index.mjs"]
