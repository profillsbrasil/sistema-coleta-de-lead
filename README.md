# Sistema Coleta de Lead

Aplicacao offline-first para captacao rapida de leads em eventos e congressos.

## Stack

- Next.js 16 + React 19
- tRPC 11
- Supabase Auth
- PostgreSQL + Drizzle ORM
- Dexie + `dexie-react-hooks`
- Turborepo + Bun workspaces
- shadcn/ui em `packages/ui`
- Ultracite / Biome

## Estrutura

```text
apps/web        Aplicacao web
packages/api    Routers tRPC e regras de negocio
packages/db     Schema Drizzle e migrations
packages/env    Validacao de env
packages/ui     Componentes compartilhados
packages/auth   Pacote legado/utilitario, fora da superficie ativa do runtime
packages/config Base compartilhada de TypeScript
```

## Ambiente

Crie `apps/web/.env` com:

```bash
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Comandos

```bash
bun install
bun run dev
bun run dev:web
bun run build
bun run check-types
bun run test
bun run check
bun run fix
bun run db:push
bun run db:generate
bun run db:migrate
bun run db:studio
```

O app web roda em `http://localhost:3001`.

## Arquitetura

- Auth ativa via Supabase em `apps/web/src/lib/supabase/*` e `packages/api/src/context.ts`
- Persistencia local via Dexie em `apps/web/src/lib/db`
- Sync offline-first via `apps/web/src/lib/sync`
- Service worker apenas para cache de navegacao offline, sem PWA completa

## UI Compartilhada

- Ajuste tokens e estilos globais em `packages/ui/src/styles/globals.css`
- Reutilize componentes de `packages/ui/src/components/*`
- Use imports path-based, por exemplo:

```tsx
import { Button } from "@dashboard-leads-profills/ui/components/button";
```
