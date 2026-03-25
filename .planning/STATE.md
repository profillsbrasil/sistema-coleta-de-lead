---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Ready to plan
stopped_at: Completed 03-04-PLAN.md
last_updated: "2026-03-25T01:52:09.102Z"
progress:
  total_phases: 6
  completed_phases: 3
  total_plans: 11
  completed_plans: 11
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-24)

**Core value:** Vendedores coletam leads de forma rapida e confiavel mesmo sem internet, com sync automatico quando a conexao voltar.
**Current focus:** Phase 03 — lead-capture

## Current Position

Phase: 4
Plan: Not started

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 01 P01 | 5min | 2 tasks | 15 files |
| Phase 01 P03 | 2min | 2 tasks | 5 files |
| Phase 01 P02 | 2min | 2 tasks | 6 files |
| Phase 01 P04 | 3min | 2 tasks | 5 files |
| Phase 02 P01 | 3min | 2 tasks | 9 files |
| Phase 02 P02 | 2min | 2 tasks | 4 files |
| Phase 02 P03 | 4min | 2 tasks | 3 files |
| Phase 03 P01 | 3min | 2 tasks | 13 files |
| Phase 03 P02 | 6min | 2 tasks | 5 files |
| Phase 03 P03 | 3min | 2 tasks | 3 files |
| Phase 03-lead-capture P04 | 5min | 2 tasks | 6 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Auth: Better-Auth esta sendo substituido por Supabase Auth (Google, Facebook, LinkedIn, email/password)
- Roles: admin + vendedor armazenados no perfil do usuario Supabase Auth
- Offline: Dexie como storage primario no client; Supabase e source of truth; server-wins para conflitos
- Segmento: campo livre de texto (sem lista de opcoes) — flexibilidade sem complexidade
- Score: quente=3, morno=2, frio=1 para leaderboard ponderado
- [Phase 01]: proxy.ts (Next.js 16) em vez de middleware.ts para session refresh
- [Phase 01]: getClaims() em vez de getUser() no proxy (mais leve, sem network call)
- [Phase 01]: NEXT_PUBLIC_SUPABASE_* no server block do T3 Env (vars publicas seguras)
- [Phase 01]: SVG icons inline no login-card (3 icones nao justificam pacote adicional)
- [Phase 01]: getClaims() no tRPC context em vez de getUser() (valida JWT via JWKS sem network call)
- [Phase 01]: Tres niveis de procedure: public < protected < admin (role check via JWT claims)
- [Phase 01]: user_roles table com app_role enum (admin, vendedor) em public schema
- [Phase 01]: Removido @tanstack/react-form junto com better-auth (sem uso apos remocao dos forms)
- [Phase 01]: Dashboard page usa getUser() server-side para auth guard (consistente com proxy.ts)
- [Phase 02]: Dexie primary key em localId (UUID client-side) com serverId como indice secundario
- [Phase 02]: syncStatus field no Lead para tracking de estado offline (pending, synced, conflict)
- [Phase 02]: SyncQueue separada da tabela leads para operacoes de sync independentes
- [Phase 02]: Whitelist sanitization de payload no pushChanges (apenas campos permitidos passam)
- [Phase 02]: Closure-based connectivity detector (sem classe, sem estado global)
- [Phase 02]: tRPC vanilla client singleton separado do React Query para sync engine (fora do React tree)
- [Phase 02]: Mutex via isSyncing boolean para prevenir sync cycles concorrentes
- [Phase 02]: localStorage para persistir lastSyncTimestamp entre sessions
- [Phase 03]: Zod 4 com .refine() para validacao condicional phone-or-email no leadFormSchema
- [Phase 03]: calculateDimensions exportada separada de compressImage para testabilidade sem canvas mock
- [Phase 03]: emptyToNull pattern: campos opcionais vazios viram null antes de persistir no Dexie
- [Phase 03]: oklch colors via Tailwind arbitrary values para tag selector (dark mode nativo via dark: prefix)
- [Phase 03]: Base UI React Collapsible nao suporta asChild -- usar className direto no Trigger
- [Phase 03]: FAB usa type cast para typedRoutes com novas rotas (regenera no proximo build)
- [Phase 03]: biome-ignore para img element no photo preview (blob URL incompativel com next/image)
- [Phase 03-lead-capture]: Upload entre pushChanges e pullChanges no sync cycle (leads precisam de serverId do push)

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 2 (Sync Engine): tRPC vanilla client fora do React tree precisa de validacao de inicializacao no App Router — singleton em lib/sync/engine.ts e a abordagem recomendada
- Phase 3 (Camera iOS): comportamento do Safari iOS para getUserMedia requer user gesture direto no onClick; testar em dispositivo fisico obrigatorio

## Session Continuity

Last session: 2026-03-25T01:49:12.410Z
Stopped at: Completed 03-04-PLAN.md
Resume file: None
