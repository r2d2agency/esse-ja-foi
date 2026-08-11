# Use Node para rodar o TanStack Start no Easypanel
FROM node:22-slim AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml* bun.lockb* ./
RUN npm install
COPY . .
# Define a URL da API para o build
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
# Garante o build como servidor Node (e nao Cloudflare Worker)
ENV NITRO_PRESET=node-server
ENV SERVER_PRESET=node-server
RUN npm run build
# Falha o build cedo caso o servidor Node nao tenha sido gerado
RUN test -f .output/server/index.mjs

FROM node:22-slim AS release
WORKDIR /app
# Copia o build do Nitro (.output contém server e public)
COPY --from=build /app/.output ./.output

# Variaveis de ambiente para o Nitro/Node server
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Porta que o Easypanel deve mapear
EXPOSE 3000

# Healthcheck usando node para verificar se o servidor responde
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/healthz').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Comando para iniciar o servidor Node gerado pelo Nitro
CMD ["node", ".output/server/index.mjs"]
