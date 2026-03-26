# Phase 2: Offline Infrastructure - Research

**Researched:** 2026-03-24
**Domain:** Dexie.js IndexedDB, custom sync engine, tRPC vanilla client, connectivity detection
**Confidence:** HIGH

## Summary

A fase 2 implementa a infraestrutura offline-first: schema de leads (Drizzle + Dexie), sync engine custom via tRPC vanilla client, conflict resolution server-wins, e connectivity detection com polling fallback para Safari. O projeto ja tem Dexie 4.3.0 e dexie-react-hooks 4.2.0 instalados em `apps/web`. O tRPC vanilla client (`createTRPCClient`) ja e usado no projeto — basta criar uma segunda instancia fora do React tree para o sync engine.

A abordagem recomendada e um sync engine singleton em `apps/web/src/lib/sync/engine.ts` que opera independente do React lifecycle, usando tRPC vanilla client para push/pull. O Dexie serve como storage primario no client com schema espelhando o server (leads + syncQueue). Conflict resolution e row-level server-wins via `updated_at`. Connectivity detection combina `navigator.onLine` events com polling HEAD request a cada 30s.

**Primary recommendation:** Implementar sync engine custom (nao usar Dexie Cloud nem dexie-syncable) com push-then-pull via tRPC vanilla client, exponential backoff para retry, e syncQueue table no Dexie para tracking de operacoes pendentes.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Campos conforme REQUIREMENTS: nome (obrigatorio), telefone, email, empresa, cargo, segmento (texto livre), notas (multi-line), tag de interesse (quente/morno/frio), foto. Sem campos extras.
- **D-02:** Contato: pelo menos telefone OU email obrigatorio (nao ambos). Validacao client-side impede salvar sem nenhum dos dois.
- **D-03:** IDs: UUID v4 gerado no client (local_id via crypto.randomUUID()), bigserial auto-increment no server (server_id). Dexie usa local_id como primary key. Postgres usa bigserial como PK com coluna local_id UUID unique.
- **D-04:** Timestamps: created_at, updated_at (automaticos), deleted_at (soft-delete). Sync usa updated_at para conflict resolution.
- **D-05:** Trigger: sync imediato ao reconectar. Sem acao do usuario. Retry com exponential backoff se falhar.
- **D-06:** Direcao: push-then-pull. Envia mudancas locais primeiro, depois busca atualizacoes do servidor.
- **D-07:** Engine: singleton em `apps/web/src/lib/sync/engine.ts`, fora do React tree. Usa tRPC vanilla client. Inicializado via lazy import em um provider React que chama startSync().
- **D-08:** Granularidade: row-level. Se server tem updated_at mais recente, a row inteira do server vence.
- **D-09:** Notificacao: toast discreto quando server overwrite acontecer. Nao bloqueia, apenas informa.
- **D-10:** Deteccao: Navigator.onLine + polling fallback a cada 30 segundos para Safari mobile.
- **D-11:** Sem indicador visual de conectividade nesta fase. O detector e interno, usado pelo sync engine.

### Claude's Discretion
- Dexie schema design — como estruturar indices, quais campos indexar para queries performaticas
- Sync queue implementation — estrutura da fila de operacoes pendentes no Dexie (syncQueue table)
- tRPC procedures para sync — quais procedures criar (pushChanges, pullChanges) e seus input schemas
- Error handling e retry strategy — detalhes do exponential backoff, max retries, timeout
- Foto handling no Dexie — como armazenar blob/base64 comprimido localmente

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| OFFL-01 | Schema de leads no Drizzle com soft-delete, timestamps, UUID client e server_id | Drizzle pgTable pattern existente em `packages/db/src/schema/auth.ts`; Dexie schema syntax researched |
| OFFL-02 | Dexie DB configurado com schema espelhado (leads, syncQueue) | Dexie 4 EntityTable TypeScript pattern; schema syntax (++, &, *, []) documented |
| OFFL-03 | Sync engine via tRPC vanilla client fora do React tree | tRPC 11 `createTRPCClient` com `httpBatchLink`; singleton pattern documented |
| OFFL-04 | Conflict resolution server-wins baseado em updated_at | Row-level comparison pattern; push-then-pull with server overwrite strategy |
| OFFL-05 | Sync automatico quando conexao detectada (polling fallback Safari) | Navigator.onLine + HEAD request polling pattern; Safari limitations documented |
| OFFL-06 | Dados locais preservados quando sync falha (ex: 401) | Error handling preserves Dexie data; syncQueue not cleared until server ACK |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Monorepo**: Turborepo 2.8, Bun 1.3
- **Runtime**: Next.js 16.2, React 19, TypeScript 5 strict
- **ORM**: Drizzle ORM 0.45, PostgreSQL (Supabase)
- **Auth**: Supabase Auth (OAuth — Google, Facebook, LinkedIn)
- **API**: tRPC 11 (type-safe RPC)
- **Formatter**: Biome 2.4 (tabs, double quotes)
- **Tests**: Vitest 3.2 com workspace
- **Commits**: Conventional Commits em Portugues
- **Imports**: `@dashboard-leads-profills/*` via workspace, sem barrel files
- **Env**: T3 Env + Zod validation; `apps/web/.env` nao versionado

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| dexie | 4.3.0 | IndexedDB wrapper para offline storage | Ja instalado; API limpa, TypeScript nativo, performance comprovada |
| dexie-react-hooks | 4.2.0 | React hooks reativos (useLiveQuery) | Ja instalado; reatividade automatica ao IndexedDB |
| @trpc/client | 11.15.0 (latest) | Vanilla client para sync engine | Ja instalado (catalog:); createTRPCClient fora do React tree |
| drizzle-orm | 0.45.1 | Schema de leads no PostgreSQL | Ja instalado; pattern existente no projeto |
| fake-indexeddb | 6.2.5 | Mock IndexedDB para testes Vitest | Standard para testar Dexie em Node.js |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | 2.0.7 | Toast para notificacao de conflito | Ja instalado; usado para feedback discreto de server overwrite |
| zod | 4.1.13 | Validacao de input nas tRPC procedures | Ja instalado; input schemas para pushChanges/pullChanges |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom sync engine | Dexie Cloud | SaaS pago; nao usa Supabase como backend; overkill para 10 vendedores |
| Custom sync engine | dexie-syncable | Deprecated em favor de Dexie Cloud; sem manutencao ativa |
| Custom sync engine | RxDB | Overhead de bundle; rewrite completo do data layer |
| Custom connectivity | is-online npm | Dependencia desnecessaria; HEAD request em 10 linhas resolve |

**Installation:**
```bash
bun add -D fake-indexeddb
```

Nota: dexie, dexie-react-hooks, @trpc/client, drizzle-orm, zod, sonner ja estao instalados.

## Architecture Patterns

### Recommended Project Structure
```
packages/db/src/schema/
├── auth.ts           # existente (user_roles, app_role enum)
├── leads.ts          # NOVO: pgTable leads, interestTag enum
└── index.ts          # re-export schemas

packages/api/src/routers/
├── index.ts          # existente (appRouter)
├── todo.ts           # existente (exemplo)
└── sync.ts           # NOVO: pushChanges, pullChanges procedures

apps/web/src/lib/
├── supabase/         # existente
│   ├── client.ts
│   ├── server.ts
│   └── proxy.ts
├── sync/             # NOVO
│   ├── engine.ts     # sync engine singleton
│   ├── connectivity.ts  # connectivity detector
│   └── constants.ts  # sync config constants
└── db/               # NOVO
    ├── index.ts      # Dexie database instance + schema
    └── types.ts      # TypeScript interfaces para leads (shared)
```

### Pattern 1: Dexie Database com TypeScript (EntityTable)
**What:** Definir database Dexie tipado com EntityTable para type-safety completa.
**When to use:** Sempre que criar tabelas Dexie.
**Example:**
```typescript
// apps/web/src/lib/db/index.ts
import Dexie, { type EntityTable } from "dexie";

interface Lead {
	localId: string;          // UUID v4 (primary key no Dexie)
	serverId: number | null;  // bigserial do Postgres (null ate sync)
	name: string;
	phone: string | null;
	email: string | null;
	company: string | null;
	position: string | null;
	segment: string | null;
	notes: string | null;
	interestTag: "quente" | "morno" | "frio";
	photo: Blob | null;
	createdAt: string;        // ISO 8601
	updatedAt: string;        // ISO 8601
	deletedAt: string | null; // soft-delete
	syncStatus: "pending" | "synced" | "conflict";
	userId: string;           // Supabase user UUID
}

interface SyncQueueItem {
	id?: number;              // auto-increment
	localId: string;          // referencia ao lead
	operation: "create" | "update" | "delete";
	timestamp: string;        // ISO 8601
	payload: string;          // JSON serializado do diff
	retryCount: number;
}

const db = new Dexie("dashboard-leads") as Dexie & {
	leads: EntityTable<Lead, "localId">;
	syncQueue: EntityTable<SyncQueueItem, "id">;
};

db.version(1).stores({
	leads: "localId, serverId, userId, interestTag, syncStatus, createdAt, updatedAt",
	syncQueue: "++id, localId, operation, timestamp",
});

export type { Lead, SyncQueueItem };
export { db };
```
**Source:** [Dexie TypeScript docs](https://dexie.org/docs/Typescript)

### Pattern 2: tRPC Vanilla Client Singleton (Sync Engine)
**What:** Instancia separada de tRPC client fora do React tree para o sync engine.
**When to use:** Operacoes de sync que rodam independente de componentes React.
**Example:**
```typescript
// apps/web/src/lib/sync/engine.ts
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@dashboard-leads-profills/api/routers/index";
import { createClient } from "@/lib/supabase/client";
import { db } from "@/lib/db";

const syncClient = createTRPCClient<AppRouter>({
	links: [
		httpBatchLink({
			url: "/api/trpc",
			async headers() {
				const supabase = createClient();
				const { data } = await supabase.auth.getSession();
				return {
					authorization: data.session
						? `Bearer ${data.session.access_token}`
						: "",
				};
			},
			fetch(url, options) {
				return fetch(url, { ...options, credentials: "include" });
			},
		}),
	],
});
```
**Source:** [tRPC vanilla client setup](https://trpc.io/docs/client/vanilla/setup)

**Nota importante:** O tRPC context atual em `packages/api/src/context.ts` usa cookies via `NextRequest`. O sync engine no browser tambem usa cookies (credentials: "include"), entao o tRPC server-side context continua funcionando normalmente. NAO precisa de Authorization header separado — as cookies do Supabase Auth ja sao enviadas com `credentials: "include"`.

### Pattern 3: Push-Then-Pull Sync
**What:** Enviar mudancas locais para o servidor antes de buscar atualizacoes.
**When to use:** Toda operacao de sync.
**Example:**
```typescript
// Dentro de engine.ts
async function syncCycle(): Promise<SyncResult> {
	// 1. Push: enviar operacoes pendentes
	const pendingOps = await db.syncQueue
		.orderBy("timestamp")
		.toArray();

	if (pendingOps.length > 0) {
		const result = await syncClient.sync.pushChanges.mutate({
			operations: pendingOps.map(op => ({
				localId: op.localId,
				operation: op.operation,
				payload: JSON.parse(op.payload),
				clientTimestamp: op.timestamp,
			})),
		});
		// Limpar syncQueue apenas para operacoes ACK'd
		await db.syncQueue.bulkDelete(
			result.acknowledged.map(ack => ack.queueId)
		);
		// Atualizar server_id nos leads criados
		for (const mapping of result.idMappings) {
			await db.leads.update(mapping.localId, {
				serverId: mapping.serverId,
				syncStatus: "synced",
			});
		}
	}

	// 2. Pull: buscar atualizacoes do servidor
	const lastSync = localStorage.getItem("lastSyncTimestamp") ?? "1970-01-01T00:00:00Z";
	const serverChanges = await syncClient.sync.pullChanges.query({
		since: lastSync,
	});

	let conflictCount = 0;
	for (const change of serverChanges.leads) {
		const local = await db.leads.get(change.localId);
		if (local && local.updatedAt > change.updatedAt) {
			// Local e mais recente — manter local (reenviara no proximo push)
			continue;
		}
		// Server wins — aplicar mudanca
		if (local) conflictCount++;
		await db.leads.put({ ...change, syncStatus: "synced" });
	}

	localStorage.setItem("lastSyncTimestamp", serverChanges.serverTimestamp);
	return { pushed: pendingOps.length, pulled: serverChanges.leads.length, conflicts: conflictCount };
}
```

### Pattern 4: Connectivity Detector
**What:** Deteccao confiavel combinando navigator.onLine + polling.
**When to use:** Trigger do sync engine.
**Example:**
```typescript
// apps/web/src/lib/sync/connectivity.ts
type ConnectivityListener = (online: boolean) => void;

function createConnectivityDetector(pollIntervalMs = 30_000) {
	let isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
	const listeners = new Set<ConnectivityListener>();
	let pollTimerId: ReturnType<typeof setInterval> | null = null;

	async function checkConnectivity(): Promise<boolean> {
		try {
			const response = await fetch(
				`/api/trpc/healthCheck?t=${Date.now()}`,
				{ method: "HEAD", cache: "no-store" }
			);
			return response.ok;
		} catch {
			return false;
		}
	}

	function notify(online: boolean) {
		if (online !== isOnline) {
			isOnline = online;
			for (const listener of listeners) {
				listener(online);
			}
		}
	}

	function start() {
		window.addEventListener("online", () => notify(true));
		window.addEventListener("offline", () => notify(false));
		// Polling fallback (Safari mobile nao dispara online/offline de forma confiavel)
		pollTimerId = setInterval(async () => {
			const result = await checkConnectivity();
			notify(result);
		}, pollIntervalMs);
	}

	function stop() {
		if (pollTimerId) clearInterval(pollTimerId);
		listeners.clear();
	}

	return { start, stop, subscribe: (fn: ConnectivityListener) => { listeners.add(fn); return () => listeners.delete(fn); }, get isOnline() { return isOnline; } };
}

export { createConnectivityDetector };
```

### Anti-Patterns to Avoid
- **Sync dentro de useEffect:** O sync engine deve ser um singleton fora do React tree. useEffect tem cleanup issues com StrictMode e re-renders.
- **Confiar apenas em navigator.onLine:** Retorna true quando conectado a LAN sem internet (Chrome/Safari). Sempre combinar com polling real.
- **Limpar syncQueue antes do ACK do servidor:** Se a rede cair entre envio e ACK, dados seriam perdidos. Limpar apenas apos confirmacao.
- **Armazenar fotos como base64 string no Dexie:** Usa ~33% mais espaco que Blob. Dexie suporta Blob nativo no IndexedDB.
- **Usar auto-increment do Dexie como ID global:** UUIDs gerados no client sao o identificador correto para offline-first.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IndexedDB access | API nativa do IndexedDB | Dexie 4 | IndexedDB API e complexa com versioning, transactions, cursor iteration |
| React state from IndexedDB | useEffect + useState manual | dexie-react-hooks useLiveQuery | Reatividade automatica sem boilerplate |
| UUID generation | Math.random UUID | crypto.randomUUID() | Browser nativo, criptograficamente seguro, disponivel em todos browsers target |
| Exponential backoff | Loop com setTimeout | Pattern simples inline (ver abaixo) | Nao justifica dependencia; ~15 linhas de codigo |
| IndexedDB mock para testes | Custom mock | fake-indexeddb | Implementacao completa da spec IndexedDB em memoria |

**Key insight:** O sync engine e custom por necessidade (Dexie Cloud e SaaS, dexie-syncable deprecated), mas as pecas individuais (Dexie, tRPC, connectivity) sao todas bibliotecas existentes. A unica logica "custom" real e a orquestracao push-then-pull com conflict resolution.

## Common Pitfalls

### Pitfall 1: Safari 7-Day IndexedDB Eviction
**What goes wrong:** Safari evicciona IndexedDB apos 7 dias sem interacao do usuario com o site.
**Why it happens:** Politica anti-tracking do WebKit desde iOS 13.4/Safari 13.1.
**How to avoid:** Esta politica NAO se aplica a PWAs adicionadas a home screen. Para browser normal, o sync automatico garante que dados nao sao perdidos (estao no servidor). Documentar como limitacao conhecida.
**Warning signs:** Dados locais desaparecem misteriosamente em Safari apos uma semana.

### Pitfall 2: Sync Loop Infinito
**What goes wrong:** Push envia dados, pull recebe os mesmos dados de volta, marca como "dirty", triggera novo push.
**Why it happens:** Falta de tracking de sincronizacao bidirecional.
**How to avoid:** Usar `syncStatus` no lead e `lastSyncTimestamp` no pull. Pull so busca dados com `updated_at > lastSyncTimestamp`. Push so envia leads com `syncStatus === "pending"`.
**Warning signs:** Network tab mostra requests de sync repetidos rapidamente.

### Pitfall 3: Race Condition no Sync Engine
**What goes wrong:** Dois sync cycles rodam simultaneamente, causando duplicacao ou perda de dados.
**Why it happens:** Reconnect + polling podem triggerar sync ao mesmo tempo.
**How to avoid:** Mutex simples no sync engine — se `isSyncing === true`, skip o ciclo. Usar flag atomica.
**Warning signs:** Leads duplicados no servidor apos reconexao.

### Pitfall 4: Token Expirado Durante Sync
**What goes wrong:** Sync inicia com token valido, mas o token expira durante um batch grande.
**Why it happens:** Access tokens Supabase sao short-lived (1 hora default).
**How to avoid:** Catch 401 no sync engine, nao limpar syncQueue, parar sync. Supabase client refresh automatico resolve na proxima tentativa. Dados locais ficam preservados (OFFL-06).
**Warning signs:** Sync falha com 401 e dados locais desaparecem.

### Pitfall 5: Blob Storage Quota no Mobile
**What goes wrong:** QuotaExceededError ao salvar muitas fotos no Dexie/IndexedDB.
**Why it happens:** Mobile Safari aloca ~50MB para browser (1GB para PWA na home screen). Fotos raw consomem rapido.
**How to avoid:** Comprimir fotos antes de armazenar (CAPT-05 define max 1280px, JPEG 0.7). Monitorar uso com `navigator.storage.estimate()`. Photo handling detalhado sera implementado na Phase 3.
**Warning signs:** Erro ao salvar lead com foto em dispositivo com pouco armazenamento.

### Pitfall 6: Dexie Version Upgrade sem Migracao
**What goes wrong:** Alterar schema sem incrementar versao causa erro ou perda de dados.
**Why it happens:** IndexedDB exige version bump explicito para schema changes.
**How to avoid:** Sempre incrementar `db.version(N)` ao adicionar/alterar tabelas ou indices. Dexie faz upgrade automatico.
**Warning signs:** Console error "UpgradeError" ou "VersionError" no browser.

## Code Examples

### Drizzle Schema para Leads (PostgreSQL)
```typescript
// packages/db/src/schema/leads.ts
import {
	bigserial,
	index,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

export const interestTagEnum = pgEnum("interest_tag", [
	"quente",
	"morno",
	"frio",
]);

export const leads = pgTable(
	"leads",
	{
		id: bigserial("id", { mode: "bigint" }).primaryKey(),
		localId: uuid("local_id").notNull().unique(),
		userId: uuid("user_id").notNull(),
		name: text("name").notNull(),
		phone: text("phone"),
		email: text("email"),
		company: text("company"),
		position: text("position"),
		segment: text("segment"),
		notes: text("notes"),
		interestTag: interestTagEnum("interest_tag").notNull(),
		photoUrl: text("photo_url"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(table) => [
		index("leads_user_id_idx").on(table.userId),
		index("leads_interest_tag_idx").on(table.interestTag),
		index("leads_updated_at_idx").on(table.updatedAt),
	]
);
```

### tRPC Sync Procedures
```typescript
// packages/api/src/routers/sync.ts
import { z } from "zod/v4";
import { protectedProcedure, router } from "../index";
import { db } from "@dashboard-leads-profills/db";
import { leads } from "@dashboard-leads-profills/db/schema/leads";
import { eq, gt, and, isNull } from "drizzle-orm";

const pushOperationSchema = z.object({
	localId: z.string().uuid(),
	operation: z.enum(["create", "update", "delete"]),
	payload: z.record(z.unknown()),
	clientTimestamp: z.string(),
});

export const syncRouter = router({
	pushChanges: protectedProcedure
		.input(z.object({ operations: z.array(pushOperationSchema) }))
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.user.sub as string;
			const acknowledged: Array<{ localId: string; queueId: number }> = [];
			const idMappings: Array<{ localId: string; serverId: number }> = [];

			for (const op of input.operations) {
				// Verificar que o lead pertence ao usuario
				if (op.operation === "create") {
					const [inserted] = await db
						.insert(leads)
						.values({ ...op.payload, localId: op.localId, userId })
						.onConflictDoUpdate({
							target: leads.localId,
							set: { ...op.payload, updatedAt: new Date() },
						})
						.returning({ id: leads.id });
					if (inserted) {
						idMappings.push({
							localId: op.localId,
							serverId: Number(inserted.id),
						});
					}
				}
				// update e delete seguem pattern similar
				acknowledged.push({ localId: op.localId, queueId: 0 });
			}

			return { acknowledged, idMappings };
		}),

	pullChanges: protectedProcedure
		.input(z.object({ since: z.string() }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.user.sub as string;
			const since = new Date(input.since);

			const changes = await db
				.select()
				.from(leads)
				.where(
					and(
						eq(leads.userId, userId),
						gt(leads.updatedAt, since)
					)
				);

			return {
				leads: changes,
				serverTimestamp: new Date().toISOString(),
			};
		}),
});
```

### Exponential Backoff (inline, sem dependencia)
```typescript
// apps/web/src/lib/sync/engine.ts (parte do sync engine)
const SYNC_CONFIG = {
	maxRetries: 5,
	baseDelayMs: 1000,
	maxDelayMs: 30_000,
} as const;

function getBackoffDelay(retryCount: number): number {
	const delay = SYNC_CONFIG.baseDelayMs * 2 ** retryCount;
	const jitter = Math.random() * SYNC_CONFIG.baseDelayMs;
	return Math.min(delay + jitter, SYNC_CONFIG.maxDelayMs);
}
```

### Inicializacao do Sync Engine no Provider
```typescript
// apps/web/src/components/providers.tsx (adicao)
import { useEffect } from "react";

function SyncInitializer() {
	useEffect(() => {
		let cleanup: (() => void) | undefined;

		async function init() {
			const { startSync } = await import("@/lib/sync/engine");
			cleanup = startSync();
		}

		init();
		return () => cleanup?.();
	}, []);

	return null;
}

// Dentro do Providers component, adicionar:
// <SyncInitializer />
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| dexie-syncable addon | Custom sync ou Dexie Cloud | Dexie 4 (2023) | dexie-syncable sem manutencao; Dexie Cloud e SaaS pago |
| createTRPCProxyClient | createTRPCClient | tRPC v11 (2024) | Renamed; mesma funcionalidade |
| navigator.onLine unico | onLine + polling fallback | Sempre (Safari bug) | Safari retorna true mesmo sem internet real |
| base64 strings para imagens | Blob nativo no IndexedDB | IndexedDB v2 (2018+) | 33% menos espaco; todos browsers modernos suportam |

**Deprecated/outdated:**
- `dexie-syncable`: Sem manutencao, substituido por Dexie Cloud. NAO usar.
- `dexie-observable`: Substituido por liveQuery nativo do Dexie 4.
- `createTRPCProxyClient`: Renomeado para `createTRPCClient` no tRPC v11.

## Open Questions

1. **Fotos: Blob vs referencia no Dexie**
   - What we know: Dexie suporta Blob nativo. CAPT-05 exige compressao (1280px, JPEG 0.7). CAPT-06 exige sync para Supabase Storage.
   - What's unclear: Nesta fase armazenamos Blob placeholder ou so a estrutura? Phase 3 (Lead Capture) implementa foto.
   - Recommendation: Nesta fase, definir o campo `photo: Blob | null` no Dexie schema e `photoUrl: text | null` no Drizzle. A logica de compressao e upload para Storage fica na Phase 3. O sync engine nesta fase ignora o campo photo (sync de texto/metadata apenas).

2. **Soft-delete no pull: incluir ou excluir?**
   - What we know: Pull busca `updated_at > since`. Leads soft-deleted tem `deleted_at` preenchido.
   - What's unclear: O pull deve trazer leads deleted para que o client saiba remover localmente?
   - Recommendation: Sim. Pull retorna leads com `deleted_at` preenchido. O client marca localmente como deleted (nao remove do Dexie, apenas seta `deletedAt`). Isso garante que deletes do servidor propagam para todos os clients.

3. **Admin sync: admin ve leads de todos?**
   - What we know: Phase 6 (Admin) precisa ver todos os leads.
   - What's unclear: O sync engine filtra por userId. Admin precisara de pull diferente?
   - Recommendation: Nesta fase, sync e sempre filtrado por userId (vendedor ve seus leads). Admin pull sera implementado na Phase 6 com procedure separada.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.1 |
| Config file | `vitest.workspace.ts` (root), `vitest.config.ts` (per package) |
| Quick run command | `bun run test` |
| Full suite command | `bun run test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| OFFL-01 | Drizzle schema leads com campos corretos | unit | `bun vitest run packages/db/src/schema/leads.test.ts -x` | Wave 0 |
| OFFL-02 | Dexie DB com leads e syncQueue tables | unit | `bun vitest run apps/web/src/lib/db/index.test.ts -x` | Wave 0 |
| OFFL-03 | Sync engine push/pull via tRPC | unit + integration | `bun vitest run apps/web/src/lib/sync/engine.test.ts -x` | Wave 0 |
| OFFL-04 | Conflict resolution server-wins | unit | `bun vitest run apps/web/src/lib/sync/engine.test.ts -x` (test case especifico) | Wave 0 |
| OFFL-05 | Connectivity detector com polling | unit | `bun vitest run apps/web/src/lib/sync/connectivity.test.ts -x` | Wave 0 |
| OFFL-06 | Dados preservados em falha de sync | unit | `bun vitest run apps/web/src/lib/sync/engine.test.ts -x` (test case especifico) | Wave 0 |

### Sampling Rate
- **Per task commit:** `bun run test`
- **Per wave merge:** `bun run test && bun run check-types`
- **Phase gate:** Full suite green + `bun run check` before verify

### Wave 0 Gaps
- [ ] `fake-indexeddb` — instalar como devDependency (`bun add -D fake-indexeddb`)
- [ ] `apps/web/vitest.config.ts` — criar config para testes no app web (environment: jsdom, setupFiles com fake-indexeddb/auto)
- [ ] Atualizar `vitest.workspace.ts` para incluir `apps/web`
- [ ] `apps/web/src/lib/db/index.test.ts` — testes do Dexie schema
- [ ] `apps/web/src/lib/sync/engine.test.ts` — testes do sync engine (mock do tRPC client)
- [ ] `apps/web/src/lib/sync/connectivity.test.ts` — testes do connectivity detector
- [ ] `packages/api/src/routers/sync.test.ts` — testes das procedures pushChanges/pullChanges

## Sources

### Primary (HIGH confidence)
- [tRPC vanilla client setup](https://trpc.io/docs/client/vanilla/setup) — createTRPCClient, httpBatchLink config
- [Dexie TypeScript docs](https://dexie.org/docs/Typescript) — EntityTable, schema declaration, version management
- [Dexie.js](https://dexie.org/) — schema syntax (++, &, *, []), version upgrades
- Codebase existente — `packages/api/src/context.ts`, `packages/api/src/index.ts`, `apps/web/src/utils/trpc.ts`

### Secondary (MEDIUM confidence)
- [MDN Navigator.onLine](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine) — Safari/Chrome limitations documented
- [MDN Storage quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) — IndexedDB limits per browser
- [WebKit storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/) — Safari 17+ quota changes, 7-day eviction
- [fake-indexeddb npm](https://www.npmjs.com/package/fake-indexeddb) — Vitest + Dexie testing setup

### Tertiary (LOW confidence)
- [Dexie sync patterns (StudyRaid)](https://app.studyraid.com/en/read/11356/355148/synchronization-patterns) — general sync patterns (not official)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — todas as libs ja instaladas no projeto, versoes verificadas via npm registry
- Architecture: HIGH — patterns derivados de codigo existente no projeto + docs oficiais
- Pitfalls: MEDIUM — Safari eviction e quota limits verificados em MDN/WebKit; sync race conditions sao patterns conhecidos
- Sync engine: MEDIUM — custom implementation; patterns validados mas sem producao reference neste projeto

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (30 dias — stack estavel, sem breaking changes iminentes)
