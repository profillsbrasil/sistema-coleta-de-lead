# Dashboard Data Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar a desatualização e a divergência de dados do `/dashboard` visíveis na UI e corrigir a causa raiz da inflação de contagem local.

**Architecture:** O servidor passa a propagar deleções (tombstones) no pull incremental; o engine de sync as aplica removendo o lead do Dexie. O resultado do fetch do ranking é propagado até o `SyncStatusProvider` como `leaderboardFailed`. A lógica nova de UI (frescor e divergência) vive em helpers puros testáveis; os componentes apenas os consomem.

**Tech Stack:** Next.js 16 / React 19, tRPC 11, Drizzle ORM (Postgres), Dexie 4, Vitest.

**Spec:** `docs/superpowers/specs/2026-05-22-dashboard-data-consistency-design.md`

---

## Notas de contexto para o executor

- Monorepo Turborepo + Bun. Testes: `bun run test` (turbo) ou, por pacote, `bunx vitest run <arquivo>`.
- O projeto **não** testa componentes React nem o `SyncStatusProvider` a fundo (não há `@testing-library/react`). A cobertura de teste da lógica nova fica nos helpers puros (Task 5) e nas camadas de sync (Tasks 1–3). Tasks 4, 6 e 7 são verificadas por `check-types` + teste manual — consistente com o padrão do repositório.
- Conventional Commits em PT, subject ≤ 50 chars. Commits exigem aprovação interativa (regra `ask` em `git commit`) — o executor deve solicitá-la.
- Não usar `--no-verify`.

## Estrutura de arquivos

| Arquivo | Responsabilidade | Ação |
|---|---|---|
| `packages/api/src/routers/sync.ts` | `delete` grava `updatedAt`; `pullChanges` retorna tombstones | Modificar |
| `apps/web/src/lib/sync/engine.ts` | Pull aplica deleção remota; `fetchLeaderboard`→boolean; `syncCycle`/`onSyncEnd` propagam `leaderboardFailed` | Modificar |
| `apps/web/src/components/sync-status-provider.tsx` | Campo `leaderboardFailed` no contexto | Modificar |
| `apps/web/src/lib/dashboard/consistency.ts` | Helpers puros: `formatRelativeTime`, `hasPersonalDivergence` | Criar |
| `apps/web/src/app/(app)/dashboard/ranking-freshness.tsx` | Texto inline de frescor/falha do ranking | Criar |
| `apps/web/src/app/(app)/dashboard/dashboard.tsx` | Integra `RankingFreshness` na seção Ranking | Modificar |
| `apps/web/src/app/(app)/dashboard/personal-dashboard.tsx` | Aviso de divergência local × servidor | Modificar |
| Testes correspondentes | — | Criar/Modificar |

---

## Task 1: Servidor — `delete` grava `updatedAt` e `pullChanges` retorna tombstones

**Files:**
- Modify: `packages/api/src/routers/sync.ts`
- Test: `packages/api/src/__tests__/sync.test.ts`

Causa raiz: o `delete` faz `.set({ deletedAt })` sem tocar `updatedAt`, então a deleção nunca é capturada pelo pull incremental (`updatedAt > since`); e o `pullChanges` filtra `isNull(deletedAt)`. Os dois pontos precisam mudar juntos.

- [ ] **Step 1: Reescrever o teste de pull existente**

No `packages/api/src/__tests__/sync.test.ts`, dentro do `describe("syncRouter.pullChanges", ...)`, substituir o teste `it("filtra leads soft-deletados — where inclui isNull(deletedAt)", ...)` inteiro por:

```ts
	it("inclui tombstones — where não filtra mais por isNull(deletedAt)", async () => {
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
		expect(whereArg.and).not.toContainEqual({ isNull: "deletedAt" });
	});
```

- [ ] **Step 2: Adicionar o teste do `delete` gravando `updatedAt`**

No mesmo arquivo, dentro do `describe` de `pushChanges` (junto dos demais testes de `delete`), adicionar:

```ts
	it("delete soft-deleta gravando updatedAt — torna o tombstone visível ao pull", async () => {
		const setMock = vi.fn().mockReturnThis();
		const updateChain = {
			set: setMock,
			where: vi.fn().mockResolvedValue(undefined),
		};
		const mockDb: MockDb = {
			insert: vi.fn(),
			update: vi.fn().mockReturnValue(updateChain),
			select: vi.fn(),
		};

		const { caller } = await loadSyncRouter(mockDb);

		await caller.pushChanges({
			operations: [
				{
					localId: "55555555-5555-4555-8555-555555555555",
					operation: "delete",
					payload: {},
					clientTimestamp: "2026-01-01T00:00:00.000Z",
				},
			],
		});

		const setArg = setMock.mock.calls[0]?.[0] as Record<string, unknown>;
		expect(setArg).toHaveProperty("deletedAt");
		expect(setArg).toHaveProperty("updatedAt");
	});
```

- [ ] **Step 3: Rodar os testes e verificar que falham**

Run: `bunx vitest run packages/api/src/__tests__/sync.test.ts`
Expected: FAIL — o teste de pull ainda acha `{ isNull: "deletedAt" }`; o teste de delete não acha `updatedAt` no `set`.

- [ ] **Step 4: Atualizar o `delete` case em `sync.ts`**

Em `packages/api/src/routers/sync.ts`, no `case "delete":`, trocar o `.set`:

```ts
				case "delete": {
					await db
						.update(leads)
						.set({ deletedAt: new Date(), updatedAt: new Date() })
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

- [ ] **Step 5: Remover o filtro `isNull(deletedAt)` do `pullChanges`**

Em `packages/api/src/routers/sync.ts`, na query do `pullChanges`, remover `isNull(leads.deletedAt)`:

```ts
			const changes = await db
				.select()
				.from(leads)
				.where(
					and(eq(leads.userId, userId), gt(leads.updatedAt, since))
				);
```

O import de `isNull` permanece — ainda é usado no `case "update"`.

- [ ] **Step 6: Rodar os testes e verificar que passam**

Run: `bunx vitest run packages/api/src/__tests__/sync.test.ts`
Expected: PASS — toda a suíte de `sync.test.ts` verde.

- [ ] **Step 7: Commit**

```bash
git add packages/api/src/routers/sync.ts packages/api/src/__tests__/sync.test.ts
git commit -m "fix: propaga tombstones no pull incremental"
```

---

## Task 2: Engine — pull aplica deleção remota

**Files:**
- Modify: `apps/web/src/lib/sync/engine.ts`
- Test: `apps/web/src/lib/sync/engine.test.ts`

O `pullChanges` do servidor agora envia leads com `deletedAt` preenchido. O cliente precisa removê-los do Dexie (server-wins), senão `getPersonalStats` continua contando.

- [ ] **Step 1: Escrever o teste de aplicação do tombstone**

No `apps/web/src/lib/sync/engine.test.ts`, dentro do `describe("pull phase", ...)`, adicionar:

```ts
		it("remove do Dexie um lead marcado como deletado no servidor", async () => {
			const ts = "2026-05-22T10:00:00.000Z";
			await db.leads.add({
				localId: "tomb-1",
				serverId: 10,
				userId: "user-1",
				name: "Lead Morto",
				phone: null,
				email: null,
				company: null,
				position: null,
				segment: null,
				notes: null,
				interestTag: "frio",
				photo: null,
				photoUrl: null,
				uploadFailed: false,
				createdAt: ts,
				updatedAt: ts,
				deletedAt: null,
				syncStatus: "synced",
			});

			mockPullChanges.query.mockResolvedValue({
				leads: [
					{
						localId: "tomb-1",
						id: 10,
						userId: "user-1",
						name: "Lead Morto",
						interestTag: "frio",
						createdAt: ts,
						updatedAt: "2026-05-22T11:00:00.000Z",
						deletedAt: "2026-05-22T11:00:00.000Z",
					},
				],
				serverTimestamp: "2026-05-22T11:30:00.000Z",
			});

			const { syncCycle } = await import("./engine");
			await syncCycle();

			expect(await db.leads.get("tomb-1")).toBeUndefined();
		});
```

- [ ] **Step 2: Rodar o teste e verificar que falha**

Run: `bunx vitest run apps/web/src/lib/sync/engine.test.ts -t "remove do Dexie"`
Expected: FAIL — o lead `tomb-1` ainda existe (foi sobrescrito via `put`, não deletado).

- [ ] **Step 3: Tratar tombstone no `pullChanges` do engine**

Em `apps/web/src/lib/sync/engine.ts`, dentro da função `pullChanges`, no início do `for (const serverLead of result.leads)`, inserir o tratamento de tombstone logo após obter `localId` e **antes** de `const localLead = await db.leads.get(localId);`:

```ts
	for (const serverLead of result.leads) {
		const serverRecord = serverLead as unknown as Record<string, unknown>;
		const localId = serverRecord.localId as string;

		// Tombstone: lead deletado no servidor — aplica server-wins removendo localmente.
		if (serverRecord.deletedAt != null) {
			await db.leads.delete(localId);
			continue;
		}

		const localLead = await db.leads.get(localId);
```

O restante do corpo do loop permanece inalterado.

- [ ] **Step 4: Rodar o teste e verificar que passa**

Run: `bunx vitest run apps/web/src/lib/sync/engine.test.ts -t "remove do Dexie"`
Expected: PASS

- [ ] **Step 5: Rodar a suíte do engine completa**

Run: `bunx vitest run apps/web/src/lib/sync/engine.test.ts`
Expected: PASS — nenhuma regressão.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/sync/engine.ts apps/web/src/lib/sync/engine.test.ts
git commit -m "fix: pull remove leads deletados no servidor"
```

---

## Task 3: Engine — `fetchLeaderboard` retorna status e `syncCycle` propaga `leaderboardFailed`

**Files:**
- Modify: `apps/web/src/lib/sync/engine.ts`
- Test: `apps/web/src/lib/sync/engine.test.ts`

Hoje `fetchLeaderboard` tem `catch {}` que descarta a falha. Vai passar a retornar `boolean`; `syncCycle` retorna `{ authExpired, leaderboardFailed }`; `syncWithRetry` repassa via `onSyncEnd`. O `catch` é mantido (não lança) — preserva o invariante "falha de ranking não quebra o sync de leads".

- [ ] **Step 1: Adicionar `leaderboard.getRanking` ao mock do tRPC no teste**

Em `apps/web/src/lib/sync/engine.test.ts`, no bloco de mock do tRPC (logo após `const mockPullChanges = { query: vi.fn() };`), adicionar `mockGetRanking` e incluir `leaderboard` no client mockado:

```ts
// Mock tRPC client
const mockPushChanges = { mutate: vi.fn() };
const mockPullChanges = { query: vi.fn() };
const mockGetRanking = { query: vi.fn() };
vi.mock("@trpc/client", () => ({
	createTRPCClient: () => ({
		sync: {
			pushChanges: mockPushChanges,
			pullChanges: mockPullChanges,
		},
		leaderboard: {
			getRanking: mockGetRanking,
		},
	}),
	httpBatchLink: vi.fn(() => ({})),
}));
```

- [ ] **Step 2: Dar default ao mock e limpar `leaderboardCache` no `beforeEach`**

No `beforeEach` do `describe("sync engine", ...)`, adicionar a limpeza do cache e o default do mock (logo após o bloco que faz `mockPullChanges.query.mockResolvedValue(...)`):

```ts
		await db.leaderboardCache?.clear();

		mockGetRanking.query.mockResolvedValue({
			ranking: [],
			serverTimestamp: new Date().toISOString(),
		});
```

E no `afterEach`, adicionar `await db.leaderboardCache?.clear();`.

- [ ] **Step 3: Escrever os testes do leaderboard**

Em `apps/web/src/lib/sync/engine.test.ts`, adicionar um novo `describe` (no nível dos demais `describe` internos de `"sync engine"`):

```ts
	describe("leaderboard fetch", () => {
		it("syncCycle retorna leaderboardFailed=false quando o ranking carrega", async () => {
			mockGetRanking.query.mockResolvedValue({
				ranking: [],
				serverTimestamp: new Date().toISOString(),
			});

			const { syncCycle } = await import("./engine");
			const result = await syncCycle();

			expect(result.leaderboardFailed).toBe(false);
		});

		it("syncCycle retorna leaderboardFailed=true sem lançar quando o ranking falha", async () => {
			mockGetRanking.query.mockRejectedValue(new Error("ranking down"));

			const { syncCycle } = await import("./engine");
			const result = await syncCycle();

			expect(result.leaderboardFailed).toBe(true);
			expect(result.authExpired).toBe(false);
		});

		it("popula leaderboardCache com lastSyncAt quando o ranking carrega", async () => {
			const serverTimestamp = "2026-05-22T12:00:00.000Z";
			mockGetRanking.query.mockResolvedValue({
				ranking: [
					{ userId: "u1", name: "Ana", totalLeads: 3, score: 7, rank: 1 },
				],
				serverTimestamp,
			});

			const { syncCycle } = await import("./engine");
			await syncCycle();

			const cached = await db.leaderboardCache.get("u1");
			expect(cached?.lastSyncAt).toBe(serverTimestamp);
		});
	});
```

- [ ] **Step 4: Rodar os testes e verificar que falham**

Run: `bunx vitest run apps/web/src/lib/sync/engine.test.ts -t "leaderboard fetch"`
Expected: FAIL — `result.leaderboardFailed` é `undefined` (a propriedade ainda não existe).

- [ ] **Step 5: `fetchLeaderboard` passa a retornar `boolean`**

Em `apps/web/src/lib/sync/engine.ts`, substituir a função `fetchLeaderboard` inteira por:

```ts
async function fetchLeaderboard(): Promise<boolean> {
	try {
		const result = await syncClient.leaderboard.getRanking.query();
		await db.leaderboardCache.clear();
		const entries = result.ranking.map((r) => ({
			userId: r.userId,
			name: r.name,
			totalLeads: r.totalLeads,
			score: r.score,
			rank: r.rank,
			lastSyncAt: result.serverTimestamp,
		}));
		if (entries.length > 0) {
			await db.leaderboardCache.bulkPut(entries);
		}
		return true;
	} catch {
		// Leaderboard fetch failure must NOT affect lead sync (per Pitfall 3)
		return false;
	}
}
```

- [ ] **Step 6: `syncCycle` retorna `leaderboardFailed`**

Em `apps/web/src/lib/sync/engine.ts`, substituir a função `syncCycle` inteira por:

```ts
export async function syncCycle(): Promise<{
	authExpired: boolean;
	leaderboardFailed: boolean;
}> {
	if (isSyncing) {
		return { authExpired: false, leaderboardFailed: false };
	}

	isSyncing = true;
	try {
		await pushChanges();
		let photosUploaded = 0;
		try {
			photosUploaded = await uploadPendingPhotos();
		} catch {
			// Photo upload failure should not break sync cycle
		}
		// Second push to send photoUrl updates enqueued by uploadPendingPhotos
		if (photosUploaded > 0) {
			await pushChanges();
		}
		await pullChanges();
		const leaderboardOk = await fetchLeaderboard();
		return { authExpired: false, leaderboardFailed: !leaderboardOk };
	} catch (error: unknown) {
		if (isUnauthorizedError(error)) {
			// 401: stop sync, preserve local data (OFFL-06)
			return { authExpired: true, leaderboardFailed: false };
		}
		throw error;
	} finally {
		isSyncing = false;
	}
}
```

- [ ] **Step 7: Estender `SyncEngineCallbacks` e propagar em `syncWithRetry`**

Em `apps/web/src/lib/sync/engine.ts`, no tipo `SyncEngineCallbacks`, adicionar `leaderboardFailed` ao objeto de `onSyncEnd`:

```ts
	onSyncEnd?: (result: {
		lastSync: string;
		error: string | null;
		authExpired?: boolean;
		isStalled?: boolean;
		leaderboardFailed?: boolean;
	}) => void;
```

Ainda em `engine.ts`, na função `syncWithRetry`, no caminho de sucesso (após `const result = await syncCycle();`), passar `leaderboardFailed` na chamada de sucesso do `onSyncEnd`:

```ts
			if (result.authExpired) {
				callbacks?.onSyncEnd?.({ lastSync, error: null, authExpired: true });
				return;
			}
			callbacks?.onSyncEnd?.({
				lastSync,
				error: null,
				leaderboardFailed: result.leaderboardFailed,
			});
			return;
```

As outras chamadas de `onSyncEnd` (auth expirada no `catch`, e o caminho `isStalled`) não mudam — `leaderboardFailed` fica `undefined` (tratado como `false` a jusante).

- [ ] **Step 8: Rodar os testes e verificar que passam**

Run: `bunx vitest run apps/web/src/lib/sync/engine.test.ts`
Expected: PASS — incluindo `leaderboard fetch` e nenhuma regressão.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/lib/sync/engine.ts apps/web/src/lib/sync/engine.test.ts
git commit -m "feat: expõe falha do ranking no ciclo de sync"
```

---

## Task 4: Provider — campo `leaderboardFailed` no contexto de sync

**Files:**
- Modify: `apps/web/src/components/sync-status-provider.tsx`

Fiação de estado. Verificação por `check-types` — o projeto não tem teste de comportamento para o provider (sem `@testing-library/react`).

- [ ] **Step 1: Adicionar `leaderboardFailed` à interface `SyncStatus` e ao default do contexto**

Em `apps/web/src/components/sync-status-provider.tsx`, na interface `SyncStatus`, adicionar o campo (em ordem alfabética, após `isSyncing`):

```ts
	isSyncing: boolean;
	lastError: string | null;
	lastSync: string | null;
	leaderboardFailed: boolean;
	manualRetry: () => void;
```

No objeto passado para `createContext<SyncStatus>({ ... })`, adicionar `leaderboardFailed: false,`.

- [ ] **Step 2: Adicionar `leaderboardFailed` ao tipo `SyncState` e ao estado inicial**

Na interface `SyncState`, adicionar `leaderboardFailed: boolean;`. No `useState<SyncState>({ ... })` inicial, adicionar `leaderboardFailed: false,`.

- [ ] **Step 3: Setar `leaderboardFailed` no callback `onSyncEnd`**

No callback `onSyncEnd`, o `setSyncState({ ... })` passa a incluir:

```ts
		onSyncEnd: (result) =>
			setSyncState({
				isSyncing: false,
				lastSync: result.lastSync,
				lastError: result.error,
				authExpired: result.authExpired ?? false,
				retryAttempt: null,
				totalRetries: 5,
				isStalled: result.isStalled ?? false,
				leaderboardFailed: result.leaderboardFailed ?? false,
			}),
```

(O `onSyncStart` usa `...prev` e mantém o valor do ciclo anterior — comportamento aceitável; não alterar.)

- [ ] **Step 4: Verificar tipos**

Run: `bun run check-types`
Expected: PASS — sem erros de tipo.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/sync-status-provider.tsx
git commit -m "feat: leaderboardFailed no contexto de sync"
```

---

## Task 5: Helpers puros de consistência do dashboard

**Files:**
- Create: `apps/web/src/lib/dashboard/consistency.ts`
- Test: `apps/web/src/lib/dashboard/consistency.test.ts`

- [ ] **Step 1: Escrever os testes dos helpers**

Criar `apps/web/src/lib/dashboard/consistency.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatRelativeTime, hasPersonalDivergence } from "./consistency";

describe("formatRelativeTime", () => {
	const now = new Date("2026-05-22T12:00:00.000Z").getTime();

	it("retorna 'agora' para menos de um minuto", () => {
		expect(formatRelativeTime("2026-05-22T11:59:30.000Z", now)).toBe("agora");
	});

	it("formata minutos", () => {
		expect(formatRelativeTime("2026-05-22T11:57:00.000Z", now)).toBe(
			"há 3 min"
		);
	});

	it("formata horas", () => {
		expect(formatRelativeTime("2026-05-22T10:00:00.000Z", now)).toBe("há 2 h");
	});

	it("formata dias", () => {
		expect(formatRelativeTime("2026-05-20T12:00:00.000Z", now)).toBe("há 2 d");
	});
});

describe("hasPersonalDivergence", () => {
	it("detecta divergência em estado estável", () => {
		expect(
			hasPersonalDivergence({
				localTotal: 5,
				serverTotal: 8,
				pendingCount: 0,
				isSyncing: false,
			})
		).toBe(true);
	});

	it("ignora divergência durante o sync", () => {
		expect(
			hasPersonalDivergence({
				localTotal: 5,
				serverTotal: 8,
				pendingCount: 0,
				isSyncing: true,
			})
		).toBe(false);
	});

	it("ignora divergência com operações pendentes", () => {
		expect(
			hasPersonalDivergence({
				localTotal: 5,
				serverTotal: 8,
				pendingCount: 2,
				isSyncing: false,
			})
		).toBe(false);
	});

	it("não diverge sem dado do servidor", () => {
		expect(
			hasPersonalDivergence({
				localTotal: 5,
				serverTotal: null,
				pendingCount: 0,
				isSyncing: false,
			})
		).toBe(false);
	});

	it("não diverge quando os totais batem", () => {
		expect(
			hasPersonalDivergence({
				localTotal: 8,
				serverTotal: 8,
				pendingCount: 0,
				isSyncing: false,
			})
		).toBe(false);
	});
});
```

- [ ] **Step 2: Rodar os testes e verificar que falham**

Run: `bunx vitest run apps/web/src/lib/dashboard/consistency.test.ts`
Expected: FAIL — módulo `./consistency` não existe.

- [ ] **Step 3: Implementar os helpers**

Criar `apps/web/src/lib/dashboard/consistency.ts`:

```ts
const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/** Formata a distância de `iso` até `now` como texto curto em PT-BR. */
export function formatRelativeTime(
	iso: string,
	now: number = Date.now()
): string {
	const elapsed = now - new Date(iso).getTime();
	if (elapsed < MINUTE_MS) {
		return "agora";
	}
	if (elapsed < HOUR_MS) {
		return `há ${Math.floor(elapsed / MINUTE_MS)} min`;
	}
	if (elapsed < DAY_MS) {
		return `há ${Math.floor(elapsed / HOUR_MS)} h`;
	}
	return `há ${Math.floor(elapsed / DAY_MS)} d`;
}

interface DivergenceInput {
	isSyncing: boolean;
	localTotal: number;
	pendingCount: number;
	serverTotal: number | null;
}

/**
 * True quando os números locais divergem do ranking do servidor em estado
 * estável. Durante o sync ou com operações pendentes a diferença é esperada,
 * então não é sinalizada.
 */
export function hasPersonalDivergence({
	isSyncing,
	localTotal,
	pendingCount,
	serverTotal,
}: DivergenceInput): boolean {
	if (serverTotal === null || pendingCount > 0 || isSyncing) {
		return false;
	}
	return localTotal !== serverTotal;
}
```

- [ ] **Step 4: Rodar os testes e verificar que passam**

Run: `bunx vitest run apps/web/src/lib/dashboard/consistency.test.ts`
Expected: PASS — 9 testes verdes.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/dashboard/consistency.ts apps/web/src/lib/dashboard/consistency.test.ts
git commit -m "feat: helpers de consistência do dashboard"
```

---

## Task 6: Componente `RankingFreshness` e integração na seção Ranking

**Files:**
- Create: `apps/web/src/app/(app)/dashboard/ranking-freshness.tsx`
- Modify: `apps/web/src/app/(app)/dashboard/dashboard.tsx`

Verificação por `check-types` + manual (o projeto não testa componentes React).

- [ ] **Step 1: Criar o componente `RankingFreshness`**

Criar `apps/web/src/app/(app)/dashboard/ranking-freshness.tsx`:

```tsx
"use client";

import { formatRelativeTime } from "@/lib/dashboard/consistency";

interface RankingFreshnessProps {
	lastSyncAt: string | null;
	leaderboardFailed: boolean;
	onRetry: () => void;
}

export function RankingFreshness({
	lastSyncAt,
	leaderboardFailed,
	onRetry,
}: RankingFreshnessProps) {
	if (leaderboardFailed) {
		return (
			<p className="px-4 text-muted-foreground text-xs">
				Ranking pode estar desatualizado ·{" "}
				<button
					className="text-primary underline underline-offset-2"
					onClick={onRetry}
					type="button"
				>
					tentar de novo
				</button>
			</p>
		);
	}

	if (!lastSyncAt) {
		return null;
	}

	return (
		<p className="px-4 text-muted-foreground text-xs">
			Atualizado {formatRelativeTime(lastSyncAt)}
		</p>
	);
}
```

- [ ] **Step 2: Integrar no `dashboard.tsx`**

Em `apps/web/src/app/(app)/dashboard/dashboard.tsx`, adicionar os imports:

```tsx
import { useSyncStatus } from "@/components/sync-status-provider";
import { RankingFreshness } from "./ranking-freshness";
```

Dentro do componente `Dashboard`, após a linha `const entries = useLiveQuery(...)`, adicionar:

```tsx
	const { leaderboardFailed, manualRetry } = useSyncStatus();
	const lastSyncAt = entries?.[0]?.lastSyncAt ?? null;
```

Na seção de Ranking, inserir o `<RankingFreshness />` logo após o `<SectionHeading ... />`:

```tsx
			<section
				aria-labelledby="ranking-heading"
				className="flex flex-col gap-3"
			>
				<SectionHeading id="ranking-heading" meta="Equipe" title="Ranking" />

				<RankingFreshness
					lastSyncAt={lastSyncAt}
					leaderboardFailed={leaderboardFailed}
					onRetry={manualRetry}
				/>

				{isLoading && (
```

O restante da seção (`isLoading`, `isEmpty`, bloco `entries`) permanece inalterado.

- [ ] **Step 3: Verificar tipos**

Run: `bun run check-types`
Expected: PASS

- [ ] **Step 4: Verificação manual**

Run: `bun run dev:web` e abrir `http://localhost:3001/dashboard`.
Expected: abaixo do título "Ranking" aparece "Atualizado há X min". Com a aba offline durante o fetch do ranking, aparece "Ranking pode estar desatualizado · tentar de novo", e o link dispara um novo sync.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/src/app/(app)/dashboard/ranking-freshness.tsx" "apps/web/src/app/(app)/dashboard/dashboard.tsx"
git commit -m "feat: frescor do ranking no dashboard"
```

---

## Task 7: Aviso de divergência no `PersonalDashboard`

**Files:**
- Modify: `apps/web/src/app/(app)/dashboard/personal-dashboard.tsx`

Cross-check: compara o total local (`getPersonalStats`) com o `totalLeads` do próprio usuário no `leaderboardCache`. Só sinaliza em estado estável. Desativado quando há `overrideStats` (números vêm de fora).

- [ ] **Step 1: Adicionar imports**

Em `apps/web/src/app/(app)/dashboard/personal-dashboard.tsx`, adicionar:

```tsx
import { useSyncStatus } from "@/components/sync-status-provider";
import { db } from "@/lib/db/index";
import { hasPersonalDivergence } from "@/lib/dashboard/consistency";
```

- [ ] **Step 2: Ler o cache do ranking e o status de sync**

Dentro do componente `PersonalDashboard`, logo após `const localStats = useLiveQuery(() => getPersonalStats(userId), [userId]);`, adicionar:

```tsx
	const cacheEntry = useLiveQuery(
		() => db.leaderboardCache.get(userId),
		[userId]
	);
	const { isSyncing, pendingCount } = useSyncStatus();
```

Esses hooks ficam acima do early return `if (!stats) { ... }` — todos os hooks são chamados incondicionalmente.

- [ ] **Step 3: Calcular a divergência e renderizar o aviso**

Após o early return `if (!stats) { ... }` e antes do `const chartData = [...]`, adicionar:

```tsx
	const showDivergence =
		overrideStats == null &&
		hasPersonalDivergence({
			isSyncing,
			localTotal: stats.total,
			pendingCount,
			serverTotal: cacheEntry?.totalLeads ?? null,
		});
```

No JSX retornado, inserir o aviso logo após o `<div>` do grid de `StatCard`s (irmão do grid, dentro do `<div className="flex flex-col gap-4">`):

```tsx
			{showDivergence && (
				<p className="text-muted-foreground text-xs">
					Seus números podem estar incompletos — sincronize para atualizar.
				</p>
			)}
```

- [ ] **Step 4: Verificar tipos**

Run: `bun run check-types`
Expected: PASS

- [ ] **Step 5: Verificação manual**

Run: `bun run dev:web`, abrir `/dashboard`. Em estado normal, sem operações pendentes e contagens batendo, o aviso **não** aparece. Para confirmar a renderização, deletar um lead direto no banco (sem o device sincronizar) cria a divergência → após o próximo fetch do ranking o aviso aparece até o pull reconciliar.
Expected: o aviso só aparece quando local ≠ servidor em estado estável.

- [ ] **Step 6: Commit**

```bash
git add "apps/web/src/app/(app)/dashboard/personal-dashboard.tsx"
git commit -m "feat: aviso de divergência em Seus números"
```

---

## Task 8: Verificação final

**Files:** nenhum (apenas checagem).

- [ ] **Step 1: Suíte de testes completa**

Run: `bun run test`
Expected: PASS — todos os pacotes verdes, incluindo `sync.test.ts`, `engine.test.ts` e `consistency.test.ts`.

- [ ] **Step 2: Type-check**

Run: `bun run check-types`
Expected: PASS

- [ ] **Step 3: Lint/format**

Run: `bun run check`
Expected: PASS — sem violações do Ultracite/Biome.

- [ ] **Step 4: Smoke test manual**

Run: `bun run dev:web`, abrir `/dashboard`.
Expected:
- "Atualizado há X" abaixo do título Ranking.
- Falha simulada do ranking → "pode estar desatualizado · tentar de novo".
- Deleção remota de um lead reconcilia a contagem local após o próximo sync.

- [ ] **Step 5: Commit final (se algum ajuste de lint foi necessário)**

```bash
git add -A
git commit -m "chore: ajustes de verificação final"
```

(Pular este passo se nada mudou nos Steps 1–3.)

---

## Self-Review

**Cobertura da spec:**
- Item 1 (falha silenciosa do ranking) → Tasks 3, 4, 6. ✓
- Item 2 (frescor invisível) → Tasks 5 (`formatRelativeTime`), 6 (`RankingFreshness`). ✓
- Item 3 (divergência de contagem): causa raiz → Tasks 1, 2; aviso → Tasks 5 (`hasPersonalDivergence`), 7. ✓
- Plano de testes da spec → Tasks 1, 2, 3, 5 cobrem servidor, engine e helpers. ✓

**Consistência de tipos:** `leaderboardFailed: boolean` é introduzido em `syncCycle` (Task 3), propagado por `SyncEngineCallbacks.onSyncEnd` (Task 3) e consumido em `SyncStatus`/`SyncState` (Task 4) e no `dashboard.tsx` (Task 6) com o mesmo nome. `formatRelativeTime` e `hasPersonalDivergence` (Task 5) são consumidos com as mesmas assinaturas em `ranking-freshness.tsx` (Task 6) e `personal-dashboard.tsx` (Task 7). `DivergenceInput` usa as chaves `isSyncing`/`localTotal`/`pendingCount`/`serverTotal` de forma idêntica na definição e nas chamadas.

**Placeholders:** nenhum — todos os steps de código contêm o conteúdo completo.
