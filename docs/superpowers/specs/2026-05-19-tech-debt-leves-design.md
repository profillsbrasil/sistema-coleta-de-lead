# Design — Lote de tech-debt leve (#26, #23, #24, #19)

> Brainstorming de 2026-05-19. Fecha 4 issues `tech-debt` de severidade alta de baixo
> a médio esforço. Os itens grandes (#20 RLS, #27 rate limit persistente) ficam para
> sessão dedicada de design.

## Contexto

Auditoria de 2026-05-19 (`docs/tech-debt.md`) levantou 6 issues abertas. Esta spec cobre
as 4 de menor esforço. Investigação prévia (agente Explore) confirmou que as chaves de
env de #24 são código morto.

## #26 — `pullChanges` filtrar leads soft-deletados

**Causa raiz:** `packages/api/src/routers/sync.ts:163` filtra o pull só por `userId` e
`updatedAt`. Tombstones (`deletedAt` setado) vazam para o cliente, são gravados em Dexie
como `synced` e entram no loop de conflito.

**Mudança:** adicionar `isNull(leads.deletedAt)` ao `and(...)` da query de `pullChanges`.
`isNull` já está importado em `sync.ts`. Uma linha.

**Teste:** caso novo em `packages/api/src/__tests__/sync.test.ts` — um lead com
`deletedAt` preenchido não aparece no retorno de `pullChanges`.

## #23 — `packages/auth` consumir env validado

**Causa raiz:** `packages/auth/src/index.ts` lê `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`,
`GOOGLE_CLIENT_ID/SECRET` e `SIGNUP_INVITE_CODE` direto de `process.env`, sem a validação
Zod de `@dashboard-leads-profills/env`. Variáveis ausentes inicializam Better Auth com
`undefined` silenciosamente.

**Mudança:**

- Adicionar `"@dashboard-leads-profills/env": "workspace:*"` às `dependencies` de
  `packages/auth/package.json`.
- Em `packages/auth/src/index.ts`: `import { env } from "@dashboard-leads-profills/env/server"`.
- Trocar os acessos crus por `env.X`:
  - linha 19-20: `baseURL`, `secret`
  - linha 29-30: `clientId`, `clientSecret` — remover os fallbacks `?? ""` (schema
    garante `min(1)`)
  - linha 63-64: `inviteCode`, `secret` no hook `before`
  - linha 93: `trustedOrigins`
- `SIGNUP_INVITE_CODE` é `.optional()` no schema — manter o `?? ""` onde aplicável.

**Verificação:** `bun run check-types` passa; `packages/auth` continua sendo importado
apenas em runtime server-side (sem regressão de Edge/SSR).

## #24 — Remover chaves de env não usadas

**Causa raiz:** `SUPABASE_SERVICE_ROLE_KEY` e `RESEND_API_KEY` estão no `.env` e no
`turbo.json` mas não têm uso em código de produção. Investigação confirmou: `RESEND_API_KEY`
tem zero ocorrências; `SUPABASE_SERVICE_ROLE_KEY` aparece só em mocks de teste.

**Mudança:**

- Remover ambas de `apps/web/.env`.
- Remover ambas de `turbo.json` (lista de env declarados).
- Remover `SUPABASE_SERVICE_ROLE_KEY` dos mocks de env em
  `packages/api/src/__tests__/admin-leads.test.ts`, `admin-stats.test.ts`,
  `leaderboard.test.ts`, `sync.test.ts`.
- Atualizar a seção "Variáveis de Ambiente" de `CLAUDE.md` (remover a frase sobre
  `SUPABASE_SERVICE_ROLE_KEY` / `RESEND_API_KEY` fora do schema).
- Marcar item #6 de `docs/tech-debt.md` como resolvido em 2026-05-19.

Não tocar no schema Zod de `packages/env` — as chaves nunca entraram nele.

**Verificação:** `bun run test` e `bun run check-types` passam.

## #19 — CI GitHub Actions

**Causa raiz:** nenhum pipeline valida `check-types`, `test`, `lint` ou `build` em PRs.

**Mudança:** novo `.github/workflows/ci.yml`.

- Triggers: `pull_request` e `push` na branch `main`.
- Job único em `ubuntu-latest`:
  1. `actions/checkout@v4`
  2. `oven-sh/setup-bun@v2` com `bun-version: 1.3.11` (pin do `packageManager` da raiz)
  3. Cache de Turborepo: `actions/cache@v4` em `.turbo` com chave por SHA.
  4. `bun install --frozen-lockfile`
  5. `bun run check-types`
  6. `bun run test`
  7. `bun run build`
  8. `bun run check`

O `setup-bun@v2` já cacheia dependências do Bun via lockfile; o cache extra cobre a pasta
`.turbo` para reaproveitar saídas de tarefas do Turborepo entre runs.

## Plano de execução (ordem e paralelismo)

Para reduzir consumo de token, os fixes vão para subagents Sonnet com TDD onde aplicável:

- **Paralelo, fase 1:** #26 (sync.ts + sync.test.ts) e #19 (`.github/workflows/`) —
  arquivos disjuntos.
- **Paralelo, fase 1:** #23 (`packages/auth/*`) — disjunto dos demais.
- **Fase 2 (após #26):** #24 toca `sync.test.ts`, que #26 também edita — roda depois
  para evitar conflito de merge.

Os issues #20 (RLS) e #27 (rate limit persistente) **não** estão neste lote: exigem
brainstorming de arquitetura próprio.

## Verificação final

- `bun run check-types`, `bun run test`, `bun run build`, `bun run check` passam local.
- As 4 issues (#26, #23, #24, #19) podem ser fechadas.
