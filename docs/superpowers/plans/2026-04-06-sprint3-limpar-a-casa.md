# Sprint 3 — "Limpar a Casa" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar 6 itens P2 (segurança, código morto, integridade de dados) e adicionar 6 testes de cenários de falha no sync engine.

**Architecture:** Cada item P2 é cirúrgico e independente. A ordem importa: segurança primeiro (P2-5, P2-1), depois limpeza (P2-2, P2-4), depois queries (P2-6), depois integridade de sync (P2-7), e por fim os testes de falha (P3-3) que validam P2-7.

**Tech Stack:** tRPC 11, Drizzle ORM, Dexie 4, Vitest, TypeScript strict, Bun workspaces

---

## File Map

| Arquivo | Tarefas |
|---------|---------|
| `packages/api/src/routers/admin/users.ts` | P2-5, P2-7 |
| `packages/api/src/routers/index.ts` | P2-1 |
| `packages/api/src/routers/todo.ts` | P2-1 (deletar) |
| `packages/auth/` | P2-2 (deletar diretório) |
| `apps/web/package.json` | P2-2 |
| `apps/web/src/lib/lead/helpers.ts` | P2-4 (criar) |
| `apps/web/src/lib/lead/save-lead.ts` | P2-4 |
| `apps/web/src/lib/lead/update-lead.ts` | P2-4 |
| `packages/api/src/routers/admin/leads.ts` | P2-6, P2-7 |
| `packages/api/src/routers/admin/stats.ts` | P2-6 |
| `packages/api/src/routers/sync.ts` | P2-7 |
| `packages/api/src/__tests__/sync.test.ts` | P2-7 (mocks + novos testes) |
| `packages/api/src/__tests__/admin-leads.test.ts` | P2-6 (adicionar `desc` ao mock) |
| `packages/api/src/__tests__/admin-stats.test.ts` | P2-6 (adicionar `selectDistinct`, `isNotNull`, `asc`) |
| `apps/web/src/lib/sync/engine.test.ts` | P3-3 |

---

## Task 1: P2-5 — Eliminar sql.raw() com interpolação manual

**Files:**
- Modify: `packages/api/src/routers/admin/users.ts:1-10` (imports), `:41`, `:53-55`

- [ ] **Step 1: Verificar o estado atual**

```bash
grep -n "sql.raw\|inArray\|isNull" packages/api/src/routers/admin/users.ts
```

Expected: 2 ocorrências de `sql.raw`, nenhum `inArray` ou `isNull`.

- [ ] **Step 2: Atualizar os imports de drizzle-orm**

Em `packages/api/src/routers/admin/users.ts`, linha 5, alterar de:
```typescript
import { and, count, eq, sql } from "drizzle-orm";
```
Para:
```typescript
import { and, count, eq, inArray, isNull, sql } from "drizzle-orm";
```

- [ ] **Step 3: Substituir linha 41 — filtro de roles**

De:
```typescript
sql`${userRoles.userId} = ANY(${sql.raw(`ARRAY['${userIds.join("','")}']::uuid[]`)})`
```
Para:
```typescript
inArray(userRoles.userId, userIds)
```

- [ ] **Step 4: Substituir linhas 52-55 — filtro de leads**

De:
```typescript
and(
    sql`${leads.userId} = ANY(${sql.raw(`ARRAY['${userIds.join("','")}']::uuid[]`)})`,
    sql`${leads.deletedAt} IS NULL`
)
```
Para:
```typescript
and(
    inArray(leads.userId, userIds),
    isNull(leads.deletedAt)
)
```

- [ ] **Step 5: Verificar que não restam sql.raw no arquivo**

```bash
grep -n "sql.raw" packages/api/src/routers/admin/users.ts
```

Expected: sem output.

- [ ] **Step 6: Rodar type-check e testes**

```bash
cd /home/othavio/Work/profills/sistema2/sistema-coleta-de-lead && bun run check-types 2>&1 | head -30
bun run test -- --reporter=verbose 2>&1 | tail -20
```

Expected: zero erros de tipos, todos os testes passando.

- [ ] **Step 7: Commit**

```bash
git add packages/api/src/routers/admin/users.ts
git commit -m "fix(security): substituir sql.raw() por inArray/isNull em admin/users (P2-5)"
```

---

## Task 2: P2-1 — Remover todoRouter (publicProcedure sem auth)

**Files:**
- Delete: `packages/api/src/routers/todo.ts`
- Modify: `packages/api/src/routers/index.ts:1,5,20`

> **NOTA:** NÃO deletar `packages/db/src/schema/todo.ts`. NÃO gerar migration DROP TABLE. A tabela vazia fica para fase posterior. O risco urgente é a rota pública.

- [ ] **Step 1: Verificar os consumidores do todoRouter**

```bash
grep -rn "todoRouter\|todo\." packages/api/src/ apps/web/src/
```

Expected: apenas `packages/api/src/routers/index.ts` (import e uso), e `packages/api/src/routers/todo.ts` (definição). Zero consumidores no frontend.

- [ ] **Step 2: Remover import e entry em index.ts**

Em `packages/api/src/routers/index.ts`, o arquivo atual é:
```typescript
import { protectedProcedure, publicProcedure, router } from "../index";
import { adminRouter } from "./admin/index";
import { leaderboardRouter } from "./leaderboard";
import { syncRouter } from "./sync";
import { todoRouter } from "./todo";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	privateData: protectedProcedure.query(({ ctx }) => {
		return {
			message: "This is private",
			user: ctx.user,
		};
	}),
	admin: adminRouter,
	leaderboard: leaderboardRouter,
	sync: syncRouter,
	todo: todoRouter,
});
export type AppRouter = typeof appRouter;
```

Substituir por:
```typescript
import { protectedProcedure, publicProcedure, router } from "../index";
import { adminRouter } from "./admin/index";
import { leaderboardRouter } from "./leaderboard";
import { syncRouter } from "./sync";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	privateData: protectedProcedure.query(({ ctx }) => {
		return {
			message: "This is private",
			user: ctx.user,
		};
	}),
	admin: adminRouter,
	leaderboard: leaderboardRouter,
	sync: syncRouter,
});
export type AppRouter = typeof appRouter;
```

- [ ] **Step 3: Deletar o arquivo do router**

```bash
rm packages/api/src/routers/todo.ts
```

- [ ] **Step 4: Verificar que nenhum publicProcedure não-autorizado sobrou**

```bash
grep -rn "publicProcedure" packages/api/src/routers/
```

Expected: apenas `packages/api/src/routers/index.ts` linha do `healthCheck`.

- [ ] **Step 5: Rodar type-check e testes**

```bash
bun run check-types 2>&1 | head -30
bun run test 2>&1 | tail -20
```

Expected: zero erros, todos os testes passando.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routers/index.ts
git rm packages/api/src/routers/todo.ts
git commit -m "chore: remover todoRouter com publicProcedure sem auth (P2-1)"
```

---

## Task 3: P2-2 — Remover packages/auth morto

**Files:**
- Delete: `packages/auth/` (diretório inteiro)
- Modify: `apps/web/package.json`

- [ ] **Step 1: Confirmar que nenhum código runtime importa o pacote**

```bash
grep -rn "@dashboard-leads-profills/auth" apps/ packages/api/ packages/db/ packages/env/
```

Expected: sem output.

- [ ] **Step 2: Remover dependência de apps/web/package.json**

Em `apps/web/package.json`, encontrar e remover a linha:
```json
"@dashboard-leads-profills/auth": "workspace:*",
```

A seção `dependencies` deve ficar sem essa entrada.

- [ ] **Step 3: Deletar o diretório packages/auth**

```bash
rm -rf packages/auth
```

- [ ] **Step 4: Atualizar o lockfile**

```bash
cd /home/othavio/Work/profills/sistema2/sistema-coleta-de-lead && bun install
```

Expected: lockfile atualizado sem erros. Se houver erro de resolução, verificar se algum arquivo ainda importa o pacote.

- [ ] **Step 5: Rodar type-check e testes**

```bash
bun run check-types 2>&1 | head -30
bun run test 2>&1 | tail -20
```

Expected: zero erros, todos os testes passando.

- [ ] **Step 6: Verificar que referência foi removida**

```bash
grep -rn "@dashboard-leads-profills/auth" .
```

Expected: sem output.

- [ ] **Step 7: Commit**

```bash
git add apps/web/package.json bun.lockb
git rm -rf packages/auth
git commit -m "chore: remover packages/auth morto e dependência em apps/web (P2-2)"
```

---

## Task 4: P2-4 — Extrair emptyToNull duplicada

**Files:**
- Create: `apps/web/src/lib/lead/helpers.ts`
- Modify: `apps/web/src/lib/lead/save-lead.ts:5-7`
- Modify: `apps/web/src/lib/lead/update-lead.ts:5-7`

- [ ] **Step 1: Criar o módulo de helpers**

Criar `apps/web/src/lib/lead/helpers.ts`:
```typescript
export function emptyToNull(value: string | undefined): string | null {
	return !value || value === "" ? null : value;
}
```

- [ ] **Step 2: Atualizar save-lead.ts**

Em `apps/web/src/lib/lead/save-lead.ts`, substituir as linhas 1-7:
```typescript
import { db } from "../db/index";
import { checkStorageAndCompress } from "./compression";
import type { LeadFormData } from "./validation";

function emptyToNull(value: string | undefined): string | null {
	return !value || value === "" ? null : value;
}
```
Por:
```typescript
import { db } from "../db/index";
import { checkStorageAndCompress } from "./compression";
import type { LeadFormData } from "./validation";

import { emptyToNull } from "./helpers";
```

- [ ] **Step 3: Atualizar update-lead.ts**

Em `apps/web/src/lib/lead/update-lead.ts`, substituir as linhas 1-7:
```typescript
import { db } from "../db/index";
import { checkStorageAndCompress } from "./compression";
import type { LeadFormData } from "./validation";

function emptyToNull(value: string | undefined): string | null {
	return !value || value === "" ? null : value;
}
```
Por:
```typescript
import { db } from "../db/index";
import { checkStorageAndCompress } from "./compression";
import type { LeadFormData } from "./validation";

import { emptyToNull } from "./helpers";
```

- [ ] **Step 4: Rodar type-check e testes**

```bash
bun run check-types 2>&1 | head -30
bun run test 2>&1 | tail -20
```

Expected: zero erros. Os testes de `save-lead` e `update-lead` continuam passando (comportamento idêntico).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/lead/helpers.ts apps/web/src/lib/lead/save-lead.ts apps/web/src/lib/lead/update-lead.ts
git commit -m "refactor: extrair emptyToNull duplicada para helpers.ts (P2-4)"
```

---

## Task 5: P2-6 — Converter queries SQL raw builder-safe para Drizzle

**Files:**
- Modify: `packages/api/src/routers/admin/leads.ts:1,27,31,49`
- Modify: `packages/api/src/routers/admin/stats.ts:1,151-161`
- Modify: `packages/api/src/__tests__/admin-leads.test.ts:46-55` (mock)
- Modify: `packages/api/src/__tests__/admin-stats.test.ts:21-55` (mock)

> **Escopo narrowed (Codex review):** Converter apenas `orderBy`, `count`, e `getDistinctSegments`. `buildWhereConditions` com `::timestamptz` permanece raw.

### Passo 1: admin/leads.ts

- [ ] **Step 1: Atualizar imports em admin/leads.ts**

Em `packages/api/src/routers/admin/leads.ts`, linha 4, alterar de:
```typescript
import { and, eq, isNull, sql } from "drizzle-orm";
```
Para:
```typescript
import { and, count, desc, eq, isNull } from "drizzle-orm";
```

(Remove `sql`, adiciona `count` e `desc`.)

- [ ] **Step 2: Converter orderBy em listByUser (linha 27)**

Em `packages/api/src/routers/admin/leads.ts`, substituir:
```typescript
.orderBy(sql`${leads.createdAt} DESC`)
```
Por:
```typescript
.orderBy(desc(leads.createdAt))
```

- [ ] **Step 3: Converter count em listByUser (linha 31)**

Substituir:
```typescript
db
    .select({ count: sql<number>`count(*)::int` })
    .from(leads)
    .where(and(eq(leads.userId, input.userId), isNull(leads.deletedAt))),
```
Por:
```typescript
db
    .select({ count: count(leads.id) })
    .from(leads)
    .where(and(eq(leads.userId, input.userId), isNull(leads.deletedAt))),
```

- [ ] **Step 4: Converter orderBy em exportByFilters (linha 49)**

Substituir:
```typescript
.orderBy(sql`${leads.createdAt} DESC`)
```
Por:
```typescript
.orderBy(desc(leads.createdAt))
```

### Passo 2: admin/stats.ts — getDistinctSegments

- [ ] **Step 5: Atualizar imports em admin/stats.ts**

Em `packages/api/src/routers/admin/stats.ts`, linha 3, alterar de:
```typescript
import { and, isNull, type SQL, sql } from "drizzle-orm";
```
Para:
```typescript
import { and, asc, isNotNull, isNull, type SQL, sql } from "drizzle-orm";
```

- [ ] **Step 6: Converter getDistinctSegments**

Substituir o corpo completo de `getDistinctSegments` (linhas 150-161):
```typescript
getDistinctSegments: adminProcedure.query(async () => {
    const rows = await db.execute(
        sql`
            SELECT DISTINCT segment
            FROM leads
            WHERE segment IS NOT NULL AND deleted_at IS NULL
            ORDER BY segment ASC
        `
    );

    return (rows.rows as Array<{ segment: string }>).map((r) => r.segment);
}),
```
Por:
```typescript
getDistinctSegments: adminProcedure.query(async () => {
    const rows = await db
        .selectDistinct({ segment: leads.segment })
        .from(leads)
        .where(and(isNotNull(leads.segment), isNull(leads.deletedAt)))
        .orderBy(asc(leads.segment));

    return rows.map((r) => r.segment as string);
}),
```

### Passo 3: Atualizar mocks de teste

- [ ] **Step 7: Adicionar `desc` ao mock de drizzle-orm em admin-leads.test.ts**

Em `packages/api/src/__tests__/admin-leads.test.ts`, na função `loadAdminLeadsRouter`, atualizar o `vi.doMock("drizzle-orm", ...)` adicionando `desc`:
```typescript
vi.doMock("drizzle-orm", () => ({
    and: (...conditions: unknown[]) => ({ kind: "and", conditions }),
    eq: (left: unknown, right: unknown) => ({ kind: "eq", left, right }),
    isNull: (value: unknown) => ({ kind: "isNull", value }),
    desc: (col: unknown) => ({ kind: "desc", col }),
    count: (col: unknown) => ({ kind: "count", col }),
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
        kind: "sql",
        text: strings.join("?"),
        values,
    }),
}));
```

- [ ] **Step 8: Adicionar `selectDistinct`, `isNotNull`, `asc` ao mock em admin-stats.test.ts**

Em `packages/api/src/__tests__/admin-stats.test.ts`, na função `loadAdminStatsRouter`:

Atualizar o mock do `db` para adicionar `selectDistinct`:
```typescript
vi.doMock("@dashboard-leads-profills/db", () => ({
    db: {
        select: vi.fn(() => ({
            from: vi.fn(() => ({
                where: vi.fn(async () => []),
            })),
        })),
        selectDistinct: vi.fn(() => ({
            from: vi.fn(() => ({
                where: vi.fn(() => ({
                    orderBy: vi.fn(async () => []),
                })),
            })),
        })),
        execute: vi.fn().mockResolvedValue({ rows: rankingRows }),
    },
}));
```

Atualizar o mock do `drizzle-orm` para adicionar `isNotNull`, `asc`:
```typescript
vi.doMock("drizzle-orm", () => ({
    and: (...conditions: unknown[]) => ({ kind: "and", conditions }),
    eq: (left: unknown, right: unknown) => ({ kind: "eq", left, right }),
    isNull: (value: unknown) => ({ kind: "isNull", value }),
    isNotNull: (value: unknown) => ({ kind: "isNotNull", value }),
    asc: (col: unknown) => ({ kind: "asc", col }),
    sql: Object.assign(
        (strings: TemplateStringsArray, ...values: unknown[]) => ({
            kind: "sql",
            text: strings.join("?"),
            values,
        }),
        { raw: (s: string) => ({ kind: "sql-raw", text: s }) }
    ),
}));
```

- [ ] **Step 9: Rodar type-check e testes**

```bash
bun run check-types 2>&1 | head -30
bun run test 2>&1 | tail -20
```

Expected: zero erros, todos os testes passando.

- [ ] **Step 10: Verificar que sql.raw não sobrou em admin/**

```bash
grep -n "sql\.raw" packages/api/src/routers/admin/
```

Expected: sem output.

- [ ] **Step 11: Commit**

```bash
git add packages/api/src/routers/admin/leads.ts packages/api/src/routers/admin/stats.ts packages/api/src/__tests__/admin-leads.test.ts packages/api/src/__tests__/admin-stats.test.ts
git commit -m "refactor: converter queries SQL raw builder-safe para Drizzle (P2-6)"
```

---

## Task 6: P2-7 — Tombstone contract + validação de rowcount

**Files:**
- Modify: `packages/api/src/routers/sync.ts:1,98-110`
- Modify: `packages/api/src/routers/admin/leads.ts:111-120`
- Modify: `packages/api/src/routers/admin/users.ts:95-101,127-131`
- Modify: `packages/api/src/__tests__/sync.test.ts` (atualizar mocks + 2 novos testes)

### Passo 1: sync.ts — Tombstone contract no UPDATE

- [ ] **Step 1: Atualizar imports em sync.ts**

Em `packages/api/src/routers/sync.ts`, linha 3, alterar de:
```typescript
import { and, eq, gt } from "drizzle-orm";
```
Para:
```typescript
import { and, eq, gt, isNull } from "drizzle-orm";
```

- [ ] **Step 2: Reescrever o case "update" em sync.ts**

O `case "update"` atual (linhas 98-111):
```typescript
case "update": {
    const fields = sanitizePayload(op.payload);
    await db
        .update(leads)
        .set({ ...fields, updatedAt: new Date() })
        .where(
            and(eq(leads.localId, op.localId), eq(leads.userId, userId))
        );
    acknowledged.push({
        localId: op.localId,
        queueId: op.clientTimestamp,
    });
    break;
}
```

Substituir por:
```typescript
case "update": {
    const fields = sanitizePayload(op.payload);
    // Include isNull(leads.deletedAt) to prevent zombie resurrection.
    // ACK regardless of rowcount — tombstoned/missing leads cannot be resolved client-side.
    await db
        .update(leads)
        .set({ ...fields, updatedAt: new Date() })
        .where(
            and(
                eq(leads.localId, op.localId),
                eq(leads.userId, userId),
                isNull(leads.deletedAt),
            )
        )
        .returning({ localId: leads.localId });
    acknowledged.push({
        localId: op.localId,
        queueId: op.clientTimestamp,
    });
    break;
}
```

### Passo 2: admin/leads.ts — Rowcount no delete

- [ ] **Step 3: Atualizar o procedure delete em admin/leads.ts**

O `delete` atual (linhas 111-120):
```typescript
delete: adminProcedure
    .input(z.object({ localId: z.string() }))
    .mutation(async ({ input }) => {
        await db
            .update(leads)
            .set({ deletedAt: new Date() })
            .where(eq(leads.localId, input.localId));

        return { success: true };
    }),
```

Substituir por:
```typescript
delete: adminProcedure
    .input(z.object({ localId: z.string() }))
    .mutation(async ({ input }) => {
        const deleted = await db
            .update(leads)
            .set({ deletedAt: new Date() })
            .where(eq(leads.localId, input.localId))
            .returning({ localId: leads.localId });

        if (deleted.length === 0) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "Lead not found",
            });
        }

        return { success: true };
    }),
```

### Passo 3: admin/users.ts — Transações em updateRole e deactivate

- [ ] **Step 4: Envolver updateRole em db.transaction()**

O `updateRole` atual (linhas 95-101):
```typescript
.mutation(async ({ input }) => {
    await db.delete(userRoles).where(eq(userRoles.userId, input.userId));
    await db
        .insert(userRoles)
        .values({ userId: input.userId, role: input.role });

    return { success: true };
}),
```

Substituir por:
```typescript
.mutation(async ({ input }) => {
    await db.transaction(async (tx) => {
        await tx.delete(userRoles).where(eq(userRoles.userId, input.userId));
        await tx.insert(userRoles).values({ userId: input.userId, role: input.role });
    });

    return { success: true };
}),
```

- [ ] **Step 5: Envolver deactivate em db.transaction()**

No `deactivate` (linhas 127-131):
```typescript
await db.delete(userRoles).where(eq(userRoles.userId, input.userId));
await db
    .insert(userRoles)
    .values({ userId: input.userId, role: "vendedor" });
```

Substituir por:
```typescript
await db.transaction(async (tx) => {
    await tx.delete(userRoles).where(eq(userRoles.userId, input.userId));
    await tx.insert(userRoles).values({ userId: input.userId, role: "vendedor" });
});
```

### Passo 4: Atualizar mocks de sync.test.ts

- [ ] **Step 6: Adicionar `isNull` ao mock de drizzle-orm em sync.test.ts**

Em `packages/api/src/__tests__/sync.test.ts`, dentro da função `loadSyncRouter`, atualizar o `vi.doMock("drizzle-orm", ...)`:
```typescript
vi.doMock("drizzle-orm", () => ({
    and: vi.fn((...args: unknown[]) => ({ and: args })),
    eq: vi.fn((col: unknown, val: unknown) => ({ eq: [col, val] })),
    gt: vi.fn((col: unknown, val: unknown) => ({ gt: [col, val] })),
    isNull: vi.fn((col: unknown) => ({ isNull: col })),
}));
```

- [ ] **Step 7: Corrigir updateChain nos testes existentes**

O sync UPDATE agora usa `.set().where().returning()`. Os testes que mockam falha no update precisam mover o erro de `where` para `returning`.

**Teste "retorna ACKs parciais e failedOperation ao primeiro erro"** — alterar o `updateChain`:
```typescript
// antes
const updateChain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockRejectedValueOnce(new Error("DB constraint violation")),
};

// depois
const updateChain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnValue({
        returning: vi.fn().mockRejectedValueOnce(new Error("DB constraint violation")),
    }),
};
```

**Teste "retorna failedOperation quando a primeira operação falha"** — alterar o `updateChain`:
```typescript
// antes
const updateChain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockRejectedValue(new Error("DB down")),
};

// depois
const updateChain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnValue({
        returning: vi.fn().mockRejectedValue(new Error("DB down")),
    }),
};
```

- [ ] **Step 8: Atualizar MockDb type para incluir returning**

Atualizar o tipo `MockDb` no topo do arquivo `sync.test.ts`:
```typescript
type MockDb = {
    insert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
};
```

O tipo não precisa mudar — o `returning` está no objeto retornado por `where`, não no `MockDb` diretamente.

### Passo 5: Adicionar testes P2-7

- [ ] **Step 9: Adicionar teste — UPDATE em lead tombstoned (ACK silencioso)**

No final da `describe("syncRouter.pushChanges", ...)`, adicionar:
```typescript
it("ACKa silenciosamente update de lead tombstoned ou inexistente (rowcount=0)", async () => {
    // returning vazio simula rowcount=0 — lead tombstoned (deletedAt definido) ou inexistente
    const updateChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]), // rowcount=0
        }),
    };
    const mockDb: MockDb = {
        insert: vi.fn(),
        update: vi.fn().mockReturnValue(updateChain),
        select: vi.fn(),
    };

    const { caller } = await loadSyncRouter(mockDb);

    const result = await caller.pushChanges({
        operations: [
            {
                localId: "44444444-4444-4444-8444-444444444444", // UUID v4 válido
                operation: "update",
                payload: { name: "Ghost Lead" },
                clientTimestamp: "2026-01-01T00:00:00.000Z",
            },
        ],
    });

    // Deve ACKar silenciosamente — sem failedOperation
    expect(result.acknowledged).toHaveLength(1);
    expect(result.acknowledged[0]?.localId).toBe("44444444-4444-4444-8444-444444444444");
    expect(result.failedOperation).toBeUndefined();
});
```

- [ ] **Step 10: Adicionar teste — DELETE em lead inexistente (ACK idempotente)**

```typescript
it("ACKa delete de lead inexistente (idempotente por natureza)", async () => {
    // Soft-delete retorna void — não usa .returning(), ACK é sempre garantido
    const updateChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined), // resolve com undefined — 0 rows afetadas
    };
    const mockDb: MockDb = {
        insert: vi.fn(),
        update: vi.fn().mockReturnValue(updateChain),
        select: vi.fn(),
    };

    const { caller } = await loadSyncRouter(mockDb);

    const result = await caller.pushChanges({
        operations: [
            {
                localId: "55555555-5555-4555-8555-555555555555", // UUID v4 válido
                operation: "delete",
                payload: {},
                clientTimestamp: "2026-01-01T00:00:00.000Z",
            },
        ],
    });

    // Deve ACKar independente de rowcount
    expect(result.acknowledged).toHaveLength(1);
    expect(result.acknowledged[0]?.localId).toBe("55555555-5555-4555-8555-555555555555");
    expect(result.failedOperation).toBeUndefined();
});
```

- [ ] **Step 11: Rodar type-check e testes**

```bash
bun run check-types 2>&1 | head -30
bun run test 2>&1 | tail -20
```

Expected: zero erros, todos os testes passando (incluindo os 2 novos).

- [ ] **Step 12: Verificar tombstone contract no código**

```bash
grep -A10 "case \"update\"" packages/api/src/routers/sync.ts | head -15
```

Expected: ver `isNull(leads.deletedAt)` no WHERE.

- [ ] **Step 13: Commit**

```bash
git add packages/api/src/routers/sync.ts packages/api/src/routers/admin/leads.ts packages/api/src/routers/admin/users.ts packages/api/src/__tests__/sync.test.ts
git commit -m "fix(sync): tombstone contract no sync UPDATE + transações em admin routes (P2-7)"
```

---

## Task 7: P3-3 — Testes de cenários de falha no sync engine (stretch)

**Files:**
- Modify: `apps/web/src/lib/sync/engine.test.ts` (adicionar 4 novos testes)

> Estes testes vão em engine.test.ts dentro do `describe("sync engine", ...)` existente. Cada teste segue o padrão de usar um `externalDetector` customizado para controlar quando o sync é acionado.

- [ ] **Step 1: Adicionar describe block para cenários de falha**

Adicionar ao final do `describe("sync engine", ...)` em `apps/web/src/lib/sync/engine.test.ts`:
```typescript
describe("failure scenarios", () => {
    // Testes adicionados aqui nos próximos steps
});
```

- [ ] **Step 2: Teste — Payload JSON corrompido bloqueia fila**

Dentro do `describe("failure scenarios", ...)`:
```typescript
it("payload JSON corrompido na syncQueue bloqueia o ciclo e reporta isStalled após retries", async () => {
    await db.syncQueue.add({
        localId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        operation: "create",
        timestamp: "2026-01-01T00:00:00.000Z",
        payload: "INVALID JSON {{{",
        retryCount: 0,
    });

    let resolveSync: () => void;
    const syncDone = new Promise<void>((resolve) => {
        resolveSync = resolve;
    });
    const onSyncEnd = vi.fn(() => resolveSync());

    let connectivityCallback: ((online: boolean) => void) | undefined;
    const externalDetector = {
        isOnline: false,
        start: vi.fn(),
        stop: vi.fn(),
        subscribe: vi.fn((fn: (online: boolean) => void) => {
            connectivityCallback = fn;
            return vi.fn();
        }),
    };

    const { startSync } = await import("./engine");
    const control = startSync({ onSyncEnd }, externalDetector);

    connectivityCallback?.(true);
    await syncDone;

    expect(onSyncEnd).toHaveBeenCalledWith(
        expect.objectContaining({
            isStalled: true,
            error: expect.any(String),
        })
    );
    // Engine não deve ter chamado o servidor (erro ocorre antes do fetch)
    expect(mockPushChanges.mutate).not.toHaveBeenCalled();

    control.stop();
});
```

- [ ] **Step 3: Teste — AbortError é tratado como erro transiente e retried**

```typescript
it("AbortError do fetchWithTimeout é tratado como erro transiente e esgota retries", async () => {
    await db.syncQueue.add({
        localId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        operation: "create",
        timestamp: "2026-01-01T00:00:00.000Z",
        payload: JSON.stringify({ name: "Abort Test", interestTag: "frio" }),
        retryCount: 0,
    });

    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";
    mockPushChanges.mutate.mockRejectedValue(abortError);

    let resolveSync: () => void;
    const syncDone = new Promise<void>((resolve) => {
        resolveSync = resolve;
    });
    const onSyncEnd = vi.fn(() => resolveSync());
    const onRetry = vi.fn();

    let connectivityCallback: ((online: boolean) => void) | undefined;
    const externalDetector = {
        isOnline: false,
        start: vi.fn(),
        stop: vi.fn(),
        subscribe: vi.fn((fn: (online: boolean) => void) => {
            connectivityCallback = fn;
            return vi.fn();
        }),
    };

    const { startSync } = await import("./engine");
    const control = startSync({ onSyncEnd, onRetry }, externalDetector);

    connectivityCallback?.(true);
    await syncDone;

    // 5 retries: onRetry chamado nas tentativas 2, 3, 4, 5 (4x)
    expect(onRetry).toHaveBeenCalledTimes(4);
    expect(onSyncEnd).toHaveBeenCalledWith(
        expect.objectContaining({
            error: "The operation was aborted",
            isStalled: true,
        })
    );

    control.stop();
});
```

- [ ] **Step 4: Teste — Pull falha após push bem-sucedido**

```typescript
it("ACKs são aplicados mesmo quando pullChanges falha em seguida", async () => {
    await db.syncQueue.add({
        localId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        operation: "create",
        timestamp: "2026-01-01T00:00:00.000Z",
        payload: JSON.stringify({ name: "Pull Fail Test", interestTag: "morno" }),
        retryCount: 0,
    });

    // Push tem sucesso e ACKa a operação
    mockPushChanges.mutate.mockResolvedValue({
        acknowledged: [{
            localId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            queueId: "2026-01-01T00:00:00.000Z",
        }],
        idMappings: [],
    });
    // Pull falha
    mockPullChanges.query.mockRejectedValue(new Error("Network error during pull"));

    let resolveSync: () => void;
    const syncDone = new Promise<void>((resolve) => {
        resolveSync = resolve;
    });
    const onSyncEnd = vi.fn(() => resolveSync());

    let connectivityCallback: ((online: boolean) => void) | undefined;
    const externalDetector = {
        isOnline: false,
        start: vi.fn(),
        stop: vi.fn(),
        subscribe: vi.fn((fn: (online: boolean) => void) => {
            connectivityCallback = fn;
            return vi.fn();
        }),
    };

    const { startSync } = await import("./engine");
    const control = startSync({ onSyncEnd }, externalDetector);

    connectivityCallback?.(true);
    await syncDone;

    // ACK foi aplicado — syncQueue deve estar vazia
    const queueCount = await db.syncQueue.count();
    expect(queueCount).toBe(0);

    // lastSyncTimestamp NÃO foi atualizado (pull nunca completou)
    const meta = await db.syncMeta.get("lastSyncTimestamp");
    expect(meta).toBeUndefined();

    control.stop();
});
```

- [ ] **Step 5: Teste — Server-wins quando updatedAt são iguais**

```typescript
it("server wins quando updatedAt são iguais e local está pending", async () => {
    const sharedTimestamp = "2026-01-01T10:00:00.000Z";

    // Lead local com mesmo timestamp que o servidor, status pending
    await db.leads.add({
        localId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        serverId: 42,
        userId: "user-123",
        name: "Local Name",
        updatedAt: sharedTimestamp,
        createdAt: sharedTimestamp,
        syncStatus: "pending",
        interestTag: "frio",
        phone: null,
        email: null,
        company: null,
        position: null,
        segment: null,
        notes: null,
        photo: null,
        photoUrl: null,
        deletedAt: null,
        uploadFailed: false,
    });

    // Servidor retorna o mesmo lead com nome diferente e timestamp idêntico
    mockPullChanges.query.mockResolvedValue({
        leads: [{
            localId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
            id: 42,
            userId: "user-123",
            name: "Server Name",
            updatedAt: sharedTimestamp,
            createdAt: sharedTimestamp,
            interestTag: "quente",
            phone: null,
            email: null,
            company: null,
            position: null,
            segment: null,
            notes: null,
            photoUrl: null,
            deletedAt: null,
        }],
        serverTimestamp: new Date().toISOString(),
    });

    let resolveSync: () => void;
    const syncDone = new Promise<void>((resolve) => {
        resolveSync = resolve;
    });
    const onSyncEnd = vi.fn(() => resolveSync());

    let connectivityCallback: ((online: boolean) => void) | undefined;
    const externalDetector = {
        isOnline: false,
        start: vi.fn(),
        stop: vi.fn(),
        subscribe: vi.fn((fn: (online: boolean) => void) => {
            connectivityCallback = fn;
            return vi.fn();
        }),
    };

    const { startSync } = await import("./engine");
    const control = startSync({ onSyncEnd }, externalDetector);

    connectivityCallback?.(true);
    await syncDone;

    // Server wins — lead deve ter o nome do servidor (timestamps iguais → localLead.updatedAt > server é false)
    const lead = await db.leads.get("dddddddd-dddd-4ddd-8ddd-dddddddddddd");
    expect(lead?.name).toBe("Server Name");
    expect(lead?.interestTag).toBe("quente");

    control.stop();
});
```

- [ ] **Step 6: Rodar os testes**

```bash
bun run test -- --reporter=verbose 2>&1 | tail -40
```

Expected: todos os testes passando, incluindo os 4 novos em `describe("failure scenarios", ...)`.

- [ ] **Step 7: Verificação final — contagens e grep**

```bash
# Zero sql.raw com interpolação manual
grep -rn "sql\.raw" packages/api/src/routers/
# Nenhum publicProcedure fora do healthCheck
grep -rn "publicProcedure" packages/api/src/routers/
# Nenhuma referência ao pacote auth morto
grep -rn "@dashboard-leads-profills/auth" apps/ packages/api/
# isNull no WHERE do sync UPDATE
grep -A8 "case \"update\"" packages/api/src/routers/sync.ts
```

Expected: `sql.raw` sem output, `publicProcedure` só no `healthCheck`, `auth` sem output, sync update mostra `isNull`.

- [ ] **Step 8: Rodar check final completo**

```bash
bun run check-types 2>&1 | head -20
bun run test 2>&1 | tail -10
bun run check 2>&1 | tail -10
```

Expected: zero erros de tipos, ≥205 testes passando (209+ com os novos 4 de P3-3 + 2 de P2-7 em sync.test.ts), lint OK.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/lib/sync/engine.test.ts
git commit -m "test: cenários de falha no sync engine — payload corrompido, AbortError, pull fail, timestamp empate (P3-3)"
```
