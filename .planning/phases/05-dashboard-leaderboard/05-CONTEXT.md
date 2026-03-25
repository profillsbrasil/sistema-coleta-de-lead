# Phase 5: Dashboard & Leaderboard - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Vendedor ve suas proprias estatisticas de performance e o ranking comparativo da equipe, inclusive quando offline. Dashboard pessoal com total, breakdown por tag, leads de hoje, score ponderado. Leaderboard com ranking de todos vendedores. Dados offline via Dexie cache.

</domain>

<decisions>
## Implementation Decisions

### Dashboard pessoal
- **D-01:** Stat cards no topo: Total Leads, Quentes, Mornos, Frios. Abaixo: card com leads de hoje e score pessoal ponderado.
- **D-02:** Grafico de barras mostrando distribuicao por tag (quente/morno/frio). Precisa de lib de graficos leve.
- **D-03:** Score ponderado: quente=3, morno=2, frio=1 (ja decidido no PROJECT.md).
- **D-04:** Dados vem do Dexie local (leads do vendedor logado). Sempre frescos, sem necessidade de network.

### Leaderboard
- **D-05:** Lista rankeada com cards. Cada card: posicao (#1, #2...), nome do vendedor, total leads, score ponderado.
- **D-06:** Vendedor logado tem card destacado (cor de accent/primary). Sempre visivel mesmo que nao esteja no topo.
- **D-07:** Ordenado por score ponderado desc. Em caso de empate, desempata por quantidade total.
- **D-08:** Dados vem de tRPC procedure que retorna ranking de todos vendedores (query server-side que agrega por userId).

### Dados offline / staleness
- **D-09:** Dexie table dedicada `leaderboardCache` para cache do leaderboard offline. Quando online, tRPC busca ranking e grava no Dexie. Offline, mostra cache.
- **D-10:** Indicador de staleness: timestamp da ultima sync do leaderboard. Mostra "Atualizado ha X min" no topo do leaderboard.
- **D-11:** Dashboard pessoal nao precisa de staleness — dados sao do Dexie local, sempre atuais.

### Navegacao
- **D-12:** Pagina unica `/dashboard` com duas tabs: "Meu Dashboard" e "Leaderboard". Dashboard e a home apos login.
- **D-13:** `/dashboard` ja existe (Phase 1 criou). Reutilizar e expandir.

### Claude's Discretion
- Biblioteca de graficos — recharts, chart.js, ou outra. Claude escolhe baseado em bundle size, SSR compatibility, e simplicidade.
- Dexie schema update — como adicionar leaderboardCache table sem quebrar versao existente.
- tRPC procedure de leaderboard — como agregar leads por vendedor com score ponderado no SQL.
- Tabs implementation — shadcn Tabs ou custom toggle. Claude decide.
- Stat card design — layout exato dos cards de stats. Claude segue UI-SPEC se existir.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project requirements
- `.planning/REQUIREMENTS.md` — DASH-01 through DASH-07 define os requisitos de dashboard e leaderboard
- `.planning/ROADMAP.md` §Phase 5 — Goal, success criteria e depends on

### Prior phase artifacts
- `apps/web/src/lib/db/index.ts` — Dexie database (leads table, precisa adicionar leaderboardCache)
- `apps/web/src/lib/db/types.ts` — Lead e SyncQueueItem interfaces (precisa adicionar LeaderboardEntry)
- `apps/web/src/lib/lead/queries.ts` — queryLeads function (reutilizar para stats pessoais)
- `apps/web/src/lib/sync/engine.ts` — Sync engine (precisa integrar leaderboard fetch)
- `packages/api/src/routers/sync.ts` — tRPC sync router (pode adicionar leaderboard procedure aqui)
- `apps/web/src/app/dashboard/page.tsx` — Dashboard page existente (expandir)
- `apps/web/src/app/dashboard/dashboard.tsx` — Dashboard component (expandir)

### UI Design System
- `.planning/phases/01-auth-migration/01-UI-SPEC.md` — Design tokens base
- `.planning/phases/04-lead-management/04-UI-SPEC.md` — Card patterns, tag colors oklch

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `queryLeads` em `queries.ts`: query Dexie com filtro por tag e paginacao. Reutilizar para stats (count por tag, count hoje).
- `relativeTime` em `relative-time.ts`: formata timestamps relativos. Reutilizar para staleness indicator.
- `TagSelector` / `TagFilter`: cores oklch para tags. Reutilizar para stat cards por tag.
- `Card` component shadcn: reutilizar para stat cards e leaderboard entries.
- `useLiveQuery` de dexie-react-hooks: para stats reativos do Dexie local.
- Sync engine singleton: pode ser estendido para fetch de leaderboard apos pullChanges.

### Established Patterns
- Dexie-first para dados do vendedor, tRPC para dados cross-user
- useLiveQuery para reatividade local
- Sonner para toasts
- shadcn base-nova com tokens estabelecidos

### Integration Points
- `apps/web/src/app/dashboard/` — expandir page e component existentes
- `apps/web/src/lib/db/index.ts` — adicionar leaderboardCache table
- `packages/api/src/routers/` — nova procedure ou router para leaderboard data
- `apps/web/src/lib/sync/engine.ts` — integrar fetch de leaderboard no sync cycle

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-dashboard-leaderboard*
*Context gathered: 2026-03-25*
