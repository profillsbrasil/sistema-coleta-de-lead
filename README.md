# Sistema Coleta de Lead

Aplicação offline-first para captação rápida de leads em eventos e congressos. O foco é
não perder dados quando a rede falha.

> Contexto completo de arquitetura e convenções: ver `CLAUDE.md` na raiz.

## Stack

- Turborepo + Bun workspaces
- Next.js 16 + React 19 (React Compiler)
- tRPC 11
- Better Auth (auth) — Drizzle adapter pg + plugin admin
- PostgreSQL + Drizzle ORM
- Dexie + `dexie-react-hooks` (persistência local offline-first)
- Supabase Storage (apenas fotos de leads, bucket `lead-photos`)
- shadcn/ui em `packages/ui`
- Vitest, Ultracite / Biome

## Estrutura

```text
apps/web        App Next.js (porta 3001)
packages/api    Routers tRPC e regras de negócio
packages/db     Schema Drizzle e migrations
packages/env    Validação de env
packages/ui     Componentes compartilhados
packages/auth   Instância Better Auth
packages/config Base compartilhada de TypeScript
```

## Ambiente

Crie `apps/web/.env`. Variáveis validadas em `packages/env`:

```bash
DATABASE_URL=
BETTER_AUTH_SECRET=          # mínimo 32 caracteres
BETTER_AUTH_URL=             # ex: http://localhost:3001
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXT_PUBLIC_BETTER_AUTH_URL=
NEXT_PUBLIC_SUPABASE_URL=    # apenas Storage
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NODE_ENV=
SIGNUP_INVITE_CODE=          # opcional
NEXT_PUBLIC_EVENT_END=       # opcional
```

## Comandos

```bash
bun install
bun run dev          # todos os apps
bun run dev:web      # apenas o app web (porta 3001)
bun run build
bun run check-types
bun run test
bun run check        # lint
bun run fix          # lint + format
bun run db:push
bun run db:generate
bun run db:migrate
bun run db:studio
```

O app web roda em `http://localhost:3001`.
