---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Export, Connectivity & PWA
status: executing
stopped_at: Completed 14-01-PLAN.md
last_updated: "2026-03-31T11:20:15.674Z"
last_activity: 2026-03-31
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 6
  completed_plans: 5
  percent: 22
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-28)

**Core value:** Vendedores coletam leads de forma rapida e confiavel mesmo sem internet, com sync automatico quando a conexao voltar.
**Current focus:** Phase 14 — leaderboard-identity-normalization

## Current Position

Milestone: v1.2 Export, Connectivity & PWA
Phase: 14 (leaderboard-identity-normalization) — EXECUTING
Plan: 2 of 2
Status: Ready to execute
Last activity: 2026-03-31

Progress: [██░░░░░░░░] 22% (v1.2) — 0/4 phases, 2/9 plans complete

## Performance Metrics

**Velocity:**

- Total plans completed: 2 (v1.2)
- Average duration: 6min
- Total execution time: 12min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 12 | 2 | 12min | 6min |
| Phase 13 P01 | 9min | 2 tasks | 5 files |
| Phase 13 P02 | 8min | 2 tasks | 4 files |
| Phase 14 P01 | 5min | 3 tasks | 6 files |

## Accumulated Context

| Phase 08 P01 | 4min | 1 tasks | 26 files |
| Phase 08 P02 | 8min | 2 tasks | 3 files |
| Phase 08 P03 | 4min | 2 tasks | 7 files |
| Phase 09 P01 | 4min | 2 tasks | 4 files |
| Phase 09 P02 | 3min | 2 tasks | 0 files |
| Phase 10 P01 | 22min | 1 tasks | 2 files |
| Phase 10 P02 | 26min | 1 tasks | 2 files |
| Phase 10 P03 | 23min | 2 tasks | 4 files |
| Phase 11 P01 | 1min | 2 tasks | 2 files |
| Phase 11 P03 | 1 | 2 tasks | 5 files |
| Phase 12 P01 | 4min | 3 tasks | 6 files |
| Phase 12 P02 | 8min | 3 tasks | 6 files |

### Decisions

Decisions sao logged em PROJECT.md Key Decisions table.
Decisoes relevantes para v1.1:

- UI: shadcn Sidebar substitui Header — zero novas dependencias (componentes ja instalados)
- Arch: Route groups (public)/(app) — separacao limpa, zero rendering condicional no root layout
- Pattern: SidebarProvider unico em (app)/layout.tsx — evita nested providers (pitfall #1)
- Mobile: useEffect + usePathname + setOpenMobile(false) para fechar drawer apos navegacao (pitfall #3)
- iOS: 100svh em vez de 100dvh no Sheet — evita gap Safari iOS 26 (pitfall #5)
- Tables: DropdownMenu de acoes no mobile em vez de botoes inline — evita tap conflicts (pitfall #7)
- [Phase 08]: Public layout como pass-through fragment (login ja tem centering proprio)
- [Phase 08]: Home page como async server component redirect (sem rendering condicional)
- [Phase 08]: collapsible='offcanvas' em vez de 'none' para manter Sheet mobile funcional
- [Phase 08]: SidebarProvider unico em (app)/layout.tsx com defaultOpen — sidebar sempre expandida no desktop
- [Phase 08]: Admin layout simplificado para role guard only — defense-in-depth com auth check redundante
- [Phase 08]: user?.id ?? '' em vez de user\!.id para Biome noNonNullAssertion compliance
- [Phase 09]: useRef+useEffect para auto-close mobile sidebar (Biome useExhaustiveDependencies compliance)
- [Phase 09]: ThemeIcon extraido como componente separado para Biome noNestedTernary
- [Phase 09]: Verificacao visual aprovada: sidebar funcional em desktop e mobile, todos 12 itens do checklist passaram
- [Phase 10]: CSS visibility switching (md:hidden / hidden md:block) para responsive table/card — evita hydration mismatch
- [Phase 10]: DropdownMenu substitui Tooltip em admin tables — touch-friendly com 44px min targets
- [Phase 10]: FAB usa visualViewport resize API para keyboard detection — fallback graceful se API indisponivel
- [Phase 10]: IntersectionObserver root: null documentado — depende de body como scroll container
- [Phase 11]: UUID_REGEX extraida para top-level para satisfazer Biome useTopLevelRegex em AppTopbar
- [Phase 11]: AppTopbar como leaf use-client importada por Server Component layout — nenhum use-client adicionado ao layout
- [Phase 11]: flex flex-col gap-* substituiu space-y-* em todos arquivos restantes da fase (padrao consistente)
- [Phase 11]: stats-charts barData usa var(--color-quente/morno/frio) via tagChartConfig theme — dark mode correto
- [Phase 11]: lead-list e lead-detail delegam padding para layout.tsx — sem px-4 py-8 nem max-w-[480px] duplicados
- [Phase 12]: Seller export now uses a dedicated Dexie helper so infinite-scroll pagination cannot truncate downloads.
- [Phase 12]: Admin export uses a shared filter schema plus a separate exportByFilters procedure instead of widening listByUser.
- [Phase 12]: Admin screen derives one named adminLeadFilters object from live UI state and reuses it for paginated and export queries.
- [Phase 12-export-workflows]: Phase 12: filename generation stays centralized in the shared CSV utility, with seller/admin screens passing explicit scope labels.
- [Phase 12-export-workflows]: Phase 12: seller and admin exports use toast feedback after download start instead of adding new inline export UI.
- [Phase 13]: Engine callback pattern: onSyncStart/onSyncEnd para lifecycle reporting sem acoplar engine ao React
- [Phase 13]: SyncStatusProvider cria e compartilha ConnectivityDetector com startSync (shared instance, evita Pitfall 1)
- [Phase 13]: Estado atomico via single useState object { isSyncing, lastSync, lastError } para evitar flicker entre renders
- [Phase 13]: SyncStatusIcon: pure functions exportadas (deriveSyncState, getTooltipText, formatBadgeCount) para testabilidade sem DOM
- [Phase 13]: Hydration-safe pattern: nunca ler localStorage em useState initializer, sempre em useEffect (documentado em CLAUDE.md Common Hurdles)
- [Phase 14]: D-07: COALESCE inline em cada router vs shared helper — mantido inline; queries sao distintas (CTE vs SPLIT_PART)
- [Phase 14]: CTE com ROW_NUMBER() OVER para rank posicional no SQL; COALESCE('Vendedor #' || rank) garante fallback legivel
- [Phase 14]: SPLIT_PART(email, '@', 1) como fallback para admin — mais informativo que numero generico

### Pending Todos

None yet.

### Blockers/Concerns

- CTA de instalacao nao pode depender da rota `/` porque a home publica redireciona imediatamente
- Verificar cedo se browsers alvo exigem service worker minimo para install prompt; manter escopo estrito se isso surgir
- Workspace lint gate (`bun run check`) segue bloqueado por debt fora do escopo da fase, incluindo `.claude/worktrees/*/biome.json` e arquivos operacionais em `.codex/get-shit-done`

## Session Continuity

Last session: 2026-03-31T11:20:15.672Z
Stopped at: Completed 14-01-PLAN.md
Resume file: None
