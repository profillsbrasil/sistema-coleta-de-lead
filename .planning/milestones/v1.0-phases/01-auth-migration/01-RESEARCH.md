# Phase 1: Auth Migration - Research

**Researched:** 2026-03-24
**Domain:** Authentication migration (Better-Auth -> Supabase Auth), OAuth, RBAC
**Confidence:** HIGH

## Summary

A migracacao de Better-Auth para Supabase Auth e bem documentada e suportada pelo ecossistema oficial. O stack recomendado usa `@supabase/ssr` 0.9.0 + `@supabase/supabase-js` 2.100.0 para SSR com Next.js 16. O padrao oficial cria dois client utilities (browser e server), um `proxy.ts` (renomeado de `middleware.ts` no Next.js 16) para refresh de sessao, e um callback route handler para PKCE OAuth flow.

Para roles (admin/vendedor), a abordagem mais robusta e uma tabela `public.user_roles` com Custom Access Token Hook que injeta o role no JWT. Isso permite checar roles tanto no client (via claims do JWT) quanto no server (via `getClaims()` no proxy/tRPC), e habilita RLS policies futuras. A alternativa de `app_metadata` e mais simples mas menos flexivel.

O projeto precisa: (1) instalar pacotes Supabase, (2) criar utilities de client, (3) criar proxy.ts, (4) criar callback route, (5) refazer login page com OAuth buttons, (6) migrar tRPC context, (7) criar protectedProcedure com role check, (8) migrar env vars, (9) configurar providers no Supabase Dashboard, (10) criar tabela user_roles + custom access token hook.

**Primary recommendation:** Usar `@supabase/ssr` com proxy.ts pattern do Next.js 16, tabela `public.user_roles` com Custom Access Token Hook para RBAC, e `getClaims()` como metodo primario de verificacao de sessao.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** OAuth only -- sem email/password, sem magic link. Apenas botoes de Google, Facebook e LinkedIn.
- **D-02:** Layout: card centralizado na tela com logo/titulo em cima, 3 botoes empilhados verticalmente. Visual limpo e mobile-friendly.
- **D-03:** Ordem dos providers: Google (primeiro, maior destaque), LinkedIn (segundo), Facebook (terceiro).
- **D-04:** Sem fallback para quem nao tem conta em nenhum provider. Equipe de 10 vendedores -- todos tem pelo menos um. Se nao tiver, nao entra.

### Claude's Discretion
- Role storage strategy -- onde armazenar o role (admin/vendedor): user metadata do Supabase vs tabela profiles no public schema. Claude decide a abordagem mais adequada para o monorepo existente.
- Route protection approach -- como proteger rotas de admin: Next.js middleware, server-side check em RSC, tRPC middleware, ou combinacao. Claude decide baseado nas constraints do stack.
- Package structure -- o que acontece com `packages/auth`: manter package com internals trocados vs usar Supabase client direto. Claude decide o que gera menos disrupcao nos imports existentes.
- Env vars migration -- quais env vars substituem `BETTER_AUTH_SECRET` e `BETTER_AUTH_URL`. Supabase requer `SUPABASE_URL` e `SUPABASE_ANON_KEY` (ja tem `DATABASE_URL` que aponta para Supabase).
- Schema migration -- como lidar com as tabelas de Better-Auth (user, session, account, verification) que existem no banco. Supabase Auth gerencia tabelas no schema `auth`, entao as tabelas do schema `public` podem ser dropadas ou adaptadas.

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | Migrar de Better-Auth para Supabase Auth | Core da pesquisa: @supabase/ssr + @supabase/supabase-js substituem better-auth; proxy.ts substitui route handler; Supabase Auth gerencia sessoes via cookies |
| AUTH-02 | User pode fazer login via Google OAuth | signInWithOAuth({ provider: 'google' }) com PKCE flow + callback route; requer config no Google Cloud Console + Supabase Dashboard |
| AUTH-03 | User pode fazer login via Facebook OAuth | signInWithOAuth({ provider: 'facebook' }) com PKCE flow; requer config no Facebook Developers + Supabase Dashboard |
| AUTH-04 | User pode fazer login via LinkedIn OAuth | signInWithOAuth({ provider: 'linkedin_oidc' }) -- provider antigo 'linkedin' deprecado; requer config no LinkedIn Developers + Supabase Dashboard |
| AUTH-05 | Sessao persiste apos refresh do browser | Cookie-based sessions via @supabase/ssr; proxy.ts faz refresh automatico de tokens expirados via getClaims(); PKCE flow usa HTTP-only cookies |
| AUTH-06 | User tem role (admin ou vendedor) armazenado no perfil | Tabela public.user_roles + Custom Access Token Hook injeta role no JWT; getClaims() retorna user_role; acessivel no client e server |
| AUTH-07 | Rotas de admin sao protegidas -- vendedor nao acessa | Tres camadas: proxy.ts redireciona nao-autenticados, tRPC adminProcedure checa role do JWT, RLS policies no banco (futuro) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Monorepo**: Turborepo 2.8, Bun 1.3 -- usar `bun add` para instalar pacotes
- **Linting**: Biome 2.2 (tabs, double quotes) -- rodar `bun run check` apos mudancas
- **Testing**: Vitest 3.2 com workspace -- testes em `packages/api`, `packages/env`
- **TypeScript**: strict mode -- sem `any`, tipos explicitos
- **Env validation**: T3 Env + Zod -- toda env var nova precisa de schema em `packages/env`
- **UI imports**: Path-based, sem barrel -- `@dashboard-leads-profills/ui/components/button`
- **Commits**: Conventional Commits em Portugues
- **Seguranca**: Nunca hardcodar secrets, sempre env vars
- **typedRoutes**: `next.config.ts` tem `typedRoutes: true`
- **Namespace**: `@dashboard-leads-profills/*`

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | 2.100.0 | Supabase client (Auth, DB, Storage) | Official SDK, mantem sessao, PKCE flow |
| @supabase/ssr | 0.9.0 | SSR cookie handling para Supabase | Official SSR adapter, createBrowserClient + createServerClient |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/supabase-js (types) | 2.100.0 | Tipos de User, Session, Claims | Ao tipar contexto tRPC e componentes |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Tabela user_roles | app_metadata no auth.users | app_metadata e mais simples mas: nao pode ser modificado pelo admin sem service_role key; Custom Access Token Hook com tabela separada e o padrao oficial de RBAC da Supabase |
| proxy.ts redirect | Layout-level check em RSC | proxy.ts e mais eficiente (roda antes do RSC) e e o padrao oficial do Next.js 16; layout check nao pode redirecionar antes de renderizar |
| getClaims() | getUser() | getClaims() valida JWT localmente (cached JWKS, rapido); getUser() faz request ao Auth server (mais seguro mas lento); proxy usa getClaims() conforme official example; para operacoes criticas usar getUser() |

**Installation:**
```bash
bun add @supabase/supabase-js @supabase/ssr
```

Nota: `better-auth` sera removido de `packages/auth/package.json` ao final da migracao.

**Version verification:** Versions confirmed via `npm view` on 2026-03-24:
- `@supabase/supabase-js`: 2.100.0
- `@supabase/ssr`: 0.9.0

## Architecture Patterns

### Recommended Project Structure
```
packages/auth/
  src/
    client.ts          # createBrowserClient utility (re-export)
    server.ts          # createServerClient utility (re-export)
    index.ts           # re-exports para manter interface do package

apps/web/
  proxy.ts             # Next.js 16 proxy (session refresh)
  src/
    app/
      auth/
        callback/
          route.ts     # OAuth PKCE code exchange handler
      login/
        page.tsx       # OAuth login page (3 buttons)
      (protected)/     # Route group para rotas autenticadas
        dashboard/
          page.tsx
        ...
      (admin)/         # Route group para rotas admin
        ...
    lib/
      supabase/
        client.ts      # createBrowserClient wrapper
        server.ts      # createServerClient wrapper
        proxy.ts       # updateSession utility para proxy.ts
    components/
      login-card.tsx   # Card com 3 OAuth buttons (substitui sign-in-form + sign-up-form)
      user-menu.tsx    # Atualizado para usar Supabase client
```

### Pattern 1: Supabase Client Utilities (Official Pattern)

**What:** Dois factories de client -- browser e server -- com cookie handling.
**When to use:** Sempre que acessar Supabase Auth em qualquer parte do app.

```typescript
// apps/web/src/lib/supabase/client.ts
// Source: https://github.com/vercel/next.js/blob/canary/examples/with-supabase
import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
```

```typescript
// apps/web/src/lib/supabase/server.ts
// Source: https://github.com/vercel/next.js/blob/canary/examples/with-supabase
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Ignoravel se chamado de Server Component
            // (proxy.ts cuida do refresh)
          }
        },
      },
    },
  )
}
```

### Pattern 2: Next.js 16 Proxy (Session Refresh)

**What:** `proxy.ts` na raiz do app (renomeado de `middleware.ts` no Next.js 16). Exporta funcao `proxy` (nao `middleware`). Refresh de tokens via `getClaims()`.
**When to use:** Toda request que nao seja asset estatico.

```typescript
// apps/web/proxy.ts
// Source: https://github.com/vercel/next.js/blob/canary/examples/with-supabase
import { updateSession } from "@/lib/supabase/proxy"
import { type NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
```

```typescript
// apps/web/src/lib/supabase/proxy.ts
// Source: https://github.com/vercel/next.js/blob/canary/examples/with-supabase
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // CRITICO: nao rodar nada entre createServerClient e getClaims()
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  // Redirecionar nao-autenticados para /login
  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/auth") &&
    request.nextUrl.pathname !== "/"
  ) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

### Pattern 3: OAuth Callback (PKCE Code Exchange)

**What:** Route handler que troca authorization code por session token.
**When to use:** Apos redirect do OAuth provider (Google, Facebook, LinkedIn).

```typescript
// apps/web/src/app/auth/callback/route.ts
// Source: https://supabase.com/docs/guides/auth/social-login/auth-google
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/dashboard"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host")
      const isLocalEnv = process.env.NODE_ENV === "development"
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-code-error`)
}
```

### Pattern 4: OAuth Sign-In (Client-Side)

**What:** Botoes de OAuth que chamam `signInWithOAuth` com redirect para callback.
**When to use:** Login page com botoes de Google, LinkedIn, Facebook.

```typescript
// Padrao para cada provider
"use client"
import { createClient } from "@/lib/supabase/client"

function handleOAuthLogin(provider: "google" | "linkedin_oidc" | "facebook") {
  const supabase = createClient()
  supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
}
```

### Pattern 5: RBAC via Custom Access Token Hook

**What:** Tabela `public.user_roles` + Postgres function como hook que injeta role no JWT.
**When to use:** Para RBAC sem network request adicional (role vem no token).

```sql
-- Source: https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac

-- Enum de roles
CREATE TYPE public.app_role AS ENUM ('admin', 'vendedor');

-- Tabela de roles
CREATE TABLE public.user_roles (
  id        bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id   uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  role      app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Hook que injeta role no JWT
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  user_role public.app_role;
BEGIN
  SELECT role INTO user_role FROM public.user_roles
  WHERE user_id = (event->>'user_id')::uuid;

  claims := event->'claims';

  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  ELSE
    claims := jsonb_set(claims, '{user_role}', '"vendedor"');
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- Permissoes necessarias para o hook funcionar
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
GRANT ALL ON TABLE public.user_roles TO supabase_auth_admin;
```

Apos criar a function, habilitar em: Supabase Dashboard > Authentication > Hooks > Custom Access Token Hook > selecionar `custom_access_token_hook`.

### Pattern 6: tRPC Context com Supabase

**What:** Substituir Better-Auth session por Supabase getClaims() no tRPC context.
**When to use:** Em toda request tRPC que precise de autenticacao.

```typescript
// packages/api/src/context.ts
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function createContext(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll() {
          // tRPC route handler nao precisa setar cookies
          // proxy.ts ja cuida do refresh
        },
      },
    },
  )

  const { data } = await supabase.auth.getClaims()

  return {
    supabase,
    user: data?.claims ?? null,
    userRole: (data?.claims as Record<string, unknown>)?.user_role as string | null,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>
```

### Pattern 7: Protected + Admin Procedures

**What:** tRPC middleware que checa autenticacao e role.

```typescript
// packages/api/src/index.ts
import { initTRPC, TRPCError } from "@trpc/server"
import type { Context } from "./context"

export const t = initTRPC.context<Context>().create()
export const router = t.router
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    })
  }
  return next({
    ctx: { ...ctx, user: ctx.user },
  })
})

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.userRole !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    })
  }
  return next({ ctx })
})
```

### Anti-Patterns to Avoid
- **Usar getSession() para proteger rotas server-side:** getSession() le cookies que podem ser spoofados. Usar getClaims() (valida JWT signature via JWKS) ou getUser() (verifica com auth server).
- **Colocar Supabase client em variavel global:** Com Next.js Fluid Compute, sempre criar novo client por request. Nunca singleton.
- **Rodar codigo entre createServerClient e getClaims no proxy:** Pode causar bugs de sessao dificeis de debugar.
- **Usar `user_metadata` para roles:** user_metadata pode ser modificado pelo proprio usuario via `updateUser()`. Roles devem ficar em app_metadata ou (melhor) em tabela separada.

## Discretion Recommendations

### Role Storage: Tabela `public.user_roles` (RECOMENDADO)

**Razao:** O padrao oficial de RBAC da Supabase usa tabela separada + Custom Access Token Hook. Vantagens:
1. Admin pode gerenciar roles via queries SQL diretas ou futuro admin panel
2. Role e injetado no JWT automaticamente via hook -- sem network request extra
3. Compativel com RLS policies (importante para phases futuras)
4. Mais flexivel que app_metadata (que requer service_role key para modificar)
5. Permite multiplos roles por usuario se necessario no futuro

### Route Protection: Tres camadas (RECOMENDADO)

1. **proxy.ts** -- Redireciona nao-autenticados para /login (rapido, pre-RSC)
2. **tRPC middleware** -- `protectedProcedure` e `adminProcedure` (protege dados)
3. **RLS no banco** -- Preparar para futuro (nao obrigatorio nesta phase)

Nao usar route groups `(admin)` com layout-level auth check para bloqueio. Usar tRPC adminProcedure para proteger os dados e proxy.ts para redirect de nao-autenticados. Paginas de admin checam role no client para UX (mostrar/esconder nav items), mas a protecao real e server-side via tRPC.

### Package Structure: Manter `packages/auth` com internals trocados (RECOMENDADO)

**Razao:** Manter `packages/auth` preserva os imports existentes (`@dashboard-leads-profills/auth`). Internamente, troca Better-Auth por re-exports dos Supabase utilities. Isso minimiza mudancas em `packages/api` e `apps/web`.

```typescript
// packages/auth/src/index.ts (novo)
export { createClient as createBrowserClient } from "./client"
export { createClient as createServerClient } from "./server"
```

Porem, a utility de proxy (`updateSession`) e o callback handler vivem em `apps/web` pois dependem de Next.js APIs.

### Env Vars: Migrar para SUPABASE_URL + ANON_KEY (RECOMENDADO)

| Remove | Add | Scope |
|--------|-----|-------|
| `BETTER_AUTH_SECRET` | -- | Nao precisa equivalente (Supabase gerencia) |
| `BETTER_AUTH_URL` | -- | Nao precisa (Supabase gerencia redirect) |
| -- | `NEXT_PUBLIC_SUPABASE_URL` | Client + Server (public) |
| -- | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server (public) |
| `CORS_ORIGIN` | -- | Supabase Dashboard gerencia CORS |

Manter `DATABASE_URL` (ja aponta para Supabase Postgres). `NEXT_PUBLIC_*` vars sao expostas ao browser -- isso e intencional e seguro para URL e Anon Key (anon key so tem permissoes via RLS).

### Schema Migration: Dropar tabelas Better-Auth (RECOMENDADO)

Supabase Auth usa schema `auth` (gerenciado automaticamente). As tabelas Better-Auth no schema `public` (user, session, account, verification) devem ser dropadas via migration Drizzle. O schema Drizzle em `packages/db/src/schema/auth.ts` deve ser reescrito para conter apenas `user_roles` (tabela nova para RBAC).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cookie-based session management | Custom cookie handling | @supabase/ssr createServerClient | Gerencia chunked cookies, refresh tokens, PKCE flow automaticamente |
| JWT validation | Manual JWT decode/verify | supabase.auth.getClaims() | Usa JWKS cache, valida signature, retorna claims tipados |
| OAuth PKCE flow | Manual code exchange | supabase.auth.exchangeCodeForSession() | Gerencia code verifier, state, nonce automaticamente |
| Session refresh em SSR | Manual token refresh | proxy.ts + updateSession | Padrao oficial, refresh antes de RSC render |
| Role injection no JWT | Custom JWT middleware | Custom Access Token Hook (Postgres) | Executa no Supabase Auth server, sem latencia adicional |

**Key insight:** Supabase Auth gerencia todo o ciclo de autenticacao (tokens, cookies, refresh, PKCE). O unico codigo custom necessario e: (1) utilities de criacao de client, (2) proxy.ts para refresh, (3) callback handler para code exchange, (4) tabela + hook para roles.

## Common Pitfalls

### Pitfall 1: getSession() vs getClaims() vs getUser()
**What goes wrong:** Usar `getSession()` server-side permite session spoofing via cookies manipulados.
**Why it happens:** getSession() le cookies sem validar o JWT. Era o padrao antigo.
**How to avoid:** Usar `getClaims()` (valida JWT signature localmente via JWKS cache) para performance. Usar `getUser()` (faz request ao Auth server) apenas quando precisa garantir que sessao nao foi revogada.
**Warning signs:** Codigo server-side usando `supabase.auth.getSession()` sem `getClaims()` ou `getUser()`.

### Pitfall 2: Codigo entre createServerClient e getClaims no proxy
**What goes wrong:** Usuarios sao deslogados aleatoriamente.
**Why it happens:** O proxy precisa processar cookies antes de qualquer outra operacao.
**How to avoid:** Chamar `getClaims()` imediatamente apos `createServerClient()` no proxy.
**Warning signs:** Qualquer `await` ou logica condicional entre a criacao do client e getClaims.

### Pitfall 3: LinkedIn provider name errado
**What goes wrong:** OAuth login com LinkedIn falha com provider nao encontrado.
**Why it happens:** O provider antigo 'linkedin' foi deprecado. Supabase usa 'linkedin_oidc'.
**How to avoid:** Usar `provider: 'linkedin_oidc'` em signInWithOAuth.
**Warning signs:** Erro "Provider not found" ou "invalid provider" ao tentar login com LinkedIn.

### Pitfall 4: Supabase client em variavel global
**What goes wrong:** Sessoes misturadas entre requests em producao.
**Why it happens:** Next.js Fluid Compute reutiliza processos. Client em singleton compartilha estado.
**How to avoid:** Sempre criar novo client em cada request/component. Nunca `export const supabase = createClient()` em modulo global.
**Warning signs:** Usuarios vendo dados de outros usuarios; sessoes "pulando" entre contas.

### Pitfall 5: Redirect URL nao configurada no Supabase Dashboard
**What goes wrong:** OAuth callback retorna erro apos redirect do provider.
**Why it happens:** Supabase valida redirect URLs. Se o callback URL nao estiver na allowlist, rejeita.
**How to avoid:** Adicionar `http://localhost:3001/auth/callback` (dev) e `https://production-domain/auth/callback` no Supabase Dashboard > Authentication > URL Configuration.
**Warning signs:** Erro "redirect_uri_mismatch" do OAuth provider.

### Pitfall 6: Esquecer de configurar providers no Supabase Dashboard
**What goes wrong:** signInWithOAuth retorna erro de provider nao habilitado.
**Why it happens:** Cada provider OAuth precisa ser habilitado manualmente no Dashboard com Client ID e Secret obtidos do provider.
**How to avoid:** Configurar Google, Facebook e LinkedIn (OIDC) em Supabase Dashboard > Authentication > Providers ANTES de implementar os botoes.
**Warning signs:** Erro "Provider is not enabled" no client.

### Pitfall 7: Nao dar permissoes ao custom access token hook
**What goes wrong:** Hook nao executa e role nao aparece no JWT.
**Why it happens:** A function precisa de GRANT EXECUTE para `supabase_auth_admin`.
**How to avoid:** Executar todos os GRANTs documentados no pattern 5 acima.
**Warning signs:** JWT nao contem claim `user_role` apos login.

## Code Examples

Verified patterns from official sources. Ver secao "Architecture Patterns" acima para exemplos completos de:
- Client utilities (Pattern 1)
- proxy.ts (Pattern 2)
- OAuth callback (Pattern 3)
- OAuth sign-in (Pattern 4)
- RBAC SQL setup (Pattern 5)
- tRPC context (Pattern 6)
- Protected procedures (Pattern 7)

### OAuth Login Button (shadcn/ui style)

```tsx
// apps/web/src/components/login-card.tsx
"use client"

import { Button } from "@dashboard-leads-profills/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@dashboard-leads-profills/ui/components/card"
import { createClient } from "@/lib/supabase/client"

function handleLogin(provider: "google" | "linkedin_oidc" | "facebook") {
  const supabase = createClient()
  supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
}

export default function LoginCard() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-center text-2xl">
          Dashboard Leads Profills
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Button
          className="w-full"
          onClick={() => handleLogin("google")}
        >
          Entrar com Google
        </Button>
        <Button
          className="w-full"
          variant="outline"
          onClick={() => handleLogin("linkedin_oidc")}
        >
          Entrar com LinkedIn
        </Button>
        <Button
          className="w-full"
          variant="outline"
          onClick={() => handleLogin("facebook")}
        >
          Entrar com Facebook
        </Button>
      </CardContent>
    </Card>
  )
}
```

### User Menu com Supabase (migrado)

```tsx
// apps/web/src/components/user-menu.tsx (migrado)
"use client"

import { Button } from "@dashboard-leads-profills/ui/components/button"
import { DropdownMenu, /* ... */ } from "@dashboard-leads-profills/ui/components/dropdown-menu"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"

export default function UserMenu() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  // ... render com user.email, user.user_metadata.full_name, etc.
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| @supabase/auth-helpers-nextjs | @supabase/ssr | 2024 | Deprecated; ssr unifica todos frameworks |
| middleware.ts | proxy.ts | Next.js 16 (2026-02) | Renomeado; funcao exportada = `proxy` nao `middleware` |
| getSession() server-side | getClaims() / getUser() | supabase-js 2.x + asymmetric keys (2025-05) | getSession() nao valida JWT; getClaims() usa JWKS |
| SUPABASE_ANON_KEY | SUPABASE_PUBLISHABLE_KEY | 2025-11 (new projects) | Rename gradual; ambos funcionam; anon key continua valido para projetos existentes |
| provider: 'linkedin' | provider: 'linkedin_oidc' | 2024-01 | LinkedIn deprecou OAuth 2.0 básico; Supabase usa OIDC |
| better-auth (este projeto) | Supabase Auth | N/A (migracao por decisao do projeto) | Supabase Auth e gerenciado; menos codigo custom |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: substituido por `@supabase/ssr`
- `middleware.ts` no Next.js 16: renomeado para `proxy.ts`
- `supabase.auth.getSession()` server-side: usar `getClaims()` ou `getUser()`
- provider `linkedin`: usar `linkedin_oidc`

## Open Questions

1. **Custom Access Token Hook: precisa de migration Drizzle?**
   - What we know: A tabela `user_roles` e a function SQL vivem no schema `public` do Supabase. Drizzle gerencia o schema `public`.
   - What's unclear: Se devemos criar a tabela via Drizzle migration (`db:generate` + `db:migrate`) ou diretamente no Supabase SQL Editor (ja que o hook e configurado via Dashboard).
   - Recommendation: Criar a tabela via Drizzle migration (mantém schema versionado no git) e configurar o hook SQL separadamente via Supabase SQL Editor ou migration seed. Documentar os GRANTs no plano.

2. **Supabase Dashboard config: automatizavel ou manual?**
   - What we know: Providers OAuth (Google, Facebook, LinkedIn) precisam ser habilitados no Supabase Dashboard com Client ID/Secret de cada provider.
   - What's unclear: Se o usuario ja configurou os providers no Dashboard ou se precisa criar apps em cada plataforma (Google Cloud Console, Facebook Developers, LinkedIn Developers).
   - Recommendation: Plano deve incluir um passo manual de configuracao de providers como pre-requisito. Listar os URLs de callback que precisam ser adicionados.

3. **Tabelas Better-Auth existentes: dropar ou manter?**
   - What we know: Better-Auth criou tabelas `user`, `session`, `account`, `verification` no schema `public`. Supabase Auth usa o schema `auth`.
   - What's unclear: Se ha dados existentes nessas tabelas que precisam ser migrados para auth.users do Supabase.
   - Recommendation: Como o projeto esta em desenvolvimento (sem usuarios reais), dropar as tabelas via Drizzle migration. Se houver dados, migrar antes de dropar.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun | Package manager + runtime | Verificar | 1.3.x esperado | -- (obrigatorio) |
| Node.js | Next.js runtime | Verificar | 22+ esperado | -- (obrigatorio) |
| PostgreSQL (Supabase) | Auth + Data | Sim (via DATABASE_URL) | -- | -- |
| Supabase Project | Auth providers, Dashboard | Sim (ja tem DATABASE_URL) | -- | -- |
| Google Cloud Console | Google OAuth provider | Manual | -- | Configurar manualmente |
| Facebook Developers | Facebook OAuth provider | Manual | -- | Configurar manualmente |
| LinkedIn Developers | LinkedIn OAuth provider | Manual | -- | Configurar manualmente |

**Missing dependencies with no fallback:**
- OAuth provider configs no Supabase Dashboard (manual setup necessario)

**Missing dependencies with fallback:**
- None

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.1 |
| Config file | `vitest.workspace.ts` (root), `packages/api/vitest.config.ts`, `packages/env/vitest.config.ts` |
| Quick run command | `bun run test` |
| Full suite command | `bun run test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Supabase client cria corretamente com env vars | unit | `bun vitest run packages/env/src --reporter=verbose` | N/A Wave 0 |
| AUTH-02 | signInWithOAuth gera URL para Google | unit (mock) | `bun vitest run packages/api/src --reporter=verbose` | N/A Wave 0 |
| AUTH-03 | signInWithOAuth gera URL para Facebook | unit (mock) | `bun vitest run packages/api/src --reporter=verbose` | N/A Wave 0 |
| AUTH-04 | signInWithOAuth gera URL para LinkedIn OIDC | unit (mock) | `bun vitest run packages/api/src --reporter=verbose` | N/A Wave 0 |
| AUTH-05 | Sessao persiste (proxy refresh) | manual-only | Manual: login, fechar browser, reabrir | -- |
| AUTH-06 | user_role presente no JWT claims | unit | `bun vitest run packages/api/src --reporter=verbose` | N/A Wave 0 |
| AUTH-07 | adminProcedure bloqueia vendedor | unit | `bun vitest run packages/api/src --reporter=verbose` | N/A Wave 0 |

### Sampling Rate
- **Per task commit:** `bun run test`
- **Per wave merge:** `bun run test && bun run check-types && bun run check`
- **Phase gate:** Full suite green + manual OAuth login verification

### Wave 0 Gaps
- [ ] `packages/env/src/server.test.ts` -- Verificar que novas env vars (SUPABASE_URL, ANON_KEY) sao validadas
- [ ] `packages/api/src/context.test.ts` -- Testar criacao de context com/sem sessao Supabase mockada
- [ ] `packages/api/src/index.test.ts` -- Testar protectedProcedure e adminProcedure bloqueiam corretamente

## Sources

### Primary (HIGH confidence)
- [Official Next.js with-supabase example](https://github.com/vercel/next.js/blob/canary/examples/with-supabase/) -- proxy.ts, client/server utilities, auth button (fetched via GitHub API 2026-03-24)
- [Supabase RBAC Custom Claims docs](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) -- SQL schema, hook function, RLS policies
- [Supabase SSR client creation docs](https://supabase.com/docs/guides/auth/server-side/creating-a-client) -- createBrowserClient, createServerClient patterns
- [Supabase Google OAuth docs](https://supabase.com/docs/guides/auth/social-login/auth-google) -- Dashboard setup, callback URL, signInWithOAuth, PKCE
- [Supabase LinkedIn OAuth docs](https://supabase.com/docs/guides/auth/social-login/auth-linkedin) -- linkedin_oidc provider, setup steps
- [Supabase Facebook OAuth docs](https://supabase.com/docs/guides/auth/social-login/auth-facebook) -- Dashboard setup, callback URL
- [Next.js 16 proxy.ts migration](https://nextjs.org/docs/app/guides/upgrading/version-16) -- middleware -> proxy rename

### Secondary (MEDIUM confidence)
- [Supabase signInWithOAuth API reference](https://supabase.com/docs/reference/javascript/auth-signinwithoauth) -- Function signature, parameters, options
- [Supabase getClaims docs](https://supabase.com/docs/reference/javascript/auth-getclaims) -- JWT validation via JWKS
- [npm @supabase/supabase-js](https://www.npmjs.com/package/@supabase/supabase-js) -- Version 2.100.0 confirmed
- [npm @supabase/ssr](https://www.npmjs.com/package/@supabase/ssr) -- Version 0.9.0 confirmed
- [Supabase API keys discussion](https://github.com/orgs/supabase/discussions/29260) -- publishable_key vs anon_key timeline

### Tertiary (LOW confidence)
- None -- all findings verified against official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- official packages, versions confirmed via npm registry
- Architecture: HIGH -- patterns from official Next.js with-supabase example (canary branch) + official docs
- Pitfalls: HIGH -- documented in official Supabase guides and confirmed via community discussions
- RBAC approach: HIGH -- official Custom Claims guide with complete SQL examples
- Env vars: MEDIUM -- publishable_key vs anon_key transition in progress; both work

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable ecosystem, 30 days)
