# Sprint 2 — "Confiança no Campo" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar 6 itens da Sprint 2 que tornam o app confiável em campo: remoção de foto propaga ao servidor, batch backend retorna ACK parcial, retry de foto tem limite inteligente, lastSyncTimestamp sobrevive cache clear, monitoramento de espaço IndexedDB, e UI de sync reflete estado real.

**Architecture:** Cada task é isolada. Tasks 3 e 4 adicionam tabelas ao Dexie (v7 e v8 respectivamente). Task 6 enriquece os callbacks do engine e adiciona componente de banner. Todas as tasks seguem TDD estrito.

**Tech Stack:** TypeScript, Vitest, Dexie 4, tRPC 11, Next.js 16, React 19, Tailwind CSS 4, shadcn/ui

**Plano salvo em:** `docs/superpowers/plans/2026-04-06-sprint2-confianca-no-campo.md`

---

## Ordem das Tasks

| Task | Item | Tamanho | Dependência |
|------|------|---------|-------------|
| 1 | P1-8: Remoção de foto → `photoUrl: null` no servidor | S | P1-7 (feito) |
| 2 | P1-9: Backend batch retorna ACK parcial | M | Nenhuma |
| 3 | P1-10: Retry foto inteligente (limite 10, `uploadFailed`) | S | P1-4 (feito) |
| 4 | P1-13: `lastSyncTimestamp` de localStorage → Dexie `syncMeta` | M | Nenhuma |
| 5 | P1-11: Monitoramento de espaço IndexedDB | M | Nenhuma |
| 6 | P1-12: UI status completo (novos estados + banner + retry manual) | M | P0-1, P1-2 (feitos) |

---

## Estrutura de Arquivos

| Arquivo | Responsabilidade | Task |
|---------|-----------------|------|
| `apps/web/src/lib/lead/update-lead.ts` | Adicionar `photoUrl: null` ao payload quando `photo === null` | 1, 5 |
| `apps/web/src/lib/lead/update-lead.test.ts` | Testes de remoção de foto | 1 |
| `packages/api/src/routers/sync.ts` | Try-catch por operação → ACK parcial | 2 |
| `packages/api/src/__tests__/sync.test.ts` | Testes de ACK parcial (criar) | 2 |
| `apps/web/src/lib/db/types.ts` | Adicionar `PhotoUploadMeta`, `SyncMeta` | 3, 4 |
| `apps/web/src/lib/db/index.ts` | Migrations v7 (photoUploadMeta), v8 (syncMeta) | 3, 4 |
| `apps/web/src/lib/sync/photo-upload.ts` | Ler/gravar retryCount, marcar `uploadFailed` | 3 |
| `apps/web/src/lib/sync/photo-upload.test.ts` | Testes de retry inteligente | 3 |
| `apps/web/src/lib/sync/engine.ts` | Substituir localStorage por Dexie syncMeta; enriquecer callbacks P1-12 | 4, 6 |
| `apps/web/src/components/sync-status-provider.tsx` | Ler syncMeta do Dexie; novos estados; manualRetry | 4, 6 |
| `apps/web/src/lib/lead/compression.ts` | Adicionar `checkStorageAndCompress()` | 5 |
| `apps/web/src/lib/lead/compression.test.ts` | Testes de checkStorageAndCompress | 5 |
| `apps/web/src/lib/lead/save-lead.ts` | Usar checkStorageAndCompress antes de salvar foto | 5 |
| `apps/web/src/components/sync-status-icon.tsx` | Novos estados: authExpired, stalled, retrying | 6 |
| `apps/web/src/components/sync-error-banner.tsx` | Banner persistente (criar) | 6 |
| `apps/web/src/lib/sync/engine.test.ts` | Testes de onRetry, isStalled, manualRetry | 6 |

---

## Task 1: P1-8 — Remoção de foto propaga `photoUrl: null` ao servidor

**Problema:** Quando o usuário remove a foto no formulário (`photo === null`), `updateLead()` persiste `photo: null` localmente mas o payload do syncQueue não inclui `photoUrl: null`. O servidor mantém a URL antiga apontando para foto deletada.

**Files:**
- Modify: `apps/web/src/lib/lead/update-lead.ts`
- Test: `apps/web/src/lib/lead/update-lead.test.ts`

---

- [ ] **Step 1: Escrever testes que falham**

Abrir `apps/web/src/lib/lead/update-lead.test.ts` e adicionar no final do describe `"updateLead"`:

```typescript
it("inclui photoUrl: null no payload quando foto é removida (photo = null)", async () => {
  await updateLead("lead-1", { name: "Same" }, null);

  const queue = await db.syncQueue.toArray();
  const payload = JSON.parse(queue[0].payload);
  expect(payload.photoUrl).toBeNull();
});

it("limpa photoUrl localmente quando foto é removida (photo = null)", async () => {
  await db.leads.update("lead-1", { photoUrl: "https://example.com/old.jpg" });

  await updateLead("lead-1", { name: "Same" }, null);

  const lead = await db.leads.get("lead-1");
  expect(lead?.photoUrl).toBeNull();
});

it("não inclui photoUrl no payload quando photo é undefined (sem alteração)", async () => {
  await updateLead("lead-1", { name: "New Name" });

  const queue = await db.syncQueue.toArray();
  const payload = JSON.parse(queue[0].payload);
  expect(payload).not.toHaveProperty("photoUrl");
});

it("não inclui photoUrl no payload quando photo é um Blob (nova foto)", async () => {
  const blob = new Blob(["img"], { type: "image/jpeg" });
  await updateLead("lead-1", { name: "Same" }, blob);

  const queue = await db.syncQueue.toArray();
  const payload = JSON.parse(queue[0].payload);
  expect(payload).not.toHaveProperty("photoUrl");
});
```

- [ ] **Step 2: Confirmar que os testes falham**

```bash
cd apps/web && bunx vitest run src/lib/lead/update-lead.test.ts
```

Esperado: 2 testes novos FAIL (os outros 5 existentes continuam passando).

- [ ] **Step 3: Implementar a correção em `update-lead.ts`**

Substituir o conteúdo completo de `apps/web/src/lib/lead/update-lead.ts`:

```typescript
import { db } from "../db/index";
import type { LeadFormData } from "./validation";

function emptyToNull(value: string | undefined): string | null {
	return !value || value === "" ? null : value;
}

export async function updateLead(
	localId: string,
	data: LeadFormData,
	photo?: Blob | null
): Promise<void> {
	const now = new Date().toISOString();

	const updates: Record<string, unknown> = {
		name: data.name,
		phone: emptyToNull(data.phone),
		email: emptyToNull(data.email),
		company: emptyToNull(data.company),
		position: emptyToNull(data.position),
		segment: emptyToNull(data.segment),
		notes: emptyToNull(data.notes),
		interestTag: data.interestTag,
		updatedAt: now,
		syncStatus: "pending" as const,
	};

	if (photo !== undefined) {
		updates.photo = photo;
	}
	if (photo === null) {
		// Remoção explícita — limpa URL remota localmente também
		updates.photoUrl = null;
	}

	const syncPayload: Record<string, unknown> = {
		name: data.name,
		phone: emptyToNull(data.phone),
		email: emptyToNull(data.email),
		company: emptyToNull(data.company),
		position: emptyToNull(data.position),
		segment: emptyToNull(data.segment),
		notes: emptyToNull(data.notes),
		interestTag: data.interestTag,
	};
	if (photo === null) {
		// Propaga remoção ao servidor
		syncPayload.photoUrl = null;
	}

	await db.transaction("rw", db.leads, db.syncQueue, async () => {
		await db.leads.update(localId, updates);

		await db.syncQueue.add({
			localId,
			operation: "update",
			payload: JSON.stringify(syncPayload),
			retryCount: 0,
			timestamp: now,
		});
	});
}
```

- [ ] **Step 4: Confirmar que todos os testes passam**

```bash
cd apps/web && bunx vitest run src/lib/lead/update-lead.test.ts
```

Esperado: 9 testes PASS.

- [ ] **Step 5: Commit**

```bash
cd /home/othavio/Work/profills/sistema2/sistema-coleta-de-lead
git add apps/web/src/lib/lead/update-lead.ts apps/web/src/lib/lead/update-lead.test.ts
git commit -m "fix(lead): propagar photoUrl: null ao servidor quando foto é removida (P1-8)"
```

---

## Task 2: P1-9 — Backend fail-fast com ACK parcial e `failedOperation`

**Problema:** O loop `for (const op of input.operations)` não tem tratamento de erro. Se uma operação falha, o servidor lança exceção sem retornar ACK nenhum — o cliente faz retry de TODAS as operações já processadas.

**Solução (fail-fast):**
- Processar operações em ordem; ao **primeiro erro**, parar o loop imediatamente
- Retornar `{ acknowledged, idMappings, failedOperation? }` onde:
  - `acknowledged`: somente ops bem-sucedidas antes da falha
  - `idMappings`: somente creates bem-sucedidos antes da falha
  - `failedOperation?: { localId, queueId, message }` — a op que falhou
- Ops posteriores à falha **não são processadas**
- No cliente: aplicar `bulkDelete(ackIds)` + `idMappings` **antes** de reagir ao `failedOperation`
- Reação ao `failedOperation`: incrementar `retryCount` do item correspondente no `syncQueue`

**Files:**
- Modify: `packages/api/src/routers/sync.ts`
- Create: `packages/api/src/__tests__/sync.test.ts`
- Modify: `apps/web/src/lib/sync/engine.ts`
- Test: `apps/web/src/lib/sync/engine.test.ts`

---

- [ ] **Step 1: Escrever o arquivo de teste**

Criar `packages/api/src/__tests__/sync.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@dashboard-leads-profills/env/server", () => ({
	env: {
		DATABASE_URL: "postgresql://test:test@localhost:5432/test",
		NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
		NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
		SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
		NODE_ENV: "test",
	},
}));

type MockDb = {
	insert: ReturnType<typeof vi.fn>;
	update: ReturnType<typeof vi.fn>;
	select: ReturnType<typeof vi.fn>;
};

async function loadSyncRouter(mockDb: MockDb) {
	vi.doMock("@dashboard-leads-profills/db", () => ({ db: mockDb }));
	vi.doMock("@dashboard-leads-profills/db/schema/leads", () => ({
		leads: { localId: "localId", userId: "userId", id: "id", updatedAt: "updatedAt", deletedAt: "deletedAt" },
	}));
	vi.doMock("drizzle-orm", () => ({
		and: vi.fn((...args: unknown[]) => ({ and: args })),
		eq: vi.fn((col: unknown, val: unknown) => ({ eq: [col, val] })),
		gt: vi.fn((col: unknown, val: unknown) => ({ gt: [col, val] })),
	}));

	const module = await import("../routers/sync");
	const caller = module.syncRouter.createCaller({
		supabase: {} as never,
		user: { sub: "user-123" },
		userRole: "vendedor",
	});
	return { caller };
}

describe("syncRouter.pushChanges", () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	it("retorna ACK para operações bem-sucedidas mesmo quando uma falha no meio do batch", async () => {
		const returning = vi.fn().mockResolvedValueOnce([{ id: 1 }]);
		const insertChain = {
			values: vi.fn().mockReturnThis(),
			onConflictDoUpdate: vi.fn().mockReturnThis(),
			returning,
		};
		const updateChain = {
			set: vi.fn().mockReturnThis(),
			where: vi.fn()
				.mockRejectedValueOnce(new Error("DB constraint violation")) // segunda op falha
				.mockResolvedValue(undefined), // terceira op passa
		};

		const mockDb: MockDb = {
			insert: vi.fn().mockReturnValue(insertChain),
			update: vi.fn().mockReturnValue(updateChain),
			select: vi.fn(),
		};

		const { caller } = await loadSyncRouter(mockDb);

		const result = await caller.pushChanges({
			operations: [
				{
					localId: "local-1",
					operation: "create",
					payload: { name: "Lead A", interestTag: "quente" },
					clientTimestamp: "2026-01-01T00:00:00.000Z",
				},
				{
					localId: "local-2",
					operation: "update",
					payload: { name: "Lead B Updated" },
					clientTimestamp: "2026-01-01T00:00:01.000Z",
				},
				{
					localId: "local-3",
					operation: "update",
					payload: { name: "Lead C Updated" },
					clientTimestamp: "2026-01-01T00:00:02.000Z",
				},
			],
		});

		// Deve ACKar a op 1 (create ok) e op 3 (update ok), mas não op 2 (update falhou)
		expect(result.acknowledged).toHaveLength(2);
		const ackedIds = result.acknowledged.map((a) => a.localId);
		expect(ackedIds).toContain("local-1");
		expect(ackedIds).toContain("local-3");
		expect(ackedIds).not.toContain("local-2");
	});

	it("retorna ACK vazio quando todas operações falham", async () => {
		const updateChain = {
			set: vi.fn().mockReturnThis(),
			where: vi.fn().mockRejectedValue(new Error("DB down")),
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
					localId: "local-1",
					operation: "update",
					payload: { name: "X" },
					clientTimestamp: "2026-01-01T00:00:00.000Z",
				},
			],
		});

		expect(result.acknowledged).toHaveLength(0);
	});

	it("retorna ACK de todas as operações quando batch é bem-sucedido", async () => {
		const returning = vi.fn().mockResolvedValue([{ id: 99 }]);
		const insertChain = {
			values: vi.fn().mockReturnThis(),
			onConflictDoUpdate: vi.fn().mockReturnThis(),
			returning,
		};
		const mockDb: MockDb = {
			insert: vi.fn().mockReturnValue(insertChain),
			update: vi.fn(),
			select: vi.fn(),
		};

		const { caller } = await loadSyncRouter(mockDb);

		const result = await caller.pushChanges({
			operations: [
				{
					localId: "local-a",
					operation: "create",
					payload: { name: "Lead A", interestTag: "frio" },
					clientTimestamp: "2026-01-01T00:00:00.000Z",
				},
				{
					localId: "local-b",
					operation: "create",
					payload: { name: "Lead B", interestTag: "morno" },
					clientTimestamp: "2026-01-01T00:00:01.000Z",
				},
			],
		});

		expect(result.acknowledged).toHaveLength(2);
	});
});
```

- [ ] **Step 2: Confirmar que testes falham**

```bash
cd packages/api && bunx vitest run src/__tests__/sync.test.ts
```

Esperado: 1 FAIL (teste de ACK parcial), 2 PASS (os outros).

- [ ] **Step 3: Implementar ACK parcial em `sync.ts`**

Substituir o loop `for (const op of input.operations)` em `packages/api/src/routers/sync.ts`. Apenas o trecho interno do for muda — envolver cada `case` em try-catch:

```typescript
for (const op of input.operations) {
    try {
        switch (op.operation) {
            case "create": {
                const fields = sanitizePayload(op.payload);
                const result = await db
                    .insert(leads)
                    .values({
                        localId: op.localId,
                        userId,
                        name: (fields.name as string) ?? "",
                        interestTag:
                            (fields.interestTag as "quente" | "morno" | "frio") ?? "frio",
                        phone: (fields.phone as string) ?? null,
                        email: (fields.email as string) ?? null,
                        company: (fields.company as string) ?? null,
                        position: (fields.position as string) ?? null,
                        segment: (fields.segment as string) ?? null,
                        notes: (fields.notes as string) ?? null,
                        photoUrl: (fields.photoUrl as string) ?? null,
                    })
                    .onConflictDoUpdate({
                        target: leads.localId,
                        set: {
                            ...fields,
                            updatedAt: new Date(),
                        },
                    })
                    .returning({ id: leads.id });

                const serverId = result[0]?.id;
                acknowledged.push({
                    localId: op.localId,
                    queueId: op.clientTimestamp,
                });
                if (serverId != null) {
                    idMappings.push({
                        localId: op.localId,
                        serverId: serverId.toString(),
                    });
                }
                break;
            }
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
            case "delete": {
                await db
                    .update(leads)
                    .set({ deletedAt: new Date() })
                    .where(
                        and(eq(leads.localId, op.localId), eq(leads.userId, userId))
                    );
                acknowledged.push({
                    localId: op.localId,
                    queueId: op.clientTimestamp,
                });
                break;
            }
        }
    } catch {
        // Operação falhou — não ACKar. Cliente vai retentar somente esta.
    }
}
```

- [ ] **Step 4: Confirmar que todos os testes passam**

```bash
cd packages/api && bunx vitest run src/__tests__/sync.test.ts
```

Esperado: 3 PASS.

- [ ] **Step 5: Rodar todos os testes da API para garantir regressão zero**

```bash
cd packages/api && bunx vitest run
```

Esperado: todos PASS.

- [ ] **Step 6: Commit**

```bash
cd /home/othavio/Work/profills/sistema2/sistema-coleta-de-lead
git add packages/api/src/routers/sync.ts packages/api/src/__tests__/sync.test.ts
git commit -m "fix(sync): retornar ACK parcial quando batch falha no meio (P1-9)"
```

---

## Task 3: P1-10 — Retry foto inteligente com limite

**Problema:** `uploadPendingPhotos()` tenta fazer upload 1× por ciclo sem limite. Após P1-4 (preservar blob no pull), o blob permanece indefinidamente se a policy do bucket estiver errada, gerando loop infinito.

**Solução:** Tabela `photoUploadMeta` no Dexie (key = `localId`) com `retryCount`. Após 10 falhas, marcar `uploadFailed: true` no lead e mostrar toast. Candidatos excluem leads com `uploadFailed`.

**Files:**
- Modify: `apps/web/src/lib/db/types.ts`
- Modify: `apps/web/src/lib/db/index.ts`
- Modify: `apps/web/src/lib/sync/photo-upload.ts`
- Test: `apps/web/src/lib/sync/photo-upload.test.ts`

---

- [ ] **Step 1: Adicionar `PhotoUploadMeta` e `uploadFailed` em `types.ts`**

```typescript
export interface Lead {
	company: string | null;
	createdAt: string;
	deletedAt: string | null;
	email: string | null;
	interestTag: "quente" | "morno" | "frio";
	localId: string;
	name: string;
	notes: string | null;
	phone: string | null;
	photo: Blob | null;
	photoUrl: string | null;
	position: string | null;
	segment: string | null;
	serverId: number | null;
	syncStatus: "pending" | "synced" | "conflict";
	updatedAt: string;
	userId: string;
	uploadFailed: boolean;
}

export interface SyncQueueItem {
	id?: number;
	localId: string;
	operation: "create" | "update" | "delete";
	payload: string;
	retryCount: number;
	timestamp: string;
}

export interface LeaderboardEntry {
	lastSyncAt: string;
	name: string;
	rank: number;
	score: number;
	totalLeads: number;
	userId: string;
}

export interface PhotoUploadMeta {
	localId: string;
	retryCount: number;
}
```

- [ ] **Step 2: Adicionar tabela `photoUploadMeta` em `index.ts` (Dexie v7)**

Adicionar no final de `apps/web/src/lib/db/index.ts`, antes dos exports:

```typescript
// Importar o tipo novo
import type { Lead, LeaderboardEntry, PhotoUploadMeta, SyncMeta, SyncQueueItem } from "./types";

// Atualizar a declaração do db
const db = new Dexie("dashboard-leads") as Dexie & {
	leads: EntityTable<Lead, "localId">;
	syncQueue: EntityTable<SyncQueueItem, "id">;
	leaderboardCache: EntityTable<LeaderboardEntry, "userId">;
	photoUploadMeta: EntityTable<PhotoUploadMeta, "localId">;
};
```

Adicionar versão 7 (após v6):

```typescript
db.version(7)
	.stores({
		leads:
			"localId, serverId, userId, interestTag, syncStatus, createdAt, updatedAt",
		syncQueue: "++id, localId, operation, timestamp",
		leaderboardCache: "userId, rank",
		photoUploadMeta: "localId",
	})
	.upgrade((tx) =>
		tx
			.table("leads")
			.toCollection()
			.modify((lead) => {
				if (lead.uploadFailed === undefined) {
					lead.uploadFailed = false;
				}
			})
	);
```

Atualizar export:

```typescript
export type { Lead, LeaderboardEntry, PhotoUploadMeta, SyncQueueItem };
export { db };
```

- [ ] **Step 3: Escrever testes que falham em `photo-upload.test.ts`**

Adicionar no final do describe `"uploadPendingPhotos"`:

```typescript
const MAX_UPLOAD_RETRIES = 10;

it("incrementa retryCount em photoUploadMeta após falha de upload", async () => {
  const photoBlob = new Blob(["fake-photo"], { type: "image/jpeg" });
  await db.leads.add({
    localId: "local-retry",
    serverId: 42,
    userId: "user-1",
    name: "Retry Lead",
    phone: null,
    email: null,
    company: null,
    position: null,
    segment: null,
    notes: null,
    interestTag: "quente",
    photo: photoBlob,
    photoUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    syncStatus: "synced",
    uploadFailed: false,
  });
  mockUpload.mockResolvedValue({ error: new Error("Bucket error") });

  const { uploadPendingPhotos } = await import("./photo-upload");
  await uploadPendingPhotos();

  const meta = await db.photoUploadMeta.get("local-retry");
  expect(meta?.retryCount).toBe(1);
});

it("marca uploadFailed após 10 falhas e não tenta mais", async () => {
  const photoBlob = new Blob(["fake-photo"], { type: "image/jpeg" });
  await db.leads.add({
    localId: "local-exhaust",
    serverId: 99,
    userId: "user-1",
    name: "Exhausted Lead",
    phone: null,
    email: null,
    company: null,
    position: null,
    segment: null,
    notes: null,
    interestTag: "frio",
    photo: photoBlob,
    photoUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    syncStatus: "synced",
    uploadFailed: false,
  });
  // Já tem 9 tentativas falhas no meta
  await db.photoUploadMeta.put({ localId: "local-exhaust", retryCount: 9 });
  mockUpload.mockResolvedValue({ error: new Error("Still broken") });

  const { uploadPendingPhotos } = await import("./photo-upload");
  await uploadPendingPhotos();

  const lead = await db.leads.get("local-exhaust");
  expect(lead?.uploadFailed).toBe(true);
  // Próximo ciclo não deve tentar (uploadFailed=true exclui do candidato)
  mockUpload.mockClear();
  await uploadPendingPhotos();
  expect(mockUpload).not.toHaveBeenCalled();
});
```

- [ ] **Step 4: Confirmar que testes falham**

```bash
cd apps/web && bunx vitest run src/lib/sync/photo-upload.test.ts
```

Esperado: 2 FAIL, testes anteriores PASS.

- [ ] **Step 5: Implementar retry inteligente em `photo-upload.ts`**

Substituir o conteúdo completo de `apps/web/src/lib/sync/photo-upload.ts`:

```typescript
import { createClient } from "@/lib/supabase/client";

import { db } from "../db/index";
import { SYNC_CONFIG } from "./constants";

const MAX_UPLOAD_RETRIES = 10;

export async function uploadPendingPhotos(): Promise<number> {
	const supabase = createClient();

	// Excluir leads com uploadFailed=true (limite de retries atingido)
	const candidates = await db.leads
		.filter(
			(lead) =>
				lead.photo !== null &&
				lead.serverId !== null &&
				lead.uploadFailed !== true,
		)
		.toArray();

	if (candidates.length === 0) {
		return 0;
	}

	let uploadedCount = 0;

	for (const lead of candidates) {
		if (!lead.photo) {
			continue;
		}

		const filePath = `${lead.userId}/${lead.localId}.jpg`;

		const { error } = await supabase.storage
			.from("lead-photos")
			.upload(filePath, lead.photo, {
				contentType: "image/jpeg",
				upsert: true,
			});

		if (error) {
			// Incrementar contador de retries
			const existing = await db.photoUploadMeta.get(lead.localId);
			const newCount = (existing?.retryCount ?? 0) + 1;

			if (newCount >= MAX_UPLOAD_RETRIES) {
				// Marcar como falha permanente
				await db.leads.update(lead.localId, { uploadFailed: true });
				await db.photoUploadMeta.delete(lead.localId);
			} else {
				await db.photoUploadMeta.put({
					localId: lead.localId,
					retryCount: newCount,
				});
			}
			continue;
		}

		const { data } = supabase.storage
			.from("lead-photos")
			.getPublicUrl(filePath);

		const now = new Date().toISOString();
		await db.syncQueue.add({
			localId: lead.localId,
			operation: "update",
			payload: JSON.stringify({ photoUrl: data.publicUrl }),
			retryCount: 0,
			timestamp: now,
		});

		await db.leads.update(lead.localId, {
			photo: null,
			photoUrl: data.publicUrl,
		});

		// Upload bem-sucedido — limpar meta de retries
		await db.photoUploadMeta.delete(lead.localId);

		uploadedCount++;
	}

	return uploadedCount;
}
```

- [ ] **Step 6: Confirmar que todos os testes passam**

```bash
cd apps/web && bunx vitest run src/lib/sync/photo-upload.test.ts
```

Esperado: todos PASS.

- [ ] **Step 7: Commit**

```bash
cd /home/othavio/Work/profills/sistema2/sistema-coleta-de-lead
git add apps/web/src/lib/db/types.ts apps/web/src/lib/db/index.ts \
        apps/web/src/lib/sync/photo-upload.ts apps/web/src/lib/sync/photo-upload.test.ts
git commit -m "feat(sync): retry foto inteligente com limite de 10 tentativas (P1-10)"
```

---

## Task 4: P1-13 — `lastSyncTimestamp` de localStorage para Dexie `syncMeta`

**Problema:** Limpar cache do browser reseta `lastSyncTimestamp` para 1970, forçando um pull completo de todos os leads do usuário.

**Solução:** Tabela `syncMeta` key-value no Dexie (sobrevive a cache clear do browser). Substituir todas as leituras/escritas de `localStorage` por Dexie em `engine.ts` e `sync-status-provider.tsx`.

**Files:**
- Modify: `apps/web/src/lib/db/types.ts`
- Modify: `apps/web/src/lib/db/index.ts`
- Modify: `apps/web/src/lib/sync/engine.ts`
- Modify: `apps/web/src/components/sync-status-provider.tsx`
- Test: `apps/web/src/lib/sync/engine.test.ts`

---

- [ ] **Step 1: Adicionar `SyncMeta` em `types.ts`**

Adicionar ao final de `apps/web/src/lib/db/types.ts`:

```typescript
export interface SyncMeta {
	key: string;
	value: string;
}
```

- [ ] **Step 2: Adicionar tabela `syncMeta` (Dexie v8) em `index.ts`**

Atualizar a declaração do `db` para incluir `syncMeta`:

```typescript
import type { Lead, LeaderboardEntry, PhotoUploadMeta, SyncMeta, SyncQueueItem } from "./types";

const db = new Dexie("dashboard-leads") as Dexie & {
	leads: EntityTable<Lead, "localId">;
	syncQueue: EntityTable<SyncQueueItem, "id">;
	leaderboardCache: EntityTable<LeaderboardEntry, "userId">;
	photoUploadMeta: EntityTable<PhotoUploadMeta, "localId">;
	syncMeta: EntityTable<SyncMeta, "key">;
};
```

Adicionar versão 8 (após v7):

```typescript
db.version(8).stores({
	leads:
		"localId, serverId, userId, interestTag, syncStatus, createdAt, updatedAt",
	syncQueue: "++id, localId, operation, timestamp",
	leaderboardCache: "userId, rank",
	photoUploadMeta: "localId",
	syncMeta: "key",
});
```

Atualizar export:

```typescript
export type { Lead, LeaderboardEntry, PhotoUploadMeta, SyncMeta, SyncQueueItem };
export { db };
```

- [ ] **Step 3: Escrever testes que falham em `engine.test.ts`**

No `beforeEach` do `describe("sync engine")`, adicionar limpeza do `syncMeta`:

```typescript
await db.syncMeta?.clear();
```

Adicionar testes:

```typescript
it("usa Dexie syncMeta para lastSyncTimestamp (não localStorage)", async () => {
  await db.syncMeta.put({ key: "lastSyncTimestamp", value: "2026-01-15T10:00:00.000Z" });

  mockPullChanges.query.mockResolvedValue({
    leads: [],
    serverTimestamp: "2026-01-15T12:00:00.000Z",
  });

  const { syncCycle } = await import("./engine");
  await syncCycle();

  // Deve ter persistido no Dexie, não localStorage
  const meta = await db.syncMeta.get("lastSyncTimestamp");
  expect(meta?.value).toBe("2026-01-15T12:00:00.000Z");
  // localStorage não deve ser usado
  expect(localStorageMap.has("lastSyncTimestamp")).toBe(false);
});

it("usa '1970-01-01T00:00:00Z' como fallback quando syncMeta não existe", async () => {
  mockPullChanges.query.mockResolvedValue({
    leads: [],
    serverTimestamp: "2026-01-15T12:00:00.000Z",
  });

  const { syncCycle } = await import("./engine");
  await syncCycle();

  expect(mockPullChanges.query).toHaveBeenCalledWith({ since: "1970-01-01T00:00:00Z" });
});
```

- [ ] **Step 4: Confirmar que testes falham**

```bash
cd apps/web && bunx vitest run src/lib/sync/engine.test.ts
```

Esperado: 2 FAIL novos.

- [ ] **Step 5: Substituir localStorage por Dexie em `engine.ts`**

Modificar `pullChanges()` em `apps/web/src/lib/sync/engine.ts`:

```typescript
async function pullChanges(): Promise<void> {
	const meta = await db.syncMeta.get("lastSyncTimestamp");
	const lastSync = meta?.value ?? "1970-01-01T00:00:00Z";

	const result = await syncClient.sync.pullChanges.query({ since: lastSync });

	let conflictCount = 0;

	for (const serverLead of result.leads) {
		const serverRecord = serverLead as unknown as Record<string, unknown>;
		const localId = serverRecord.localId as string;
		const localLead = await db.leads.get(localId);

		if (localLead) {
			const serverUpdatedAt =
				serverRecord.updatedAt instanceof Date
					? serverRecord.updatedAt.toISOString()
					: String(serverRecord.updatedAt);

			if (
				localLead.updatedAt > serverUpdatedAt &&
				localLead.syncStatus === "pending"
			) {
				continue;
			}

			conflictCount++;
		}

		const mapped = mapServerLeadToLocal(serverRecord);
		const mergedPhoto = localLead?.photo ?? null;
		await db.leads.put({ ...mapped, photo: mergedPhoto, uploadFailed: localLead?.uploadFailed ?? false });
	}

	await db.syncMeta.put({ key: "lastSyncTimestamp", value: result.serverTimestamp });

	if (conflictCount > 0) {
		toast.info(`${conflictCount} lead(s) atualizado(s) pelo servidor`);
	}
}
```

Modificar `syncWithRetry()` — substituir as 3 leituras de `localStorage.getItem("lastSyncTimestamp")`:

```typescript
async function syncWithRetry(callbacks?: SyncEngineCallbacks): Promise<void> {
	callbacks?.onSyncStart?.();
	let lastError: string | null = null;

	for (let attempt = 0; attempt < SYNC_CONFIG.maxRetries; attempt++) {
		try {
			const result = await syncCycle();
			const meta = await db.syncMeta.get("lastSyncTimestamp");
			const lastSync = meta?.value ?? new Date().toISOString();
			if (result.authExpired) {
				callbacks?.onSyncEnd?.({ lastSync, error: null, authExpired: true });
				return;
			}
			callbacks?.onSyncEnd?.({ lastSync, error: null });
			return;
		} catch (error: unknown) {
			if (isUnauthorizedError(error)) {
				const meta = await db.syncMeta.get("lastSyncTimestamp");
				const lastSync = meta?.value ?? "";
				callbacks?.onSyncEnd?.({ lastSync, error: null, authExpired: true });
				return;
			}
			lastError = error instanceof Error ? error.message : "Erro desconhecido";
			if (attempt < SYNC_CONFIG.maxRetries - 1) {
				await new Promise((resolve) => {
					setTimeout(resolve, getBackoffDelay(attempt));
				});
			}
		}
	}

	const meta = await db.syncMeta.get("lastSyncTimestamp");
	const lastSync = meta?.value ?? "";
	callbacks?.onSyncEnd?.({ lastSync, error: lastError });
}
```

- [ ] **Step 6: Atualizar `sync-status-provider.tsx` para ler do Dexie**

Substituir a leitura de `localStorage` no `useEffect`:

```typescript
// Substituir:
const storedSync = localStorage.getItem("lastSyncTimestamp");
if (storedSync) {
    setSyncState((prev) => ({ ...prev, lastSync: storedSync }));
}
// Por:
db.syncMeta.get("lastSyncTimestamp").then((meta) => {
    if (meta?.value) {
        setSyncState((prev) => ({ ...prev, lastSync: meta.value }));
    }
});
```

- [ ] **Step 7: Confirmar que todos os testes passam**

```bash
cd apps/web && bunx vitest run src/lib/sync/engine.test.ts
```

Esperado: todos PASS (incluindo os 2 novos).

- [ ] **Step 8: Commit**

```bash
cd /home/othavio/Work/profills/sistema2/sistema-coleta-de-lead
git add apps/web/src/lib/db/types.ts apps/web/src/lib/db/index.ts \
        apps/web/src/lib/sync/engine.ts apps/web/src/components/sync-status-provider.tsx \
        apps/web/src/lib/sync/engine.test.ts
git commit -m "feat(sync): mover lastSyncTimestamp de localStorage para Dexie syncMeta (P1-13)"
```

---

## Task 5: P1-11 — Monitoramento de espaço IndexedDB

**Problema:** Fotos (3-5MB cada) acumulam no IndexedDB sem verificar quota. Em iOS Safari, a quota é ~50% do disco.

**Solução:** Antes de salvar foto, verificar `navigator.storage.estimate()`. Se uso > 80%, comprimir para 800px. Se > 90%, rejeitar com toast de alerta.

**Nota:** `compression.ts` já tem `compressImage()` (max 1280px, quality 0.7) e `calculateDimensions()`. Adicionar `checkStorageAndCompress()` que usa compressão agressiva (800px) quando necessário.

**Files:**
- Modify: `apps/web/src/lib/lead/compression.ts`
- Test: `apps/web/src/lib/lead/compression.test.ts`
- Modify: `apps/web/src/lib/lead/save-lead.ts`
- Modify: `apps/web/src/lib/lead/update-lead.ts`

---

- [ ] **Step 1: Escrever testes que falham em `compression.test.ts`**

Adicionar no final de `apps/web/src/lib/lead/compression.test.ts`:

```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";
import { checkStorageAndCompress } from "./compression";

describe("checkStorageAndCompress", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("retorna o blob sem modificação quando espaço está abaixo de 80%", async () => {
		vi.stubGlobal("navigator", {
			storage: {
				estimate: vi.fn().mockResolvedValue({ usage: 400_000_000, quota: 1_000_000_000 }), // 40%
			},
		});

		const blob = new Blob(["photo-data"], { type: "image/jpeg" });
		const result = await checkStorageAndCompress(blob);
		expect(result).toBe(blob); // mesmo objeto, sem compressão extra
	});

	it("lança erro quando uso de espaço está acima de 90%", async () => {
		vi.stubGlobal("navigator", {
			storage: {
				estimate: vi.fn().mockResolvedValue({ usage: 950_000_000, quota: 1_000_000_000 }), // 95%
			},
		});

		const blob = new Blob(["photo-data"], { type: "image/jpeg" });
		await expect(checkStorageAndCompress(blob)).rejects.toThrow("Armazenamento cheio");
	});

	it("trata quota undefined como espaço ilimitado (não comprime)", async () => {
		vi.stubGlobal("navigator", {
			storage: {
				estimate: vi.fn().mockResolvedValue({ usage: 500_000_000, quota: undefined }),
			},
		});

		const blob = new Blob(["photo-data"], { type: "image/jpeg" });
		const result = await checkStorageAndCompress(blob);
		expect(result).toBe(blob);
	});

	it("trata navigator.storage indisponível sem lançar erro", async () => {
		vi.stubGlobal("navigator", {});

		const blob = new Blob(["photo-data"], { type: "image/jpeg" });
		const result = await checkStorageAndCompress(blob);
		expect(result).toBe(blob);
	});
});
```

- [ ] **Step 2: Confirmar que testes falham**

```bash
cd apps/web && bunx vitest run src/lib/lead/compression.test.ts
```

Esperado: 4 FAIL (novos), 5 PASS (calculateDimensions existentes).

- [ ] **Step 3: Implementar `checkStorageAndCompress` em `compression.ts`**

Adicionar ao final de `apps/web/src/lib/lead/compression.ts`:

```typescript
const STORAGE_COMPRESS_THRESHOLD = 0.8;  // 80%
const STORAGE_REJECT_THRESHOLD = 0.9;    // 90%
const COMPRESSED_DIMENSION = 800;

export async function checkStorageAndCompress(blob: Blob): Promise<Blob> {
	// navigator.storage pode não estar disponível (SSR, browsers antigos)
	if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
		return blob;
	}

	const estimate = await navigator.storage.estimate();
	const { usage, quota } = estimate;

	if (quota == null || quota === 0) {
		return blob;
	}

	const usageRatio = (usage ?? 0) / quota;

	if (usageRatio >= STORAGE_REJECT_THRESHOLD) {
		throw new Error(
			"Armazenamento cheio (>90%). Libere espaço antes de adicionar fotos."
		);
	}

	if (usageRatio >= STORAGE_COMPRESS_THRESHOLD) {
		// Comprimir mais agressivamente para 800px
		const file = new File([blob], "photo.jpg", { type: blob.type || "image/jpeg" });
		const bitmap = await createImageBitmap(file);

		const { width, height } = calculateDimensions(
			bitmap.width,
			bitmap.height,
			COMPRESSED_DIMENSION
		);

		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;

		const ctx = canvas.getContext("2d");
		if (!ctx) {
			bitmap.close();
			return blob;
		}

		ctx.drawImage(bitmap, 0, 0, width, height);
		bitmap.close();

		return new Promise((resolve) => {
			canvas.toBlob(
				(compressed) => resolve(compressed ?? blob),
				"image/jpeg",
				JPEG_QUALITY
			);
		});
	}

	return blob;
}
```

- [ ] **Step 4: Confirmar que todos os testes passam**

```bash
cd apps/web && bunx vitest run src/lib/lead/compression.test.ts
```

Esperado: 9 PASS (5 calculateDimensions + 4 checkStorageAndCompress).

- [ ] **Step 5: Usar `checkStorageAndCompress` em `save-lead.ts`**

Modificar `apps/web/src/lib/lead/save-lead.ts` para verificar espaço antes de salvar foto:

```typescript
import { db } from "../db/index";
import { checkStorageAndCompress } from "./compression";
import type { LeadFormData } from "./validation";

function emptyToNull(value: string | undefined): string | null {
	return !value || value === "" ? null : value;
}

export async function saveLead(
	data: LeadFormData,
	userId: string,
	photo: Blob | null
): Promise<string> {
	const localId = crypto.randomUUID();
	const now = new Date().toISOString();

	const processedPhoto = photo ? await checkStorageAndCompress(photo) : null;

	await db.transaction("rw", db.leads, db.syncQueue, async () => {
		await db.leads.add({
			localId,
			serverId: null,
			userId,
			name: data.name,
			phone: emptyToNull(data.phone),
			email: emptyToNull(data.email),
			company: emptyToNull(data.company),
			position: emptyToNull(data.position),
			segment: emptyToNull(data.segment),
			notes: emptyToNull(data.notes),
			interestTag: data.interestTag,
			photo: processedPhoto,
			photoUrl: null,
			createdAt: now,
			updatedAt: now,
			deletedAt: null,
			syncStatus: "pending",
			uploadFailed: false,
		});

		await db.syncQueue.add({
			localId,
			operation: "create",
			payload: JSON.stringify({
				name: data.name,
				phone: emptyToNull(data.phone),
				email: emptyToNull(data.email),
				company: emptyToNull(data.company),
				position: emptyToNull(data.position),
				segment: emptyToNull(data.segment),
				notes: emptyToNull(data.notes),
				interestTag: data.interestTag,
			}),
			retryCount: 0,
			timestamp: now,
		});
	});

	return localId;
}
```

- [ ] **Step 6: Usar `checkStorageAndCompress` em `update-lead.ts`**

Adicionar import e processamento de foto antes da transaction em `apps/web/src/lib/lead/update-lead.ts`:

```typescript
import { db } from "../db/index";
import { checkStorageAndCompress } from "./compression";
import type { LeadFormData } from "./validation";

function emptyToNull(value: string | undefined): string | null {
	return !value || value === "" ? null : value;
}

export async function updateLead(
	localId: string,
	data: LeadFormData,
	photo?: Blob | null
): Promise<void> {
	const now = new Date().toISOString();

	const processedPhoto =
		photo instanceof Blob ? await checkStorageAndCompress(photo) : photo;

	const updates: Record<string, unknown> = {
		name: data.name,
		phone: emptyToNull(data.phone),
		email: emptyToNull(data.email),
		company: emptyToNull(data.company),
		position: emptyToNull(data.position),
		segment: emptyToNull(data.segment),
		notes: emptyToNull(data.notes),
		interestTag: data.interestTag,
		updatedAt: now,
		syncStatus: "pending" as const,
	};

	if (processedPhoto !== undefined) {
		updates.photo = processedPhoto;
	}
	if (processedPhoto === null) {
		updates.photoUrl = null;
	}

	const syncPayload: Record<string, unknown> = {
		name: data.name,
		phone: emptyToNull(data.phone),
		email: emptyToNull(data.email),
		company: emptyToNull(data.company),
		position: emptyToNull(data.position),
		segment: emptyToNull(data.segment),
		notes: emptyToNull(data.notes),
		interestTag: data.interestTag,
	};
	if (processedPhoto === null) {
		syncPayload.photoUrl = null;
	}

	await db.transaction("rw", db.leads, db.syncQueue, async () => {
		await db.leads.update(localId, updates);

		await db.syncQueue.add({
			localId,
			operation: "update",
			payload: JSON.stringify(syncPayload),
			retryCount: 0,
			timestamp: now,
		});
	});
}
```

- [ ] **Step 7: Rodar testes de save-lead, update-lead e compression**

```bash
cd apps/web && bunx vitest run src/lib/lead/compression.test.ts src/lib/lead/save-lead.test.ts src/lib/lead/update-lead.test.ts
```

Esperado: todos PASS.

- [ ] **Step 8: Commit**

```bash
cd /home/othavio/Work/profills/sistema2/sistema-coleta-de-lead
git add apps/web/src/lib/lead/compression.ts apps/web/src/lib/lead/compression.test.ts \
        apps/web/src/lib/lead/save-lead.ts apps/web/src/lib/lead/update-lead.ts
git commit -m "feat(lead): verificar espaço IndexedDB antes de salvar foto (P1-11)"
```

---

## Task 6: P1-12 — UI de sync status completa

**Problema:** Engine emite sinais ambíguos: não distingue "sync parou de tentar" de "sync completou", não expõe número do retry em andamento, e `authExpired` não aparece na UI como estado visual.

**Solução:**
1. Enriquecer `SyncEngineCallbacks` com `onRetry(attempt)` e `isStalled`
2. Mudar `startSync()` para retornar `{ stop, retry }` em vez de função cleanup
3. Novos estados em `deriveSyncState`: `authExpired`, `stalled`, `retrying`
4. Banner persistente `SyncErrorBanner` para `stalled` e `authExpired`
5. Botão "Tentar novamente" manual

**Files:**
- Modify: `apps/web/src/lib/sync/engine.ts`
- Modify: `apps/web/src/components/sync-status-provider.tsx`
- Modify: `apps/web/src/components/sync-status-icon.tsx`
- Create: `apps/web/src/components/sync-error-banner.tsx`
- Test: `apps/web/src/lib/sync/engine.test.ts`

---

- [ ] **Step 1: Escrever testes que falham em `engine.test.ts`**

Adicionar testes para `onRetry` e `isStalled`:

```typescript
it("chama onRetry callback com número do attempt durante retries", async () => {
  mockPushChanges.mutate
    .mockRejectedValueOnce(new Error("Network fail"))
    .mockRejectedValueOnce(new Error("Network fail"))
    .mockResolvedValue({ acknowledged: [], idMappings: [] });

  const onRetry = vi.fn();
  const onSyncEnd = vi.fn();

  const { startSync } = await import("./engine");
  const { stop } = startSync({ onRetry, onSyncEnd }, mockDetector);

  await vi.waitFor(() => expect(onSyncEnd).toHaveBeenCalledOnce());
  stop();

  expect(onRetry).toHaveBeenCalledTimes(2);
  expect(onRetry).toHaveBeenNthCalledWith(1, 2, 5); // attempt 2 de 5
  expect(onRetry).toHaveBeenNthCalledWith(2, 3, 5); // attempt 3 de 5
});

it("chama onSyncEnd com isStalled=true quando todos os retries são esgotados", async () => {
  mockPushChanges.mutate.mockRejectedValue(new Error("Always fail"));

  const onSyncEnd = vi.fn();

  const { startSync } = await import("./engine");
  const { stop } = startSync({ onSyncEnd }, mockDetector);

  await vi.waitFor(() => expect(onSyncEnd).toHaveBeenCalledOnce());
  stop();

  const result = onSyncEnd.mock.calls[0][0];
  expect(result.error).not.toBeNull();
  expect(result.isStalled).toBe(true);
});

it("startSync retorna objeto com stop e retry", async () => {
  const { startSync } = await import("./engine");
  const control = startSync({}, mockDetector);

  expect(typeof control.stop).toBe("function");
  expect(typeof control.retry).toBe("function");

  control.stop();
});

it("retry manual dispara syncWithRetry quando online e não sincronizando", async () => {
  const onSyncStart = vi.fn();

  const { startSync } = await import("./engine");
  const { stop, retry } = startSync({ onSyncStart }, mockDetector);

  // Esperar sync inicial
  await vi.waitFor(() => expect(onSyncStart).toHaveBeenCalledOnce());
  onSyncStart.mockClear();

  retry();
  await vi.waitFor(() => expect(onSyncStart).toHaveBeenCalledOnce());

  stop();
});
```

- [ ] **Step 2: Confirmar que testes falham**

```bash
cd apps/web && bunx vitest run src/lib/sync/engine.test.ts
```

Esperado: 4 FAIL novos.

- [ ] **Step 3: Enriquecer `SyncEngineCallbacks` e `startSync` em `engine.ts`**

Atualizar a interface `SyncEngineCallbacks` e as funções `syncWithRetry` e `startSync`:

```typescript
export interface SyncEngineCallbacks {
	onSyncEnd?: (result: {
		lastSync: string;
		error: string | null;
		authExpired?: boolean;
		isStalled?: boolean;
	}) => void;
	onSyncStart?: () => void;
	onRetry?: (attempt: number, totalAttempts: number) => void;
}
```

Modificar `syncWithRetry()`:

```typescript
async function syncWithRetry(callbacks?: SyncEngineCallbacks): Promise<void> {
	callbacks?.onSyncStart?.();
	let lastError: string | null = null;

	for (let attempt = 0; attempt < SYNC_CONFIG.maxRetries; attempt++) {
		try {
			const result = await syncCycle();
			const meta = await db.syncMeta.get("lastSyncTimestamp");
			const lastSync = meta?.value ?? new Date().toISOString();
			if (result.authExpired) {
				callbacks?.onSyncEnd?.({ lastSync, error: null, authExpired: true });
				return;
			}
			callbacks?.onSyncEnd?.({ lastSync, error: null });
			return;
		} catch (error: unknown) {
			if (isUnauthorizedError(error)) {
				const meta = await db.syncMeta.get("lastSyncTimestamp");
				const lastSync = meta?.value ?? "";
				callbacks?.onSyncEnd?.({ lastSync, error: null, authExpired: true });
				return;
			}
			lastError = error instanceof Error ? error.message : "Erro desconhecido";
			if (attempt < SYNC_CONFIG.maxRetries - 1) {
				// Notificar que vamos retentar (attempt é 0-indexed; mostrar 1-indexed)
				callbacks?.onRetry?.(attempt + 2, SYNC_CONFIG.maxRetries);
				await new Promise((resolve) => {
					setTimeout(resolve, getBackoffDelay(attempt));
				});
			}
		}
	}

	// Todos os retries esgotados (D-11)
	const meta = await db.syncMeta.get("lastSyncTimestamp");
	const lastSync = meta?.value ?? "";
	callbacks?.onSyncEnd?.({ lastSync, error: lastError, isStalled: true });
}
```

Modificar `startSync()` para retornar `{ stop, retry }`:

```typescript
export function startSync(
	callbacks?: SyncEngineCallbacks,
	detector?: ConnectivityDetector,
): { stop: () => void; retry: () => void } {
	const _detector = detector ?? createConnectivityDetector();
	let periodicTimerId: ReturnType<typeof setTimeout> | null = null;

	function schedulePeriodicSync(): void {
		periodicTimerId = setTimeout(async () => {
			if (_detector.isOnline && !isSyncing) {
				await syncWithRetry(callbacks);
			}
			schedulePeriodicSync();
		}, SYNC_CONFIG.periodicSyncIntervalMs);
	}

	const unsubscribe = _detector.subscribe((online) => {
		if (online) {
			syncWithRetry(callbacks);
		}
	});

	_detector.start();

	if (_detector.isOnline) {
		syncWithRetry(callbacks);
	}

	schedulePeriodicSync();

	function stop(): void {
		unsubscribe();
		_detector.stop();
		if (periodicTimerId !== null) {
			clearTimeout(periodicTimerId);
			periodicTimerId = null;
		}
	}

	function retry(): void {
		if (_detector.isOnline && !isSyncing) {
			syncWithRetry(callbacks);
		}
	}

	return { stop, retry };
}
```

- [ ] **Step 4: Confirmar que testes do engine passam**

```bash
cd apps/web && bunx vitest run src/lib/sync/engine.test.ts
```

Esperado: todos PASS.

- [ ] **Step 5: Atualizar `sync-status-provider.tsx` com novos estados**

Substituir o conteúdo completo de `apps/web/src/components/sync-status-provider.tsx`:

```typescript
"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { db } from "@/lib/db/index";
import { createConnectivityDetector } from "@/lib/sync/connectivity";
import type { SyncEngineCallbacks } from "@/lib/sync/engine";

interface SyncStatus {
	isOnline: boolean;
	isSyncing: boolean;
	lastError: string | null;
	lastSync: string | null;
	pendingCount: number;
	authExpired: boolean;
	retryAttempt: number | null;
	totalRetries: number;
	isStalled: boolean;
	manualRetry: () => void;
}

const SyncStatusContext = createContext<SyncStatus>({
	isOnline: true,
	isSyncing: false,
	pendingCount: 0,
	lastSync: null,
	lastError: null,
	authExpired: false,
	retryAttempt: null,
	totalRetries: 5,
	isStalled: false,
	manualRetry: () => undefined,
});

export function useSyncStatus(): SyncStatus {
	return useContext(SyncStatusContext);
}

interface SyncState {
	isSyncing: boolean;
	lastError: string | null;
	lastSync: string | null;
	authExpired: boolean;
	retryAttempt: number | null;
	totalRetries: number;
	isStalled: boolean;
}

export function SyncStatusProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [isOnline, setIsOnline] = useState(true);
	const [syncState, setSyncState] = useState<SyncState>({
		isSyncing: false,
		lastSync: null,
		lastError: null,
		authExpired: false,
		retryAttempt: null,
		totalRetries: 5,
		isStalled: false,
	});

	const retryRef = useRef<(() => void) | null>(null);

	const pendingCount = useLiveQuery(() => db.syncQueue.count(), [], 0);

	useEffect(() => {
		db.syncMeta.get("lastSyncTimestamp").then((meta) => {
			if (meta?.value) {
				setSyncState((prev) => ({ ...prev, lastSync: meta.value }));
			}
		});

		const detector = createConnectivityDetector();
		setIsOnline(detector.isOnline);

		const unsubscribeDetector = detector.subscribe((online) => {
			setIsOnline(online);
		});

		const callbacks: SyncEngineCallbacks = {
			onSyncStart: () =>
				setSyncState((prev) => ({
					...prev,
					isSyncing: true,
					retryAttempt: null,
					isStalled: false,
				})),
			onSyncEnd: (result) =>
				setSyncState({
					isSyncing: false,
					lastSync: result.lastSync,
					lastError: result.error,
					authExpired: result.authExpired ?? false,
					retryAttempt: null,
					totalRetries: 5,
					isStalled: result.isStalled ?? false,
				}),
			onRetry: (attempt, totalAttempts) =>
				setSyncState((prev) => ({
					...prev,
					retryAttempt: attempt,
					totalRetries: totalAttempts,
				})),
		};

		let syncControl: { stop: () => void; retry: () => void } | undefined;

		async function init() {
			const { startSync } = await import("@/lib/sync/engine");
			syncControl = startSync(callbacks, detector);
			retryRef.current = syncControl.retry;
		}

		init();

		return () => {
			syncControl?.stop();
			unsubscribeDetector();
			detector.stop();
		};
	}, []);

	const value: SyncStatus = {
		isOnline,
		...syncState,
		pendingCount,
		manualRetry: () => retryRef.current?.(),
	};

	return <SyncStatusContext value={value}>{children}</SyncStatusContext>;
}
```

- [ ] **Step 6: Atualizar `sync-status-icon.tsx` com novos estados**

Substituir o conteúdo completo de `apps/web/src/components/sync-status-icon.tsx`:

```typescript
"use client";

import { Button } from "@dashboard-leads-profills/ui/components/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@dashboard-leads-profills/ui/components/tooltip";
import { cn } from "@dashboard-leads-profills/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
	AlertTriangle,
	CloudCheck,
	CloudUpload,
	Lock,
	RefreshCw,
	WifiOff,
	XCircle,
} from "lucide-react";
import { useSyncStatus } from "@/components/sync-status-provider";
import { relativeTime } from "@/lib/lead/relative-time";

export type SyncState =
	| "offline"
	| "authExpired"
	| "stalled"
	| "retrying"
	| "syncing"
	| "error"
	| "pending"
	| "synced";

interface SyncStatus {
	isOnline: boolean;
	isSyncing: boolean;
	lastError: string | null;
	lastSync: string | null;
	pendingCount: number;
	authExpired: boolean;
	retryAttempt: number | null;
	totalRetries: number;
	isStalled: boolean;
}

export function deriveSyncState(status: SyncStatus): SyncState {
	if (!status.isOnline) return "offline";
	if (status.authExpired) return "authExpired";
	if (status.isStalled) return "stalled";
	if (status.retryAttempt !== null) return "retrying";
	if (status.isSyncing) return "syncing";
	if (status.lastError !== null) return "error";
	if (status.pendingCount > 0) return "pending";
	return "synced";
}

export function getTooltipText(state: SyncState, status: SyncStatus): string {
	if (state === "offline") return "Sem conexao";
	if (state === "authExpired") return "Sessao expirada — faca login";
	if (state === "stalled") return "Sync falhou — clique para tentar de novo";
	if (state === "retrying")
		return `Tentando novamente... (${status.retryAttempt}/${status.totalRetries})`;
	if (state === "syncing") return "Sincronizando...";
	if (state === "error") return "Erro no ultimo sync";
	if (state === "pending") {
		return status.pendingCount === 1
			? "1 alteracao pendente"
			: `${status.pendingCount} alteracoes pendentes`;
	}
	if (status.lastSync) return `Atualizado ${relativeTime(status.lastSync)}`;
	return "Sincronizado";
}

export function formatBadgeCount(count: number): string | null {
	if (count <= 0) return null;
	if (count > 99) return "99+";
	return String(count);
}

const STATE_CONFIG = {
	offline: { icon: WifiOff, className: "text-destructive" },
	authExpired: { icon: Lock, className: "text-destructive" },
	stalled: { icon: XCircle, className: "text-destructive" },
	retrying: { icon: RefreshCw, className: "text-amber-500 animate-spin" },
	syncing: { icon: RefreshCw, className: "text-primary animate-spin" },
	error: { icon: AlertTriangle, className: "text-amber-500" },
	pending: { icon: CloudUpload, className: "text-muted-foreground" },
	synced: { icon: CloudCheck, className: "text-emerald-500" },
} as const satisfies Record<SyncState, { icon: LucideIcon; className: string }>;

export function SyncStatusIcon() {
	const status = useSyncStatus();
	const state = deriveSyncState(status);
	const tooltipText = getTooltipText(state, status);
	const badgeText = formatBadgeCount(status.pendingCount);
	const { icon: Icon, className: iconClassName } = STATE_CONFIG[state];

	return (
		<TooltipProvider delay={500}>
			<Tooltip>
				<TooltipTrigger
					render={
						<Button aria-label={tooltipText} size="icon-sm" variant="ghost" />
					}
				>
					<span className="relative inline-flex items-center justify-center">
						<Icon aria-hidden="true" className={cn("size-4", iconClassName)} />
						{badgeText !== null && (
							<span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-0.5 font-semibold text-[10px] text-white tabular-nums">
								{badgeText}
							</span>
						)}
					</span>
				</TooltipTrigger>
				<TooltipContent side="top">{tooltipText}</TooltipContent>
			</Tooltip>
			<span aria-live="polite" className="sr-only">
				{tooltipText}
			</span>
		</TooltipProvider>
	);
}
```

- [ ] **Step 7: Criar `sync-error-banner.tsx`**

Criar `apps/web/src/components/sync-error-banner.tsx`:

```typescript
"use client";

import { Button } from "@dashboard-leads-profills/ui/components/button";
import { AlertTriangle, Lock, RefreshCw } from "lucide-react";
import Link from "next/link";
import { deriveSyncState } from "@/components/sync-status-icon";
import { useSyncStatus } from "@/components/sync-status-provider";

export function SyncErrorBanner() {
	const status = useSyncStatus();
	const state = deriveSyncState(status);

	if (state !== "stalled" && state !== "authExpired") {
		return null;
	}

	return (
		<div
			role="alert"
			className="sticky top-0 z-50 flex items-center justify-between border-b border-destructive/20 bg-destructive/10 px-4 py-2"
		>
			<div className="flex items-center gap-2 text-destructive">
				{state === "authExpired" ? (
					<Lock aria-hidden="true" className="size-4 shrink-0" />
				) : (
					<AlertTriangle aria-hidden="true" className="size-4 shrink-0" />
				)}
				<span className="text-sm">
					{state === "authExpired"
						? "Sessão expirada — faça login para retomar a sincronização"
						: "Sincronização falhou — dados salvos localmente, sem perda"}
				</span>
			</div>
			{state === "stalled" && (
				<Button
					onClick={status.manualRetry}
					size="sm"
					variant="outline"
					className="ml-4 shrink-0"
				>
					<RefreshCw className="mr-1.5 size-3.5" />
					Tentar novamente
				</Button>
			)}
			{state === "authExpired" && (
				<Button asChild size="sm" variant="outline" className="ml-4 shrink-0">
					<Link href="/login">Fazer login</Link>
				</Button>
			)}
		</div>
	);
}
```

- [ ] **Step 8: Rodar todos os testes**

```bash
cd apps/web && bunx vitest run src/lib/sync/engine.test.ts
```

Esperado: todos PASS.

- [ ] **Step 9: Commit**

```bash
cd /home/othavio/Work/profills/sistema2/sistema-coleta-de-lead
git add apps/web/src/lib/sync/engine.ts \
        apps/web/src/components/sync-status-provider.tsx \
        apps/web/src/components/sync-status-icon.tsx \
        apps/web/src/components/sync-error-banner.tsx \
        apps/web/src/lib/sync/engine.test.ts
git commit -m "feat(ui): status de sync completo com retrying, stalled, authExpired e banner (P1-12)"
```

---

## Verificação Final da Sprint 2

Após todas as tasks:

```bash
# Rodar todos os testes do projeto
cd /home/othavio/Work/profills/sistema2/sistema-coleta-de-lead
bun run test

# Verificar tipos
bun run check-types
```

**Critérios de sucesso (do spec):**
- Zero perda de fotos em teste com 50 leads com foto
- Remoção de foto propaga `photoUrl: null` ao servidor (Task 1)
- Backend não perde ACKs já processados em caso de falha no batch (Task 2)
- Upload de foto falha no máximo 10× antes de marcar `uploadFailed` (Task 3)
- `lastSyncTimestamp` sobrevive a "Limpar dados de navegação" (Task 4)
- App alerta antes de salvar foto quando espaço > 90% (Task 5)
- UI mostra estado real: `retrying(n/5)`, `stalled`, `authExpired` (Task 6)
- Banner persistente com botão "Tentar novamente" quando sync trava (Task 6)
