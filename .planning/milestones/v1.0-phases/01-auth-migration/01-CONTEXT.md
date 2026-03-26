# Phase 1: Auth Migration - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrar de Better-Auth para Supabase Auth. Usuarios conseguem acessar o sistema via OAuth (Google, Facebook, LinkedIn) e o sistema conhece o role de cada usuario (admin ou vendedor). Rotas de admin sao protegidas. Formularios de email/password sao removidos.

</domain>

<decisions>
## Implementation Decisions

### Login flow UX
- **D-01:** OAuth only — sem email/password, sem magic link. Apenas botoes de Google, Facebook e LinkedIn.
- **D-02:** Layout: card centralizado na tela com logo/titulo em cima, 3 botoes empilhados verticalmente. Visual limpo e mobile-friendly.
- **D-03:** Ordem dos providers: Google (primeiro, maior destaque), LinkedIn (segundo), Facebook (terceiro).
- **D-04:** Sem fallback para quem nao tem conta em nenhum provider. Equipe de 10 vendedores — todos tem pelo menos um. Se nao tiver, nao entra.

### Claude's Discretion
- Role storage strategy — onde armazenar o role (admin/vendedor): user metadata do Supabase vs tabela profiles no public schema. Claude decide a abordagem mais adequada para o monorepo existente.
- Route protection approach — como proteger rotas de admin: Next.js middleware, server-side check em RSC, tRPC middleware, ou combinacao. Claude decide baseado nas constraints do stack.
- Package structure — o que acontece com `packages/auth`: manter package com internals trocados vs usar Supabase client direto. Claude decide o que gera menos disrupcao nos imports existentes.
- Env vars migration — quais env vars substituem `BETTER_AUTH_SECRET` e `BETTER_AUTH_URL`. Supabase requer `SUPABASE_URL` e `SUPABASE_ANON_KEY` (ja tem `DATABASE_URL` que aponta para Supabase).
- Schema migration — como lidar com as tabelas de Better-Auth (user, session, account, verification) que existem no banco. Supabase Auth gerencia tabelas no schema `auth`, entao as tabelas do schema `public` podem ser dropadas ou adaptadas.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in decisions above and in:

### Project requirements
- `.planning/REQUIREMENTS.md` — AUTH-01 through AUTH-07 define os requisitos de autenticacao
- `.planning/ROADMAP.md` §Phase 1 — Goal, success criteria e depends on

### Existing auth code (to be replaced)
- `packages/auth/src/index.ts` — Better-Auth config atual (Drizzle adapter, email/password, nextCookies)
- `packages/db/src/schema/auth.ts` — Schema Better-Auth (user, session, account, verification tables)
- `packages/api/src/context.ts` — tRPC context que le sessao via Better-Auth
- `apps/web/src/lib/auth-client.ts` — Better-Auth React client
- `apps/web/src/app/api/auth/[...all]/route.ts` — Better-Auth route handler
- `apps/web/src/components/sign-in-form.tsx` — Formulario de login (a ser substituido por OAuth buttons)
- `apps/web/src/components/sign-up-form.tsx` — Formulario de cadastro (a ser removido)
- `packages/env/src/server.ts` — Env vars com BETTER_AUTH_SECRET e BETTER_AUTH_URL (a ser migrado)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/ui/components/button.tsx`: Button component com variants — reutilizar para botoes de OAuth
- `packages/ui/components/card.tsx`: Card component — reutilizar para o card de login centralizado
- `packages/ui/components/label.tsx`, `input.tsx`: Componentes de form — podem ser removidos da tela de login (OAuth nao precisa de form)
- `@tanstack/react-form`: Usado nos forms atuais — nao sera necessario na nova tela de login
- `apps/web/src/components/loader.tsx`: Loading component — reutilizar para estado de carregamento durante redirect OAuth

### Established Patterns
- tRPC context em `packages/api/src/context.ts`: Le sessao de `NextRequest.headers` — precisa ser adaptado para Supabase Auth
- `protectedProcedure` em `packages/api/src/index.ts`: Middleware de autorizacao — precisa ser atualizado para checar sessao Supabase + role
- T3 Env em `packages/env/src/server.ts`: Validacao de env vars — precisa adicionar `SUPABASE_URL` e `SUPABASE_ANON_KEY`, remover `BETTER_AUTH_*`
- CORS config via `trustedOrigins` em Better-Auth — Supabase Auth gerencia CORS pelo dashboard

### Integration Points
- `apps/web/src/app/api/auth/[...all]/route.ts`: Route handler que precisa ser substituido ou removido (Supabase Auth pode usar route handlers proprios ou callback URL)
- `apps/web/src/components/user-menu.tsx`: Provavelmente usa authClient para sessao — precisa migrar para Supabase client
- `apps/web/src/components/providers.tsx`: Provider wrapper — pode precisar de Supabase provider
- `apps/web/src/app/layout.tsx`: Root layout — pode precisar de session provider do Supabase

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-auth-migration*
*Context gathered: 2026-03-24*
