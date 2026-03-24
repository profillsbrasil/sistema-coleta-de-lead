# Codebase Structure

**Analysis Date:** 2026-03-24

## Directory Layout

```
dashboard-leads-profills/                # Monorepo root
├── apps/
│   └── web/                            # Next.js application (frontend + API routes)
│       ├── src/
│       │   ├── app/                    # Next.js App Router (pages, API routes)
│       │   │   ├── layout.tsx          # Root layout with providers
│       │   │   ├── page.tsx            # Home page (healthcheck)
│       │   │   ├── api/
│       │   │   │   ├── auth/[...all]/  # Better-auth routes
│       │   │   │   └── trpc/[trpc]/    # tRPC route handler
│       │   │   ├── login/              # Auth pages
│       │   │   ├── dashboard/          # User dashboard
│       │   │   └── todos/              # Todo list page
│       │   ├── components/             # Reusable React components (Header, Forms, etc.)
│       │   ├── lib/                    # Library code (auth client setup)
│       │   ├── utils/                  # Utility functions (tRPC client, React Query)
│       │   └── index.css               # Global styles
│       ├── next.config.ts              # Next.js configuration
│       ├── tsconfig.json               # TypeScript config with path aliases
│       └── package.json
├── packages/
│   ├── api/                            # tRPC router definitions
│   │   └── src/
│   │       ├── index.ts                # tRPC instance, publicProcedure, protectedProcedure
│   │       ├── context.ts              # tRPC context (session extraction)
│   │       ├── routers/
│   │       │   ├── index.ts            # Root router, healthCheck endpoint
│   │       │   └── todo.ts             # Todo CRUD procedures
│   │       └── __tests__/
│   │           └── healthcheck.test.ts # Tests for API
│   │
│   ├── auth/                           # Better-auth configuration
│   │   └── src/
│   │       └── index.ts                # Better-auth instance with Drizzle adapter
│   │
│   ├── db/                             # Drizzle ORM setup + schema
│   │   └── src/
│   │       ├── index.ts                # Drizzle client instance
│   │       ├── schema/
│   │       │   ├── index.ts            # Schema barrel export
│   │       │   ├── auth.ts             # User, session, account, verification tables
│   │       │   └── todo.ts             # Todo table
│   │       └── supabase/               # Drizzle migrations (auto-generated)
│   │
│   ├── env/                            # T3 Env validation configuration
│   │   └── src/
│   │       ├── server.ts               # Server-side env (DATABASE_URL, BETTER_AUTH_SECRET, etc.)
│   │       └── web.ts                  # Client-side env (currently empty)
│   │
│   ├── ui/                             # Shared shadcn UI components
│   │   ├── src/
│   │   │   ├── components/             # Component files (button, card, input, checkbox, etc.)
│   │   │   ├── lib/
│   │   │   │   └── utils.ts            # cn() utility for classname merging
│   │   │   └── styles/
│   │   │       └── globals.css         # Global Tailwind styles
│   │   ├── components.json             # shadcn CLI config
│   │   └── package.json
│   │
│   └── config/                         # Shared configuration
│       └── tsconfig.base.json          # Base TypeScript config extended by all packages
│
├── docs/
│   └── claude/                         # Claude-specific documentation
│       ├── specs/                      # Feature specifications
│       └── plans/                      # Implementation plans
│
├── .planning/
│   └── codebase/                       # Codebase mapping documents (this directory)
│
├── turbo.json                          # Turborepo configuration (task definitions, caching)
├── package.json                        # Root workspace configuration
├── bun.lock                            # Bun lockfile
├── biome.json                          # Biome linter/formatter config
└── CLAUDE.md                           # Project-specific Claude instructions
```

## Directory Purposes

**apps/web/src/app:**
- Purpose: Next.js pages and API routes (App Router)
- Contains: `.tsx` page components, API route handlers, server components
- Key files:
  - `layout.tsx`: Root layout, font setup, Provider injection
  - `page.tsx`: Home page with healthcheck
  - `api/trpc/[trpc]/route.ts`: tRPC request handler
  - `api/auth/[...all]/route.ts`: Better-auth catch-all route
  - `login/page.tsx`: Sign-in/sign-up form
  - `dashboard/page.tsx`: User dashboard (protected)
  - `todos/page.tsx`: Todo list page (CRUD example)

**apps/web/src/components:**
- Purpose: Reusable UI components and layout components
- Contains: React components (client and server)
- Key files:
  - `header.tsx`: Navigation bar with links and user menu
  - `providers.tsx`: Client-side providers (React Query, Theme, Toaster)
  - `sign-in-form.tsx`, `sign-up-form.tsx`: Auth forms
  - `user-menu.tsx`: User dropdown menu
  - `mode-toggle.tsx`: Dark mode toggle
  - `theme-provider.tsx`: Next-themes provider wrapper

**apps/web/src/lib:**
- Purpose: Library functions and client initialization
- Contains: Auth client setup, API client wrappers
- Key files:
  - `auth-client.ts`: Better-auth client for frontend (session management)

**apps/web/src/utils:**
- Purpose: Helper functions and hooks
- Contains: tRPC client setup, React Query configuration
- Key files:
  - `trpc.ts`: tRPC client initialization, QueryClient setup, error handling

**packages/api/src:**
- Purpose: tRPC router definition and middleware
- Contains: Procedure definitions, router setup
- Key files:
  - `index.ts`: tRPC instance, procedure types (publicProcedure, protectedProcedure)
  - `context.ts`: Context creation from NextRequest (session extraction)
  - `routers/index.ts`: Root router combining all sub-routers
  - `routers/todo.ts`: Todo CRUD procedures with Drizzle queries

**packages/auth/src:**
- Purpose: Better-auth singleton instance
- Contains: Auth provider configuration with database adapter
- Key files:
  - `index.ts`: Better-auth instance with Drizzle adapter, email/password provider

**packages/db/src:**
- Purpose: Database client and schema definitions
- Contains: Drizzle ORM setup, table schemas
- Key files:
  - `index.ts`: Drizzle client instance (PostgreSQL connection)
  - `schema/auth.ts`: Better-auth tables (user, session, account, verification)
  - `schema/todo.ts`: Todo table definition
  - `schema/index.ts`: Barrel export of all schemas

**packages/env/src:**
- Purpose: Environment variable validation
- Contains: T3 Env configuration
- Key files:
  - `server.ts`: Server-side env schema (DATABASE_URL, BETTER_AUTH_SECRET, etc.)
  - `web.ts`: Client-side env schema (currently empty, for future client secrets)

**packages/ui/src:**
- Purpose: Shared component library
- Contains: shadcn components styled with Tailwind
- Key files:
  - `components/button.tsx`: Styled button component
  - `components/card.tsx`: Card container component
  - `components/input.tsx`: Form input component
  - `components/checkbox.tsx`: Checkbox component
  - `components/dropdown-menu.tsx`: Dropdown menu component
  - `lib/utils.ts`: `cn()` utility for className merging (clsx + tailwind-merge)
  - `styles/globals.css`: Global Tailwind configuration

**packages/config:**
- Purpose: Shared configuration base
- Contains: Base TypeScript configuration
- Key files:
  - `tsconfig.base.json`: Extended by all app/package tsconfigs

## Key File Locations

**Entry Points:**
- `apps/web/src/app/layout.tsx`: Root layout (App Router entry)
- `apps/web/src/app/page.tsx`: Home route
- `apps/web/next.config.ts`: Next.js build config

**Configuration:**
- `package.json`: Root workspace definition, scripts
- `turbo.json`: Turborepo tasks and caching rules
- `biome.json`: Linter/formatter rules
- `apps/web/.env`: Environment variables (not tracked, copy .env.example)

**Core Logic:**
- `packages/api/src/routers/todo.ts`: Business logic for todos
- `packages/auth/src/index.ts`: Authentication setup
- `packages/db/src/schema/todo.ts`: Data model definition

**Testing:**
- `packages/api/src/__tests__/healthcheck.test.ts`: Vitest test example
- `vitest.workspace.ts` (root): Vitest configuration for all packages
- Each package: `vitest.config.ts` for package-specific setup

## Naming Conventions

**Files:**
- Pages: `page.tsx` (Next.js App Router)
- Components: `ComponentName.tsx` (PascalCase)
- Utils/hooks: `useHookName.ts` or `utilityName.ts` (camelCase)
- Routes: `[dynamic].tsx` or `[...catch-all].tsx` (Next.js convention)
- Tests: `filename.test.ts` or `filename.spec.ts`

**Directories:**
- Pages: kebab-case for grouping (e.g., `login/`, `dashboard/`, `todos/`)
- Packages: kebab-case (e.g., `api`, `auth`, `db`, `env`, `ui`)
- Components: Organized by feature or domain (no single components/ subdirs)

**TypeScript/JavaScript:**
- Constants: UPPER_SNAKE_CASE for env vars and config
- Variables/functions: camelCase
- Types/interfaces: PascalCase
- Zod schemas: lowercase or inline in procedures

## Where to Add New Code

**New Feature (Database + API + UI):**

1. **Database Schema:** Create table in `packages/db/src/schema/newfeature.ts`
   - Export in `packages/db/src/schema/index.ts`
   - Run `bun run db:generate` to create migration
   - Run `bun run db:push` to apply to database

2. **API Routes:** Create router in `packages/api/src/routers/newfeature.ts`
   - Import in `packages/api/src/routers/index.ts`
   - Define procedures with `publicProcedure` or `protectedProcedure`
   - Add Zod input validation

3. **UI Page:** Create at `apps/web/src/app/feature/page.tsx`
   - Use `"use client"` if interactive
   - Import components from `@dashboard-leads-profills/ui/components/*`
   - Use `trpc` client from `@/utils/trpc` for data fetching

4. **UI Components:** Add to `apps/web/src/components/FeatureName.tsx`
   - Or shared component to `packages/ui/src/components/featureName.tsx`

**New Component/Module:**

- Implementation: `packages/ui/src/components/NewComponent.tsx`
- Export: Add to `packages/ui/src/components/` (path-based imports, no barrel files)
- Usage: `import { NewComponent } from "@dashboard-leads-profills/ui/components/new-component"`

**Utilities:**

- Shared helpers: `packages/api/src/utils/helperName.ts` (API layer) or `apps/web/src/utils/helperName.ts` (frontend)
- Shared UI utils: `packages/ui/src/lib/utilName.ts`

**Tests:**

- Unit tests: Co-locate with source file as `filename.test.ts`
- Test files in `packages/api/src/__tests__/` for API layer
- Run with `bun run test` (Vitest via Turborepo)

## Special Directories

**apps/web/.next:**
- Purpose: Next.js build output and caching
- Generated: Yes
- Committed: No (in .gitignore)

**packages/db/supabase:**
- Purpose: Drizzle migrations (auto-generated)
- Generated: Yes (by `bun run db:generate`)
- Committed: Yes (track migrations)

**node_modules, .turbo, .next:**
- Purpose: Build artifacts, lockfiles, caches
- Generated: Yes
- Committed: No (in .gitignore)

**.planning/codebase:**
- Purpose: Architecture documentation
- Generated: Yes (by gsd map-codebase)
- Committed: Yes

**docs/claude/specs/ and docs/claude/plans/:**
- Purpose: Specification and implementation plan documents
- Generated: Yes (by XP workflow)
- Committed: Yes (track decisions)

---

*Structure analysis: 2026-03-24*
