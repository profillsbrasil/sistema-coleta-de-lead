# Migração: Supabase Auth → Better Auth + Drizzle

**Data**: 2026-04-17
**Branch alvo**: `feat/better-auth-migration`
**Escopo**: big-bang, zero migração de dados de usuários.

## Contexto

Sistema hoje usa Supabase Auth para signup/login (email+senha + Google OAuth),
sessão via cookies `@supabase/ssr`, claims customizados via função PG
`custom_access_token_hook`, admin API via service role. Postgres é hospedado
na Supabase e acessado pelo app via Drizzle (DATABASE_URL).

Problemas recorrentes com Supabase Auth:
- SMTP hosted com regras restritivas (Resend exige domínio verificado;
  sender `@gmail.com` → `550 domain not verified`). Emails de confirmação
  não chegam (log `auth` 2026-04-17T15:13:58Z).
- Custom claims via `custom_access_token_hook` comentado em `config.toml`.
- Admin API exige service role key carregada no servidor.
- Dependência dupla: `@supabase/ssr` + `@supabase/supabase-js` em apps/web
  e em packages/api.
- Acoplamento entre login e provedor de DB.

**Objetivo**: desacoplar auth do Supabase. Supabase permanece apenas como
Postgres (via `DATABASE_URL`). Better Auth assume signup, login, sessão,
OAuth, admin — tudo em código próprio no monorepo, com Drizzle adapter.

**Decisões do usuário (captadas via AskUserQuestion, 2026-04-17)**:
- Zerar 6 usuários existentes e recadastrar. Sem script de migração.
- Métodos de login: email/senha + Google OAuth.
- Email de confirmação: **desligado**. `emailVerified = true` auto
  (fit para coleta em eventos, zero fricção).
- Sessão DB-backed (padrão Better Auth).
- Admin via plugin oficial `admin` (substitui `user_roles` + hook PG +
  `supabaseAdmin.auth.admin.*`).

## Stack alvo

- `better-auth@latest` core
- `better-auth/adapters/drizzle` provider `pg`
- `better-auth/plugins → admin`
- `better-auth/react` (client)
- `better-auth/next-js` (toNextJsHandler)
- `@better-auth/cli` dev-only (gera schema Drizzle)
- Drizzle continua cliente DB único
- Postgres hospedado Supabase (DATABASE_URL)

## Arquitetura alvo

```
packages/
├── auth/                       NOVO
│   ├── src/index.ts            betterAuth() instance
│   ├── src/schema.ts           user/session/account/verification (Drizzle)
│   ├── src/client.ts           createAuthClient() + adminClient()
│   └── package.json            exports server + client
├── db/src/schema/
│   ├── auth.ts                 REMOVER (user_roles drop)
│   └── leads.ts                FK leads.user_id → user.id (opcional)
├── api/src/
│   ├── context.ts              auth.api.getSession({ headers })
│   ├── index.ts                adminProcedure usa ctx.user.role
│   └── routers/admin/users.ts  auth.api.listUsers/banUser/unbanUser
├── env/src/
│   ├── server.ts               BETTER_AUTH_*, GOOGLE_*
│   └── web.ts                  NEXT_PUBLIC_BETTER_AUTH_URL
apps/web/src/
├── app/
│   ├── api/auth/[...all]/route.ts       NOVO (toNextJsHandler)
│   ├── auth/callback/route.ts           REMOVER
│   ├── auth/confirm/route.ts            REMOVER
│   ├── (public)/forgot-password/        REMOVER
│   └── (public)/update-password/        REMOVER
├── middleware.ts                        getSessionCookie (Edge-safe)
├── lib/
│   ├── supabase/                        REMOVER (client/server/proxy)
│   └── auth/auth-snapshot.ts            refatorar tipo
└── components/
    ├── login-card.tsx                   authClient.signIn.*/signUp.email
    ├── user-menu.tsx                    authClient.useSession + signOut
    ├── global-header.tsx                authClient.signOut
    └── app-auth-provider.tsx            authClient.useSession (nativo)
```

## Schema DB — mudanças

### Drop (migration SQL manual, fora do fluxo Better Auth CLI)

```sql
-- Remover função de hook antiga
DROP FUNCTION IF EXISTS public.custom_access_token_hook(jsonb);

-- Limpeza total de dados de usuário
TRUNCATE public.user_roles CASCADE;
DELETE FROM public.leads;

-- Drop tabela + enum de roles (role vira campo em user)
DROP TABLE IF EXISTS public.user_roles;
DROP TYPE IF EXISTS public.app_role;
```

No painel Supabase → Authentication: desligar Email provider + Google
provider (impede signup via Supabase). Remover SMTP custom.

### Add (via `bunx @better-auth/cli generate --output packages/auth/src/schema.ts`)

Tabelas geradas pelo CLI do Better Auth:

- `user` — `id uuid pk`, `email unique`, `emailVerified bool default true`,
  `name`, `image`, `role text default 'vendedor'`, `banned bool`,
  `banReason`, `banExpires`, `createdAt`, `updatedAt`
- `session` — `id`, `userId fk user.id`, `token unique`, `expiresAt`,
  `ipAddress`, `userAgent`, `impersonatedBy`, `createdAt`, `updatedAt`
- `account` — `id`, `userId fk`, `providerId` (`credential`|`google`),
  `accountId`, `password` (credential), `accessToken`, `refreshToken`,
  `idToken`, `scope`, `createdAt`, `updatedAt`
- `verification` — `id`, `identifier`, `value`, `expiresAt`, `createdAt`,
  `updatedAt` (criado pelo CLI; não usado com autoVerify off)

Aplicar: `bun run db:generate && bun run db:push`.

### FK opcional em leads

```sql
ALTER TABLE public.leads
  ADD CONSTRAINT leads_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.user(id) ON DELETE CASCADE;
```

Melhora integridade. Executar após Better Auth criar tabela `user`.

## Código crítico

### `packages/auth/src/index.ts`

```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { db } from "@dashboard-leads-profills/db";
import * as schema from "./schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: false,
    minPasswordLength: 6,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "vendedor", input: false },
    },
  },
  plugins: [
    admin({ defaultRole: "vendedor", adminRoles: ["admin"] }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL!],
});

export type Session = typeof auth.$Infer.Session;
```

### `packages/auth/src/client.ts`

```ts
import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  plugins: [adminClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
```

### `apps/web/src/app/api/auth/[...all]/route.ts`

```ts
import { auth } from "@dashboard-leads-profills/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

### `apps/web/src/middleware.ts`

```ts
import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_EXACT = new Set(["/", "/login", "/offline", "/sw.js"]);
const PUBLIC_PREFIXES = ["/api/auth"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_EXACT.has(pathname)) return NextResponse.next();
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.next();

  const cookie = getSessionCookie(req);
  if (!cookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|webp|svg|ico)).*)"],
};
```

`getSessionCookie` só valida presença/assinatura. Não hit DB. Validação
real ocorre em contexto tRPC e Server Components.

### `packages/api/src/context.ts`

```ts
import { auth } from "@dashboard-leads-profills/auth";
import type { NextRequest } from "next/server";

export async function createTRPCContext(opts: { req: NextRequest }) {
  const session = await auth.api.getSession({ headers: opts.req.headers });
  return {
    headers: opts.req.headers,
    user: session?.user ?? null,
    userRole: session?.user.role ?? null,
    session: session?.session ?? null,
  };
}
export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
```

### `packages/api/src/index.ts`

```ts
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.userRole !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});
```

Contract igual para consumidores — só muda origem dos campos.
`ctx.user.sub` → `ctx.user.id` (atualizar `leaderboard.ts:7` e
`admin/users.ts:104`).

### `apps/web/src/components/login-card.tsx`

Substituir handlers:

```tsx
// signup
const { error } = await authClient.signUp.email({
  email: trimmedEmail,
  password,
  name: trimmedName,
});
if (error) { setFormError(error.message); return; }
router.replace("/dashboard");
router.refresh();

// signin email
const { error } = await authClient.signIn.email({
  email: trimmedEmail,
  password,
});
if (error) { setFormError("Email ou senha incorretos."); return; }
router.replace("/dashboard");
router.refresh();

// Google
await authClient.signIn.social({
  provider: "google",
  callbackURL: "/dashboard",
});
```

Remover: estado `signupSuccess`, tela "verifique email", links
`/forgot-password`, `/update-password`.

### Admin router `packages/api/src/routers/admin/users.ts`

```ts
// listUsers
const result = await auth.api.listUsers({
  query: { limit: perPage, offset: (page - 1) * perPage },
  headers: ctx.headers,
});

// ban
await auth.api.banUser({
  body: { userId, banReason: "desativado por admin" },
  headers: ctx.headers,
});

// unban
await auth.api.unbanUser({
  body: { userId },
  headers: ctx.headers,
});
```

### Queries SQL (leaderboard + stats + admin/leads)

Trocar em `packages/api/src/routers/leaderboard.ts:13-48`,
`admin/leads.ts:140`, `admin/stats.ts:135`:

```sql
-- antes:
FROM auth.users u
u.raw_user_meta_data->>'name' as name

-- depois:
FROM public."user" u
u.name as name
```

(nota: `user` é palavra reservada em PG; quotar.)

### Offline snapshot `apps/web/src/lib/auth/auth-snapshot.ts`

Substituir tipo `User` Supabase por:

```ts
type AppUser = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "vendedor";
  image?: string;
};
```

`app-auth-provider.tsx` simplifica: `authClient.useSession()` nativo
substitui `getSession + getClaims + onAuthStateChange` manual.

## Env changes

Adicionar em `apps/web/.env`:

```env
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_URL=http://localhost:3001
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3001
GOOGLE_CLIENT_ID=<Google Cloud Console>
GOOGLE_CLIENT_SECRET=<Google Cloud Console>
```

Remover:

```env
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Manter (único vínculo com Supabase):

```env
DATABASE_URL=postgresql://...@db.xoebbbpkauyjgccakjdy.supabase.co:5432/postgres
```

`packages/env/src/server.ts` — substituir keys Supabase por Better Auth:

```ts
BETTER_AUTH_SECRET: z.string().min(32),
BETTER_AUTH_URL: z.string().url(),
GOOGLE_CLIENT_ID: z.string().min(1),
GOOGLE_CLIENT_SECRET: z.string().min(1),
```

`packages/env/src/web.ts` — só `NEXT_PUBLIC_BETTER_AUTH_URL`.

### Google Cloud Console

- Adicionar authorized redirect URIs:
  - `http://localhost:3001/api/auth/callback/google`
  - `https://<prod-domain>/api/auth/callback/google`
- Remover URI antigo `<supabase-ref>.supabase.co/auth/v1/callback`.

## Ordem de execução

Branch: `feat/better-auth-migration`. Commits atômicos.

1. Criar `packages/auth` + `package.json` + `tsconfig` (extends config base,
   exports server `./index` + client `./client`).
2. Instalar deps em `packages/auth` e `apps/web`: `bun add better-auth`
   (ambos), `bun add -d @better-auth/cli` (raiz).
3. Gerar schema: `bunx @better-auth/cli generate --config packages/auth/src/index.ts --output packages/auth/src/schema.ts`.
4. Registrar schema no Drizzle principal. `drizzle.config.ts` deve incluir
   tabelas Better Auth. `bun run db:generate && bun run db:push`.
5. Criar `packages/auth/src/index.ts` + `client.ts`.
6. Criar `apps/web/src/app/api/auth/[...all]/route.ts`.
7. Atualizar envs (`packages/env/*`, `apps/web/.env`) + Google Cloud
   Console.
8. Reescrever `apps/web/src/middleware.ts`.
9. Reescrever `packages/api/src/context.ts` + procedures.
10. Reescrever `apps/web/src/components/login-card.tsx`.
11. Remover `app/auth/callback`, `app/auth/confirm`, `(public)/forgot-password`,
    `(public)/update-password`.
12. Atualizar `user-menu.tsx`, `global-header.tsx`, `app-auth-provider.tsx`
    para `authClient`.
13. Reescrever `packages/api/src/routers/admin/users.ts` (list/ban/unban
    via `auth.api.*`).
14. Trocar SQL em `routers/leaderboard.ts`, `admin/leads.ts`,
    `admin/stats.ts` (`auth.users` → `public."user"`).
15. Refatorar `apps/web/src/lib/auth/auth-snapshot.ts` + bootstrap.
16. Drop Supabase Auth:
    - `rm -rf apps/web/src/lib/supabase/`
    - `rm packages/api/src/lib/supabase-admin.ts`
    - `bun remove @supabase/ssr @supabase/supabase-js` (apps/web + packages/api)
    - SQL migration de drop (ver seção "Drop")
    - Painel Supabase: desligar Email + Google providers, remover SMTP
17. Seed admin:
    ```ts
    const res = await auth.api.signUpEmail({
      body: { email: "admin@...", password: "...", name: "Admin" },
    });
    // depois:
    // UPDATE "user" SET role = 'admin' WHERE email = 'admin@...';
    ```
18. Atualizar `turbo.json` — incluir `packages/auth` em `build`,
    `check-types`, `dev`.

## Verificação end-to-end

```bash
bun install
bun run db:push
bun run check-types
bun run check
bun run dev
```

Fluxo manual, por ordem:

1. `/login` → signup email/senha → redirect `/dashboard` direto.
2. Logout → signin email/senha → `/dashboard`.
3. Logout → Google → callback `/api/auth/callback/google` → `/dashboard`.
4. Checar cookie `better-auth.session_token` no DevTools.
5. Como vendedor, tentar `/admin/*` → redirect/403.
6. Promover user a admin via SQL → `/admin/leads` abre.
7. Admin → listar users → banir um → login dele falha.
8. Leaderboard mostra `user.name`.
9. Offline: logar, matar rede, reload `/dashboard` → snapshot ok.
10. tRPC `leads.create` sem sessão → UNAUTHORIZED.

Validação DB:

```sql
SELECT count(*) FROM public."user";
SELECT count(*) FROM public.session;
SELECT count(*) FROM public.account;
SELECT count(*) FROM auth.users;  -- legado, deve ser ignored
```

## Fora de escopo

- Magic link / passkey / 2FA
- Organization plugin / multi-tenant
- RLS nas tabelas public (advisor já alerta — issue separada)
- Email transacional / reset de senha
- Impersonation (disponível no plugin admin, ativar quando precisar)
- Rate limit / CAPTCHA no signup
- Migração de dados de usuários existentes (user escolheu zerar)

## Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Google OAuth client redirect URI errado em prod | Atualizar Google Cloud Console antes do deploy; checklist no runbook |
| Tabelas `user`/`session` conflitando com nomes existentes | `user` é palavra reservada em PG — Better Auth gera quotado; conferir durante `db:push` |
| Cookie name diferente entre ambientes quebra SW cache | `better-auth.session_token` é fixo; SW não precisa mudar |
| Edge middleware + DB adapter incompatível | `getSessionCookie` não toca DB; seguro em Edge |
| Reset de senha removido | Plugin admin permite admin trocar senha; magic link/email pode ser adicionado depois |
| `packages/auth` nome conflita com referência em CLAUDE.md | CLAUDE.md menciona `packages/auth` legado que não existe fisicamente; atualizar doc no mesmo PR |
