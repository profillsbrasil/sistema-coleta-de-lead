# Phase 13: Sync Visibility - Research

**Researched:** 2026-03-30
**Domain:** React Context + Dexie reactive queries + sync engine callbacks + UI state indicator
**Confidence:** HIGH

## Summary

Phase 13 exposes the offline-first sync engine's runtime status through a React Context Provider and renders an icon-only indicator in the sidebar footer. The work splits into two clear domains: (1) promoting the existing `SyncInitializer` component into a `SyncStatusProvider` that aggregates 5 fields (`isOnline`, `isSyncing`, `pendingCount`, `lastSync`, `lastError`) from three sources (ConnectivityDetector, engine callbacks, Dexie live query), and (2) building a `SyncStatusIcon` leaf component that maps a precedence-based state to icon + color + tooltip.

All required libraries and UI components are already installed. No new dependencies are needed. The engine (`engine.ts`) currently uses module-level `isSyncing` state and does not expose lifecycle callbacks -- this is the primary integration gap that Plan 13-01 must address. The ConnectivityDetector already provides `subscribe()` and `isOnline`, and `useLiveQuery` from `dexie-react-hooks` is proven in the codebase for reactive Dexie reads.

**Primary recommendation:** Refactor `engine.ts` to accept an options object with lifecycle callbacks (`onSyncStart`, `onSyncEnd`, `onSyncError`) so the Provider can track `isSyncing`, `lastSync`, and `lastError` without coupling the engine to React.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** `SyncInitializer` em `providers.tsx` e promovido a `SyncStatusProvider` -- vira um React Context Provider que rastreia o status do engine e injeta via Context.
- **D-02:** O Context expoe 5 campos: `isOnline: boolean`, `isSyncing: boolean`, `pendingCount: number`, `lastSync: string | null`, `lastError: string | null`.
- **D-03:** `pendingCount` e derivado via `useLiveQuery(() => db.syncQueue.count())` diretamente no Provider -- leitura reativa do Dexie sem polling.
- **D-04:** O engine expoe callbacks/setters para que o Provider atualize `isSyncing`, `lastSync` e `lastError` durante o ciclo de sync. O `isOnline` continua derivado do `ConnectivityDetector`.
- **D-05:** O indicador fica no `sidebar-user-menu.tsx` (sidebar footer), integrado ao componente existente.
- **D-06:** Forma visual: icone animado somente (sem texto). Estados visuais: Offline (vermelho/desconectado), Syncing (spin), Error (warning), Pending (neutro com badge), Synced (verde/check).
- **D-07:** Tooltip no icone expoe o detalhe. Tooltip e o unico lugar onde texto aparece.
- **D-08:** Precedencia: `Offline > Syncing > Error > Pending > Synced`.
- **D-09:** Estado "stale" nao e distinguido.
- **D-10:** `lastSync` e preservado no `localStorage` (chave `lastSyncTimestamp` ja existente).
- **D-11:** Estado de erro (`lastError`) e definido apenas apos todas as 5 tentativas (`maxRetries`) falharem.
- **D-12:** `lastError` e zerado automaticamente quando o proximo ciclo de sync completar sem erro. Sem botao de retry manual.
- **D-13:** O indicador nao dispara toasts. Toasts existentes permanecem, nenhum novo toast de status.

### Claude's Discretion
- Icone especifico para cada estado (Lucide icons ja instalados -- escolha do agente)
- Duracao e easing da animacao de spin no estado syncing
- Tamanho do badge de pendingCount e threshold para mostrar (ex: so se > 0)
- Exato posicionamento do icone dentro do sidebar-user-menu (antes/depois do avatar)

### Deferred Ideas (OUT OF SCOPE)
- **ENH-10:** Botao de retry manual -- mantido no backlog.
- **Stale/aging timeout:** Distinguir "synced recente" vs "synced ha muito tempo" com cor.
- **AppTopbar placement:** Colocar o indicador no topbar -- descartado.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ENH-02 | Usuario autenticado ve no shell do app um estado claro de conectividade e sync sem bloquear a captura offline | SyncStatusProvider injeta status via Context; SyncStatusIcon renderiza no sidebar footer; nenhum blocking de formularios |
| ENH-08 | Estado de sync indica quando ha alteracoes pendentes, sincronizacao em andamento, falha recente ou ultima sincronizacao bem-sucedida | 5 campos no Context (`isOnline`, `isSyncing`, `pendingCount`, `lastSync`, `lastError`) mapeados a 5 estados visuais com precedencia definida |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

- **Monorepo:** Turborepo 2.8, Bun 1.3
- **Frontend:** Next.js 16.2, React 19, React Compiler, TailwindCSS 4, shadcn/ui
- **Linting:** Biome 2.4 via Ultracite -- `bun x ultracite fix` antes de commit
- **Commits:** Conventional Commits em Portugues
- **Indentacao:** tabs (Biome)
- **Quotes:** double quotes (Biome)
- **UI imports:** path-based, nao barrel (`@dashboard-leads-profills/ui/components/tooltip`)
- **CSS classes:** usar `cn()` de `@dashboard-leads-profills/ui/lib/utils`
- **No console.log:** debug statements proibidos em producao
- **No `any`:** usar `unknown` se genuinamente desconhecido
- **TypeScript strict:** explicit types em parametros e retornos quando aumentam clareza
- **Testes:** Vitest 3.2 -- assertions dentro de `it()`/`test()`, sem `.only`/`.skip`

---

## Standard Stack

### Core (already installed -- no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 19 | 19.2.3 | `createContext`, `useContext`, `useState`, `useEffect`, `useCallback` | Context Provider pattern para estado compartilhado |
| dexie-react-hooks | 4.2.0 | `useLiveQuery` para `pendingCount` reativo | Ja em uso em 4+ componentes do projeto |
| Dexie | 4.3.0 | `db.syncQueue.count()` | Ja e o storage primario offline |
| Lucide React | 1.6.0 | 5 icones de estado (WifiOff, RefreshCw, AlertTriangle, CloudUpload, CloudCheck) | Ja instalado, todos 5 icones verificados disponiveis |
| shadcn/ui Tooltip | (base-ui-react 1.3.0) | Tooltip wrapping o icone | Ja instalado em packages/ui |
| shadcn/ui Button | (base-ui-react 1.3.0) | `variant="ghost" size="icon-sm"` wrapper | Padrao existente no sidebar-user-menu |
| tw-animate-css | 1.4.0 | `animate-spin` para estado Syncing | Ja importado em globals.css |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React Context | Zustand/Jotai | Overengineering para 5 campos; Context e suficiente e nao requer dependencia extra |
| useLiveQuery (Dexie) | Polling com setInterval | Polling desperdicaria CPU e teria latencia; useLiveQuery e reativo e ja provado no projeto |
| Module callbacks | Event emitter / custom events | Callbacks diretos sao mais simples e type-safe; event emitter adicionaria indiretion desnecessaria |

**Installation:** Nenhuma. Tudo ja instalado.

---

## Architecture Patterns

### Engine Callback Pattern (Plan 13-01)

**What:** Refatorar `startSync()` para aceitar um objeto de options com callbacks de lifecycle.

**Current state of `engine.ts`:**
- `isSyncing` e uma variavel module-level `let isSyncing = false` (linha 25)
- `syncCycle()` seta `isSyncing = true/false` no try/finally
- `syncWithRetry()` faz 5 tentativas com backoff mas nao expoe resultado
- `startSync()` retorna apenas cleanup function `() => void`
- `localStorage.setItem("lastSyncTimestamp", ...)` acontece dentro de `pullChanges()` (linha 150)

**Proposed change:**

```typescript
// engine.ts - new options interface
interface SyncEngineCallbacks {
  onSyncStart?: () => void;
  onSyncEnd?: (result: { lastSync: string; error: string | null }) => void;
}

export function startSync(callbacks?: SyncEngineCallbacks): () => void {
  // ... existing detector setup ...

  // Pass callbacks down to syncWithRetry/syncCycle
  // onSyncStart called when isSyncing transitions to true
  // onSyncEnd called when cycle completes (success or final failure)
}
```

**Why this pattern:** Keeps engine framework-agnostic (no React dependency). Provider passes callbacks when calling `startSync()`. Engine calls `onSyncStart` before the cycle and `onSyncEnd` with result after. This respects D-04 exactly.

**Key integration detail:** `onSyncEnd` must be called with `error: null` on success AND `error: string` only after all `maxRetries` are exhausted (D-11). Transient errors during retry do NOT trigger `onSyncEnd` with an error.

### SyncStatusProvider Pattern (Plan 13-01)

**What:** React Context Provider that replaces `SyncInitializer` in `providers.tsx`.

**Structure:**

```typescript
// apps/web/src/components/sync-status-provider.tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/index";
import { createConnectivityDetector } from "@/lib/sync/connectivity";

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSync: string | null;
  lastError: string | null;
}

const SyncStatusContext = createContext<SyncStatus>({
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  lastSync: null,
  lastError: null,
});

export function useSyncStatus(): SyncStatus {
  return useContext(SyncStatusContext);
}
```

**Key details:**
- `useLiveQuery(() => db.syncQueue.count(), [], 0)` provides reactive `pendingCount` (D-03). The `0` default keeps renders predictable before IndexedDB resolves.
- `isOnline` comes from `ConnectivityDetector.subscribe()` -- same detector that `startSync` uses. The Provider creates the detector AND passes it to `startSync` so both share the same instance.
- State updates for `isSyncing`, `lastSync`, `lastError` come via callbacks passed to `startSync()` (D-04).
- `lastSync` initial value reads from `localStorage.getItem("lastSyncTimestamp")` on mount (D-10).
- State batch: when sync ends, `isSyncing`, `lastSync`, and `lastError` must update in a single render to avoid flicker (UI-SPEC: "set isSyncing = false only after lastSync and lastError are also updated in the same state batch").

**Placement in providers.tsx:**

```tsx
// providers.tsx - replaces SyncInitializer
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider ...>
      <QueryClientProvider client={queryClient}>
        <SyncStatusProvider>
          {children}
        </SyncStatusProvider>
        <ReactQueryDevtools />
      </QueryClientProvider>
      <Toaster richColors />
    </ThemeProvider>
  );
}
```

### SyncStatusIcon Pattern (Plan 13-02)

**What:** Leaf client component that maps sync state to visual representation.

**Precedence logic (from D-08 and UI-SPEC):**

```typescript
function deriveSyncState(status: SyncStatus): SyncState {
  if (!status.isOnline) return "offline";
  if (status.isSyncing) return "syncing";
  if (status.lastError !== null) return "error";
  if (status.pendingCount > 0) return "pending";
  return "synced";
}
```

**State-to-visual mapping (from UI-SPEC):**

| State | Icon | Color Class | Tooltip (PT-BR) |
|-------|------|-------------|-----------------|
| offline | `WifiOff` | `text-destructive` | "Sem conexao" |
| syncing | `RefreshCw` | `text-primary animate-spin` | "Sincronizando..." |
| error | `AlertTriangle` | `text-amber-500` | "Erro no ultimo sync" |
| pending | `CloudUpload` | `text-muted-foreground` + badge | "{n} alteracao(es) pendente(s)" |
| synced | `CloudCheck` | `text-emerald-500` | "Atualizado {relativeTime}" / "Sincronizado" |

**Badge (pending only):** Absolute overlay, `bg-amber-500 text-white`, 10px font, `tabular-nums`, renders only when `pendingCount > 0`, max "99+".

**Placement in sidebar-user-menu.tsx:** Between the name/role stack and ThemeToggle button. Same `<Button size="icon-sm" variant="ghost">` wrapper. Tooltip with `side="top"` and `delay={500}`.

### Anti-Patterns to Avoid

- **DO NOT create a new ConnectivityDetector inside the Provider AND let startSync create another one.** They must share the same instance, otherwise `isOnline` state can diverge.
- **DO NOT update `isSyncing`, `lastSync`, `lastError` in separate `setState` calls.** Use a single state object or `useReducer` to batch updates and avoid flicker.
- **DO NOT call `useLiveQuery` inside a callback or conditional.** It must be at hook top-level in the Provider component (React hook rules).
- **DO NOT import Dexie/`useLiveQuery` in a Server Component.** `SyncStatusProvider` must be `"use client"`.
- **DO NOT add toasts in the SyncStatusIcon component.** D-13 explicitly forbids new status toasts.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reactive IndexedDB count | Polling with setInterval | `useLiveQuery(() => db.syncQueue.count())` | Dexie's live query hooks into IndexedDB transactions; polling misses instant updates and wastes CPU |
| Online/offline detection | `navigator.onLine` only | Existing `ConnectivityDetector` with polling + browser events | `navigator.onLine` lies on many networks; detector does active health checks |
| Tooltip component | Custom `onMouseEnter`/`onMouseLeave` | shadcn `Tooltip` + `TooltipProvider` + `TooltipTrigger` + `TooltipContent` | Handles portal, positioning, accessibility, animation out of the box |
| Spin animation | Custom CSS keyframes | `animate-spin` from tw-animate-css | Already imported and proven in 6+ places in the codebase |
| Relative time display | New time formatting function | Existing `relativeTime()` from `@/lib/lead/relative-time` | Already used in `staleness-indicator.tsx`; outputs PT-BR strings |

**Key insight:** Every building block for this phase already exists in the codebase. The only novel code is the glue: a Context Provider that wires existing signals together, and a UI component that maps state to visuals.

---

## Common Pitfalls

### Pitfall 1: Dual ConnectivityDetector instances
**What goes wrong:** Provider creates its own detector for `isOnline`, and `startSync()` creates another internally. They poll independently and can disagree on online status.
**Why it happens:** Current `startSync()` creates the detector internally (line 222 of engine.ts).
**How to avoid:** Refactor `startSync()` to accept an external `ConnectivityDetector` instance, or have `startSync()` return/expose its detector. The Provider then subscribes to the same instance.
**Warning signs:** Indicator shows "online" but sync doesn't trigger, or vice versa.

### Pitfall 2: State update flicker
**What goes wrong:** Icon briefly shows "synced" then "pending" during state transitions because `isSyncing` and `lastSync` update in separate renders.
**Why it happens:** Multiple `setState` calls in sequence cause multiple re-renders.
**How to avoid:** Use a single state object `{ isSyncing, lastSync, lastError }` updated via one `setState` call, or use `useReducer`. The UI-SPEC explicitly requires atomic state updates.
**Warning signs:** Icon visually "flashes" between states during sync completion.

### Pitfall 3: useLiveQuery returns undefined on first render
**What goes wrong:** `pendingCount` is `undefined` before IndexedDB resolves, causing the precedence logic to behave unexpectedly.
**Why it happens:** `useLiveQuery` is async; first render returns `undefined` unless a default is provided.
**How to avoid:** Always provide the third argument (default): `useLiveQuery(() => db.syncQueue.count(), [], 0)`. This is the established pattern in the codebase.
**Warning signs:** Badge briefly shows "undefined" or precedence evaluates wrong on page load.

### Pitfall 4: Missing aria-label update
**What goes wrong:** Screen readers announce stale state because `aria-label` isn't synced with current tooltip text.
**Why it happens:** `aria-label` is set statically or forgotten.
**How to avoid:** Derive `aria-label` from the same `tooltipText` variable that populates `TooltipContent`. UI-SPEC requires they match exactly.
**Warning signs:** Accessibility audit fails; screen reader announces "Sincronizado" while icon shows error.

### Pitfall 5: Engine error callback fires on transient errors
**What goes wrong:** Indicator shows "Error" during first retry attempt, not after all retries are exhausted.
**Why it happens:** `onSyncEnd` with error is called inside the retry loop instead of after the loop completes.
**How to avoid:** D-11 is explicit: `lastError` is only set after ALL `maxRetries` (5) fail. The `onSyncEnd` with error must be called only when `syncWithRetry()` exhausts all attempts. Success within any retry clears the error path.
**Warning signs:** Error icon appears and disappears rapidly during transient network issues.

### Pitfall 6: Biome lint violations
**What goes wrong:** New code fails CI due to Biome rules.
**Why it happens:** Nested ternaries (noNestedTernary), missing exhaustive deps, non-standard patterns.
**How to avoid:** Use early returns or a config map instead of nested ternaries for state-to-icon mapping. Run `bun run check` before commit.
**Warning signs:** CI blocks merge.

---

## Code Examples

### Engine callback integration (verified pattern from existing codebase)

```typescript
// Source: Pattern derived from current engine.ts structure
// engine.ts - refactored startSync signature
interface SyncEngineCallbacks {
  onSyncStart?: () => void;
  onSyncEnd?: (result: { lastSync: string; error: string | null }) => void;
}

export function startSync(
  callbacks?: SyncEngineCallbacks,
  detector?: ConnectivityDetector
): () => void {
  const _detector = detector ?? createConnectivityDetector();

  async function syncWithRetryAndCallbacks(): Promise<void> {
    callbacks?.onSyncStart?.();
    let lastError: string | null = null;

    for (let attempt = 0; attempt < SYNC_CONFIG.maxRetries; attempt++) {
      try {
        await syncCycle();
        // Success: report lastSync from localStorage
        const lastSync = localStorage.getItem("lastSyncTimestamp");
        callbacks?.onSyncEnd?.({ lastSync: lastSync ?? new Date().toISOString(), error: null });
        return;
      } catch (error: unknown) {
        if (isUnauthorizedError(error)) {
          callbacks?.onSyncEnd?.({ lastSync: localStorage.getItem("lastSyncTimestamp") ?? "", error: null });
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

    // All retries exhausted (D-11)
    callbacks?.onSyncEnd?.({ lastSync: localStorage.getItem("lastSyncTimestamp") ?? "", error: lastError });
  }

  // ... rest of detector setup using _detector ...
}
```

### useLiveQuery for pendingCount (established project pattern)

```typescript
// Source: Pattern from apps/web/src/app/(app)/leads/lead-list.tsx (useLiveQuery usage)
// In SyncStatusProvider:
const pendingCount = useLiveQuery(
  () => db.syncQueue.count(),
  [],
  0  // default value -- avoids undefined on first render
);
```

### State derivation with precedence (from UI-SPEC)

```typescript
// Source: CONTEXT.md D-08 + UI-SPEC precedence rule
type SyncState = "offline" | "syncing" | "error" | "pending" | "synced";

const STATE_CONFIG: Record<SyncState, { icon: LucideIcon; className: string }> = {
  offline:  { icon: WifiOff,       className: "text-destructive" },
  syncing:  { icon: RefreshCw,     className: "text-primary animate-spin" },
  error:    { icon: AlertTriangle, className: "text-amber-500" },
  pending:  { icon: CloudUpload,   className: "text-muted-foreground" },
  synced:   { icon: CloudCheck,    className: "text-emerald-500" },
};
// Use config map instead of nested ternaries (Biome noNestedTernary compliance)
```

### Tooltip integration (from existing sidebar-user-menu.tsx pattern)

```typescript
// Source: packages/ui/src/components/tooltip.tsx API + sidebar-user-menu.tsx button pattern
<TooltipProvider delay={500}>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        aria-label={tooltipText}
        size="icon-sm"
        variant="ghost"
      >
        <Icon className={cn("size-4", colorClass)} />
        {/* Badge overlay for pending state */}
      </Button>
    </TooltipTrigger>
    <TooltipContent side="top">
      {tooltipText}
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Module-level `isSyncing` boolean | Callback-based lifecycle reporting | This phase | Provider can observe engine state without polling |
| `SyncInitializer` (renders null) | `SyncStatusProvider` (Context Provider) | This phase | Any component can consume sync status via `useSyncStatus()` |
| `staleness-indicator.tsx` (prop-driven) | `SyncStatusIcon` (context-driven) | This phase | Status is derived from runtime Context, not passed as props |

**Deprecated/outdated after this phase:**
- `SyncInitializer` component: replaced entirely by `SyncStatusProvider`
- `staleness-indicator.tsx`: may become redundant since `SyncStatusIcon` tooltip covers the same "Atualizado ha X" information. Can be kept for backward compatibility or removed if unused elsewhere.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.1 |
| Config file | `apps/web/vitest.config.ts` (jsdom env, fake-indexeddb/auto) |
| Quick run command | `bun run test -- --filter web` |
| Full suite command | `bun run test` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ENH-02 | SyncStatusProvider exposes correct fields via Context | unit | `bunx vitest run apps/web/src/components/sync-status-provider.test.tsx -x` | Wave 0 |
| ENH-02 | useSyncStatus hook returns default values on mount | unit | Same file as above | Wave 0 |
| ENH-08 | Precedence logic: offline > syncing > error > pending > synced | unit | `bunx vitest run apps/web/src/components/sync-status-icon.test.tsx -x` | Wave 0 |
| ENH-08 | Engine callbacks fire onSyncStart/onSyncEnd correctly | unit | `bunx vitest run apps/web/src/lib/sync/engine.test.ts -x` | Existing (extend) |
| ENH-08 | lastError set only after maxRetries exhausted (D-11) | unit | Same engine test file | Existing (extend) |

### Sampling Rate

- **Per task commit:** `bunx vitest run apps/web/src/lib/sync/ apps/web/src/components/sync-status* -x`
- **Per wave merge:** `bun run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `apps/web/src/components/sync-status-provider.test.tsx` -- covers ENH-02 (Provider Context)
- [ ] `apps/web/src/components/sync-status-icon.test.tsx` -- covers ENH-08 (precedence derivation, tooltip text mapping)
- [ ] Extend `apps/web/src/lib/sync/engine.test.ts` -- covers ENH-08 (callback integration, D-11 retry exhaustion)

Note: Testing React Context Providers with `useLiveQuery` in Vitest/jsdom requires `fake-indexeddb/auto` (already configured) and wrapping renders in test providers. The existing test infrastructure is sufficient.

---

## Open Questions

1. **ConnectivityDetector sharing strategy**
   - What we know: Current `startSync()` creates detector internally. Provider needs the same detector for `isOnline`.
   - What's unclear: Should the Provider create the detector and pass it to `startSync`, or should `startSync` return/expose its detector?
   - Recommendation: Provider creates detector and passes it to `startSync(callbacks, detector)`. This keeps the Provider as the single owner of state sources. LOW complexity, clear ownership.

2. **staleness-indicator.tsx disposition**
   - What we know: Used in leaderboard-tab.tsx. Shows "Atualizado ha X" text.
   - What's unclear: Will it be replaced by the new SyncStatusIcon tooltip, or kept for the leaderboard-specific use case?
   - Recommendation: Keep it for now -- it serves a different purpose (leaderboard cache freshness vs global sync status). Can be cleaned up in a future phase.

---

## Sources

### Primary (HIGH confidence)
- `apps/web/src/lib/sync/engine.ts` -- current engine architecture, isSyncing pattern, startSync() signature
- `apps/web/src/lib/sync/connectivity.ts` -- ConnectivityDetector interface and subscribe pattern
- `apps/web/src/lib/sync/constants.ts` -- SYNC_CONFIG.maxRetries = 5
- `apps/web/src/components/providers.tsx` -- current SyncInitializer implementation
- `apps/web/src/components/sidebar-user-menu.tsx` -- target placement, Button size="icon-sm" pattern
- `apps/web/src/components/staleness-indicator.tsx` -- relativeTime() usage, aria-live pattern
- `packages/ui/src/components/tooltip.tsx` -- Base UI React Tooltip API (delay, side, TooltipProvider props)
- `apps/web/src/lib/db/index.ts` -- db.syncQueue table confirmed
- `apps/web/src/lib/lead/relative-time.ts` -- relativeTime() helper PT-BR output
- `.claude/skills/dexiejs/references/framework-integration.md` -- useLiveQuery React pattern with defaultResult
- `.planning/phases/13-sync-visibility/13-CONTEXT.md` -- all 13 implementation decisions
- `.planning/phases/13-sync-visibility/13-UI-SPEC.md` -- visual contract, spacing, icons, colors, animation

### Secondary (MEDIUM confidence)
- `apps/web/src/lib/sync/engine.test.ts` -- existing test patterns for mocking engine dependencies
- `apps/web/vitest.config.ts` -- jsdom env + fake-indexeddb/auto setup confirmed

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and proven in codebase
- Architecture: HIGH -- patterns derived directly from existing code and explicit CONTEXT.md decisions
- Pitfalls: HIGH -- identified from reading actual engine.ts code and established project patterns

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable -- no external dependency changes expected)
