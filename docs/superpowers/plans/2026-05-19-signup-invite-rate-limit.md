# Rate Limit Persistente para `/api/signup-invite` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o rate limit in-memory de `/api/signup-invite` por um store persistente em Postgres, válido entre instâncias serverless.

**Architecture:** Uma tabela `signup_invite_rate_limit` (Drizzle) guarda contador e fim de janela por IP. Um helper executa um `INSERT ... ON CONFLICT` atômico — race-safe sem transação — que incrementa ou reinicia a janela e retorna o contador. O route handler chama o helper async; comportamento observável (5 tentativas / 60s, resposta 429) é preservado.

**Tech Stack:** Next.js 16 route handler, Drizzle ORM (node-postgres), PostgreSQL, Vitest.

---

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `packages/db/src/schema/signup-invite-rate-limit.ts` | **Criar** — schema Drizzle da tabela |
| `packages/db/src/schema/index.ts` | **Modificar** — re-export do novo schema |
| `packages/db/src/index.ts` | **Modificar** — registra schema no client `db` |
| `packages/db/src/migrations/<gerada>.sql` | **Criar** — migration gerada por drizzle-kit |
| `apps/web/src/lib/rate-limit/signup-invite.ts` | **Criar** — helper de limite + cleanup |
| `apps/web/src/lib/rate-limit/signup-invite.test.ts` | **Criar** — teste de integração contra Postgres |
| `apps/web/src/app/api/signup-invite/route.ts` | **Modificar** — usa o helper async |
| `docs/tech-debt.md` | **Modificar** — marca item #9 como resolvido |

---

## Task 1: Schema e migration da tabela

**Files:**
- Create: `packages/db/src/schema/signup-invite-rate-limit.ts`
- Modify: `packages/db/src/schema/index.ts`
- Modify: `packages/db/src/index.ts:4-8`
- Create: `packages/db/src/migrations/<gerada>.sql` (drizzle-kit nomeia)

- [ ] **Step 1: Criar o schema Drizzle**

Create `packages/db/src/schema/signup-invite-rate-limit.ts`:

```ts
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const signupInviteRateLimit = pgTable("signup_invite_rate_limit", {
	ip: text("ip").primaryKey(),
	count: integer("count").notNull(),
	resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});
```

- [ ] **Step 2: Re-exportar no índice de schema**

Modify `packages/db/src/schema/index.ts` — adicionar a linha de export mantendo as existentes:

```ts
// biome-ignore lint/performance/noBarrelFile: indice de schema Drizzle, re-export intencional
export * from "./leads";
export * from "./signup-invite-rate-limit";
export * from "./todo";
```

- [ ] **Step 3: Registrar no client `db`**

Modify `packages/db/src/index.ts` — incluir `signupInviteRateLimit` no import e no objeto `schema`:

```ts
import { env } from "@dashboard-leads-profills/env/server";
import { drizzle } from "drizzle-orm/node-postgres";

import { interestTagEnum, leads, signupInviteRateLimit, todo } from "./schema";

export const db = drizzle(env.DATABASE_URL, {
	schema: { interestTagEnum, leads, signupInviteRateLimit, todo },
});
```

- [ ] **Step 4: Gerar a migration**

Run (a partir da raiz do repo): `bun run db:generate`
Expected: drizzle-kit cria um novo arquivo `.sql` em `packages/db/src/migrations/` contendo `CREATE TABLE "signup_invite_rate_limit"` com as colunas `ip` (pk), `count`, `reset_at`.

- [ ] **Step 5: Aplicar a migration no banco local**

Run (a partir da raiz do repo): `bun run db:migrate`
Expected: migration aplicada sem erro; a tabela `signup_invite_rate_limit` passa a existir.

- [ ] **Step 6: Verificar tipos**

Run: `bun run check-types`
Expected: PASS, sem erros.

- [ ] **Step 7: Commit**

```bash
git add packages/db/src/schema/signup-invite-rate-limit.ts packages/db/src/schema/index.ts packages/db/src/index.ts packages/db/src/migrations
git commit -m "feat: tabela signup_invite_rate_limit"
```

---

## Task 2: Helper de rate limit com teste de integração

**Files:**
- Create: `apps/web/src/lib/rate-limit/signup-invite.ts`
- Test: `apps/web/src/lib/rate-limit/signup-invite.test.ts`

> **Nota sobre o teste:** os testes existentes (`leaderboard.test.ts`, `sync.test.ts`) mockam o `db` inteiro. Aqui o ponto da mudança é a atomicidade do SQL, então o teste conecta a um Postgres real. Ele lê `process.env.TEST_DATABASE_URL`; se ausente, o bloco inteiro é pulado via `describe.skipIf`. Para rodar a cobertura real, exporte `TEST_DATABASE_URL` apontando para o banco de teste antes de `bun run test`.

- [ ] **Step 1: Escrever o teste de integração (falhando)**

Create `apps/web/src/lib/rate-limit/signup-invite.test.ts`:

```ts
// @vitest-environment node
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

vi.mock("@dashboard-leads-profills/env/server", () => ({
	env: {
		DATABASE_URL:
			process.env.TEST_DATABASE_URL ??
			"postgresql://test:test@localhost:5432/test",
		NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
		NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
		BETTER_AUTH_SECRET: "test-better-auth-secret-min-32-chars-long",
		BETTER_AUTH_URL: "http://localhost:3001",
		GOOGLE_CLIENT_ID: "test-google-client-id",
		GOOGLE_CLIENT_SECRET: "test-google-client-secret",
		NODE_ENV: "test",
	},
}));

describe.skipIf(!TEST_DATABASE_URL)("checkSignupInviteRateLimit", () => {
	let db: typeof import("@dashboard-leads-profills/db").db;
	let sql: typeof import("drizzle-orm").sql;
	let checkSignupInviteRateLimit: typeof import("./signup-invite").checkSignupInviteRateLimit;
	let cleanupExpiredRateLimits: typeof import("./signup-invite").cleanupExpiredRateLimits;

	beforeAll(async () => {
		({ db } = await import("@dashboard-leads-profills/db"));
		({ sql } = await import("drizzle-orm"));
		({ checkSignupInviteRateLimit, cleanupExpiredRateLimits } = await import(
			"./signup-invite"
		));
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS signup_invite_rate_limit (
				ip text PRIMARY KEY,
				count integer NOT NULL,
				reset_at timestamptz NOT NULL
			)
		`);
	});

	afterEach(async () => {
		await db.execute(sql`DELETE FROM signup_invite_rate_limit`);
	});

	it("libera a primeira chamada de um IP novo", async () => {
		expect(await checkSignupInviteRateLimit("1.1.1.1")).toBe(true);
	});

	it("libera 5 chamadas e bloqueia a 6ª na mesma janela", async () => {
		const ip = "2.2.2.2";
		for (let i = 0; i < 5; i++) {
			expect(await checkSignupInviteRateLimit(ip)).toBe(true);
		}
		expect(await checkSignupInviteRateLimit(ip)).toBe(false);
	});

	it("reinicia a janela após reset_at expirar", async () => {
		const ip = "3.3.3.3";
		for (let i = 0; i < 6; i++) {
			await checkSignupInviteRateLimit(ip);
		}
		await db.execute(
			sql`UPDATE signup_invite_rate_limit SET reset_at = now() - interval '1 second' WHERE ip = ${ip}`
		);
		expect(await checkSignupInviteRateLimit(ip)).toBe(true);
	});

	it("mantém buckets independentes por IP", async () => {
		for (let i = 0; i < 6; i++) {
			await checkSignupInviteRateLimit("4.4.4.4");
		}
		expect(await checkSignupInviteRateLimit("5.5.5.5")).toBe(true);
	});

	it("cleanup remove linhas com reset_at no passado", async () => {
		await db.execute(
			sql`INSERT INTO signup_invite_rate_limit (ip, count, reset_at) VALUES ('old', 3, now() - interval '1 minute')`
		);
		await db.execute(
			sql`INSERT INTO signup_invite_rate_limit (ip, count, reset_at) VALUES ('fresh', 1, now() + interval '1 minute')`
		);
		await cleanupExpiredRateLimits();
		const result = await db.execute(
			sql`SELECT ip FROM signup_invite_rate_limit ORDER BY ip`
		);
		expect((result.rows as { ip: string }[]).map((r) => r.ip)).toEqual([
			"fresh",
		]);
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar a falha**

Run (com `TEST_DATABASE_URL` exportado): `cd apps/web && bunx vitest run src/lib/rate-limit/signup-invite.test.ts`
Expected: FAIL — `Failed to resolve import "./signup-invite"` (o helper ainda não existe).

- [ ] **Step 3: Implementar o helper**

Create `apps/web/src/lib/rate-limit/signup-invite.ts`:

```ts
import { db } from "@dashboard-leads-profills/db";
import { sql } from "drizzle-orm";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const CLEANUP_PROBABILITY = 0.05;

/** Remove linhas cuja janela já expirou. Best-effort. */
export async function cleanupExpiredRateLimits(): Promise<void> {
	await db.execute(
		sql`DELETE FROM signup_invite_rate_limit WHERE reset_at < now()`
	);
}

/**
 * Registra uma tentativa do IP e devolve `true` se ainda está dentro do limite
 * (5 tentativas por janela de 60s), `false` se deve ser bloqueado.
 *
 * O upsert é atômico: o `ON CONFLICT` decide num único statement se incrementa
 * o contador ou reinicia a janela, sem race entre instâncias concorrentes.
 */
export async function checkSignupInviteRateLimit(ip: string): Promise<boolean> {
	if (Math.random() < CLEANUP_PROBABILITY) {
		try {
			await cleanupExpiredRateLimits();
		} catch {
			// Cleanup é best-effort; sua falha não deve bloquear o request.
			// O caminho crítico (upsert abaixo) segue normalmente.
		}
	}

	const resetAt = new Date(Date.now() + RATE_LIMIT_WINDOW_MS);
	const result = await db.execute(sql`
		INSERT INTO signup_invite_rate_limit (ip, count, reset_at)
		VALUES (${ip}, 1, ${resetAt})
		ON CONFLICT (ip) DO UPDATE SET
			count = CASE WHEN signup_invite_rate_limit.reset_at < now()
				THEN 1 ELSE signup_invite_rate_limit.count + 1 END,
			reset_at = CASE WHEN signup_invite_rate_limit.reset_at < now()
				THEN ${resetAt} ELSE signup_invite_rate_limit.reset_at END
		RETURNING count
	`);

	const rows = result.rows as { count: number }[];
	const count = Number(rows[0]?.count ?? 0);
	return count <= RATE_LIMIT_MAX;
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run (com `TEST_DATABASE_URL` exportado): `cd apps/web && bunx vitest run src/lib/rate-limit/signup-invite.test.ts`
Expected: PASS — 5 testes verdes.

- [ ] **Step 5: Verificar tipos e lint**

Run: `bun run check-types`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/rate-limit/signup-invite.ts apps/web/src/lib/rate-limit/signup-invite.test.ts
git commit -m "feat: helper de rate limit persistente para signup-invite"
```

---

## Task 3: Ligar o route handler ao helper

**Files:**
- Modify: `apps/web/src/app/api/signup-invite/route.ts`

- [ ] **Step 1: Substituir o rate limit in-memory pelo helper**

Modify `apps/web/src/app/api/signup-invite/route.ts`. Remover:
- as constantes `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX` e o `const attempts = new Map(...)` (linhas 9-11);
- a função `checkRateLimit` inteira (linhas 21-33).

Adicionar o import do helper e trocar a chamada. O início do arquivo passa a ser:

```ts
import {
	computeInviteToken,
	INVITE_COOKIE_MAX_AGE,
	INVITE_COOKIE_NAME,
	timingSafeEqual,
} from "@dashboard-leads-profills/auth/invite-token";
import { env } from "@dashboard-leads-profills/env/server";
import { checkSignupInviteRateLimit } from "@/lib/rate-limit/signup-invite";

function getClientIp(req: Request): string {
	const forwarded = req.headers.get("x-forwarded-for");
	if (forwarded) {
		return (forwarded.split(",")[0] ?? "").trim();
	}
	return req.headers.get("x-real-ip") ?? "unknown";
}
```

E dentro de `POST`, a checagem de limite passa a ser `await`:

```ts
	const ip = getClientIp(req);
	if (!(await checkSignupInviteRateLimit(ip))) {
		return Response.json(
			{ error: "Muitas tentativas. Tente novamente em 1 minuto." },
			{ status: 429 }
		);
	}
```

O restante de `POST` (parse do body, `timingSafeEqual`, `computeInviteToken`, cookie, resposta 200) permanece inalterado.

- [ ] **Step 2: Ordenar imports e formatar**

Run: `bun run fix`
Expected: sem erros; ordenação de imports ajustada se necessário.

- [ ] **Step 3: Verificar tipos**

Run: `bun run check-types`
Expected: PASS.

- [ ] **Step 4: Rodar a suíte de testes completa**

Run: `bun run test`
Expected: PASS (testes do helper rodam se `TEST_DATABASE_URL` estiver setado; caso contrário ficam skipped — nenhum teste falha).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/api/signup-invite/route.ts
git commit -m "feat: route signup-invite usa rate limit persistente"
```

---

## Task 4: Marcar dívida técnica como resolvida

**Files:**
- Modify: `docs/tech-debt.md:86-93`

- [ ] **Step 1: Adicionar status ao item #9**

Modify `docs/tech-debt.md` — adicionar uma linha `**Status:**` ao final do item 9, no mesmo formato dos itens já resolvidos (ex.: item 3):

```markdown
### 9. Rate limit de `/api/signup-invite` é in-memory

- **Arquivo:** `apps/web/src/app/api/signup-invite/route.ts:11`
- **Causa raiz:** o controle de tentativas usa um `Map` em memória de processo. Em
  deploy serverless cada cold start zera o `Map`; um atacante rotaciona instâncias e
  contorna o limite.
- **Ação sugerida:** migrar para um store persistente (Redis) ou estratégia stateless.
- **Issue:** #27
- **Status:** resolvido em 2026-05-19 — store migrado para a tabela Postgres
  `signup_invite_rate_limit` via upsert atômico; rate limit agora é compartilhado
  entre instâncias serverless.
```

- [ ] **Step 2: Commit**

```bash
git add docs/tech-debt.md
git commit -m "docs: marca item 9 da dívida técnica como resolvido"
```

---

## Verificação Final

- [ ] `bun run check-types` — PASS
- [ ] `bun run test` — PASS (helper coberto quando `TEST_DATABASE_URL` setado)
- [ ] `bun run check` — PASS
- [ ] Tabela `signup_invite_rate_limit` existe no banco e a migration está commitada.
- [ ] `route.ts` não tem mais `Map`, `attempts` nem `checkRateLimit`.
