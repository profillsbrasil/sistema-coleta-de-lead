# Lote tech-debt leve (#26, #23, #24, #19) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar 4 issues `tech-debt` de severidade alta de baixo esforço: filtro de soft-delete no pull de sync, validação de env em `packages/auth`, remoção de segredos não usados e pipeline de CI.

**Architecture:** 4 tarefas independentes em arquivos majoritariamente disjuntos. Task 1 (#26) e Task 4 (#24) tocam ambas `packages/api/src/__tests__/sync.test.ts` — Task 4 roda por último. Task 4 também é dona de todas as edições nos 4 arquivos de teste de `packages/api`.

**Tech Stack:** Next.js 16, tRPC 11, Drizzle ORM, Better Auth, `@t3-oss/env-core`, Vitest, Turborepo + Bun, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-05-19-tech-debt-leves-design.md`

---

### Task 1: #26 — `pullChanges` filtra leads soft-deletados

**Files:**
- Modify: `packages/api/src/routers/sync.ts:160-163`
- Test: `packages/api/src/__tests__/sync.test.ts` (novo bloco `describe`)

- [ ] **Step 1: Escrever o teste que falha**

Adicionar ao final de `packages/api/src/__tests__/sync.test.ts`, depois do último `describe`:

```ts
describe("syncRouter.pullChanges", () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	it("filtra leads soft-deletados — where inclui isNull(deletedAt)", async () => {
		const whereMock = vi.fn().mockResolvedValue([]);
		const selectChain = {
			from: vi.fn().mockReturnThis(),
			where: whereMock,
		};
		const mockDb: MockDb = {
			insert: vi.fn(),
			update: vi.fn(),
			select: vi.fn().mockReturnValue(selectChain),
		};

		const { caller } = await loadSyncRouter(mockDb);

		await caller.pullChanges({ since: "2026-01-01T00:00:00.000Z" });

		const whereArg = whereMock.mock.calls[0]?.[0] as { and: unknown[] };
		expect(whereArg.and).toContainEqual({ isNull: "deletedAt" });
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar a falha**

Run: `cd packages/api && bun run vitest run src/__tests__/sync.test.ts -t "filtra leads soft-deletados"`
Expected: FAIL — `whereArg.and` não contém `{ isNull: "deletedAt" }` (a query atual só passa `eq` e `gt`).

- [ ] **Step 3: Implementar a mudança mínima**

Em `packages/api/src/routers/sync.ts`, na query de `pullChanges` (por volta da linha 160-163), adicionar `isNull(leads.deletedAt)` ao `and(...)`:

```ts
			const changes = await db
				.select()
				.from(leads)
				.where(
					and(
						eq(leads.userId, userId),
						gt(leads.updatedAt, since),
						isNull(leads.deletedAt)
					)
				);
```

`isNull` já está importado em `sync.ts` (`import { and, eq, gt, isNull } from "drizzle-orm";`).

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `cd packages/api && bun run vitest run src/__tests__/sync.test.ts`
Expected: PASS — todos os testes de `sync.test.ts`, incluindo o novo.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/routers/sync.ts packages/api/src/__tests__/sync.test.ts
git commit -m "fix: pullChanges filtra leads soft-deletados"
```

---

### Task 2: #19 — CI GitHub Actions

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Criar o workflow**

Criar `.github/workflows/ci.yml` com o conteúdo exato:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.3.11

      - name: Cache Turborepo
        uses: actions/cache@v4
        with:
          path: .turbo
          key: turbo-${{ github.sha }}
          restore-keys: turbo-

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Check types
        run: bun run check-types

      - name: Test
        run: bun run test

      - name: Build
        run: bun run build

      - name: Lint
        run: bun run check
```

- [ ] **Step 2: Validar a sintaxe YAML**

Run: `bunx js-yaml .github/workflows/ci.yml > /dev/null && echo "YAML OK"`
Expected: `YAML OK` (sem erro de parse).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: adiciona pipeline GitHub Actions"
```

---

### Task 3: #23 — `packages/auth` consome env validado

**Files:**
- Modify: `packages/auth/package.json` (dependencies)
- Modify: `packages/auth/src/index.ts`

- [ ] **Step 1: Adicionar a dependência de env**

Em `packages/auth/package.json`, no bloco `dependencies`, adicionar a linha do pacote `env` (manter ordenação consistente com o arquivo):

```json
  "dependencies": {
    "better-auth": "^1.3.10",
    "@dashboard-leads-profills/db": "workspace:*",
    "@dashboard-leads-profills/env": "workspace:*",
    "drizzle-orm": "catalog:"
  },
```

- [ ] **Step 2: Instalar para resolver o workspace**

Run: `bun install`
Expected: instala sem erro; lockfile atualizado com a nova aresta de workspace.

- [ ] **Step 3: Trocar `process.env` por `env` validado**

Em `packages/auth/src/index.ts`:

Adicionar o import (junto aos outros imports do topo):

```ts
import { env } from "@dashboard-leads-profills/env/server";
```

Trocar as ocorrências:

```ts
	baseURL: env.BETTER_AUTH_URL,
	secret: env.BETTER_AUTH_SECRET,
```

```ts
		google: {
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
		},
```

No hook `databaseHooks.user.create.before`:

```ts
					const inviteCode = env.SIGNUP_INVITE_CODE ?? "";
					const secret = env.BETTER_AUTH_SECRET;
```

E o `trustedOrigins`:

```ts
	trustedOrigins: [env.BETTER_AUTH_URL],
```

`GOOGLE_CLIENT_ID/SECRET` e `BETTER_AUTH_SECRET/URL` são obrigatórios no schema (`min(1)` / `url()` / `min(32)`), então os fallbacks `?? ""` e `?? "http://localhost:3001"` são removidos. `SIGNUP_INVITE_CODE` é `.optional()` — mantém `?? ""`.

- [ ] **Step 4: Verificar tipos e build**

Run: `bun run check-types && bun run build`
Expected: PASS — sem erro de tipo; `env.X` resolve para os tipos do schema. (A suíte de testes de `packages/api` é verificada na Task 4, que ajusta os mocks de env.)

- [ ] **Step 5: Commit**

```bash
git add packages/auth/package.json packages/auth/src/index.ts bun.lock
git commit -m "refactor: packages/auth usa env validado"
```

---

### Task 4: #24 — Remover segredos não usados (roda por último)

> Roda depois das Tasks 1 e 3: edita `packages/api/src/__tests__/sync.test.ts` (também tocado pela Task 1) e ajusta os mocks de env para suportar a Task 3.

**Files:**
- Modify: `apps/web/.env`
- Modify: `turbo.json`
- Modify: `packages/api/src/__tests__/admin-leads.test.ts`
- Modify: `packages/api/src/__tests__/admin-stats.test.ts`
- Modify: `packages/api/src/__tests__/leaderboard.test.ts`
- Modify: `packages/api/src/__tests__/sync.test.ts`
- Modify: `CLAUDE.md`
- Modify: `docs/tech-debt.md`

- [ ] **Step 1: Remover as chaves de `apps/web/.env`**

Remover as linhas de `SUPABASE_SERVICE_ROLE_KEY` e `RESEND_API_KEY` de `apps/web/.env` (incluir o comentário `# Resend` órfão acima de `RESEND_API_KEY`).

- [ ] **Step 2: Remover as chaves de `turbo.json`**

Em `turbo.json`, remover as entradas `"SUPABASE_SERVICE_ROLE_KEY"` e `"RESEND_API_KEY"` da lista `env`. Manter `"SUPABASE_ACCESS_TOKEN"` (fora de escopo).

- [ ] **Step 3: Ajustar os mocks de env nos 4 testes de `packages/api`**

Em cada um de `admin-leads.test.ts`, `admin-stats.test.ts`, `leaderboard.test.ts` e `sync.test.ts`, dentro do `vi.mock("@dashboard-leads-profills/env/server", ...)`:

- Remover a linha `SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",`.
- Adicionar as chaves de auth que a Task 3 passou a ler via `env` (o mock deve espelhar o schema real consumido por `packages/auth`):

```ts
		BETTER_AUTH_SECRET: "test-better-auth-secret-min-32-chars-long",
		BETTER_AUTH_URL: "http://localhost:3001",
		GOOGLE_CLIENT_ID: "test-google-client-id",
		GOOGLE_CLIENT_SECRET: "test-google-client-secret",
```

O objeto `env` final de cada mock deve conter: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NODE_ENV`.

- [ ] **Step 4: Atualizar `CLAUDE.md`**

Na seção "Variáveis de Ambiente", remover a frase:

> `SUPABASE_SERVICE_ROLE_KEY` e `RESEND_API_KEY` aparecem no `.env` / `turbo.json` mas não são validados por `packages/env` — ver `docs/tech-debt.md`.

- [ ] **Step 5: Marcar o item #6 de `docs/tech-debt.md` como resolvido**

No item "### 6. Segredos fora do schema de validação de env", adicionar abaixo da linha `- **Issue:** #24`:

```markdown
- **Status:** resolvido em 2026-05-19 — `SUPABASE_SERVICE_ROLE_KEY` e `RESEND_API_KEY`
  eram código morto (zero uso em produção); removidos de `apps/web/.env` e `turbo.json`.
```

- [ ] **Step 6: Verificar testes e tipos**

Run: `bun run test && bun run check-types`
Expected: PASS — toda a suíte passa; nenhum teste referencia `SUPABASE_SERVICE_ROLE_KEY`.

- [ ] **Step 7: Commit**

```bash
git add apps/web/.env turbo.json packages/api/src/__tests__/ CLAUDE.md docs/tech-debt.md
git commit -m "chore: remove segredos de env não usados"
```

---

## Verificação final

Após as 4 tarefas, na raiz do repo:

```bash
bun run check-types && bun run test && bun run build && bun run check
```

Expected: tudo PASS. As issues #26, #23, #24 e #19 podem ser fechadas no GitHub.
