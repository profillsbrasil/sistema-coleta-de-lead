# packages/db — Convenções locais

Arquitetura e stack: ver `../../CLAUDE.md`.

## Comandos

- Os comandos `db:*` (`db:push`, `db:generate`, `db:migrate`, `db:studio`) rodam a
  partir da raiz do repositório.
- `drizzle.config.ts` carrega env de `../../apps/web/.env`.

## Schema

- Schema Drizzle em `src/schema`. Tabela ativa: `leads`.
- `todo`, `user_roles` e o enum `app_role` são artefatos da migration
  `0000_smart_blockbuster.sql` (scaffolding Better-T-Stack e auth legada). Não são
  usados em nenhum código. Não construa em cima deles — ver item de backlog em
  `docs/tech-debt.md`.
