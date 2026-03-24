# Dashboard Leads Profills

## Stack

- **Monorepo**: Turborepo 2.8, Bun 1.3
- **Frontend**: Next.js 16.2 (React 19, React Compiler), TailwindCSS 4, shadcn/ui
- **API**: tRPC 11 (RPC type-safe)
- **ORM**: Drizzle ORM 0.45, PostgreSQL (Supabase)
- **Auth**: Better-Auth 1.5 (email/password, session-based)
- **Linting**: Biome 2.2
- **Testes**: Vitest 3.2
- **TypeScript**: 5 strict

## Arquitetura

```
apps/web               Next.js (porta 3001) — consome api, auth, ui, env
packages/api           tRPC routers — consome auth, db, env
packages/auth          Better-Auth config — consome db, env
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
- Imports: organizados automaticamente (Biome)
- CSS classes: sorted via utilitarios `cn`, `clsx`, `cva`
- Commits: Conventional Commits em Portugues (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`)
- Modules: `type: "module"` em todos os packages

## Env Vars

Arquivo: `apps/web/.env` (nao versionado)

| Variavel | Validacao | Descricao |
|----------|-----------|-----------|
| `DATABASE_URL` | `z.string().min(1)` | Connection string PostgreSQL (Supabase) |
| `BETTER_AUTH_SECRET` | `z.string().min(32)` | Secret para sessoes Better-Auth |
| `BETTER_AUTH_URL` | `z.url()` | URL base da app |
| `CORS_ORIGIN` | `z.url()` | Origem CORS permitida |
| `NODE_ENV` | `z.enum(["development","production","test"])` | Ambiente (default: development) |

Validacao em `packages/env/src/server.ts` via T3 Env + Zod. Roda no import time.

## Common Hurdles

- **Drizzle .env path**: `drizzle.config.ts` carrega env de `../../apps/web/.env`. Rodar `db:*` commands sempre do root.
- **typedRoutes**: `next.config.ts` tem `typedRoutes: true`. Imports de routes devem usar o tipo gerado.
- **tRPC context**: Acoplado a `NextRequest` (adapter fetch). Testes de routers precisam mockar o context.
- **UI imports**: `packages/ui` usa exports path-based, nao barrel. Importar como `@dashboard-leads-profills/ui/components/button`.
- **T3 Env no CI**: Build precisa de env vars validas (mesmo placeholder) para passar validacao Zod.

## Testes

- Framework: Vitest 3.2 com workspace (`vitest.workspace.ts`)
- Pacotes testaveis: `packages/api`, `packages/env`
- Config por pacote: `vitest.config.ts` em cada pacote
- Rodar: `bun run test` (via Turborepo)

## CI

GitHub Actions em `.github/workflows/ci.yml`:
1. Biome check (sem --write)
2. Type check
3. Test (Vitest)
4. Build (com env vars placeholder)

## Entrypoints XP

| Command | Uso |
|---------|-----|
| `/xp` | Fluxo estruturado (feature, bug, refactor, cleanup, docs) |
| `/fix` | Bug pequeno/medio com TDD |
| `/debug` | Investigar causa raiz |
| `/tdd` | Executar fatia via Red-Green-Refactor |
| `/ci` | Gerar evidencia tecnica |
| `/verify` | Gerar evidencia visual/E2E |
| `/gh-pr` | Criar PR via gh CLI |
