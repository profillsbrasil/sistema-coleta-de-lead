# Codebase Concerns

**Analysis Date:** 2026-03-24

## Security Issues

**Exposed secrets in `.env` file:**
- Issue: `.env` file is present in the repository with actual credentials (DATABASE_URL, BETTER_AUTH_SECRET)
- Files: `/apps/web/.env`
- Impact: Credentials exposed in git history; anyone with repo access sees production secrets
- Fix approach:
  - Remove `.env` from git history immediately: `git rm --cached apps/web/.env && git commit -m "chore: remove exposed secrets"`
  - Add `.env` to `.gitignore` (ensure it's there)
  - Rotate all exposed credentials (Supabase, Better-Auth secret)
  - Use `.env.example` with placeholder values for documentation

**Missing CORS configuration validation:**
- Issue: `CORS_ORIGIN` env var accepts any URL but frontend hardcodes localhost origin. No dynamic validation during API calls.
- Files: `packages/env/src/server.ts`, `apps/web/src/utils/trpc.ts`
- Impact: Potential CORS bypass or misconfiguration if origin changes without updating both frontend and backend
- Fix approach: Add explicit origin validation in tRPC handler; match CORS_ORIGIN against request origin

**Unauthenticated todo endpoints:**
- Issue: Todo CRUD operations use `publicProcedure` instead of `protectedProcedure`
- Files: `packages/api/src/routers/todo.ts` (all mutations and queries)
- Impact: Anyone can read, create, toggle, and delete todos without authentication
- Fix approach: Change all todo operations to `protectedProcedure`; add userId association to todo schema

## Test Coverage Gaps

**Health check test is a placeholder:**
- What's not tested: The actual tRPC API endpoints (getAll, create, toggle, delete)
- Files: `packages/api/src/__tests__/healthcheck.test.ts`
- Risk: Mutations and queries have zero coverage; regressions go undetected
- Priority: High — These are the main API surface

**Missing integration tests:**
- What's not tested: Database interactions, tRPC context creation, auth flow
- Files: `packages/api/src/`, `packages/auth/src/index.ts`
- Risk: Schema changes or auth configuration errors won't be caught until runtime
- Priority: High — Auth and database are critical paths

**No E2E tests:**
- What's not tested: Sign in/sign up flows, authenticated todo operations, session management
- Files: `apps/web/src/components/sign-in-form.tsx`, `apps/web/src/components/sign-up-form.tsx`, `apps/web/src/app/todos/page.tsx`
- Risk: User-facing workflows may break without detection
- Priority: Medium — Important for user experience but can use manual QA initially

## Architectural Issues

**Todo schema missing user association:**
- Issue: `todo` table has no `user_id` column; todos are shared globally
- Files: `packages/db/src/schema/todo.ts`
- Impact: Multi-user system will show all users' todos to everyone
- Fix approach: Add `user_id` foreign key to todo table; link todos to authenticated users; migrate data

**Hardcoded tRPC endpoint URL:**
- Issue: Frontend assumes `/api/trpc` endpoint exists; no configuration option
- Files: `apps/web/src/utils/trpc.ts` (line 23)
- Impact: Breaks if API moves to different path or domain
- Fix approach: Move URL to env var; inject at runtime from `packages/env/src/web.ts`

**Auth client initialized without baseURL:**
- Issue: `authClient` created with empty config object
- Files: `apps/web/src/lib/auth-client.ts`
- Impact: Auth client may use incorrect endpoint; unclear how it knows where to post credentials
- Fix approach: Explicitly configure `baseURL` from env vars

## Data Integrity Concerns

**Todo mutations return incomplete data:**
- Issue: `insert`, `toggle`, and `delete` mutations return Drizzle result object, not the modified todo
- Files: `packages/api/src/routers/todo.ts` (lines 16-18, 24-27, 32-33)
- Impact: Frontend must refetch entire list after every mutation; inefficient and race-condition prone
- Fix approach: Return full todo object from mutations; update UI optimistically with mutation result

**No timestamps on todos:**
- Issue: Todo table has no `created_at` or `updated_at` columns
- Files: `packages/db/src/schema/todo.ts`
- Impact: Cannot sort by creation date; no audit trail; cannot detect stale data
- Fix approach: Add timestamp columns with defaults and update triggers

**Database connection string hardcoded in env validation:**
- Issue: Drizzle config loads env from `../../apps/web/.env` via dotenv
- Files: `packages/db/drizzle.config.ts` (lines 4-5)
- Impact: Dev command assumes specific directory structure; fails if run elsewhere
- Fix approach: Use `process.env` directly; document required setup

## Performance Bottlenecks

**Full todo list refetch on every mutation:**
- Issue: Each create/toggle/delete invalidates all todos and refetches entire list
- Files: `apps/web/src/app/todos/page.tsx` (lines 26, 34, 40)
- Impact: N todos = N+1 queries per mutation; network overhead; flickering UI
- Fix approach: Implement optimistic updates; return modified todo from mutations; update React Query cache directly

**No query-level caching:**
- Issue: No `staleTime`, `cacheTime`, or `gcTime` configured on queries
- Files: `apps/web/src/app/todos/page.tsx` (line 22)
- Impact: Every component remount or page navigation triggers fresh fetch
- Fix approach: Set `staleTime: 5 * 60 * 1000` (5 min) for todo list; adjust based on use case

**QueryClientProvider created at module level:**
- Issue: `queryClient` is a singleton in `utils/trpc.ts`
- Files: `apps/web/src/utils/trpc.ts` (lines 7-18)
- Impact: Leaked state across test runs; shared cache in SSR contexts
- Fix approach: Create new client per app instance; inject via context/provider

## Fragile Areas

**Session handling is tightly coupled:**
- Files: `packages/api/src/context.ts`, `packages/auth/src/index.ts`, `apps/web/src/lib/auth-client.ts`
- Why fragile: Auth config scattered across three packages; if Better-Auth API changes, all three need updates
- Safe modification: Centralize auth setup in `packages/auth`; export singleton and hooks; add integration tests
- Test coverage: Integration tests for session creation, validation, expiry

**Form validation logic mixed with state:**
- Files: `apps/web/src/components/sign-in-form.tsx` (lines 21-49), `apps/web/src/components/sign-up-form.tsx`
- Why fragile: Zod schema duplicated if used elsewhere; form logic not reusable; validation tied to tanstack-form
- Safe modification: Extract schema to `utils/validation.ts`; consider form library abstraction
- Test coverage: Schema validation tests; form submission tests

**tRPC router depends on package resolution order:**
- Files: `packages/api/src/routers/index.ts`, `packages/api/src/index.ts`
- Why fragile: Routers created in a specific order; circular dependency risk if auth module imports from api
- Safe modification: Add integration test that loads full router; document dependency graph
- Test coverage: Router initialization tests

## Dependencies at Risk

**Dexie without usage:**
- Risk: `dexie` and `dexie-react-hooks` added to `package.json` but not imported anywhere
- Files: `/package.json` (lines 44-45)
- Impact: Dead dependency; increases bundle size; may conflict if removed later
- Migration plan: Remove if not planned for immediate use; readd when IndexedDB caching is implemented

**Better-Auth version pinned exactly:**
- Risk: `better-auth` pinned to `1.5.5` (not `^1.5.5`); no minor version bumps for bug fixes
- Files: `/package.json` (line 20)
- Impact: Security fixes won't auto-update; manual intervention required
- Migration plan: Switch to `^1.5.5` (or `~1.5.5` if breaking changes are frequent)

**TypeScript 5 without strict type checking on env:**
- Risk: `env.ts` uses basic Zod validation but no TypeScript-level strictness
- Files: `packages/env/src/server.ts`
- Impact: Missing env vars don't fail at build time; only at runtime during app start
- Migration plan: Ensure CI enforces `NODE_ENV=test` during build; add build-time env validation

## Missing Critical Features

**No user profile or settings:**
- Problem: Auth system allows sign-up/sign-in but no user profile page or account settings
- Blocks: Users cannot change password, update profile, or manage sessions

**No request/response logging:**
- Problem: No logging on tRPC calls; cannot debug failed requests or track API usage
- Blocks: Troubleshooting production issues; monitoring user actions

**No error tracking or observability:**
- Problem: Client-side errors not captured; server errors not tracked
- Blocks: Cannot identify bugs in production; performance issues go unnoticed

**No database migrations strategy:**
- Problem: Drizzle config exists but no clear workflow for running migrations in production
- Blocks: Deployment of schema changes; rollback mechanisms unclear

---

*Concerns audit: 2026-03-24*
