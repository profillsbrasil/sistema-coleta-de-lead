# Dashboard Leads Profills

## Stack

- **Monorepo**: Turborepo 2.8, Bun 1.3
- **Frontend**: Next.js 16.2 (React 19, React Compiler), TailwindCSS 4, shadcn/ui
- **API**: tRPC 11 (RPC type-safe)
- **ORM**: Drizzle ORM 0.45, PostgreSQL (Supabase)
- **Auth**: Supabase Auth via `@supabase/ssr` (email/password, cookie-based sessions)
- **Linting**: Biome 2.2
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
- Imports: organizados automaticamente (Biome)
- CSS classes: sorted via utilitarios `cn`, `clsx`, `cva`
- Commits: Conventional Commits em Portugues (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`)
- Modules: `type: "module"` em todos os packages

## UI Components

- Antes de criar qualquer componente UI, verificar `packages/ui/src/components/` para componentes shadcn existentes
- Usar compound patterns (CardHeader, CardContent, CardTitle, etc.) em vez de Card raw com padding manual
- Usar `cn()` de `@dashboard-leads-profills/ui/lib/utils` para toda composicao de className -- nunca string concat
- Usar Empty/EmptyDescription para estados vazios em vez de `<p>` raw
- Consultar shadcn MCP skill para exemplos de uso quando disponivel
- Recharts e importado direto (`Bar`, `BarChart`, etc.) mas wrappado com `ChartContainer`/`ChartTooltip` do shadcn

## Env Vars

Arquivo: `apps/web/.env` (nao versionado)

| Variavel                        | Validacao                                     | Escopo          | Descricao                                           |
| ------------------------------- | --------------------------------------------- | --------------- | --------------------------------------------------- |
| `DATABASE_URL`                  | `z.string().min(1)`                           | server          | Connection string PostgreSQL (Supabase)             |
| `NEXT_PUBLIC_SUPABASE_URL`      | `z.string().url()`                            | server + client | URL do projeto Supabase                             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `z.string().min(1)`                           | server + client | Anon key publica do Supabase                        |
| `SUPABASE_SERVICE_ROLE_KEY`     | `z.string().min(1)`                           | server          | Service role key (admin ops, nunca expor ao client) |
| `NODE_ENV`                      | `z.enum(["development","production","test"])` | server          | Ambiente (default: development)                     |

Validacao server em `packages/env/src/server.ts`, client em `packages/env/src/web.ts`. T3 Env + Zod, roda no import time.

## Common Hurdles

- **Drizzle .env path**: `drizzle.config.ts` carrega env de `../../apps/web/.env`. Rodar `db:*` commands sempre do root.
- **typedRoutes**: `next.config.ts` tem `typedRoutes: true`. Imports de routes devem usar o tipo gerado.
- **tRPC context**: Acoplado a `NextRequest` (adapter fetch). Testes de routers precisam mockar o context.
- **UI imports**: `packages/ui` usa exports path-based, nao barrel. Importar como `@dashboard-leads-profills/ui/components/button`.
- **T3 Env no CI**: Build precisa de env vars validas (mesmo placeholder) para passar validacao Zod.
- **Auth users**: Usuarios ficam em `auth.users` (schema Supabase, invisivel no Drizzle). Roles ficam em `public.user_roles`. Para tornar admin: `INSERT INTO user_roles (user_id, role) VALUES ('uuid', 'admin')` via SQL Editor do Supabase.
- **Admin role check**: tRPC context extrai `user_role` de Supabase claims (`supabase.auth.getClaims()`). Roles precisam estar propagados como custom claims no Supabase para funcionar.

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

| Command   | Uso                                                       |
| --------- | --------------------------------------------------------- |
| `/xp`     | Fluxo estruturado (feature, bug, refactor, cleanup, docs) |
| `/fix`    | Bug pequeno/medio com TDD                                 |
| `/debug`  | Investigar causa raiz                                     |
| `/tdd`    | Executar fatia via Red-Green-Refactor                     |
| `/ci`     | Gerar evidencia tecnica                                   |
| `/verify` | Gerar evidencia visual/E2E                                |
| `/gh-pr`  | Criar PR via gh CLI                                       |

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Dashboard Leads Profills**

Sistema de coleta de leads para vendedores utilizarem durante congressos e conferencias. Permite coleta rapida de contatos (formulario, scan QR WhatsApp, foto), gerenciamento dos proprios leads, e um dashboard com leaderboard comparativo e estatisticas individuais. Funciona offline-first via Dexie com sync para Supabase quando houver conexao.

**Core Value:** Vendedores conseguem coletar leads de forma rapida e confiavel mesmo sem internet, com sync automatico quando a conexao voltar.

### Constraints

- **Offline-first:** Dexie como storage primario no client, Supabase como source of truth no server. Sync bidirecional com conflict resolution (server wins)
- **Stack:** Usar stack existente (Next.js 16, tRPC, Drizzle, Supabase Auth, shadcn/ui). Dexie para offline
- **Performance:** Coleta de lead deve ser < 3 toques ate salvar (formulario rapido)
- **Compatibilidade:** Funcionar em Chrome e Safari mobile (cameras para QR e foto)
- **Evento unico:** Sem necessidade de multi-tenancy ou separacao por evento
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages

- TypeScript 5 (strict) - Used across all packages and applications
- JavaScript - React components, Next.js configuration, client code
- SQL - PostgreSQL queries via Drizzle ORM

## Runtime

- Node.js 22.13.14 (pinned via `@types/node` dependency)
- Bun 1.3.11 - Package manager and runtime
- Bun 1.3.11 (configured in `package.json` `packageManager` field)
- Lockfile: `bun.lock` (present)

## Frameworks

- Next.js 16.2 - React framework with App Router, typed routes, and React Compiler enabled
- React 19.2.3 - UI library with functional components
- TailwindCSS 4.1.18 - Utility-first CSS framework
- tRPC 11.13.4 - Type-safe RPC framework
- Drizzle ORM 0.45.1 - SQL ORM for PostgreSQL
- Supabase Auth via `@supabase/ssr` 0.9 + `@supabase/supabase-js` 2.100 - Cookie-based authentication
- TanStack React Query 5.90.12 - Server state management with React hooks
- TanStack React Form 1.28.0 - Form state management
- shadcn/ui - Accessible component library
- Base UI React 1.3.0 - Headless UI component primitives
- Lucide React 1.6.0 - Icon library
- Sonner 2.0.7 - Toast notifications
- class-variance-authority 0.7.1 - Type-safe CSS class utilities
- tailwind-merge 3.5.0 - TailwindCSS utility merge
- tw-animate-css 1.4.0 - Animation utilities
- next-themes 0.4.6 - Theme provider for Next.js
- Dexie 4.3.0 - Client-side IndexedDB wrapper (installed but minimal usage in codebase)
- dexie-react-hooks 4.2.0 - React hooks for Dexie

## Testing

- Vitest 3.2.1 - Unit test runner with workspace support
- `@vitest/coverage-v8` 3.2.1 - Code coverage via V8
- Config files: `vitest.workspace.ts` (root), `vitest.config.ts` (per package)
- Testable packages: `packages/api`, `packages/env`
- Vitest built-in assertions

## Build & Dev Tools

- Turborepo 2.8.12 - Build orchestration and caching
- Biome 2.4.7 - Unified linter and formatter
- Ultracite 7.3.2 - Zero-config preset for Biome
- Drizzle Kit 0.31.8 - Schema generation and migration management
- TypeScript 5 - Strict type checking across packages
- Babel Plugin React Compiler 1.0.0 - Automatic memoization (Next.js 16 feature)

## Key Dependencies

- `zod` 4.1.13 - Schema validation for environment, input, and API contracts
- `dotenv` 17.2.2 - Environment variable loading from `.env` files
- `pg` 8.17.1 - Native PostgreSQL driver for Drizzle
- `@t3-oss/env-core` 0.13.1 - T3 environment validation (server-side)
- `@t3-oss/env-nextjs` 0.13.1 - T3 environment validation (Next.js)
- `@types/pg` 8.16.0 - TypeScript types for PostgreSQL driver
- `@types/node` 22.13.14 - Node.js type definitions
- `@types/react` 19.2.10 - React type definitions
- `@types/react-dom` 19.2.3 - React DOM type definitions
- `typescript` 5.9.3+ - TypeScript compiler

## Configuration

- File location: `apps/web/.env` (not versioned, contains secrets)
- Validation: T3 Env with Zod (schema-based)
- Validation run time: Import-time (enforced on app start)
- `DATABASE_URL` - PostgreSQL connection string (Supabase)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (`z.string().url()`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key (`z.string().min(1)`)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key for admin ops (`z.string().min(1)`)
- `NODE_ENV` - Optional, defaults to "development"
- Location: `packages/env/src/server.ts` (server exports)
- Location: `packages/env/src/web.ts` (client exports)
- Pattern: T3 Env + Zod with runtime validation
- Next.js: `apps/web/next.config.ts`
- TypeScript: `packages/config/tsconfig.base.json` (shared)
- Turbo: `turbo.json` (task dependencies, caching rules)
- Drizzle: `packages/db/drizzle.config.ts`
- Biome: `biome.json` (linting + formatting)

## Package Structure

- Workspace refs: `workspace:*` (internal packages)
- Catalog refs: `catalog:` (pinned versions in root `package.json` catalog)

## Platform Requirements

- Bun 1.3.11
- Node.js 22+ (inferred from `@types/node`)
- PostgreSQL database (Supabase or compatible)
- Deployment target: Vercel (Next.js optimized) or Node.js 22+ environment
- Environment variables required (see Configuration)
- Database connection to PostgreSQL
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns

- Components: PascalCase (e.g., `header.tsx`, `sign-in-form.tsx`) in `components/` directory
- Pages: kebab-case in App Router structure (e.g., `todos/page.tsx`, `dashboard/page.tsx`)
- Utilities: camelCase (e.g., `utils.ts`, `auth-client.ts`)
- Routers/API: kebab-case or lowercase (e.g., `todo.ts`, `routers/`, `context.ts`)
- Test files: `*.test.ts` suffix (e.g., `healthcheck.test.ts`)
- PascalCase for React components (e.g., `Header`, `SignInForm`, `TodosPage`)
- camelCase for regular functions (e.g., `createContext`, `handleAddTodo`, `handleToggleTodo`)
- camelCase for tRPC procedures (e.g., `getAll`, `create`, `toggle`, `delete`)
- Event handlers: `handle*` prefix (e.g., `handleAddTodo`, `handleToggleTodo`, `handleDeleteTodo`)
- camelCase for all variable declarations (e.g., `newTodoText`, `todos`, `createMutation`)
- UPPER_SNAKE_CASE for constants exported from modules (observed in route arrays: `const links = [...]`)
- `const` by default; `let` only when reassignment needed
- PascalCase for type definitions and interfaces (imported from Zod schemas, React types)
- Type assertions use `as const` for literal types (observed in `{ to: "/", label: "Home" } as const`)
- Explicit type imports: `import type { ... }` for type-only imports

## Code Style

- Indentation: tabs (configured in Biome)
- Quote style: double quotes (configured in Biome)
- Max line length: no explicit limit observed, but lines kept reasonable
- Trailing commas: included in multiline structures
- Framework: Biome 2.4.7 with Ultracite preset
- Extends: `ultracite/biome/core`, `ultracite/biome/next`
- Key rules enforced:

## Import Organization

- `@/` → app root in `apps/web/src/` (configured via Next.js tsconfig)
- `@dashboard-leads-profills/*` → workspace package imports (e.g., `@dashboard-leads-profills/ui/components/button`)
- Absolute imports preferred over relative `../../../` patterns
- No barrel files (index.ts re-exports) in hot paths; import directly from source

## Error Handling

- tRPC: Use `TRPCError` with specific error codes and descriptive messages
- Supabase Auth: Errors handled via error response checks in form submissions
- Database: No explicit error handling visible in CRUD operations; relies on ORM/framework
- Input validation: Zod schemas with descriptive error messages
- No silent failures; errors propagated to UI via toast notifications or form validation display

## Logging

- No debug statements in production code (enforced by `hookify.debug-statements`)
- No `console.log` in committed code
- Errors displayed to users via toast notifications (`toast.error()`, `toast.success()`)

## Comments

- Self-documenting code preferred (clear function/variable names)
- No JSDoc observed in codebase
- No inline comments observed; code structure speaks for itself

## Function Design

- Example: `handleAddTodo` (5 lines), `handleToggleTodo` (2 lines), `handleDeleteTodo` (2 lines)
- Destructured parameters when multiple values needed
- Explicit type annotations for clarity
- Default parameters positioned after required parameters
- Implicit returns in arrow functions when single expression
- Explicit `return` statements in multiline blocks
- Async functions always return Promises or void

## Module Design

- Named exports for specific symbols (e.g., `export const router`, `export const publicProcedure`)
- Default exports for React components
- Type exports use `export type` syntax
- Example: `export type AppRouter = typeof appRouter;`
- NOT used in the codebase; components imported directly from source
- Example: `import { Button } from "@dashboard-leads-profills/ui/components/button"` (not from `@dashboard-leads-profills/ui`)

## React & JSX

- Function components only (no class components)
- PascalCase names
- Props typed explicitly with TypeScript interfaces or inline types
- Example: `export default function Header() { ... }`
- Imported from libraries (`@tanstack/react-form`, `@tanstack/react-query`, `next/navigation`)
- Called at top level only; never conditional
- Example: `const router = useRouter();` before any conditionals
- Children passed between tags, not as props
- Props destructured in function signature
- Example from `Providers`:
- Labels associated with inputs via `htmlFor` attribute
- Example: `<Label htmlFor={field.name}>Email</Label>`
- ARIA labels for icon-only buttons: `aria-label="Delete todo"`
- Semantic HTML: `<button>`, `<nav>`, `<hr />`, `<form>`

## Async & Promises

- `async/await` preferred over `.then()` chains
- Example: `return await db.select().from(todo);`
- Always `await` promises in async functions
- Errors caught via `try-catch` or library-specific handlers
- tanstack/react-query: `useMutation()`, `useQuery()`
- Example from `todos/page.tsx`:

## TypeScript

- No `any` types; use `unknown` if genuinely unknown
- Explicit return types on functions when clarity matters
- Type narrowing preferred over assertions
- Example: `z.email()`, `z.string().min(1)` for validation
- Used for literal types and immutable values
- Example: `const links = [...] as const;` in header navigation
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview

- Modular workspace structure (apps + packages)
- tRPC for type-safe API communication (no REST)
- Server-client separation with Supabase Auth for session management
- Database-first approach using Drizzle ORM with PostgreSQL
- Environment validation at import time (T3 Env + Zod)
- React 19 with Server Components where applicable
- Component library shared via workspace packages

## Layers

- Purpose: Next.js application serving UI pages and API routes
- Location: `apps/web/src`
- Contains: Next.js pages (App Router), client components, API route handlers, hooks, utilities
- Depends on: `@dashboard-leads-profills/api`, `@dashboard-leads-profills/auth`, `@dashboard-leads-profills/env`, `@dashboard-leads-profills/ui`
- Used by: End users via browser
- Purpose: tRPC router definitions and procedures; business logic entry points
- Location: `packages/api/src`
- Contains: tRPC router setup, context creation, procedure definitions, input validation (Zod), data mutations
- Depends on: `@dashboard-leads-profills/auth`, `@dashboard-leads-profills/db`, `@dashboard-leads-profills/env`
- Used by: `apps/web` (via tRPC client)
- Purpose: Supabase Auth client factories (server + browser)
- Location: `packages/auth/src`
- Contains: `createServerClient` (cookie-based SSR), `createClient` (browser SPA)
- Depends on: `@dashboard-leads-profills/env`
- Used by: `apps/web` (for auth in server/client components)
- Purpose: Drizzle ORM setup, schema definitions, database client
- Location: `packages/db/src`
- Contains: PostgreSQL schema tables, Drizzle client instance, schema exports
- Depends on: `@dashboard-leads-profills/env`
- Used by: `packages/api`, `packages/auth`
- Purpose: Environment variable validation and export
- Location: `packages/env/src`
- Contains: T3 Env configuration for server and client, Zod schemas
- Depends on: None (dotenv for loading)
- Used by: All packages/apps
- Purpose: Reusable shadcn-based React components
- Location: `packages/ui/src`
- Contains: Styled components (button, card, input, checkbox, dropdown, etc.), utility functions, global styles
- Depends on: shadcn/ui dependencies, Tailwind CSS
- Used by: `apps/web`

## Data Flow

- **Server State:** PostgreSQL (source of truth)
- **Session State:** Supabase Auth cookies (via `@supabase/ssr`) + NextRequest headers
- **Client Cache:** React Query (via `QueryClient` in `apps/web/src/utils/trpc.ts`)
- **UI State:** React hooks (useState in components)

## Key Abstractions

- Purpose: Type-safe RPC endpoints with automatic client generation
- Examples: `packages/api/src/routers/todo.ts`, `packages/api/src/routers/index.ts`
- Pattern: `publicProcedure.input(Zod schema).mutation/query(async handler)`
- Distinguishes public vs protected procedures via middleware
- Purpose: Define database tables with relations
- Examples: `packages/db/src/schema/todo.ts`, `packages/db/src/schema/auth.ts`
- Pattern: `pgTable("table_name", { columnName: dataType() })`
- Includes indices for foreign keys, relations for ORM queries
- Purpose: Type-safe configuration with fail-fast on import
- Examples: `packages/env/src/server.ts`, `packages/env/src/web.ts`
- Pattern: T3 Env + Zod schemas, validation runs at module load time
- Critical: Missing/invalid vars cause immediate build/startup failure
- Purpose: Client-side caching, synchronization with server state
- Example: `apps/web/src/utils/trpc.ts`, usage in pages like `apps/web/src/app/todos/page.tsx`
- Pattern: `useQuery()` for fetches, `useMutation()` for writes, automatic error handling

## Entry Points

- Location: `apps/web/src/app/layout.tsx`
- Triggers: `bun run dev:web` (Next.js dev server on port 3001)
- Responsibilities: Root layout, font loading, provider setup (Providers component)
- tRPC Handler: `apps/web/src/app/api/trpc/[trpc]/route.ts`
- Auth Handler: `apps/web/src/app/api/auth/[...all]/route.ts`
- Push Schema: `bun run db:push` → `packages/db` → Drizzle CLI pushes schema to Supabase
- Generate Migration: `bun run db:generate` → Drizzle generates migration files
- Migrate: `bun run db:migrate` → Applies pending migrations
- Studio: `bun run db:studio` → Opens Drizzle Studio (UI)

## Error Handling

- **API Errors:** tRPC throws `TRPCError` with code + message (e.g., "UNAUTHORIZED" in `protectedProcedure`)
- **Validation Errors:** Zod validation in procedure `.input()` automatically rejects invalid data
- **Client-side:** React Query catches errors, displays via Sonner toast in `apps/web/src/utils/trpc.ts`
- **Auth Errors:** Supabase Auth returns error responses on failed signup/signin

## Cross-Cutting Concerns

- Input: Zod schemas in tRPC procedures (e.g., `z.object({ id: z.number() })`)
- Environment: T3 Env at module import time
- Database: Drizzle table constraints (unique, notNull, etc.)
- Provider: Supabase Auth (email/password)
- Session: Cookie-based via `@supabase/ssr`, validated on each request via `packages/api/src/context.ts`
- Authorization: `protectedProcedure` middleware blocks unauthenticated access; admin routes check `user_role` claim
- Roles: Tabela `user_roles` (schema `public`) com `pgEnum("app_role", ["admin", "vendedor"])`; propagados para Supabase via custom claims
- Users: Gerenciados pelo Supabase em `auth.users` (nao visivel no Drizzle); tabela `user_roles` e o unico schema local de auth
- tRPC client sends credentials: `credentials: "include"` in fetch link
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
