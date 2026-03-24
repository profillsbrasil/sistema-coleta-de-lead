# Technology Stack

**Analysis Date:** 2026-03-24

## Languages

**Primary:**
- TypeScript 5 (strict) - Used across all packages and applications
- JavaScript - React components, Next.js configuration, client code

**Secondary:**
- SQL - PostgreSQL queries via Drizzle ORM

## Runtime

**Environment:**
- Node.js 22.13.14 (pinned via `@types/node` dependency)
- Bun 1.3.11 - Package manager and runtime

**Package Manager:**
- Bun 1.3.11 (configured in `package.json` `packageManager` field)
- Lockfile: `bun.lock` (present)

## Frameworks

**Core:**
- Next.js 16.2 - React framework with App Router, typed routes, and React Compiler enabled
  - Location: `apps/web`
  - Port: 3001
  - Features: `typedRoutes: true`, `reactCompiler: true`

**Frontend:**
- React 19.2.3 - UI library with functional components
- TailwindCSS 4.1.18 - Utility-first CSS framework

**Backend:**
- tRPC 11.13.4 - Type-safe RPC framework
  - Server: `packages/api`
  - Client: `@trpc/client` with `@trpc/tanstack-react-query` integration
  - HTTP link with batch support via `httpBatchLink`

**ORM:**
- Drizzle ORM 0.45.1 - SQL ORM for PostgreSQL
  - Schema location: `packages/db/src/schema/`
  - Migrations: `packages/db/src/migrations/`
  - Includes relations and indexes

**Auth:**
- Better-Auth 1.5.5 - Session-based authentication
  - Adapter: Drizzle with PostgreSQL provider
  - Methods: Email and password (enabled)
  - Session storage: Database tables (user, session, account, verification)
  - Integration: `nextCookies()` plugin for Next.js

**Data Fetching:**
- TanStack React Query 5.90.12 - Server state management with React hooks
- TanStack React Form 1.28.0 - Form state management

**UI Components:**
- shadcn/ui - Accessible component library
- Base UI React 1.3.0 - Headless UI component primitives
- Lucide React 1.6.0 - Icon library
- Sonner 2.0.7 - Toast notifications
- class-variance-authority 0.7.1 - Type-safe CSS class utilities
- tailwind-merge 3.5.0 - TailwindCSS utility merge
- tw-animate-css 1.4.0 - Animation utilities

**Theming:**
- next-themes 0.4.6 - Theme provider for Next.js

**State Management:**
- Dexie 4.3.0 - Client-side IndexedDB wrapper (installed but minimal usage in codebase)
- dexie-react-hooks 4.2.0 - React hooks for Dexie

## Testing

**Framework:**
- Vitest 3.2.1 - Unit test runner with workspace support
- `@vitest/coverage-v8` 3.2.1 - Code coverage via V8
- Config files: `vitest.workspace.ts` (root), `vitest.config.ts` (per package)
- Testable packages: `packages/api`, `packages/env`

**Assertion:**
- Vitest built-in assertions

## Build & Dev Tools

**Monorepo:**
- Turborepo 2.8.12 - Build orchestration and caching
  - Config: `turbo.json`
  - UI: TUI mode enabled
  - Runs: dev, build, check-types, test, db:* commands

**Linting & Formatting:**
- Biome 2.4.7 - Unified linter and formatter
  - Config: `biome.json`
  - Formatter: tabs (indentation), double quotes
  - Linter rules: recommended, a11y, style rules enabled
  - Class sorting: enabled for `clsx`, `cva`, `cn` functions
  - Extends: `ultracite/biome/core`, `ultracite/biome/next`
- Ultracite 7.3.2 - Zero-config preset for Biome

**Database:**
- Drizzle Kit 0.31.8 - Schema generation and migration management
  - Commands: push, generate, migrate, studio
  - Config: `packages/db/drizzle.config.ts`
  - Loads `.env` from `../../apps/web/.env`

**Type Checking:**
- TypeScript 5 - Strict type checking across packages

**React Tools:**
- Babel Plugin React Compiler 1.0.0 - Automatic memoization (Next.js 16 feature)

## Key Dependencies

**Critical:**
- `zod` 4.1.13 - Schema validation for environment, input, and API contracts
- `dotenv` 17.2.2 - Environment variable loading from `.env` files
- `pg` 8.17.1 - Native PostgreSQL driver for Drizzle

**Infrastructure:**
- `@t3-oss/env-core` 0.13.1 - T3 environment validation (server-side)
- `@t3-oss/env-nextjs` 0.13.1 - T3 environment validation (Next.js)
- `@types/pg` 8.16.0 - TypeScript types for PostgreSQL driver

**Dev Infrastructure:**
- `@types/node` 22.13.14 - Node.js type definitions
- `@types/react` 19.2.10 - React type definitions
- `@types/react-dom` 19.2.3 - React DOM type definitions
- `typescript` 5.9.3+ - TypeScript compiler

## Configuration

**Environment:**
- File location: `apps/web/.env` (not versioned, contains secrets)
- Validation: T3 Env with Zod (schema-based)
- Validation run time: Import-time (enforced on app start)

**Required Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string (Supabase)
- `BETTER_AUTH_SECRET` - Min 32 chars, session encryption key
- `BETTER_AUTH_URL` - Base URL for auth provider (`z.url()` validated)
- `CORS_ORIGIN` - Allowed CORS origin (`z.url()` validated)
- `NODE_ENV` - Optional, defaults to "development"

**Environment Validation:**
- Location: `packages/env/src/server.ts` (server exports)
- Location: `packages/env/src/web.ts` (client exports)
- Pattern: T3 Env + Zod with runtime validation

**Build Configuration:**
- Next.js: `apps/web/next.config.ts`
- TypeScript: `packages/config/tsconfig.base.json` (shared)
- Turbo: `turbo.json` (task dependencies, caching rules)
- Drizzle: `packages/db/drizzle.config.ts`
- Biome: `biome.json` (linting + formatting)

## Package Structure

**Workspaces (via Bun):**
```
apps/
├── web/               Next.js 16, React 19, port 3001
packages/
├── api/               tRPC routers + context
├── auth/              Better-Auth config + export
├── db/                Drizzle ORM + schema + migrations
├── env/               T3 Env validation (server + web)
├── ui/                shadcn components + hooks + styles
├── config/            Shared tsconfig.base.json
```

**Namespace:** `@dashboard-leads-profills/*`

**Dependency Resolution:**
- Workspace refs: `workspace:*` (internal packages)
- Catalog refs: `catalog:` (pinned versions in root `package.json` catalog)

## Platform Requirements

**Development:**
- Bun 1.3.11
- Node.js 22+ (inferred from `@types/node`)
- PostgreSQL database (Supabase or compatible)

**Production:**
- Deployment target: Vercel (Next.js optimized) or Node.js 22+ environment
- Environment variables required (see Configuration)
- Database connection to PostgreSQL

---

*Stack analysis: 2026-03-24*
