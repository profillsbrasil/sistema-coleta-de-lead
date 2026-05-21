# packages/db — Convenções locais

Arquitetura e stack: ver `../../CLAUDE.md`.

## Comandos

- Os comandos `db:*` (`db:push`, `db:generate`, `db:migrate`, `db:studio`) rodam a
  partir da raiz do repositório.
- `drizzle.config.ts` carrega env de `../../apps/web/.env`.

## Schema

- Schema Drizzle em `src/schema`. Tabela ativa: `leads`.
- `signup_invite_rate_limit` é a única outra tabela própria do `packages/db`.
- Tabelas Better Auth (`user`, `session`, `account`, `verification`) vivem em
  `packages/auth/src/schema.ts` e são incluídas no schema do drizzle-kit via o
  `schema` array em `drizzle.config.ts`.
- Toda tabela `public.*` tem RLS habilitada (migration `0004_enable_rls_drop_legacy`).
  O app Drizzle conecta como role owner e tem bypass implícito; PostgREST/anon é
  default-deny. Se for adicionar uma nova tabela: lembre de habilitar RLS na
  mesma migration.
