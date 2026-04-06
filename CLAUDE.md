# Sistema Coleta de Lead

## Fonte de Verdade

- Este arquivo e a referencia canonica para contexto de produto, arquitetura e convencoes do projeto.
- Em caso de conflito entre documentacao de agente e codigo, o codigo-fonte vence.
- `AGENTS.md` e `.claude/CLAUDE.md` devem permanecer alinhados a este arquivo, sem manter uma segunda versao da arquitetura.

## Objetivo do Produto

- O sistema existe para coleta rapida de leads em eventos e congressos, com operacao offline-first.
- O foco principal e nao perder dados quando a rede falha.
- O app nao deve derivar para um CRM completo. Funis, automacoes complexas e fluxos de follow-up nao sao o centro do produto atual.

## Stack Atual

- Monorepo: Turborepo + Bun workspaces
- Frontend: Next.js 16, React 19, React Compiler, Tailwind CSS 4
- UI compartilhada: `packages/ui` com primitives shadcn/ui path-based
- API: tRPC 11 em route handler Next.js
- Banco: PostgreSQL + Drizzle ORM
- Auth: Supabase Auth via `@supabase/ssr` e `@supabase/supabase-js`
- Offline local: Dexie 4 + `dexie-react-hooks`
- Testes: Vitest
- Lint/format: Ultracite / Biome

## Estrutura Real do Monorepo

```text
apps/web        App Next.js na porta 3001
packages/api    Routers tRPC, contexto auth e regras de negocio
packages/db     Schema Drizzle, migrations e acesso ao Postgres
packages/env    Validacao de env para server e client
packages/ui     Componentes e utilitarios de UI compartilhados
packages/auth   Pacote legado/utilitario de auth; nao e a superficie ativa do app/API hoje
packages/config Base compartilhada de TypeScript
```

Namespace de workspace: `@dashboard-leads-profills/*`

## Auth Real

- O app web usa clientes Supabase em `apps/web/src/lib/supabase/client.ts`, `apps/web/src/lib/supabase/server.ts` e `apps/web/src/lib/supabase/proxy.ts`.
- O middleware de sessao fica em `apps/web/src/middleware.ts` e redireciona rotas privadas para `/login`.
- O callback OAuth fica em `apps/web/src/app/auth/callback/route.ts`.
- O login atual usa Google, LinkedIn e Facebook via Supabase OAuth em `apps/web/src/components/login-card.tsx`.
- O contexto tRPC cria um cliente Supabase diretamente em `packages/api/src/context.ts` e extrai claims para `user` e `userRole`.
- Operacoes administrativas no backend usam `packages/api/src/lib/supabase-admin.ts`.
- Existe um pacote `packages/auth`, mas ele nao e consumido pelo app nem pela API no estado atual. Nao trate esse pacote como ponto central sem uma refatoracao explicita.

## Arquitetura Offline-First

- Lead CRUD salva primeiro no IndexedDB via Dexie em `apps/web/src/lib/db/index.ts`.
- O schema local Dexie esta na versao 5.
- A fila de sincronizacao local fica em `syncQueue`.
- O sync engine esta em `apps/web/src/lib/sync/engine.ts` e trabalha com `create`, `update` e `delete`.
- A estrategia atual e push, upload de fotos, pull e refresh do leaderboard.
- Em conflitos, a regra pratica e server-wins para dados do servidor durante o pull.
- O status de sync exposto na UI vem de `apps/web/src/components/sync-status-provider.tsx`.
- A deteccao de conectividade usa eventos do browser e polling em `/api/health` por `HEAD`, implementado em `apps/web/src/lib/sync/connectivity.ts`.

## Service Worker

- O service worker existe para manter navegacao autenticada utilizavel offline no App Router.
- Nao trate o app como PWA completa.
- Nao existe manifest de instalacao, install prompt ou background sync.
- O registro do SW fica em `apps/web/src/components/service-worker-registrar.tsx`.
- O worker esta em `apps/web/public/sw.js`.
- O build gera `sw-manifest.json` e `sw-build.js` via `apps/web/scripts/generate-sw-manifest.ts`.
- O SW faz pre-cache de rotas autenticadas, assets estaticos e payloads RSC, com fallback para `/offline`.

## Areas Funcionais Relevantes

- Dashboard: `apps/web/src/app/(app)/dashboard`
- Leads: `apps/web/src/app/(app)/leads`
- Admin: `apps/web/src/app/(app)/admin`
- Sync API: `packages/api/src/routers/sync.ts`
- Leaderboard API: `packages/api/src/routers/leaderboard.ts`
- Admin API: `packages/api/src/routers/admin/*`

## Banco e Dados

- Schema Drizzle em `packages/db/src/schema`
- Tabelas centrais atuais:
  - `leads`
  - `user_roles`
- O ranking usa SQL direto e consulta `auth.users` para nome do vendedor.
- `drizzle.config.ts` carrega env de `../../apps/web/.env`; comandos `db:*` devem ser executados a partir da raiz do repo.

## Variaveis de Ambiente Reais

Arquivo esperado no desenvolvimento: `apps/web/.env`

Server:
- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NODE_ENV`

Client:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

As validacoes ficam em `packages/env/src/server.ts` e `packages/env/src/web.ts`.

## Comandos do Workspace

```bash
bun run dev          # turbo dev
bun run dev:web      # next dev --port 3001 apenas para o app web
bun run build        # turbo build
bun run check-types  # turbo check-types
bun run test         # turbo test
bun run check        # ultracite check
bun run fix          # ultracite fix
bun run db:push      # drizzle-kit push no pacote db
bun run db:generate  # drizzle-kit generate no pacote db
bun run db:migrate   # drizzle-kit migrate no pacote db
bun run db:studio    # drizzle-kit studio no pacote db
```

## Convencoes de Codigo

- Use imports path-based para `packages/ui`. Exemplo: `@dashboard-leads-profills/ui/components/button`
- Evite barrel files novos para UI ou modulos internos.
- `cn()` vem de `@dashboard-leads-profills/ui/lib/utils`.
- Mantenha `type: "module"` e TypeScript estrito.
- Nao introduza `any` sem justificativa; prefira `unknown`.
- Nao deixe `console.log` em producao.
- Para componentes/client code sensiveis a SSR, respeite fronteiras de runtime. Dexie e browser-only.

## Guardrails para Agentes

- Antes de descrever arquitetura, verifique o codigo correspondente.
- Use sempre as superficies de auth baseadas em Supabase descritas neste repo.
- Nao afirme que o health check de conectividade e `/api/trpc/healthCheck`. O endpoint usado pelo app e `/api/health`.
- Nao tratar o service worker como PWA completa.
- Nao mover o app para usar `packages/auth` por padrao. Isso seria refatoracao, nao manutencao rotineira.
- Quando tocar offline/sync, preserve a prioridade do dado local e o comportamento resiliente sem rede.

## Hurdles Conhecidos

- `packages/auth` ainda existe no monorepo, mas nao e a integracao principal do runtime atual.
- O Dexie local ainda carrega migracoes de legado, incluindo limpeza do antigo `followUpStatus`.
- O leaderboard depende de `auth.users` no Supabase para obter nomes.
- O middleware ignora `/api/*`; autenticação de API e tratada dentro do contexto tRPC ou nos handlers.
- Builds e testes que exigem env devem usar as mesmas variaveis reais do projeto.
