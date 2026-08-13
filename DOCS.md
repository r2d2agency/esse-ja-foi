# Documentação Técnica: ESSE JÁ FOI

## 1. Visão Geral
Plataforma robusta para gestão completa do ciclo de vida de veículos usados: captação (leads), cadastro de clientes/veículos, vistoria técnica mobile-first, motor de depreciação inteligente e gestão de leilões.

**Status:** Beta Operacional
**Ano:** 2026

---

## 2. Arquitetura e Stack
- **Framework:** TanStack Start v1 (React 19 + SSR)
- **Banco de Dados:** PostgreSQL (Drizzle ORM)
- **Estilização:** Tailwind CSS v4 + shadcn/ui
- **Auth:** Custom Auth (PBKDF2) com controle de acesso por papéis (RBAC)
- **Deployment:** Easypanel (Docker multi-stage)
- **Localização:** PT-BR, BRL (Moeda), America/Sao_Paulo (Timezone)

---

## 3. Estrutura de Pastas e Módulos

### 🛠️ Core (`/src/db`, `/src/lib`)
- **`auth.server.ts`**: Lógica de autenticação e proteção de rotas.
- **`depreciacao.server.ts`**: O "coração" financeiro. Calcula o valor de compra baseado em FIPE, KM e avarias.
- **`laudos.server.ts`**: Gestão de checklists dinâmicos e laudos técnicos.
- **`brasil.ts`**: Utilitários de formatação (CPF, CNPJ, BRL, CEP).

### 🖥️ Backoffice (`/src/routes/admin`, `/src/routes/operacao`)
- **Gestão de Leads**: Captura da landing page e fluxo de conversão.
- **Cadastro de Clientes**: Fluxo em passos com validação rigorosa de documentos.
- **Cadastro de Veículos**: Geolocalização (Leaflet) e histórico de estados.
- **Agenda**: Controle semanal de vistorias com validação de conflitos.
- **Admin Depreciação**: Painel para calibrar as regras de desconto e simulador em tempo real.

### 📱 App Vistoriador (`/src/routes/vistoria`)
Interface mobile-first otimizada para campo:
- **Fluxo Guiado**: Checklist de itens obrigatórios com fotos de avarias.
- **Roteiro de Fotos**: Guia visual para fotos padrão do veículo.
- **Compressão de Imagem**: Redução de tamanho no cliente para upload rápido.
- **Sincronização**: Salvamento incremental com suporte a estados offline.

---

## 4. Motor de Depreciação (Destaque)
O sistema aplica uma matriz de cálculo proprietária:
1. **Base**: Valor FIPE atualizado.
2. **Ajuste KM**: Bonus/Penalidade baseado na média de mercado.
3. **Checklist**: Descontos ponderados (Leve 0.6x, Médio 1.0x, Grave 1.8x).
4. **Acessórios**: Valorização percentual por item extra.
5. **Margem**: Aplicação de margem de segurança operacional (Padrão 8%).
6. **Gap**: Indicador visual (Verde/Vermelho) comparando o interesse do cliente vs. teto do sistema.

---

## 5. Próximos Passos (Backlog)
- [ ] Implementar módulo de Lances/Leilão para o Perfil Comprador.
- [ ] Gerador de PDF para o Laudo Técnico Final.
- [ ] Integração com API FIPE oficial para atualização automática.
- [ ] Dashboard de BI (Metas vs Realizado).

---

## 6. Comandos Úteis
- `npm run dev`: Iniciar ambiente de desenvolvimento.
- `npm run build`: Gerar build de produção otimizado.
- `docker build -t essejafoi .`: Gerar imagem para Easypanel.
