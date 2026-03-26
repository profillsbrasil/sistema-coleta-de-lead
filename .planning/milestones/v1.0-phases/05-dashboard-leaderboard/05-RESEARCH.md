# Phase 5: Dashboard & Leaderboard - Research

**Researched:** 2026-03-25
**Domain:** Dashboard UI com dados offline (Dexie) + aggregation server-side (Drizzle/PostgreSQL) + charting (Recharts)
**Confidence:** HIGH

## Summary

Esta fase envolve expandir a pagina `/dashboard` existente com duas tabs: dashboard pessoal (dados locais Dexie) e leaderboard (dados cross-user via tRPC + cache Dexie). O dashboard pessoal usa `useLiveQuery` para stats reativos do Dexie local -- sem network, sem latencia. O leaderboard requer uma nova tRPC procedure que agrega leads por userId no PostgreSQL com score ponderado, e um cache local `leaderboardCache` no Dexie para acesso offline.

A stack esta completa: Recharts 3.8.0 ja instalado no `packages/ui`, shadcn Chart/Tabs/Card/Skeleton ja disponiveis, Dexie 4.3.0 com `fake-indexeddb` no test setup. O trabalho principal e: (1) query de agregacao SQL, (2) nova Dexie table com version bump, (3) componentes de UI seguindo o UI-SPEC aprovado, (4) integracao do leaderboard fetch no sync cycle.

**Primary recommendation:** Usar Dexie `useLiveQuery` para dashboard pessoal (zero network) e tRPC `protectedProcedure` com SQL aggregation (`COUNT` + `SUM CASE`) para leaderboard server-side, cachear resultado no Dexie `leaderboardCache`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Stat cards no topo: Total Leads, Quentes, Mornos, Frios. Abaixo: card com leads de hoje e score pessoal ponderado.
- **D-02:** Grafico de barras mostrando distribuicao por tag (quente/morno/frio). Precisa de lib de graficos leve.
- **D-03:** Score ponderado: quente=3, morno=2, frio=1 (ja decidido no PROJECT.md).
- **D-04:** Dados vem do Dexie local (leads do vendedor logado). Sempre frescos, sem necessidade de network.
- **D-05:** Lista rankeada com cards. Cada card: posicao (#1, #2...), nome do vendedor, total leads, score ponderado.
- **D-06:** Vendedor logado tem card destacado (cor de accent/primary). Sempre visivel mesmo que nao esteja no topo.
- **D-07:** Ordenado por score ponderado desc. Em caso de empate, desempata por quantidade total.
- **D-08:** Dados vem de tRPC procedure que retorna ranking de todos vendedores (query server-side que agrega por userId).
- **D-09:** Dexie table dedicada `leaderboardCache` para cache do leaderboard offline. Quando online, tRPC busca ranking e grava no Dexie. Offline, mostra cache.
- **D-10:** Indicador de staleness: timestamp da ultima sync do leaderboard. Mostra "Atualizado ha X min" no topo do leaderboard.
- **D-11:** Dashboard pessoal nao precisa de staleness -- dados sao do Dexie local, sempre atuais.
- **D-12:** Pagina unica `/dashboard` com duas tabs: "Meu Dashboard" e "Leaderboard". Dashboard e a home apos login.
- **D-13:** `/dashboard` ja existe (Phase 1 criou). Reutilizar e expandir.

### Claude's Discretion
- Biblioteca de graficos -- recharts, chart.js, ou outra. Claude escolhe baseado em bundle size, SSR compatibility, e simplicidade.
- Dexie schema update -- como adicionar leaderboardCache table sem quebrar versao existente.
- tRPC procedure de leaderboard -- como agregar leads por vendedor com score ponderado no SQL.
- Tabs implementation -- shadcn Tabs ou custom toggle. Claude decide.
- Stat card design -- layout exato dos cards de stats. Claude segue UI-SPEC se existir.

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DASH-01 | Vendedor ve dashboard pessoal com total de leads coletados | `useLiveQuery` no Dexie com count por userId, sem network |
| DASH-02 | Dashboard mostra breakdown por tag (quente, morno, frio) | `useLiveQuery` com filter por interestTag, stat cards + bar chart Recharts |
| DASH-03 | Dashboard mostra leads coletados hoje | Filter Dexie por `createdAt >= startOfToday()`, stat card "Leads Hoje" |
| DASH-04 | Leaderboard comparativo de todos vendedores (quantidade + score ponderado) | tRPC procedure com SQL aggregation (`GROUP BY userId`, `COUNT`, `SUM CASE`) |
| DASH-05 | Score ponderado: quente=3, morno=2, frio=1 | SQL `SUM(CASE WHEN interest_tag='quente' THEN 3 ...)`; client-side para dashboard pessoal |
| DASH-06 | Leaderboard funciona offline com dados da ultima sincronizacao | Dexie `leaderboardCache` table com version bump; staleness indicator |
| DASH-07 | Dashboard e leaderboard acessiveis offline via cache no Dexie | Dashboard: Dexie local (sempre offline). Leaderboard: `leaderboardCache` Dexie table |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Recharts | 3.8.0 | Bar chart para distribuicao por tag | Ja instalado no `packages/ui`, shadcn `chart.tsx` wrappa Recharts com ChartContainer/ChartTooltip |
| Dexie | 4.3.0 | Storage offline + live queries | Ja em uso no projeto, `useLiveQuery` para reatividade |
| dexie-react-hooks | 4.2.0 | `useLiveQuery` hook | Ja em uso no projeto |
| Drizzle ORM | 0.45.1 | SQL aggregation para leaderboard | Ja em uso, suporta `sql` template tag para raw SQL |
| tRPC | 11.13.4 | RPC type-safe para leaderboard data | Ja em uso, `protectedProcedure` para auth |
| shadcn/ui | base-nova | Card, Tabs, Skeleton, Chart components | Ja instalados no `packages/ui` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Lucide React | 1.6.0 | Icone Clock para staleness indicator | Ja instalado |
| TanStack React Query | 5.90.12 | Cache/fetch do leaderboard via tRPC | Ja em uso para tRPC queries |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | Chart.js / Nivo | Recharts ja instalado e wrappado pelo shadcn Chart -- zero setup adicional |
| shadcn Tabs | Custom toggle buttons | Tabs ja tem a11y built-in (keyboard nav, ARIA), implementacao custom seria retrabalho |

**Discretion Resolution:**
- **Charting:** Usar Recharts 3.8.0 (ja instalado). shadcn `chart.tsx` fornece `ChartContainer`, `ChartTooltip`, `ChartTooltipContent` que wrappam Recharts. Zero dependencia nova.
- **Tabs:** Usar shadcn Tabs (Base UI React primitives). A11y built-in, ja instalado.

## Architecture Patterns

### Recommended Project Structure

```
apps/web/src/
├── app/dashboard/
│   ├── page.tsx                    # Server component (auth guard, expandir)
│   ├── dashboard.tsx               # Client component (Tabs container, expandir)
│   ├── personal-dashboard.tsx      # Tab "Meu Dashboard" (useLiveQuery)
│   └── leaderboard-tab.tsx         # Tab "Leaderboard" (React Query + Dexie cache)
├── components/
│   ├── stat-card.tsx               # Stat card reutilizavel
│   ├── leaderboard-entry.tsx       # Card de ranking
│   └── staleness-indicator.tsx     # "Atualizado ha X min"
├── lib/
│   ├── db/
│   │   ├── index.ts                # Dexie DB (adicionar leaderboardCache, version 2)
│   │   └── types.ts                # Adicionar LeaderboardEntry interface
│   ├── lead/
│   │   ├── queries.ts              # Reutilizar para stats pessoais
│   │   ├── stats.ts                # NOVO: funcoes de calculo de stats (count por tag, score, hoje)
│   │   └── relative-time.ts        # Reutilizar para staleness
│   └── sync/
│       └── engine.ts               # Integrar leaderboard fetch apos pullChanges
packages/api/src/routers/
├── index.ts                        # Adicionar leaderboardRouter
└── leaderboard.ts                  # NOVO: procedure getRanking
```

### Pattern 1: Dashboard Pessoal via useLiveQuery

**What:** Todos os stats do dashboard pessoal vem do Dexie local, reativos via `useLiveQuery`.
**When to use:** Quando os dados pertencem ao vendedor logado e ja estao no Dexie.
**Example:**

```typescript
// apps/web/src/lib/lead/stats.ts
import { db } from "../db/index";

export interface PersonalStats {
  total: number;
  quente: number;
  morno: number;
  frio: number;
  hoje: number;
  score: number;
}

export async function getPersonalStats(userId: string): Promise<PersonalStats> {
  const leads = await db.leads
    .where("userId")
    .equals(userId)
    .filter((lead) => lead.deletedAt === null)
    .toArray();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const quente = leads.filter((l) => l.interestTag === "quente").length;
  const morno = leads.filter((l) => l.interestTag === "morno").length;
  const frio = leads.filter((l) => l.interestTag === "frio").length;

  return {
    total: leads.length,
    quente,
    morno,
    frio,
    hoje: leads.filter((l) => l.createdAt >= todayIso).length,
    score: quente * 3 + morno * 2 + frio * 1,
  };
}
```

```typescript
// apps/web/src/app/dashboard/personal-dashboard.tsx
"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { getPersonalStats } from "@/lib/lead/stats";

export default function PersonalDashboard({ userId }: { userId: string }) {
  const stats = useLiveQuery(() => getPersonalStats(userId), [userId]);
  // render stat cards + chart com stats
}
```

### Pattern 2: Leaderboard via tRPC + Dexie Cache

**What:** Leaderboard busca dados cross-user via tRPC, cacheia no Dexie para offline.
**When to use:** Dados de outros vendedores que o client nao tem localmente.
**Example:**

```typescript
// packages/api/src/routers/leaderboard.ts
import { db } from "@dashboard-leads-profills/db";
import { leads } from "@dashboard-leads-profills/db/schema/leads";
import { sql, eq, isNull } from "drizzle-orm";
import { protectedProcedure, router } from "../index";

export const leaderboardRouter = router({
  getRanking: protectedProcedure.query(async () => {
    const result = await db
      .select({
        userId: leads.userId,
        totalLeads: sql<number>`count(*)::int`,
        score: sql<number>`sum(case
          when ${leads.interestTag} = 'quente' then 3
          when ${leads.interestTag} = 'morno' then 2
          when ${leads.interestTag} = 'frio' then 1
          else 0
        end)::int`,
      })
      .from(leads)
      .where(isNull(leads.deletedAt))
      .groupBy(leads.userId)
      .orderBy(
        sql`sum(case when ${leads.interestTag} = 'quente' then 3 when ${leads.interestTag} = 'morno' then 2 else 1 end) desc`,
        sql`count(*) desc`
      );

    return { ranking: result, serverTimestamp: new Date().toISOString() };
  }),
});
```

### Pattern 3: Dexie Version Bump para nova table

**What:** Adicionar `leaderboardCache` table requer incrementar a versao do Dexie.
**When to use:** Sempre que o schema do Dexie muda.
**Example:**

```typescript
// apps/web/src/lib/db/index.ts
import Dexie, { type EntityTable } from "dexie";
import type { Lead, LeaderboardEntry, SyncQueueItem } from "./types";

const db = new Dexie("dashboard-leads") as Dexie & {
  leads: EntityTable<Lead, "localId">;
  syncQueue: EntityTable<SyncQueueItem, "id">;
  leaderboardCache: EntityTable<LeaderboardEntry, "userId">;
};

db.version(1).stores({
  leads: "localId, serverId, userId, interestTag, syncStatus, createdAt, updatedAt",
  syncQueue: "++id, localId, operation, timestamp",
});

db.version(2).stores({
  leads: "localId, serverId, userId, interestTag, syncStatus, createdAt, updatedAt",
  syncQueue: "++id, localId, operation, timestamp",
  leaderboardCache: "userId",
});

export type { Lead, LeaderboardEntry, SyncQueueItem };
export { db };
```

### Anti-Patterns to Avoid

- **Buscar leaderboard no client via Dexie local:** O client so tem leads do proprio vendedor. Leaderboard requer dados cross-user, obrigatoriamente server-side.
- **Polling frequente do leaderboard:** Nao fazer polling independente. Integrar fetch no sync cycle (apos pullChanges).
- **useLiveQuery para leaderboard:** `leaderboardCache` nao muda com frequencia. Usar `useLiveQuery` para ler cache e React Query para trigger de fetch.
- **SQL injection via template literals:** Usar `sql` template tag do Drizzle, nunca string interpolation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bar chart | Custom SVG/Canvas chart | Recharts `BarChart` via shadcn `ChartContainer` | Responsividade, tooltips, dark mode, a11y |
| Tab navigation | Custom toggle com state | shadcn `Tabs` (Base UI primitives) | ARIA keyboard nav, focus management built-in |
| Relative time | Custom interval/polling | `relativeTime()` existente em `lib/lead/relative-time.ts` | Ja implementado e testado na Phase 4 |
| Score calculation | Custom calculation in multiple places | Single `calculateScore()` function | DRY -- usado no dashboard pessoal E na query SQL |

**Key insight:** shadcn Chart wrappa Recharts com theming automatico (dark mode, CSS vars). Usar `ChartContainer` + `ChartConfig` evita configuracao manual de cores.

## Common Pitfalls

### Pitfall 1: Dexie version bump sem repetir stores existentes

**What goes wrong:** Ao adicionar version(2), se nao repetir todas as stores do version(1), Dexie remove as stores omitidas.
**Why it happens:** Dexie interpreta cada version como o schema completo naquela versao.
**How to avoid:** SEMPRE repetir todas as stores nas versions anteriores e novas.
**Warning signs:** Dados de leads desaparecem apos deploy da version 2.

### Pitfall 2: User name no leaderboard -- Supabase `auth.users` nao esta no schema Drizzle

**What goes wrong:** A query de leaderboard retorna `userId` mas precisa do nome do vendedor. A tabela `auth.users` do Supabase nao esta no schema Drizzle e fazer JOIN direto e complexo.
**Why it happens:** Supabase gerencia `auth.users` no schema `auth`, separado do `public` schema onde o Drizzle opera.
**How to avoid:** Duas opcoes viáveis:
1. **Raw SQL** com `sql` template tag do Drizzle para fazer `LEFT JOIN auth.users ON ...` e extrair `raw_user_meta_data->>'full_name'`. Funcional mas acopla ao schema interno do Supabase.
2. **Supabase Admin API** (`supabase.auth.admin.listUsers()`) para buscar nomes separadamente e juntar no application layer. Requer `service_role` key.
3. **(Recomendado) Buscar nomes no client** via mapping: o server retorna `userId`, o client complementa com nome. Para o vendedor logado, ja tem `user_metadata.full_name`. Para os demais, cachear nomes no `leaderboardCache` (server retorna userId + nome na procedure).

**Solucao pragmatica:** Usar raw SQL no Drizzle para JOIN com `auth.users` e extrair `full_name` do `raw_user_meta_data` JSONB. Equipe pequena (~10 vendedores), query simples.

```sql
SELECT
  l.user_id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email) AS name,
  COUNT(*)::int AS total_leads,
  SUM(CASE WHEN l.interest_tag = 'quente' THEN 3
           WHEN l.interest_tag = 'morno' THEN 2
           ELSE 1 END)::int AS score
FROM leads l
LEFT JOIN auth.users u ON u.id = l.user_id
WHERE l.deleted_at IS NULL
GROUP BY l.user_id, u.raw_user_meta_data, u.email
ORDER BY score DESC, total_leads DESC
```

### Pitfall 3: Leaderboard fetch bloqueia sync cycle

**What goes wrong:** Se o fetch do leaderboard falhar com erro, pode impedir o sync cycle de completar.
**Why it happens:** Se o fetch esta dentro do try/catch do sync cycle, um throw para tudo.
**How to avoid:** Leaderboard fetch deve ser independente -- wrap em try/catch proprio dentro do sync cycle. Falha de leaderboard nunca afeta push/pull de leads.
**Warning signs:** Sync de leads para de funcionar quando leaderboard endpoint esta fora.

### Pitfall 4: Recharts com layout="vertical" e altura fixa

**What goes wrong:** Chart nao renderiza ou fica cortado se o container nao tem altura explicita.
**Why it happens:** Recharts precisa de dimensoes explicitas no `ResponsiveContainer` ou via CSS.
**How to avoid:** Definir `height={120}` no ChartContainer (conforme UI-SPEC). shadcn `ChartContainer` ja wrappa `ResponsiveContainer`.
**Warning signs:** Chart mostra area vazia ou nao aparece.

### Pitfall 5: Timezone no filtro "leads de hoje"

**What goes wrong:** `startOfToday()` pode usar UTC em vez do timezone local do vendedor, mostrando contagem errada.
**Why it happens:** `new Date().setHours(0,0,0,0)` usa timezone local do browser, que e correto. Mas `createdAt` esta em ISO (UTC no Dexie). Comparacao direta de strings ISO pode dar resultados incorretos.
**How to avoid:** Converter `createdAt` para Date object e comparar com `startOfToday` como Date, nao como string.
**Warning signs:** Lead criado as 23h aparece como "hoje" no dia seguinte, ou nao aparece.

## Code Examples

### Recharts Bar Chart via shadcn ChartContainer

```typescript
// Fonte: shadcn chart.tsx + Recharts docs
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@dashboard-leads-profills/ui/components/chart";
import { Bar, BarChart, XAxis, YAxis } from "recharts";

const chartConfig: ChartConfig = {
  quente: { label: "Quente", color: "oklch(0.45 0.18 17)" },
  morno: { label: "Morno", color: "oklch(0.5 0.13 85)" },
  frio: { label: "Frio", color: "oklch(0.45 0.15 240)" },
};

const data = [
  { tag: "Quente", count: stats.quente, fill: "oklch(0.45 0.18 17)" },
  { tag: "Morno", count: stats.morno, fill: "oklch(0.5 0.13 85)" },
  { tag: "Frio", count: stats.frio, fill: "oklch(0.45 0.15 240)" },
];

<ChartContainer config={chartConfig} className="h-[120px] w-full">
  <BarChart data={data} layout="vertical">
    <XAxis type="number" hide />
    <YAxis type="category" dataKey="tag" width={60} />
    <ChartTooltip content={<ChartTooltipContent />} />
    <Bar dataKey="count" radius={4} />
  </BarChart>
</ChartContainer>
```

### LeaderboardEntry interface para Dexie cache

```typescript
// apps/web/src/lib/db/types.ts
export interface LeaderboardEntry {
  userId: string;
  name: string;
  totalLeads: number;
  score: number;
  rank: number;
  lastSyncAt: string; // ISO timestamp da ultima sync do leaderboard
}
```

### Staleness Indicator com relativeTime

```typescript
import { Clock } from "lucide-react";
import { relativeTime } from "@/lib/lead/relative-time";

function StalenessIndicator({ lastSyncAt }: { lastSyncAt: string | null }) {
  if (!lastSyncAt) {
    return <span className="text-xs text-muted-foreground">Nunca sincronizado</span>;
  }

  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground" aria-live="polite">
      <Clock className="size-3" />
      Atualizado {relativeTime(lastSyncAt)}
    </span>
  );
}
```

### Integracao no sync engine

```typescript
// Dentro do syncCycle(), apos pullChanges():
async function fetchLeaderboard(): Promise<void> {
  try {
    const result = await syncClient.leaderboard.getRanking.query();
    await db.leaderboardCache.clear();
    const entries = result.ranking.map((r, i) => ({
      userId: r.userId,
      name: r.name,
      totalLeads: r.totalLeads,
      score: r.score,
      rank: i + 1,
      lastSyncAt: result.serverTimestamp,
    }));
    await db.leaderboardCache.bulkPut(entries);
  } catch {
    // Falha de leaderboard nao afeta sync de leads
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Recharts 2.x | Recharts 3.8.0 | 2024+ | API estavel, sem breaking changes significativos para BarChart |
| Dexie version migration manual | Dexie version().stores() chained | Dexie 4.x | Cada version() define schema completo; upgrade automatico |
| shadcn Chart custom colors | ChartConfig com `color` ou `theme` | shadcn 2024+ | CSS vars automaticas via `--color-{key}` |

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.1 |
| Config file | `apps/web/vitest.config.ts` (jsdom + fake-indexeddb) |
| Quick run command | `bun run test -- --filter web` |
| Full suite command | `bun run test` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | getPersonalStats retorna total de leads | unit | `bun vitest run apps/web/src/lib/lead/stats.test.ts -t "total"` | Wave 0 |
| DASH-02 | getPersonalStats retorna breakdown por tag | unit | `bun vitest run apps/web/src/lib/lead/stats.test.ts -t "tag"` | Wave 0 |
| DASH-03 | getPersonalStats retorna leads de hoje | unit | `bun vitest run apps/web/src/lib/lead/stats.test.ts -t "hoje"` | Wave 0 |
| DASH-04 | leaderboard.getRanking retorna ranking ordenado | unit | `bun vitest run packages/api/src/routers/leaderboard.test.ts` | Wave 0 |
| DASH-05 | Score ponderado (quente=3, morno=2, frio=1) | unit | `bun vitest run apps/web/src/lib/lead/stats.test.ts -t "score"` | Wave 0 |
| DASH-06 | Leaderboard cache offline via Dexie | unit | `bun vitest run apps/web/src/lib/lead/leaderboard-cache.test.ts` | Wave 0 |
| DASH-07 | Dashboard stats acessiveis offline (Dexie local) | unit | `bun vitest run apps/web/src/lib/lead/stats.test.ts` | Wave 0 |

### Sampling Rate

- **Per task commit:** `bun vitest run apps/web/src/lib/lead/stats.test.ts`
- **Per wave merge:** `bun run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `apps/web/src/lib/lead/stats.test.ts` -- covers DASH-01, DASH-02, DASH-03, DASH-05, DASH-07
- [ ] `apps/web/src/lib/lead/leaderboard-cache.test.ts` -- covers DASH-06 (Dexie cache read/write)
- [ ] Leaderboard tRPC procedure test (DASH-04) -- requer mock de DB, pode ser deferido para integration test

## Open Questions

1. **Supabase `auth.users` JOIN**
   - What we know: A tabela `auth.users` esta no schema `auth` do Supabase, nao no `public` schema do Drizzle. O campo `raw_user_meta_data->>'full_name'` contem o nome do OAuth provider.
   - What's unclear: Se o Drizzle `sql` template permite referenciar `auth.users` cross-schema sem setup adicional. PostgreSQL permite por default, mas o Supabase Row Level Security (RLS) pode bloquear.
   - Recommendation: Testar o raw SQL join. Se RLS bloquear, alternativa e usar `supabase.auth.admin.listUsers()` no backend com `service_role` key (ja disponivel no server). O fallback e uma tabela `user_profiles` no public schema, mas isso adiciona complexidade desnecessaria para ~10 usuarios.

2. **Staleness indicator refresh**
   - What we know: `relativeTime()` retorna string estatica no momento da chamada.
   - What's unclear: Se precisa de re-render periodico para atualizar "ha 5 min" -> "ha 6 min".
   - Recommendation: Um `setInterval` de 60s dentro do `LeaderboardTab` que forca re-render do staleness indicator e suficiente. Equipe pequena, nao precisa de real-time.

## Sources

### Primary (HIGH confidence)

- Codigo existente do projeto: `apps/web/src/lib/db/index.ts`, `types.ts`, `queries.ts`, `sync/engine.ts`
- Codigo existente: `packages/api/src/routers/sync.ts`, `packages/api/src/index.ts`
- Codigo existente: `packages/ui/src/components/chart.tsx`, `tabs.tsx`
- UI-SPEC aprovado: `.planning/phases/05-dashboard-leaderboard/05-UI-SPEC.md`
- CONTEXT.md: `.planning/phases/05-dashboard-leaderboard/05-CONTEXT.md`

### Secondary (MEDIUM confidence)

- Dexie version management: conhecimento do Dexie 4.x API (version chaining)
- Recharts 3.x BarChart API: conhecimento do API estavel desde v2
- Drizzle `sql` template tag para raw SQL: documentacao Drizzle ORM

### Tertiary (LOW confidence)

- Supabase `auth.users` cross-schema JOIN com RLS: precisa validacao em runtime

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- todas as libs ja instaladas e em uso no projeto
- Architecture: HIGH -- patterns consistentes com phases anteriores (Dexie-first, tRPC, sync engine)
- Pitfalls: HIGH -- baseado em codigo existente e decisoes anteriores documentadas
- Leaderboard SQL + auth.users JOIN: MEDIUM -- precisa validar cross-schema access no Supabase

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stack estavel, sem mudancas rapidas esperadas)
