---
phase: 01-auth-migration
plan: 01
subsystem: auth
tags: [supabase, supabase-ssr, oauth, proxy, session-refresh, env-validation]

# Dependency graph
requires: []
provides:
  - "Supabase browser client factory (apps/web/src/lib/supabase/client.ts)"
  - "Supabase server client factory (apps/web/src/lib/supabase/server.ts)"
  - "proxy.ts session refresh via getClaims (apps/web/proxy.ts)"
  - "OAuth PKCE callback route (apps/web/src/app/auth/callback/route.ts)"
  - "Supabase env vars validated at import time (packages/env)"
  - "packages/auth re-exports Supabase clients (createBrowserClient, createServerClient)"
affects: [01-02, 01-03, 01-04, 02-sync-engine]

# Tech tracking
tech-stack:
  added: ["@supabase/supabase-js@2.100.0", "@supabase/ssr@0.9.0"]
  patterns: ["Next.js 16 proxy.ts convention", "Supabase SSR cookie-based auth", "getClaims() lightweight session check"]

key-files:
  created:
    - apps/web/src/lib/supabase/client.ts
    - apps/web/src/lib/supabase/server.ts
    - apps/web/src/lib/supabase/proxy.ts
    - apps/web/proxy.ts
    - apps/web/src/app/auth/callback/route.ts
    - packages/auth/src/client.ts
    - packages/auth/src/server.ts
  modified:
    - packages/env/src/server.ts
    - packages/env/src/web.ts
    - packages/auth/src/index.ts
    - packages/auth/package.json
    - apps/web/package.json
    - bun.lock

key-decisions:
  - "Usar proxy.ts (Next.js 16) em vez de middleware.ts"
  - "getClaims() em vez de getUser() para check leve no proxy"
  - "NEXT_PUBLIC_SUPABASE_* no server block do T3 Env (vars publicas, seguras)"

patterns-established:
  - "Supabase client factory: createClient() em client.ts (browser) e server.ts (server)"
  - "proxy.ts chama updateSession que usa getClaims para refresh de sessao"
  - "Callback route em /auth/callback para PKCE code exchange"

requirements-completed: [AUTH-01, AUTH-05]

# Metrics
duration: 5min
completed: 2026-03-24
---

# Phase 01 Plan 01: Supabase Auth Foundation Summary

**Supabase client utilities (browser + server), proxy.ts com getClaims, callback route PKCE, e env vars migradas de Better-Auth para Supabase**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-24T22:27:27Z
- **Completed:** 2026-03-24T22:32:47Z
- **Tasks:** 2
- **Files modified:** 15 (7 created, 6 modified, 2 deleted)

## Accomplishments
- Supabase packages instalados e client utilities criadas (browser + server)
- proxy.ts criado com session refresh via getClaims() e redirect para /login
- Callback route para PKCE OAuth code exchange em /auth/callback
- Env vars migradas: BETTER_AUTH_* removidas, NEXT_PUBLIC_SUPABASE_* adicionadas com validacao Zod
- packages/auth migrado de Better-Auth para re-exports Supabase
- Better-Auth route handler e auth-client.ts deletados

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Supabase packages and create client utilities** - `9489ec9` (feat)
2. **Task 2: Create proxy.ts and OAuth callback route** - `a09c75d` (feat)

## Files Created/Modified
- `apps/web/src/lib/supabase/client.ts` - Browser Supabase client factory via createBrowserClient
- `apps/web/src/lib/supabase/server.ts` - Server Supabase client factory com cookie handling
- `apps/web/src/lib/supabase/proxy.ts` - updateSession com getClaims e redirect logic
- `apps/web/proxy.ts` - Next.js 16 proxy entry point
- `apps/web/src/app/auth/callback/route.ts` - PKCE code exchange GET handler
- `packages/auth/src/client.ts` - Supabase browser client via env validated
- `packages/auth/src/server.ts` - Supabase server client com cookie store abstraction
- `packages/auth/src/index.ts` - Re-exports createBrowserClient e createServerClient
- `packages/auth/package.json` - Deps migradas: better-auth removido, @supabase/* adicionado
- `packages/env/src/server.ts` - BETTER_AUTH_* removido, NEXT_PUBLIC_SUPABASE_* adicionado
- `packages/env/src/web.ts` - Client env vars para Supabase com runtimeEnv
- `apps/web/package.json` - @supabase/supabase-js e @supabase/ssr adicionados
- `apps/web/src/app/api/auth/[...all]/route.ts` - DELETADO (Better-Auth handler)
- `apps/web/src/lib/auth-client.ts` - DELETADO (Better-Auth React client)

## Decisions Made
- **proxy.ts vs middleware.ts:** Next.js 16.2 suporta ambos; usado proxy.ts conforme convencao Next.js 16
- **getClaims() vs getUser():** getClaims e mais leve (nao faz network call), suficiente para check de sessao no proxy
- **NEXT_PUBLIC_* no server block:** Vars publicas intencionalmente no server block do T3 Env -- sao seguras e precisam estar disponiveis tanto no server quanto no client

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Type errors em arquivos que ainda importam de auth-client.ts (sign-in-form, sign-up-form, user-menu, dashboard) -- esperados, serao resolvidos no plano 01-02
- Type errors em context.ts e dashboard/page.tsx que importam `auth` de packages/auth -- tambem esperados, resolvidos em planos subsequentes

## User Setup Required

**Configuracao Supabase necessaria antes de rodar a app.** O usuario precisa:
1. Obter `NEXT_PUBLIC_SUPABASE_ANON_KEY` no Supabase Dashboard -> Settings -> API -> anon public key
2. Atualizar `apps/web/.env` com a key correta (atualmente placeholder)
3. Configurar redirect URL `http://localhost:3001/auth/callback` no Supabase Dashboard -> Authentication -> URL Configuration -> Redirect URLs

## Known Stubs

- `apps/web/.env` contem `NEXT_PUBLIC_SUPABASE_ANON_KEY=PLACEHOLDER_ANON_KEY` -- precisa ser substituido pelo valor real do Supabase Dashboard

## Next Phase Readiness
- Client utilities prontas para uso em componentes de login/signup (plan 01-02)
- proxy.ts funcional para proteger rotas (plan 01-03)
- Callback route pronta para OAuth providers (plan 01-02)
- Blocker: usuario precisa configurar SUPABASE_ANON_KEY real antes de testar

## Self-Check: PASSED

- All 7 created files verified present
- Both deleted files confirmed absent
- Both task commits verified: 9489ec9, a09c75d

---
*Phase: 01-auth-migration*
*Completed: 2026-03-24*
