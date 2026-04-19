# Migração Supabase Auth → Better Auth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir Supabase Auth por Better Auth + Drizzle, mantendo Supabase apenas como Postgres. Zero migração de dados, recadastro forçado, email de confirmação desligado, Google OAuth preservado, admin via plugin oficial.

**Architecture:** Novo pacote `packages/auth` hospeda instância Better Auth + schema Drizzle + client React. Handler Next.js em `/api/auth/[...all]`. Middleware usa `getSessionCookie` (Edge-safe). Contexto tRPC troca `supabase.auth.getClaims` por `auth.api.getSession({ headers })`. Role vira campo em `user` (via plugin admin), eliminando tabela `user_roles` e função PG `custom_access_token_hook`.

**Tech Stack:** `better-auth` (core + adapters/drizzle + plugins/admin + react + next-js), `@better-auth/cli` (dev), Drizzle, Next.js 16 App Router, tRPC 11, Postgres (Supabase hosted via DATABASE_URL).

**Spec:** `docs/superpowers/specs/2026-04-17-supabase-auth-to-better-auth-design.md`

**Branch:** `feat/better-auth-migration` (criar antes de Task 1).

---

## Convenções

- Diretório base: `/home/othavio/Work/profills/sistema-coleta-de-lead`.
- Package manager: `bun` via turbo. Commits em PT Conventional Commits.
- Verificação por task: critério de aceitação explícito (type-check, dev boot, fluxo manual) — sem TDD artificial (repo não tem suite de auth).
- Commit frequente: um commit por task salvo indicação contrária.

## Mapa de arquivos

**Create:**
- `packages/auth/package.json`
- `packages/auth/tsconfig.json`
- `packages/auth/src/index.ts` — server instance
- `packages/auth/src/schema.ts` — tabelas Drizzle geradas
- `packages/auth/src/client.ts` — React client
- `apps/web/src/app/api/auth/[...all]/route.ts` — handler Next
- `packages/db/src/migrations/drop-supabase-auth.sql` — SQL cleanup
- `scripts/seed-admin.ts` — script de seed admin inicial

**Modify:**
- `apps/web/package.json` — add better-auth, remove @supabase/*
- `packages/api/package.json` — add workspace dep @auth, remove @supabase/*
- `packages/db/drizzle.config.ts` — incluir schema auth
- `packages/db/src/schema/index.ts` — export schema auth
- `packages/env/src/server.ts` — BETTER_AUTH_*, GOOGLE_*
- `packages/env/src/web.ts` — NEXT_PUBLIC_BETTER_AUTH_URL
- `apps/web/src/middleware.ts` — getSessionCookie
- `apps/web/src/components/login-card.tsx` — authClient
- `apps/web/src/components/user-menu.tsx` — authClient
- `apps/web/src/components/global-header.tsx` — authClient.signOut
- `apps/web/src/components/app-auth-provider.tsx` — authClient.useSession
- `apps/web/src/lib/auth/auth-snapshot.ts` — BetterAuthUser
- `apps/web/src/lib/auth/bootstrap.ts` — tipo novo
- `packages/api/src/context.ts` — getSession
- `packages/api/src/index.ts` — procedures
- `packages/api/src/routers/admin/users.ts` — auth.api.*
- `packages/api/src/routers/leaderboard.ts` — SQL public."user"
- `packages/api/src/routers/admin/leads.ts` — SQL public."user"
- `packages/api/src/routers/admin/stats.ts` — SQL public."user"
- `turbo.json` — incluir packages/auth
- `apps/web/.env` — novas vars
- `CLAUDE.md` — atualizar referências auth
- `.claude/CLAUDE.md` — idem

**Delete:**
- `apps/web/src/app/auth/callback/route.ts`
- `apps/web/src/app/auth/confirm/route.ts`
- `apps/web/src/app/(public)/forgot-password/` (inteiro)
- `apps/web/src/app/(public)/update-password/` (inteiro)
- `apps/web/src/lib/supabase/` (inteiro)
- `packages/api/src/lib/supabase-admin.ts`
- `packages/db/src/schema/auth.ts`
- `packages/db/src/migrations/custom-access-token-hook.sql` (já aplicada → drop via nova migration)

---

## Task 0: Criar branch de trabalho

**Files:** — (nenhum, só git)

- [ ] **Step 1: Criar branch e salvar WIP atual**

```bash
cd /home/othavio/Work/profills/sistema-coleta-de-lead
git stash push -u -m "wip antes better-auth migration"
git checkout -b feat/better-auth-migration
git stash pop
```

Expected: branch `feat/better-auth-migration` checada, working tree com mudanças pré-existentes preservadas.

**Critério aceitação:** `git branch --show-current` retorna `feat/better-auth-migration`.

---

## Task 1: Scaffold packages/auth

**Files:**
- Create: `packages/auth/package.json`
- Create: `packages/auth/tsconfig.json`
- Create: `packages/auth/src/index.ts` (stub)
- Create: `packages/auth/src/client.ts` (stub)

- [ ] **Step 1: Criar `packages/auth/package.json`**

```json
{
  "name": "@dashboard-leads-profills/auth",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./client": "./src/client.ts",
    "./schema": "./src/schema.ts"
  },
  "scripts": {
    "check-types": "tsc --noEmit",
    "generate": "better-auth generate --config src/index.ts --output src/schema.ts --y"
  },
  "dependencies": {
    "better-auth": "^1.3.10",
    "@dashboard-leads-profills/db": "workspace:*",
    "drizzle-orm": "catalog:"
  },
  "devDependencies": {
    "@better-auth/cli": "^1.3.10",
    "@dashboard-leads-profills/config": "workspace:*",
    "typescript": "catalog:"
  },
  "peerDependencies": {
    "react": "^19.0.0"
  }
}
```

- [ ] **Step 2: Criar `packages/auth/tsconfig.json`**

```json
{
  "extends": "@dashboard-leads-profills/config/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Stubs iniciais**

`packages/auth/src/index.ts`:
```ts
export const placeholder = "better-auth-instance-tbd";
```

`packages/auth/src/client.ts`:
```ts
export const clientPlaceholder = "better-auth-client-tbd";
```

- [ ] **Step 4: Instalar deps**

```bash
bun install
```

Expected: `packages/auth/node_modules` populado, sem erros.

- [ ] **Step 5: Commit**

```bash
git add packages/auth turbo.json
git commit -m "feat(auth): scaffold pacote @dashboard-leads-profills/auth"
```

**Critério aceitação:** `bun install` completa sem erro; `cat packages/auth/package.json | jq .name` retorna `@dashboard-leads-profills/auth`.

---

## Task 2: Atualizar turbo.json

**Files:**
- Modify: `turbo.json`

- [ ] **Step 1: Ler estado atual**

```bash
cat turbo.json
```

- [ ] **Step 2: Garantir que `check-types`, `build`, `dev` tenham padrão que cubra novo pacote**

Turbo descobre workspaces automaticamente via `bun workspaces`. Só precisa confirmar que a task `check-types` não tem `filter` explícito que exclua `packages/auth`. Se tiver, remover a exclusão.

Se `turbo.json` já usa pattern genérico (`"check-types": { "dependsOn": ["^check-types"] }`), nada a fazer.

- [ ] **Step 3: Validar**

```bash
bun run check-types 2>&1 | head -20
```

Expected: `packages/auth:check-types` aparece na lista de tasks executadas (mesmo que só com stubs).

- [ ] **Step 4: Commit (se houve mudança)**

```bash
git add turbo.json
git commit -m "chore(turbo): incluir packages/auth no pipeline"
```

**Critério aceitação:** Turbo lista `packages/auth` entre workspaces ao rodar qualquer task.

---

## Task 3: Escrever instância Better Auth real

**Files:**
- Modify: `packages/auth/src/index.ts`

- [ ] **Step 1: Substituir stub por instância real**

```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { db } from "@dashboard-leads-profills/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
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
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "vendedor",
        input: false,
      },
    },
  },
  plugins: [
    admin({
      defaultRole: "vendedor",
      adminRoles: ["admin"],
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3001"],
});

export type Session = typeof auth.$Infer.Session;
```

- [ ] **Step 2: Type-check**

```bash
cd packages/auth && bun x tsc --noEmit
```

Expected: sem erros. Se falhar com "Cannot find module 'better-auth'", rode `bun install` na raiz.

- [ ] **Step 3: Commit**

```bash
git add packages/auth/src/index.ts
git commit -m "feat(auth): instância Better Auth com Drizzle adapter e plugin admin"
```

**Critério aceitação:** `bun x tsc --noEmit` limpo em `packages/auth`.

---

## Task 4: Gerar schema Drizzle via CLI

**Files:**
- Create: `packages/auth/src/schema.ts` (gerado)
- Modify: `packages/db/src/schema/index.ts` (re-export)

- [ ] **Step 1: Rodar CLI do Better Auth**

```bash
cd /home/othavio/Work/profills/sistema-coleta-de-lead
bunx @better-auth/cli generate \
  --config packages/auth/src/index.ts \
  --output packages/auth/src/schema.ts \
  --y
```

Expected: `packages/auth/src/schema.ts` criado com `pgTable` para `user`, `session`, `account`, `verification`.

- [ ] **Step 2: Inspecionar schema gerado**

```bash
head -40 packages/auth/src/schema.ts
```

Verificar presença de:
- `export const user = pgTable("user", { id: text("id").primaryKey(), email: text("email").notNull().unique(), ..., role: text("role").default("vendedor") })`
- `export const session = pgTable("session", ...)`
- `export const account = pgTable("account", ...)`
- `export const verification = pgTable("verification", ...)`

Se algum campo `role`, `banned`, `banReason`, `banExpires` estiver faltando no `user`, é porque o plugin admin não foi detectado — revisar import em `packages/auth/src/index.ts`.

- [ ] **Step 3: Adicionar `packages/auth` como dependência do `packages/db` (evita ciclo)**

Na verdade **não adicionar** — o fluxo é inverso: `packages/auth` importa `db`. Schema Better Auth fica em `packages/auth/src/schema.ts` e é exposto via export.

Atualizar `packages/db/drizzle.config.ts` para incluir o schema do pacote auth:

```bash
cat packages/db/drizzle.config.ts
```

- [ ] **Step 4: Modificar `packages/db/drizzle.config.ts` para incluir schema auth**

Se o `schema` aponta pra `"./src/schema"`, trocar por array:

```ts
export default defineConfig({
  schema: [
    "./src/schema",
    "../auth/src/schema.ts",
  ],
  // resto igual
});
```

- [ ] **Step 5: Gerar migration Drizzle**

```bash
bun run db:generate
```

Expected: novo arquivo `packages/db/drizzle/XXXX_*.sql` criado com `CREATE TABLE "user"`, `"session"`, `"account"`, `"verification"`.

- [ ] **Step 6: Commit**

```bash
git add packages/auth/src/schema.ts packages/db/drizzle.config.ts packages/db/drizzle/
git commit -m "feat(auth): schema Drizzle (user/session/account/verification) + migration"
```

**Critério aceitação:** `packages/auth/src/schema.ts` exporta `user`, `session`, `account`, `verification`; migration SQL em `packages/db/drizzle/` contém `CREATE TABLE "user"`.

---

## Task 5: Configurar env vars (local dev)

**Files:**
- Modify: `apps/web/.env`
- Modify: `packages/env/src/server.ts`
- Modify: `packages/env/src/web.ts`

- [ ] **Step 1: Gerar secret Better Auth**

```bash
openssl rand -base64 32
```

Copiar output (ex: `abc123...=`).

- [ ] **Step 2: Obter Google OAuth credentials**

No Google Cloud Console, pegar o OAuth Client ID e Secret já cadastrado (o mesmo que Supabase usa). Se não tiver acesso direto, buscar no painel Supabase → Authentication → Providers → Google (campos `Client ID` e `Client Secret`).

- [ ] **Step 3: Adicionar em `apps/web/.env` (permissão manual do usuário — acesso ao arquivo é denied no agent)**

Pedir para o usuário adicionar:

```env
BETTER_AUTH_SECRET=<secret gerado>
BETTER_AUTH_URL=http://localhost:3001
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3001
GOOGLE_CLIENT_ID=<client id>
GOOGLE_CLIENT_SECRET=<client secret>
```

Manter por enquanto as vars Supabase (serão removidas em task posterior).

- [ ] **Step 4: Modificar `packages/env/src/server.ts`**

Adicionar no schema Zod:

```ts
BETTER_AUTH_SECRET: z.string().min(32),
BETTER_AUTH_URL: z.string().url(),
GOOGLE_CLIENT_ID: z.string().min(1),
GOOGLE_CLIENT_SECRET: z.string().min(1),
```

Manter campos Supabase por enquanto (co-existência temporária).

- [ ] **Step 5: Modificar `packages/env/src/web.ts`**

Adicionar:

```ts
NEXT_PUBLIC_BETTER_AUTH_URL: z.string().url(),
```

- [ ] **Step 6: Validar**

```bash
bun run check-types
```

Expected: sem novos erros de env.

- [ ] **Step 7: Atualizar Google Cloud Console**

Adicionar redirect URIs:
- `http://localhost:3001/api/auth/callback/google`
- `<prod-domain>/api/auth/callback/google` (se houver prod deploy)

**Não remover ainda** o URI antigo do Supabase — só remover ao final da migração.

- [ ] **Step 8: Commit**

```bash
git add packages/env/
git commit -m "feat(env): adicionar vars BETTER_AUTH_* e GOOGLE_*"
```

**Critério aceitação:** `bun run check-types` limpo; `apps/web/.env` contém todas 5 novas vars.

---

## Task 6: Criar handler Next.js e client React

**Files:**
- Create: `apps/web/src/app/api/auth/[...all]/route.ts`
- Modify: `packages/auth/src/client.ts`

- [ ] **Step 1: Criar handler**

`apps/web/src/app/api/auth/[...all]/route.ts`:

```ts
import { auth } from "@dashboard-leads-profills/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

- [ ] **Step 2: Substituir stub do client**

`packages/auth/src/client.ts`:

```ts
import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  plugins: [adminClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
```

- [ ] **Step 3: Adicionar dep no workspace web**

Editar `apps/web/package.json`:

```json
"dependencies": {
  ...
  "@dashboard-leads-profills/auth": "workspace:*",
  "better-auth": "^1.3.10",
  ...
}
```

Rodar `bun install`.

- [ ] **Step 4: Aplicar schema no DB**

```bash
bun run db:push
```

Expected: tabelas `user`, `session`, `account`, `verification` criadas em `public`. Sem erros.

Verificar via MCP Supabase:
```sql
-- Via mcp__supabase__execute_sql (project_id xoebbbpkauyjgccakjdy):
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('user','session','account','verification');
```

Expected: 4 linhas.

- [ ] **Step 5: Smoke test — chamar endpoint sem iniciar ainda o front**

```bash
bun run dev:web &
sleep 8
curl -s http://localhost:3001/api/auth/ok
```

Expected: `{"ok":true}` (endpoint oficial de health do Better Auth).

Parar dev: `kill %1`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/api/auth/ packages/auth/src/client.ts apps/web/package.json bun.lock
git commit -m "feat(auth): handler Next.js /api/auth/[...all] + client React"
```

**Critério aceitação:** `curl localhost:3001/api/auth/ok` → `{"ok":true}`; 4 tabelas Better Auth presentes em `public`.

---

## Task 7: Reescrever middleware com getSessionCookie

**Files:**
- Modify: `apps/web/src/middleware.ts`

- [ ] **Step 1: Ler versão atual**

```bash
cat apps/web/src/middleware.ts
cat apps/web/src/lib/supabase/proxy.ts
```

- [ ] **Step 2: Substituir conteúdo de `middleware.ts`**

```ts
import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_EXACT = new Set(["/", "/login", "/offline", "/sw.js"]);
const PUBLIC_PREFIXES = ["/api/auth"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_EXACT.has(pathname)) return NextResponse.next();
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }
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
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|webp|svg|ico)).*)",
  ],
};
```

- [ ] **Step 3: Manter `lib/supabase/proxy.ts` por enquanto**

Ele será removido em task posterior (cleanup). Agora o middleware já não o chama mais, mas deixar o arquivo evita quebrar imports de outros lugares antes do cleanup.

- [ ] **Step 4: Type-check**

```bash
bun run check-types 2>&1 | grep -E "middleware|error" | head -20
```

Expected: sem novos erros em `middleware.ts`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/middleware.ts
git commit -m "feat(web): middleware Better Auth com getSessionCookie (Edge-safe)"
```

**Critério aceitação:** `tsc --noEmit` sem novos erros em middleware; booting dev server não aponta rota inválida para `/login`.

---

## Task 8: Reescrever contexto tRPC

**Files:**
- Modify: `packages/api/src/context.ts`
- Modify: `packages/api/src/index.ts`
- Modify: `packages/api/package.json`

- [ ] **Step 1: Adicionar dep no api workspace**

Editar `packages/api/package.json`:

```json
"dependencies": {
  ...
  "@dashboard-leads-profills/auth": "workspace:*",
  ...
}
```

`bun install`.

- [ ] **Step 2: Substituir `packages/api/src/context.ts`**

```ts
import { auth } from "@dashboard-leads-profills/auth";
import type { NextRequest } from "next/server";

export async function createTRPCContext(opts: { req: NextRequest }) {
  const session = await auth.api.getSession({ headers: opts.req.headers });
  return {
    headers: opts.req.headers,
    user: session?.user ?? null,
    userRole: (session?.user.role as "admin" | "vendedor" | null) ?? null,
    session: session?.session ?? null,
  };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
```

- [ ] **Step 3: Atualizar procedures em `packages/api/src/index.ts`**

Alterar assinatura que lê `ctx.user`:

```ts
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.userRole !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});
```

- [ ] **Step 4: Atualizar referências `ctx.user.sub` → `ctx.user.id`**

Buscar e substituir:
```bash
grep -rn "ctx.user.sub" packages/api/src
```

Trocar cada ocorrência por `ctx.user.id`. Arquivos afetados (conforme spec):
- `packages/api/src/routers/leaderboard.ts:7`
- `packages/api/src/routers/admin/users.ts:104`

- [ ] **Step 5: Type-check**

```bash
cd packages/api && bun x tsc --noEmit 2>&1 | head -30
```

Expected: sem erros relativos ao contexto.

- [ ] **Step 6: Commit**

```bash
git add packages/api/package.json packages/api/src/context.ts packages/api/src/index.ts packages/api/src/routers/leaderboard.ts packages/api/src/routers/admin/users.ts bun.lock
git commit -m "feat(api): contexto tRPC via auth.api.getSession; user.sub → user.id"
```

**Critério aceitação:** `tsc --noEmit` limpo em `packages/api` (exceto erros pré-existentes em tests).

---

## Task 9: Reescrever admin/users.ts (list/ban/unban via Better Auth)

**Files:**
- Modify: `packages/api/src/routers/admin/users.ts`

- [ ] **Step 1: Substituir conteúdo inteiro**

```ts
import { auth } from "@dashboard-leads-profills/auth";
import { db } from "@dashboard-leads-profills/db";
import { leads } from "@dashboard-leads-profills/db/schema/leads";
import { TRPCError } from "@trpc/server";
import { and, count, inArray, isNull } from "drizzle-orm";
import z from "zod";
import { adminProcedure, router } from "../../index";

export const adminUsersRouter = router({
  list: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        page: z.number().min(1).default(1),
        perPage: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const result = await auth.api.listUsers({
        query: {
          limit: input.perPage,
          offset: (input.page - 1) * input.perPage,
        },
        headers: ctx.headers,
      });

      const userIds = result.users.map((u) => u.id);
      const leadsResult =
        userIds.length > 0
          ? await db
              .select({ userId: leads.userId, leadCount: count(leads.id) })
              .from(leads)
              .where(and(inArray(leads.userId, userIds), isNull(leads.deletedAt)))
              .groupBy(leads.userId)
          : [];
      const leadCountByUserId = new Map(
        leadsResult.map((r) => [r.userId, r.leadCount])
      );

      let users = result.users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name ?? "",
        role: (u.role as "admin" | "vendedor") ?? "vendedor",
        leadCount: leadCountByUserId.get(u.id) ?? 0,
        isBanned: !!u.banned,
      }));

      if (input.search) {
        const term = input.search.toLowerCase();
        users = users.filter(
          (u) =>
            u.name.toLowerCase().includes(term) ||
            u.email.toLowerCase().includes(term)
        );
      }

      return { users, total: result.total };
    }),

  updateRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["admin", "vendedor"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await auth.api.setRole({
        body: { userId: input.userId, role: input.role },
        headers: ctx.headers,
      });
      return { success: true };
    }),

  deactivate: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.id === input.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot deactivate your own account",
        });
      }
      await auth.api.banUser({
        body: {
          userId: input.userId,
          banReason: "desativado por admin",
        },
        headers: ctx.headers,
      });
      return { success: true };
    }),

  reactivate: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await auth.api.unbanUser({
        body: { userId: input.userId },
        headers: ctx.headers,
      });
      return { success: true };
    }),
});
```

- [ ] **Step 2: Type-check**

```bash
cd packages/api && bun x tsc --noEmit 2>&1 | head -20
```

Expected: sem erros em `admin/users.ts`.

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/routers/admin/users.ts
git commit -m "feat(api): admin/users via auth.api (listUsers/banUser/unbanUser/setRole)"
```

**Critério aceitação:** `tsc --noEmit` limpo em `admin/users.ts`.

---

## Task 10: Trocar SQL auth.users → public."user" em leaderboard + admin stats/leads

**Files:**
- Modify: `packages/api/src/routers/leaderboard.ts`
- Modify: `packages/api/src/routers/admin/leads.ts`
- Modify: `packages/api/src/routers/admin/stats.ts`

- [ ] **Step 1: Ler cada arquivo alvo para achar o SQL atual**

```bash
grep -n "auth.users" packages/api/src/routers/leaderboard.ts packages/api/src/routers/admin/leads.ts packages/api/src/routers/admin/stats.ts
```

- [ ] **Step 2: Em `leaderboard.ts`, trocar**

Antes (aprox. linhas 13-48):
```sql
FROM auth.users u
LEFT JOIN leads l ON u.id = l.user_id
```

Depois:
```sql
FROM public."user" u
LEFT JOIN leads l ON u.id = l.user_id
```

Trocar também `u.raw_user_meta_data->>'name'` por `u.name`.

Fallback: se antes usava `COALESCE(u.raw_user_meta_data->>'name', u.email, 'Vendedor #' || rank)` → manter fallback com `u.name`, `u.email`.

- [ ] **Step 3: Em `admin/leads.ts:140`, mesmo padrão**

```sql
-- antes
JOIN auth.users u ON u.id = l.user_id::uuid
u.raw_user_meta_data->>'name' as name
u.email

-- depois
JOIN public."user" u ON u.id = l.user_id
u.name as name
u.email
```

Nota: `user_id` em `leads` é `uuid`. IDs do Better Auth são `text` por default — **atenção**: se o CLI gerou `user.id` como `text`, os IDs em `leads.user_id` (uuid) não vão fazer match por tipo. Verificar migration. Se necessário, fazer `CAST`:

```sql
JOIN public."user" u ON u.id = l.user_id::text
```

- [ ] **Step 4: Em `admin/stats.ts:135`, mesmo padrão**

- [ ] **Step 5: Type-check**

```bash
bun run check-types
```

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routers/leaderboard.ts packages/api/src/routers/admin/leads.ts packages/api/src/routers/admin/stats.ts
git commit -m "feat(api): queries usam public.\"user\" (Better Auth) em vez de auth.users"
```

**Critério aceitação:** nenhum `auth.users` restante em `packages/api/src/`:
```bash
grep -rn "auth\.users" packages/api/src/
```
deve retornar vazio.

---

## Task 11: Reescrever login-card.tsx

**Files:**
- Modify: `apps/web/src/components/login-card.tsx`

- [ ] **Step 1: Remover imports Supabase, adicionar authClient**

Substituir:
```tsx
import { createClient } from "@/lib/supabase/client";
```
por:
```tsx
import { authClient } from "@dashboard-leads-profills/auth/client";
```

- [ ] **Step 2: Substituir handler `handleEmailSignup`**

```tsx
async function handleEmailSignup(e: React.FormEvent) {
  e.preventDefault();
  setFormError(null);

  const trimmedEmail = email.trim();
  const trimmedName = name.trim();

  if (!trimmedName) return setFormError("Informe seu nome.");
  if (!trimmedEmail) return setFormError("Informe seu email.");
  if (password.length < 6) return setFormError("A senha deve ter pelo menos 6 caracteres.");

  setIsSubmitting(true);
  try {
    const { error } = await authClient.signUp.email({
      email: trimmedEmail,
      password,
      name: trimmedName,
    });
    if (error) {
      setFormError(error.message ?? "Falha ao cadastrar.");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  } finally {
    setIsSubmitting(false);
  }
}
```

- [ ] **Step 3: Substituir handler `handleEmailSignin`**

```tsx
async function handleEmailSignin(e: React.FormEvent) {
  e.preventDefault();
  setFormError(null);

  const trimmedEmail = email.trim();
  if (!trimmedEmail) return setFormError("Informe seu email.");
  if (!password) return setFormError("Informe sua senha.");

  setIsSubmitting(true);
  try {
    const { error } = await authClient.signIn.email({
      email: trimmedEmail,
      password,
    });
    if (error) {
      setFormError("Email ou senha incorretos.");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  } finally {
    setIsSubmitting(false);
  }
}
```

- [ ] **Step 4: Substituir handler Google**

```tsx
async function handleGoogleSignin() {
  setIsGoogleLoading(true);
  try {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
    });
  } finally {
    setIsGoogleLoading(false);
  }
}
```

- [ ] **Step 5: Remover estados / UI de "verifique email"**

Deletar:
- `const [signupSuccess, setSignupSuccess] = useState(false);`
- `const [signupEmail, setSignupEmail] = useState("");`
- Bloco `if (signupSuccess) return (...)` e seu JSX.
- Link para `/forgot-password` (rota vai sumir).

- [ ] **Step 6: Type-check**

```bash
bun run check-types 2>&1 | grep login-card
```

Expected: vazio (sem erros).

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/login-card.tsx
git commit -m "feat(web): login-card usa authClient (Better Auth) para signup/signin/Google"
```

**Critério aceitação:** `login-card.tsx` sem referência a `@/lib/supabase`; `tsc --noEmit` limpo.

---

## Task 12: Reescrever user-menu / global-header / app-auth-provider

**Files:**
- Modify: `apps/web/src/components/user-menu.tsx`
- Modify: `apps/web/src/components/global-header.tsx`
- Modify: `apps/web/src/components/app-auth-provider.tsx`

- [ ] **Step 1: user-menu.tsx — trocar getUser + signOut**

Substituir:
```tsx
const supabase = createClient();
const { data } = await supabase.auth.getUser();
```
por:
```tsx
const { data: session } = authClient.useSession();
const user = session?.user;
```

E:
```tsx
await supabase.auth.signOut();
```
por:
```tsx
await authClient.signOut();
```

Adicionar import:
```tsx
import { authClient } from "@dashboard-leads-profills/auth/client";
```

Remover import `createClient` do Supabase.

- [ ] **Step 2: global-header.tsx — mesmo padrão para `signOut`**

Substituir chamada Supabase por `authClient.signOut()`.

- [ ] **Step 3: app-auth-provider.tsx — simplificar**

Substituir todo o setup manual (`getSession`, `getClaims`, `onAuthStateChange`) por `authClient.useSession()`:

```tsx
"use client";

import { authClient } from "@dashboard-leads-profills/auth/client";
import { createContext, useContext, useMemo, type ReactNode } from "react";

type AppUser = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "vendedor";
  image?: string | null;
};

const AuthContext = createContext<{ user: AppUser | null; isPending: boolean }>({
  user: null,
  isPending: true,
});

export function AppAuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const user = useMemo<AppUser | null>(() => {
    if (!session?.user) return null;
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name ?? "",
      role: (session.user.role as "admin" | "vendedor") ?? "vendedor",
      image: session.user.image ?? null,
    };
  }, [session]);

  return (
    <AuthContext.Provider value={{ user, isPending }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAppAuth() {
  return useContext(AuthContext);
}
```

- [ ] **Step 4: Atualizar consumidores de `useAppAuth`**

Se outros componentes consomem o contexto antigo (`userRole` separado, `snapshot`, etc.), ajustar para o formato novo. Buscar:

```bash
grep -rn "useAppAuth\|useAuthContext" apps/web/src
```

Cada consumidor deve receber apenas `{ user, isPending }` agora. `user.role` substitui `userRole`.

- [ ] **Step 5: Type-check**

```bash
bun run check-types 2>&1 | grep -E "user-menu|global-header|app-auth-provider"
```

Expected: vazio.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/user-menu.tsx apps/web/src/components/global-header.tsx apps/web/src/components/app-auth-provider.tsx
git commit -m "feat(web): user-menu/header/provider usam authClient.useSession"
```

**Critério aceitação:** `tsc --noEmit` sem erros em 3 arquivos; nenhuma importação `@/lib/supabase` nesses três.

---

## Task 13: Admin layout (Server Component)

**Files:**
- Modify: `apps/web/src/app/(app)/admin/layout.tsx`

- [ ] **Step 1: Substituir guards Supabase por auth.api.getSession**

```tsx
import { auth } from "@dashboard-leads-profills/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");
  return <>{children}</>;
}
```

- [ ] **Step 2: Type-check**

```bash
bun run check-types 2>&1 | grep "admin/layout"
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/\(app\)/admin/layout.tsx
git commit -m "feat(web): admin layout guard via auth.api.getSession"
```

**Critério aceitação:** sem erros TS; rota admin bloqueia não-admin em runtime (teste na Task 20).

---

## Task 14: Refatorar auth-snapshot / bootstrap

**Files:**
- Modify: `apps/web/src/lib/auth/auth-snapshot.ts`
- Modify: `apps/web/src/lib/auth/bootstrap.ts`

- [ ] **Step 1: Substituir tipo `User` Supabase em `auth-snapshot.ts`**

```ts
type AppUser = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "vendedor";
  image?: string | null;
};

export type AuthSnapshot = {
  userId: string;
  userEmail: string;
  userName: string;
  userRole: "admin" | "vendedor";
  image?: string | null;
  lastValidatedAt: number;
};

export function buildSnapshotFromUser(user: AppUser): AuthSnapshot {
  return {
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    userRole: user.role,
    image: user.image ?? null,
    lastValidatedAt: Date.now(),
  };
}
```

Remover funções que recebiam `Session`/`User` do Supabase. Expor apenas `buildSnapshotFromUser(appUser)`.

- [ ] **Step 2: `bootstrap.ts` — adaptar `createSellerSnapshotFromSession`**

Se a função era chamada com `Session` Supabase, trocar por `AppUser`. Se deixar de fazer sentido, remover.

`coerceSnapshotToOfflineSeller` continua válido.

- [ ] **Step 3: Atualizar chamadores**

```bash
grep -rn "buildSnapshotFromUser\|createSellerSnapshotFromSession\|readAuthSnapshot" apps/web/src
```

Ajustar cada uso para o novo formato.

- [ ] **Step 4: Type-check**

```bash
bun run check-types 2>&1 | grep auth-snapshot
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/auth/
git commit -m "feat(web): auth snapshot usa AppUser (Better Auth) em vez de Supabase User"
```

**Critério aceitação:** `tsc --noEmit` limpo em `lib/auth/`.

---

## Task 15: Deletar rotas Supabase Auth (callback, confirm, forgot/update-password)

**Files:**
- Delete: `apps/web/src/app/auth/callback/route.ts`
- Delete: `apps/web/src/app/auth/confirm/route.ts`
- Delete: `apps/web/src/app/(public)/forgot-password/` (diretório)
- Delete: `apps/web/src/app/(public)/update-password/` (diretório)

- [ ] **Step 1: Remover arquivos**

```bash
rm apps/web/src/app/auth/callback/route.ts
rm apps/web/src/app/auth/confirm/route.ts
rm -rf apps/web/src/app/\(public\)/forgot-password
rm -rf apps/web/src/app/\(public\)/update-password
rmdir apps/web/src/app/auth 2>/dev/null || true
```

- [ ] **Step 2: Verificar que ninguém link pra `/forgot-password` ou `/auth/confirm` ainda**

```bash
grep -rn "forgot-password\|update-password\|auth/confirm\|auth/callback" apps/web/src packages/
```

Expected: apenas arquivos de lib supabase (proxy.ts), que serão removidos na próxima task.

- [ ] **Step 3: Type-check**

```bash
bun run check-types
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(web): remover rotas Supabase Auth (callback, confirm, reset)"
```

**Critério aceitação:** diretórios `auth/callback`, `auth/confirm`, `(public)/forgot-password`, `(public)/update-password` não existem.

---

## Task 16: Remover pacote Supabase (lib, admin, deps)

**Files:**
- Delete: `apps/web/src/lib/supabase/` (client.ts, server.ts, proxy.ts)
- Delete: `packages/api/src/lib/supabase-admin.ts`
- Modify: `apps/web/package.json`
- Modify: `packages/api/package.json`

- [ ] **Step 1: Remover arquivos**

```bash
rm -rf apps/web/src/lib/supabase
rm packages/api/src/lib/supabase-admin.ts
rmdir packages/api/src/lib 2>/dev/null || true
```

- [ ] **Step 2: Verificar nenhum import residual**

```bash
grep -rn "@/lib/supabase\|@supabase/ssr\|@supabase/supabase-js" apps/web/src packages/
```

Expected: vazio. Se algo aparecer, corrigir antes de continuar.

- [ ] **Step 3: Remover deps Supabase**

```bash
cd apps/web && bun remove @supabase/ssr @supabase/supabase-js
cd ../../packages/api && bun remove @supabase/supabase-js
cd ../..
```

- [ ] **Step 4: Type-check final**

```bash
bun run check-types
```

Expected: sem novos erros (erros pré-existentes em tests de lead/sync são aceitáveis).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remover pacotes e arquivos Supabase Auth (apenas DB permanece)"
```

**Critério aceitação:** `grep` não encontra mais nenhum `@supabase/`, `createClient` de Supabase, ou `supabaseAdmin`.

---

## Task 17: Drop schema Supabase Auth (migration SQL)

**Files:**
- Create: `packages/db/src/migrations/drop-supabase-auth-legacy.sql`
- Delete: `packages/db/src/schema/auth.ts`
- Modify: `packages/db/src/schema/index.ts`

- [ ] **Step 1: Criar migration SQL manual**

`packages/db/src/migrations/drop-supabase-auth-legacy.sql`:

```sql
-- Limpar dados de usuários antigos (user escolheu recadastrar)
TRUNCATE public.user_roles CASCADE;
DELETE FROM public.leads;

-- Remover hook PG de claim customizado
DROP FUNCTION IF EXISTS public.custom_access_token_hook(jsonb);

-- Remover tabela de roles (role agora é campo em public.user)
DROP TABLE IF EXISTS public.user_roles;
DROP TYPE IF EXISTS public.app_role;
```

- [ ] **Step 2: Executar migration via MCP Supabase**

Usar `mcp__supabase__apply_migration` com nome `drop_supabase_auth_legacy` e o SQL acima.

Alternativa (psql direto):
```bash
psql "$DATABASE_URL" -f packages/db/src/migrations/drop-supabase-auth-legacy.sql
```

- [ ] **Step 3: Remover schema Drizzle antigo**

```bash
rm packages/db/src/schema/auth.ts
```

Editar `packages/db/src/schema/index.ts` para remover export:

```bash
grep -rn "schema/auth" packages/db/src packages/
```

Remover linha `export * from "./auth"` (ou equivalente).

- [ ] **Step 4: Adicionar FK leads.user_id → public.user.id**

Criar migration via MCP:

```sql
-- Após Better Auth ter criado public.user
ALTER TABLE public.leads
  ADD CONSTRAINT leads_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;
```

Nota: se `public.user.id` for `text` e `leads.user_id` for `uuid`, precisa alinhar tipos antes. Duas opções:
- **a)** Alterar Better Auth schema para usar `uuid` (editar `packages/auth/src/schema.ts` trocando `text("id")` por `uuid("id")` + re-gerar migration).
- **b)** Alterar `leads.user_id` para `text`.

**Opção recomendada (a)**: manter `leads.user_id` como `uuid` por consistência com o resto do schema.

- [ ] **Step 5: Type-check**

```bash
bun run check-types
```

- [ ] **Step 6: Commit**

```bash
git add packages/db/
git commit -m "chore(db): drop user_roles/custom_access_token_hook; FK leads.user_id → user.id"
```

**Critério aceitação:** `public.user_roles` não existe; `public.leads` tem constraint `leads_user_id_fkey`; schema Drizzle sem `schema/auth.ts`.

---

## Task 18: Remover vars Supabase de env + atualizar docs

**Files:**
- Modify: `packages/env/src/server.ts`
- Modify: `packages/env/src/web.ts`
- Modify: `apps/web/.env` (manual pelo usuário)
- Modify: `CLAUDE.md`
- Modify: `.claude/CLAUDE.md`

- [ ] **Step 1: Remover validações Supabase**

`packages/env/src/server.ts`: remover linhas:
```ts
NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
```

`packages/env/src/web.ts`: remover linhas:
```ts
NEXT_PUBLIC_SUPABASE_URL: ...
NEXT_PUBLIC_SUPABASE_ANON_KEY: ...
```

- [ ] **Step 2: Pedir usuário remover manualmente do `.env`**

```env
# remover:
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

- [ ] **Step 3: Atualizar CLAUDE.md (raiz)**

Substituir seção "Auth Real" por descrição Better Auth:

```markdown
## Auth Real

- Auth via Better Auth em `packages/auth`.
- Server instance: `packages/auth/src/index.ts` (Drizzle adapter pg, plugin admin).
- Client React: `packages/auth/src/client.ts` (authClient, useSession).
- Handler Next.js: `apps/web/src/app/api/auth/[...all]/route.ts`.
- Middleware: `apps/web/src/middleware.ts` usa `getSessionCookie` (Edge-safe).
- Contexto tRPC: `packages/api/src/context.ts` chama `auth.api.getSession({ headers })`.
- Providers: email/senha (auto-verificado) + Google OAuth.
- Role em campo `user.role` (sem tabela separada).
- Admin API: `auth.api.listUsers/banUser/unbanUser/setRole`.
```

Remover menção a `packages/auth` legado e a `@supabase/ssr`.

- [ ] **Step 4: Atualizar `.claude/CLAUDE.md`**

Substituir "Auth real: Supabase" por "Auth real: Better Auth". Trocar referências a `apps/web/src/lib/supabase/*` para `packages/auth/*`.

- [ ] **Step 5: Atualizar `packages/env/*`**

Remover campos Supabase; manter apenas `DATABASE_URL`, `NODE_ENV`, e novos `BETTER_AUTH_*`, `GOOGLE_*`.

- [ ] **Step 6: Type-check**

```bash
bun run check-types
```

- [ ] **Step 7: Commit**

```bash
git add packages/env/ CLAUDE.md .claude/CLAUDE.md
git commit -m "chore(env,docs): remover vars Supabase Auth; CLAUDE.md aponta para Better Auth"
```

**Critério aceitação:** nenhum `SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY` em `packages/env`; CLAUDE.md menciona Better Auth.

---

## Task 19: Script de seed admin

**Files:**
- Create: `scripts/seed-admin.ts`
- Modify: `package.json` (script `seed:admin`)

- [ ] **Step 1: Criar script**

```ts
import { auth } from "@dashboard-leads-profills/auth";
import { db } from "@dashboard-leads-profills/db";
import { user } from "@dashboard-leads-profills/auth/schema";
import { eq } from "drizzle-orm";

const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;
const name = process.env.SEED_ADMIN_NAME ?? "Admin";

if (!email || !password) {
  console.error("Defina SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD");
  process.exit(1);
}

const res = await auth.api.signUpEmail({
  body: { email, password, name },
});

if (!res?.user) {
  console.error("Falha ao criar usuário");
  process.exit(1);
}

await db.update(user).set({ role: "admin" }).where(eq(user.id, res.user.id));

console.log(`Admin criado: ${res.user.id} (${email})`);
```

- [ ] **Step 2: Adicionar script em `package.json` (raiz)**

```json
"scripts": {
  ...
  "seed:admin": "bun scripts/seed-admin.ts",
  ...
}
```

- [ ] **Step 3: Executar**

```bash
SEED_ADMIN_EMAIL=othavio@exemplo.com \
SEED_ADMIN_PASSWORD=<senha-forte> \
SEED_ADMIN_NAME="Othavio" \
bun run seed:admin
```

Expected: `Admin criado: <uuid> (othavio@exemplo.com)`.

Verificar via MCP:
```sql
SELECT id, email, role FROM public."user";
```

Expected: 1 linha com `role = admin`.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-admin.ts package.json
git commit -m "chore(scripts): seed admin inicial via auth.api.signUpEmail"
```

**Critério aceitação:** 1 user com `role=admin` em `public.user`.

---

## Task 20: Verificação end-to-end manual

**Files:** — (nenhum código; checklist runtime)

- [ ] **Step 1: Subir dev**

```bash
bun run dev
```

- [ ] **Step 2: Fluxo signup email/senha**

Browser → http://localhost:3001/login → aba "Criar conta" → preencher → submit.

Expected: redirect imediato para `/dashboard`. SEM tela "verifique email". Cookie `better-auth.session_token` presente no DevTools.

- [ ] **Step 3: Logout + signin email/senha**

Clicar menu user → Logout → volta pra `/login`. Signin com mesmo email/senha.

Expected: redirect `/dashboard`.

- [ ] **Step 4: Google OAuth**

Logout → clicar "Continuar com Google" → fluxo Google → callback `/api/auth/callback/google` → `/dashboard`.

Expected: cookie presente; `user.email` aparece no user-menu.

- [ ] **Step 5: Guard admin**

Como vendedor recém-criado: acessar `/admin/leads`.

Expected: redirect `/dashboard` (guard no admin layout).

- [ ] **Step 6: Promover a admin via SQL**

Via MCP ou psql:
```sql
UPDATE public."user" SET role = 'admin' WHERE email = 'seu-email';
```

Refresh na página → `/admin/leads` abre.

- [ ] **Step 7: Admin users — listar / banir / reativar**

Em `/admin/users`:
- Listar — aparecem todos os users criados.
- Banir um outro user — ele tenta login → falha.
- Reativar — login volta a funcionar.

- [ ] **Step 8: Leaderboard**

Criar alguns leads como vendedor → `/dashboard` (ou rota do leaderboard) → ranking exibe nome correto do user.

- [ ] **Step 9: Offline**

DevTools → Network → Offline. Reload `/dashboard`. Snapshot ainda exibe nome do user (via `auth-snapshot`).

- [ ] **Step 10: tRPC sem sessão**

Em um terminal ou tab anônima sem login:
```bash
curl -s http://localhost:3001/api/trpc/leaderboard.top
```

Expected: 401/UNAUTHORIZED.

- [ ] **Step 11: DB sanity**

```sql
SELECT
  (SELECT count(*) FROM public."user") AS users,
  (SELECT count(*) FROM public.session) AS sessions,
  (SELECT count(*) FROM public.account) AS accounts,
  (SELECT count(*) FROM auth.users) AS supabase_users_legacy;
```

Expected: `users >= 1`, `sessions >= 1`, `accounts >= 1`, `supabase_users_legacy` qualquer valor (irrelevante; schema Supabase Auth não é usado).

- [ ] **Step 12: Painel Supabase — desligar providers auth**

Manual, via painel web:
- Authentication → Providers → Email: desligar.
- Authentication → Providers → Google: desligar.
- Project Settings → Auth → SMTP: opcional remover.

Evita que alguém crie user novo via Supabase por engano.

- [ ] **Step 13: Google Cloud Console — remover redirect URI antigo**

Remover `<supabase-ref>.supabase.co/auth/v1/callback` da lista de authorized redirect URIs do OAuth client.

- [ ] **Step 14: Commit checkpoint final**

```bash
git add -A
git status  # conferir que nada sobrou
git commit --allow-empty -m "chore: migração Supabase Auth → Better Auth concluída e validada"
```

- [ ] **Step 15: Push e PR**

```bash
git push -u origin feat/better-auth-migration
gh pr create --title "feat: migração Supabase Auth → Better Auth" --body "$(cat <<'EOF'
## Summary
- Substitui Supabase Auth por Better Auth (Drizzle adapter, plugin admin)
- Supabase permanece como Postgres (DATABASE_URL)
- Zero migração de users — recadastro forçado
- Email confirm desligado, Google OAuth preservado
- Role vira campo em user; elimina user_roles e custom_access_token_hook

## Test plan
- [x] Signup email/senha → /dashboard direto
- [x] Signin email/senha
- [x] Google OAuth
- [x] Guard admin
- [x] Admin listUsers/banUser/unbanUser/setRole
- [x] Leaderboard com user.name
- [x] Offline snapshot
- [x] tRPC UNAUTHORIZED sem sessão
EOF
)"
```

**Critério aceitação:** todos os 11 fluxos da verificação passam; PR aberto.

---

## Self-Review

**1. Spec coverage** — todos os blocos da spec cobertos:
- Limpezas e drops → Tasks 15, 16, 17
- Novos pacotes/arquivos → Tasks 1, 3, 4, 6
- Schema DB → Task 4, 17
- Fluxos que trocam → Tasks 11, 12
- Integração tRPC → Task 8
- Middleware → Task 7
- Leaderboard/Admin → Tasks 9, 10
- Offline snapshot → Task 14
- Env → Tasks 5, 18
- Ordem → já embutida na numeração
- Verificação → Task 20
- Fora de escopo → respeitado

**2. Placeholder scan** — sem TBD/TODO. Todos os steps mostram código/comando completo. `.env` fica como instrução manual pro usuário (agent não tem permissão de leitura).

**3. Type consistency** — `authClient`, `auth.api.*`, `ctx.user.id`, `user.role` usados consistentemente em todas as tasks. `AppUser` definido em Task 12 e reusado em Task 14.

---

## Execution Handoff

Plan completo e salvo em `docs/superpowers/plans/2026-04-17-supabase-auth-to-better-auth-plan.md`. Duas opções de execução:

**1. Subagent-Driven (recommended)** — dispatch de subagent fresh por task, review entre tasks, rollback fácil se algo quebra.

**2. Inline Execution** — executo tudo nesta sessão via `superpowers:executing-plans`, com checkpoints de review.

Qual?
