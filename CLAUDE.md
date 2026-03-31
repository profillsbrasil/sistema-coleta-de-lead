# Dashboard Leads Profills

## Stack

- **Monorepo**: Turborepo 2.8, Bun 1.3
- **Frontend**: Next.js 16.2 (React 19, React Compiler), TailwindCSS 4, shadcn/ui
- **API**: tRPC 11 (RPC type-safe)
- **ORM**: Drizzle ORM 0.45, PostgreSQL (Supabase)
- **Auth**: Supabase Auth via `@supabase/ssr` (cookie-based sessions, OAuth Google/Facebook/LinkedIn)
- **Offline**: Dexie 4 (IndexedDB) como storage primario, sync push-then-pull server-wins
- **Linting**: Biome 2.4 (Ultracite preset)
- **Testes**: Vitest 3.2
- **TypeScript**: 5 strict

## Arquitetura

```
apps/web               Next.js (porta 3001) — consome api, auth, ui, env
packages/api           tRPC routers — consome auth, db, env
packages/auth          Supabase Auth clients (server + browser) — consome env
packages/db            Drizzle ORM + schema — consome env
packages/env           T3 Env validation (server + web exports)
packages/ui            shadcn/ui components, hooks, styles
packages/config        tsconfig.base.json compartilhado
```

Namespace: `@dashboard-leads-profills/*` (workspace refs via `workspace:*`, versoes via `catalog:`)

## Comandos

```bash
bun run dev            # turbo dev (todos os apps)
bun run dev:web        # turbo -F web dev (apenas web, porta 3001)
bun run build          # turbo build
bun run check-types    # turbo check-types
bun run check          # biome check --write .
bun run test           # turbo test (vitest)
bun run db:push        # drizzle push schema
bun run db:generate    # drizzle generate migrations
bun run db:migrate     # drizzle migrate
bun run db:studio      # drizzle studio (UI)
```

## Convencoes

- Indentacao: tabs (Biome)
- Quotes: double quotes (Biome)
- Imports: organizados automaticamente (Biome), absolute `@/` para app root
- CSS classes: `cn()` de `@dashboard-leads-profills/ui/lib/utils` — nunca string concat
- Commits: Conventional Commits em Portugues (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`)
- Modules: `type: "module"` em todos os packages
- UI imports: path-based, nao barrel. Ex: `@dashboard-leads-profills/ui/components/button`
- No `any` — usar `unknown`. No `console.log` em producao.

## UI Components

- Verificar `packages/ui/src/components/` antes de criar componentes
- Compound patterns (CardHeader, CardContent, etc.)
- Recharts wrappado com `ChartContainer`/`ChartTooltip` do shadcn

## Offline-First Architecture

**Core Value:** Vendedores coletam leads offline em congressos. Dados NUNCA podem ser perdidos.

**Como funciona:**
- Lead CRUD → salva direto no Dexie (IndexedDB), zero dependencia de rede
- Sync engine (`apps/web/src/lib/sync/engine.ts`) → push-then-pull quando online, server-wins
- `SyncStatusProvider` (`apps/web/src/components/sync-status-provider.tsx`) → React Context com 5 campos (isOnline, isSyncing, pendingCount, lastSync, lastError)
- ConnectivityDetector → polling `/api/trpc/healthCheck` a cada 30s + browser online/offline events

**Limitacao critica do Next.js App Router:**
- Navegacao client-side entre rotas busca RSC payload do servidor
- Sem internet, o fetch falha e a pagina quebra ("Failed to fetch RSC payload")
- **Solucao:** Service Worker apenas para cache de app shell e RSC payloads (SEM PWA, SEM manifest, SEM install prompt)
- O SW deve ser minimo: pre-cache de rotas autenticadas + cache-first para assets estaticos

**NAO e PWA. O app e web-only. Service Worker e usado exclusivamente como camada de cache.**

## Env Vars

Arquivo: `apps/web/.env` (nao versionado)

| Variavel                        | Escopo          | Descricao                                           |
| ------------------------------- | --------------- | --------------------------------------------------- |
| `DATABASE_URL`                  | server          | Connection string PostgreSQL (Supabase)             |
| `NEXT_PUBLIC_SUPABASE_URL`      | server + client | URL do projeto Supabase                             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | server + client | Anon key publica do Supabase                        |
| `SUPABASE_SERVICE_ROLE_KEY`     | server          | Service role key (admin ops, nunca expor ao client) |

Validacao: T3 Env + Zod em `packages/env/src/server.ts` e `packages/env/src/web.ts`.

## Common Hurdles

- **Drizzle .env path**: `drizzle.config.ts` carrega env de `../../apps/web/.env`. Rodar `db:*` sempre do root.
- **tRPC context**: Acoplado a `NextRequest`. Testes de routers precisam mockar o context.
- **UI imports**: path-based, nao barrel. Ex: `@dashboard-leads-profills/ui/components/button`
- **T3 Env no CI**: Build precisa de env vars validas (mesmo placeholder).
- **Auth users**: `auth.users` (Supabase, invisivel no Drizzle). Roles em `public.user_roles`.
- **Hydration + localStorage**: Nunca ler localStorage em useState initializer — causa hydration mismatch. Ler no useEffect.

## Testes

- Vitest 3.2 com workspace. Config por pacote.
- Rodar: `bun run test` (via Turborepo)

## CI

GitHub Actions em `.github/workflows/ci.yml`: Biome check → Type check → Test → Build

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->
