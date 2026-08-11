# Dockerfile para TanStack Start + Node.js (Vite 6/7 compatibility)
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# Instalar dependências
FROM base AS install
COPY package.json pnpm-lock.yaml* bun.lockb* ./
# Instalamos TUDO, incluindo devDependencies para o build, mas omitimos scripts de ciclo de vida desnecessários
RUN npm install --include=dev

# Build da aplicação
FROM base AS build
COPY --from=install /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
# O TanStack Start gera a pasta .output que contém TUDO que o servidor precisa
RUN npm run build

# Execução da aplicação
FROM base AS release
# O Nitro/Vinxi (TanStack Start) empacota as dependências necessárias no .output/server/node_modules
# se configurado, mas por segurança copiamos o que é essencial.
COPY --from=build /app/.output ./.output
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/package.json ./package.json

ENV NODE_ENV=production
ENV PORT=3000
# Importante: HOST 0.0.0.0 para aceitar conexões externas ao container
ENV HOST=0.0.0.0
EXPOSE 3000

# Comando para iniciar o servidor
CMD ["node", ".output/server/index.mjs"]
