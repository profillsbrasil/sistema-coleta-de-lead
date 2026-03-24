# Architecture

**Analysis Date:** 2026-03-24

## Pattern Overview

**Overall:** Monorepo with layered separation of concerns using Turborepo + tRPC type-safe RPC + Next.js App Router

**Key Characteristics:**
- Modular workspace structure (apps + packages)
- tRPC for type-safe API communication (no REST)
- Server-client separation with better-auth for session management
- Database-first approach using Drizzle ORM with PostgreSQL
- Environment validation at import time (T3 Env + Zod)
- React 19 with Server Components where applicable
- Component library shared via workspace packages

## Layers

**Frontend (apps/web):**
- Purpose: Next.js application serving UI pages and API routes
- Location: `apps/web/src`
- Contains: Next.js pages (App Router), client components, API route handlers, hooks, utilities
- Depends on: `@dashboard-leads-profills/api`, `@dashboard-leads-profills/auth`, `@dashboard-leads-profills/env`, `@dashboard-leads-profills/ui`
- Used by: End users via browser

**API (packages/api):**
- Purpose: tRPC router definitions and procedures; business logic entry points
- Location: `packages/api/src`
- Contains: tRPC router setup, context creation, procedure definitions, input validation (Zod), data mutations
- Depends on: `@dashboard-leads-profills/auth`, `@dashboard-leads-profills/db`, `@dashboard-leads-profills/env`
- Used by: `apps/web` (via tRPC client)

**Authentication (packages/auth):**
- Purpose: Better-auth configuration and session management
- Location: `packages/auth/src`
- Contains: Better-auth instance, Drizzle adapter configuration, email/password provider setup
- Depends on: `@dashboard-leads-profills/db`, `@dashboard-leads-profills/env`
- Used by: `packages/api` (for session context), `apps/web` (for auth routes)

**Database (packages/db):**
- Purpose: Drizzle ORM setup, schema definitions, database client
- Location: `packages/db/src`
- Contains: PostgreSQL schema tables, Drizzle client instance, schema exports
- Depends on: `@dashboard-leads-profills/env`
- Used by: `packages/api`, `packages/auth`

**Environment (packages/env):**
- Purpose: Environment variable validation and export
- Location: `packages/env/src`
- Contains: T3 Env configuration for server and client, Zod schemas
- Depends on: None (dotenv for loading)
- Used by: All packages/apps

**UI Components (packages/ui):**
- Purpose: Reusable shadcn-based React components
- Location: `packages/ui/src`
- Contains: Styled components (button, card, input, checkbox, dropdown, etc.), utility functions, global styles
- Depends on: shadcn/ui dependencies, Tailwind CSS
- Used by: `apps/web`

## Data Flow

**User Action Flow (Todo CRUD Example):**

1. User interacts with form in `apps/web/src/app/todos/page.tsx` (Client Component)
2. Client calls `trpc.todo.create.mutate()` via mutation hook
3. tRPC client (`apps/web/src/utils/trpc.ts`) serializes call to HTTP POST `/api/trpc`
4. Next.js route handler `apps/web/src/app/api/trpc/[trpc]/route.ts` receives request
5. Route handler invokes `fetchRequestHandler` which matches to tRPC router
6. Router procedure in `packages/api/src/routers/todo.ts` executes business logic
7. Database operations via Drizzle ORM in `packages/db/src/index.ts`
8. PostgreSQL returns results
9. Response serialized back through tRPC to client
10. React Query cache updated, component re-renders

**Session/Auth Flow:**

1. User visits `/login` page (`apps/web/src/app/login/page.tsx`)
2. Sign-up form posts to `apps/web/src/app/api/auth/[...all]/route.ts`
3. Route handler delegates to `better-auth` handler
4. Better-auth creates user record in PostgreSQL via Drizzle
5. Session cookie created and stored
6. On subsequent requests, `packages/api/src/context.ts` reads session from headers
7. Context passed to tRPC procedures for authorization checks
8. `protectedProcedure` middleware in `packages/api/src/index.ts` validates session

**State Management:**

- **Server State:** PostgreSQL (source of truth)
- **Session State:** Better-auth session cookies + NextRequest headers
- **Client Cache:** React Query (via `QueryClient` in `apps/web/src/utils/trpc.ts`)
- **UI State:** React hooks (useState in components)

## Key Abstractions

**tRPC Procedures:**
- Purpose: Type-safe RPC endpoints with automatic client generation
- Examples: `packages/api/src/routers/todo.ts`, `packages/api/src/routers/index.ts`
- Pattern: `publicProcedure.input(Zod schema).mutation/query(async handler)`
- Distinguishes public vs protected procedures via middleware

**Drizzle Schema:**
- Purpose: Define database tables with relations
- Examples: `packages/db/src/schema/todo.ts`, `packages/db/src/schema/auth.ts`
- Pattern: `pgTable("table_name", { columnName: dataType() })`
- Includes indices for foreign keys, relations for ORM queries

**Environment Validation:**
- Purpose: Type-safe configuration with fail-fast on import
- Examples: `packages/env/src/server.ts`, `packages/env/src/web.ts`
- Pattern: T3 Env + Zod schemas, validation runs at module load time
- Critical: Missing/invalid vars cause immediate build/startup failure

**React Query Integration:**
- Purpose: Client-side caching, synchronization with server state
- Example: `apps/web/src/utils/trpc.ts`, usage in pages like `apps/web/src/app/todos/page.tsx`
- Pattern: `useQuery()` for fetches, `useMutation()` for writes, automatic error handling

## Entry Points

**Web App:**
- Location: `apps/web/src/app/layout.tsx`
- Triggers: `bun run dev:web` (Next.js dev server on port 3001)
- Responsibilities: Root layout, font loading, provider setup (Providers component)

**API Routes:**
- tRPC Handler: `apps/web/src/app/api/trpc/[trpc]/route.ts`
  - Triggers: HTTP POST/GET to `/api/trpc`
  - Responsibilities: Route tRPC requests to correct procedure
- Auth Handler: `apps/web/src/app/api/auth/[...all]/route.ts`
  - Triggers: HTTP POST/GET to `/api/auth/*`
  - Responsibilities: Delegate to better-auth handler for signup/signin

**Database Commands:**
- Push Schema: `bun run db:push` → `packages/db` → Drizzle CLI pushes schema to Supabase
- Generate Migration: `bun run db:generate` → Drizzle generates migration files
- Migrate: `bun run db:migrate` → Applies pending migrations
- Studio: `bun run db:studio` → Opens Drizzle Studio (UI)

## Error Handling

**Strategy:** Explicit error handling with TRPCError for API layer, Zod validation failures, try-catch in async operations

**Patterns:**

- **API Errors:** tRPC throws `TRPCError` with code + message (e.g., "UNAUTHORIZED" in `protectedProcedure`)
- **Validation Errors:** Zod validation in procedure `.input()` automatically rejects invalid data
- **Client-side:** React Query catches errors, displays via Sonner toast in `apps/web/src/utils/trpc.ts`
- **Auth Errors:** Better-auth returns explicit error responses on failed signup/signin

## Cross-Cutting Concerns

**Logging:** None currently implemented (no centralized logger). Could add pino or winston.

**Validation:**
- Input: Zod schemas in tRPC procedures (e.g., `z.object({ id: z.number() })`)
- Environment: T3 Env at module import time
- Database: Drizzle table constraints (unique, notNull, etc.)

**Authentication:**
- Provider: Better-auth with email/password provider
- Session: Cookie-based, validated on each request via `packages/api/src/context.ts`
- Authorization: `protectedProcedure` middleware blocks unauthorized access to routes like `privateData`

**CORS:**
- Configured in Better-auth: `trustedOrigins: [env.CORS_ORIGIN]`
- tRPC client sends credentials: `credentials: "include"` in fetch link

---

*Architecture analysis: 2026-03-24*
