---
phase: 14-leaderboard-identity-normalization
plan: "02"
subsystem: web
tags: [leaderboard, dexie, cache, rank, offline, identity]

# Dependency graph
requires:
  - phase: 14-01
    provides: leaderboard.getRanking com rank: number via ROW_NUMBER() SQL
provides:
  - leaderboard-tab.tsx com rank do servidor no cache Dexie (sem rank drift)
  - Verificacao visual aprovada: nomes corretos, destaque sem "(voce)", cache offline funcional
affects:
  - apps/web leaderboard display (cache offline agora reflete rank SQL correto)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - rank: r.rank em vez de i+1 no mapeamento de cache — preserva rank SQL no Dexie

key-files:
  created: []
  modified:
    - apps/web/src/app/(app)/dashboard/leaderboard-tab.tsx
    - apps/web/src/components/leaderboard-entry.tsx

key-decisions:
  - "Usar r.rank (SQL ROW_NUMBER) diretamente no cache Dexie elimina rank drift (Pitfall 3)"
  - "No displayEntries, remover rank: i+1 e deixar spread ...r incluir r.rank automaticamente"

patterns-established:
  - "Pattern: nunca recomputar rank no JS quando o servidor ja entrega rank posicional correto"

requirements-completed:
  - ENH-06
  - ENH-09

# Metrics
duration: 16min
completed: "2026-03-31"
---

# Phase 14 Plan 02: Leaderboard rank do servidor (cache sem drift) Summary

**Duas substituicoes cirurgicas em leaderboard-tab.tsx eliminam rank drift: cache Dexie usa r.rank do SQL ROW_NUMBER(); verificacao visual aprovada com nomes corretos, destaque sem "(voce)" e cache offline funcional.**

## Performance

- **Duration:** ~16 min (incluindo checkpoint de verificacao visual)
- **Started:** 2026-03-31T11:21:56Z
- **Completed:** 2026-03-31T11:37:39Z
- **Tasks:** 3 de 3 concluidas
- **Files modified:** 2

## Accomplishments

- `leaderboard-tab.tsx`: bloco de cache Dexie agora usa `rank: r.rank` — rank SQL propagado ao IndexedDB sem drift
- `leaderboard-tab.tsx`: displayEntries agora usa spread `...r` sem override de rank — `r.rank` incluido via spread
- `leaderboard-entry.tsx`: formatacao Biome corrigida (tag `<p>` colapsada em linha unica)
- Suite completa: 149 testes passando em web + api + env
- Verificacao visual aprovada: nomes legiveis, destaque visual sem sufixo "(voce)", cache offline funcional

## Task Commits

1. **Task 1: Atualizar leaderboard-tab.tsx para usar rank do servidor** - `6233b79` (fix)
2. **Task 2: Rodar suite completa e verificar Biome** - `e14af45` (chore)
3. **Task 3: Verificacao visual** - aprovado pelo usuario (checkpoint:human-verify)

## Files Created/Modified

- `apps/web/src/app/(app)/dashboard/leaderboard-tab.tsx` - rank: r.rank no cache Dexie; spread ...r em displayEntries; parametros i removidos
- `apps/web/src/components/leaderboard-entry.tsx` - formatacao Biome: tag p colapsada

## Decisions Made

- **r.rank via spread vs rank: r.rank explicito:** displayEntries usa `...r` que ja inclui `rank`, entao remover `rank: i+1` e suficiente. Cache Dexie requer mapeamento explicito (nao usa spread), entao precisa de `rank: r.rank` explicito.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Formatting] Biome format error em leaderboard-entry.tsx**
- **Found during:** Task 2 (Biome check dos arquivos da fase)
- **Issue:** Tag `<p>` com conteudo em 3 linhas em vez de inline — Biome flagra como format error
- **Fix:** `bun x biome check --write` aplicou o colapso automaticamente
- **Files modified:** apps/web/src/components/leaderboard-entry.tsx
- **Commit:** e14af45

---

**Total deviations:** 1 auto-fixed (Rule 1 — formatacao Biome)
**Impact on plan:** Zero scope creep. Fix de formatacao apenas.

## Known Stubs

None — rank agora vem diretamente do servidor SQL.

## Issues Encountered

None — plano executado sem bloqueios.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 14 completa: identidade do leaderboard normalizada em todas as camadas (SQL, API, UI, cache Dexie)
- Pronto para phase 15: SW Cache para navegacao offline (app shell + RSC payloads)
- Sem blockers.

## Self-Check: PASSED

- FOUND: apps/web/src/app/(app)/dashboard/leaderboard-tab.tsx
- FOUND: apps/web/src/components/leaderboard-entry.tsx
- FOUND commit: 6233b79 (fix)
- FOUND commit: e14af45 (chore)

---
*Phase: 14-leaderboard-identity-normalization*
*Completed: 2026-03-31*
