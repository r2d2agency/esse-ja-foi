# Use Nginx para servir o frontend estático
FROM node:22-slim AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml* bun.lockb* ./
RUN npm install
COPY . .
# Define a URL da API para o build do Vite
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:stable-alpine AS release
# Copia o build do Vite para o diretório do Nginx
# No TanStack Start com preset node-server, o build estático fica em .output/public
COPY --from=build /app/.output/public /usr/share/nginx/html
# Configuração para fallback de SPA (redireciona tudo para index.html)
RUN echo 'server { \
    listen 80; \
    listen 3000; \
    server_name localhost; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
