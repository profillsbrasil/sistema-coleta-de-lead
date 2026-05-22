# Sistema Coleta de Lead

## Fonte de Verdade

- Este arquivo é a referência canônica de produto, arquitetura e convenções do projeto.
- Em caso de conflito entre documentação e código, o código-fonte vence.
- `AGENTS.md` aponta para este arquivo. Os CLAUDE.md por workspace (`apps/web`, `packages/db`, `packages/ui`) cobrem apenas convenções locais — nunca duplicam arquitetura.

## Objetivo do Produto

- Coleta rápida de leads em eventos e congressos, com operação offline-first.
- O foco principal é não perder dados quando a rede falha.
- O app não deve derivar para um CRM completo. Funis, automações complexas e fluxos de follow-up não são o centro do produto.

## Stack

- Monorepo: Turborepo + Bun workspaces
- Frontend: Next.js 16, React 19 (React Compiler ativo), Tailwind CSS 4
- UI compartilhada: `packages/ui` com primitives shadcn/ui path-based
- API: tRPC 11 em route handler Next.js
- Banco: PostgreSQL + Drizzle ORM
- Auth: Better Auth (Drizzle adapter pg + plugin admin) em `packages/auth`
- Storage (fotos de leads): Supabase Storage bucket `lead-photos` via `@supabase/supabase-js` em `apps/web/src/lib/storage/client.ts` — somente Storage, sem Supabase Auth
- Offline local: Dexie 4 + `dexie-react-hooks`
- Testes: Vitest
- Lint/format: Ultracite / Biome

## Estrutura do Monorepo

```text
apps/web        App Next.js na porta 3001
packages/api    Routers tRPC, contexto auth e regras de negócio
packages/db     Schema Drizzle, migrations e acesso ao Postgres
packages/env    Validação de env para server e client
packages/ui     Componentes e utilitários de UI compartilhados
packages/auth   Instância Better Auth (server, client React, schema Drizzle)
packages/config Base compartilhada de TypeScript
```

Namespace de workspace: `@dashboard-leads-profills/*`

## Auth

- Better Auth em `packages/auth/src/index.ts` (Drizzle adapter `pg`, plugin `admin`). `packages/auth` é a integração de auth ativa e central do runtime.
- Client React em `packages/auth/src/client.ts` — expõe `authClient`, `useSession`, `signIn`, `signUp`, `signOut` + plugin `adminClient()`.
- Schema Drizzle em `packages/auth/src/schema.ts` — tabelas `user` / `session` / `account` / `verification` com IDs `uuid defaultRandom`.
- Handler Next.js em `apps/web/src/app/api/auth/[...all]/route.ts` via `toNextJsHandler`.
- Middleware em `apps/web/src/middleware.ts` usa `getSessionCookie` (Edge-safe, sem hit DB).
- Contexto tRPC em `packages/api/src/context.ts` chama `auth.api.getSession({ headers })` e expõe `{ user, userRole, session, headers }`.
- Guard admin em `apps/web/src/app/(app)/admin/layout.tsx` via `session.user.role === "admin"`.
- Admin API usa `auth.api.listUsers/banUser/unbanUser/setRole` em `packages/api/src/routers/admin/users.ts`.
- Providers: email/senha (auto-verificado, sem confirmação por email) + Google OAuth (callback `/api/auth/callback/google`).
- Role é campo direto em `public.user.role` (default `vendedor`). Não há tabela de roles separada em uso.
- Snapshot offline em `apps/web/src/lib/auth/auth-snapshot.ts`, construído a partir de `session.user`.

## Arquitetura Offline-First

- Lead CRUD grava primeiro no IndexedDB via Dexie em `apps/web/src/lib/db/index.ts`. Schema local Dexie na versão 8.
- A fila de sincronização local fica em `syncQueue`.
- O sync engine está em `apps/web/src/lib/sync/engine.ts` e trabalha com `create`, `update` e `delete`.
- Ciclo de sync: push → upload de fotos → push (se houve fotos) → pull → refresh do leaderboard.
- Em conflitos, a regra é server-wins para dados do servidor durante o pull.
- O status de sync exposto na UI vem de `apps/web/src/components/sync-status-provider.tsx`.
- A detecção de conectividade usa eventos do browser e polling em `/api/health` por `HEAD`, em `apps/web/src/lib/sync/connectivity.ts`.

## Service Worker

- Mantém navegação autenticada utilizável offline no App Router. Não é PWA completa: sem manifest de instalação, install prompt ou background sync.
- Registro em `apps/web/src/components/service-worker-registrar.tsx`; worker em `apps/web/public/sw.js`.
- O build gera `sw-manifest.json` e `sw-build.js` via `apps/web/scripts/generate-sw-manifest.ts` (passo `postbuild`).
- O SW faz pré-cache de rotas autenticadas, assets estáticos e payloads RSC, com fallback para `/offline`.

## Áreas Funcionais

- Dashboard: `apps/web/src/app/(app)/dashboard`
- Leads: `apps/web/src/app/(app)/leads`
- Admin: `apps/web/src/app/(app)/admin`
- Sorteio WhatsApp: `apps/web/src/app/(app)/admin/sorteio` + `packages/api/src/routers/whatsapp.ts`
- Sync API: `packages/api/src/routers/sync.ts`
- Leaderboard API: `packages/api/src/routers/leaderboard.ts`
- Admin API: `packages/api/src/routers/admin/*`

## WhatsApp Bot (Sorteio Profills Fispal 2026)

Backend para captação de inscrições em sorteio via QR Code → WhatsApp. Isolado da coleta de leads dos vendedores.

- Webhook em `apps/web/src/app/api/whatsapp/webhook/route.ts` — GET (verify token) + POST (HMAC-SHA256 do raw body, dedup por `wamid`, rate limit por `wa_id`, state machine, persistência, sender).
- Lógica em `packages/api/src/whatsapp/`: `signature.ts` (verificação timing-safe), `state-machine.ts` (puro, NEW→AWAITING_CONSENT→AWAITING_NAME→AWAITING_COMPANY→COMPLETED, fork DECLINED), `sender.ts` (POST graph.facebook.com/v25.0), `messages.ts` (textos PT-BR), `code-generator.ts` (`PROFILLS-XXXX`), `rate-limit.ts` (30 msgs/60s por wa_id), `types.ts` (Zod schemas de inbound).
- Schema Postgres `whatsapp.*` (3 tabelas: `participants`, `messages`, `rate_limit`) em `packages/db/src/schema/whatsapp.ts`. RLS habilitada nas três. `participants.raffle_code` identifica a inscrição; o sistema não persiste vencedor, prêmio sorteado ou notificação de vencedor.
- Admin UI `/admin/sorteio` reusa o guard de role admin do layout existente; stats, lista paginada, busca/filtro, export CSV e ação de contato manual via WhatsApp. O sorteio é realizado fora do sistema por terceiro.
- tRPC router `whatsapp.*` (`packages/api/src/routers/whatsapp.ts`) com `adminProcedure`: `list`, `stats`, `exportCsv`.
- Envs em `apps/web/.env`: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_API_VERSION` (default `v25.0`), `TERMS_VERSION`, e os `NEXT_PUBLIC_EVENT_NAME` / `_EVENT_WHATSAPP_NUMBER` / `_RAFFLE_DATE` / `_WHATSAPP_WELCOME_IMAGE_URL` opcionais.
- LGPD: opt-in obrigatório por botão `Aceito`/`Nao aceito`; quem recusa fica em state `DECLINED` com apenas `wa_id + declined_at + terms_version` (sem nome/empresa); sem comando SAIR no bot — eliminação por canal humano.

## Banco e Dados

- Schema Drizzle em `packages/db/src/schema`. Tabela ativa: `leads` (+ `signup_invite_rate_limit`).
- Tabelas Better Auth (`user`, `session`, `account`, `verification`) ficam em `packages/auth/src/schema.ts`.
- Toda tabela `public.*` tem RLS habilitada (migration `0004_enable_rls_drop_legacy`). O app conecta como role owner e tem bypass implícito; PostgREST/anon é default-deny. Ao adicionar tabela nova, habilitar RLS na mesma migration.
- O leaderboard usa SQL direto e faz JOIN de `leads` com `public."user"` (tabela Better Auth) para obter o nome do vendedor. Não consulta `auth.users`.
- `drizzle.config.ts` carrega env de `../../apps/web/.env`; comandos `db:*` rodam a partir da raiz do repo.

## Variáveis de Ambiente

Arquivo esperado no desenvolvimento: `apps/web/.env`. Validações em `packages/env/src/server.ts` e `packages/env/src/web.ts`.

Server: `DATABASE_URL`, `BETTER_AUTH_SECRET` (min 32 chars), `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NODE_ENV`, `SIGNUP_INVITE_CODE` (opcional). WhatsApp Bot: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_API_VERSION` (default `v25.0`), `TERMS_VERSION` (default `v1`), `SUPABASE_SERVICE_ROLE_KEY` (opcional, só se upload de mídia via API).

Client: `NEXT_PUBLIC_BETTER_AUTH_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_EVENT_END` (opcional), `NEXT_PUBLIC_EVENT_NAME` (opcional), `NEXT_PUBLIC_EVENT_WHATSAPP_NUMBER` (opcional, E.164 sem `+`), `NEXT_PUBLIC_RAFFLE_DATE` (opcional), `NEXT_PUBLIC_WHATSAPP_WELCOME_IMAGE_URL` (opcional, URL HTTPS do bucket público).

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

## Convenções de Código

- Imports path-based para `packages/ui`: `@dashboard-leads-profills/ui/components/button`.
- Evite barrel files novos para UI ou módulos internos.
- `cn()` vem de `@dashboard-leads-profills/ui/lib/utils`.
- Mantenha `type: "module"` e TypeScript estrito.
- Não introduza `any` sem justificativa; prefira `unknown`.
- Não deixe `console.log` em produção.
- Dexie é browser-only; respeite fronteiras de runtime em código sensível a SSR.

## Guardrails para Agentes

- Verifique o código antes de descrever arquitetura.
- Use as superfícies de auth Better Auth (`packages/auth`); o app não usa Supabase Auth.
- O health check de conectividade é `/api/health`, não `/api/trpc/healthCheck`.
- O service worker não é PWA completa.
- Ao tocar offline/sync, preserve a prioridade do dado local e o comportamento resiliente sem rede.
- Dívida técnica conhecida está catalogada em `docs/tech-debt.md` — consulte antes de propor mudanças amplas.
