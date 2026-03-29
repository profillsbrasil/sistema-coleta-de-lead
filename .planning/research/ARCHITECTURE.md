# Architecture Research

**Domain:** Offline-first lead collection app milestone enhancements
**Researched:** 2026-03-28
**Confidence:** HIGH

## Standard Architecture

### System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                     App Router UI Shell                     │
├─────────────────────────────────────────────────────────────┤
│  AppSidebar / AppTopbar / login or dashboard CTA surfaces  │
└───────────────┬───────────────────────────────┬─────────────┘
                │                               │
┌───────────────▼──────────────┐   ┌────────────▼─────────────┐
│   Client feature modules      │   │   Existing sync runtime  │
│  export / install / status UI │   │ connectivity + syncCycle │
└───────────────┬──────────────┘   └────────────┬─────────────┘
                │                               │
┌───────────────▼────────────────────────────────▼─────────────┐
│                  API + server query boundary                 │
│        tRPC routers, server SQL, trusted Supabase access     │
└───────────────┬────────────────────────────────┬─────────────┘
                │                                │
┌───────────────▼──────────────┐   ┌─────────────▼─────────────┐
│      Dexie client cache      │   │   Postgres / auth.users   │
│ leads, syncQueue, ranking    │   │ leaderboard identities    │
└──────────────────────────────┘   └───────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Sync status presenter | Show online/offline, pending, syncing, last success | Small client store or event bridge on top of the existing sync engine |
| Export module | Convert lead records to export rows and trigger download | Shared utility plus screen-level action buttons |
| Leaderboard identity mapper | Produce readable names for ranking entries | Server-side fallback mapping in the leaderboard router |
| Install controller | Decide when to show install CTA or iOS guidance | Lightweight client component using `beforeinstallprompt` and `display-mode` checks |

## Recommended Project Structure

```text
apps/web/src/
├── components/            # Shell and reusable UI
│   ├── app-topbar.tsx     # Good target for sync/install surface
│   └── [new status CTA].tsx
├── lib/
│   ├── lead/              # Export formatting and lead row mapping
│   ├── sync/              # Existing engine, detector, new state bridge
│   └── pwa/               # Small install controller utilities
├── app/
│   ├── layout.tsx         # Root metadata + providers
│   ├── manifest.ts        # New install metadata
│   └── (app)/             # Authenticated routes using shell UI
└── public/                # PWA icons
```

### Structure Rationale

- **`lib/sync/`:** The sync engine already owns connectivity and queue behavior; v1.2 should publish UI-safe state from here instead of duplicating logic in components.
- **`lib/lead/`:** Export formatting belongs with lead-domain utilities so vendedor and admin screens can share one export path.
- **`lib/pwa/`:** Install prompt logic is browser-specific and should stay isolated from page components.
- **`components/`:** Status badges and install CTA are cross-route UI concerns.

## Architectural Patterns

### Pattern 1: Thin UI over existing runtime state

**What:** Keep sync/connectivity truth in the existing engine and expose a small read model for the UI.
**When to use:** For shell-level status that must reflect real queue/sync behavior.
**Trade-offs:** Slightly more plumbing now, but avoids two competing state machines later.

### Pattern 2: Shared export pipeline

**What:** One domain utility maps lead records to exported rows for both vendedor and admin experiences.
**When to use:** When the same dataset needs different UI entry points but identical file semantics.
**Trade-offs:** Requires clarifying scope rules, but prevents format drift between screens.

### Pattern 3: Server-side identity fallback

**What:** Resolve leaderboard display names in the backend before caching and rendering.
**When to use:** When auth metadata is provider-dependent and the client should not need to understand fallback rules.
**Trade-offs:** Slightly more router logic, but cleaner cached data and simpler UI rendering.

## Data Flow

### Request Flow

```text
[User clicks export/install/status surface]
    ↓
[Client component]
    ↓
[Feature utility or router call]
    ↓
[Dexie / sync engine / leaderboard router]
    ↓
[UI feedback or downloaded file]
```

### State Management

```text
[sync engine + connectivity detector]
    ↓ (publish read model)
[shell status component]
    ↓
[user trust / retry decision]
```

### Key Data Flows

1. **Export flow:** screen action -> shared export mapper -> browser download.
2. **Connectivity flow:** sync runtime -> derived status model -> topbar/sidebar badge.
3. **Leaderboard identity flow:** server SQL -> fallback mapping -> Dexie cache -> leaderboard UI.
4. **Install flow:** manifest/icons + browser eligibility -> install CTA or iOS guidance.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Up to 10 sellers per event | Current monorepo and direct SQL approach is sufficient |
| More sellers / more exports | Prefer server-generated filtered exports only if client export becomes too heavy |
| Multiple events / richer identity needs | Consider a first-class `profiles` table later |

### Scaling Priorities

1. **First bottleneck:** export scope correctness, not raw compute cost.
2. **Second bottleneck:** identity consistency across auth providers.

## Anti-Patterns

### Anti-Pattern 1: Reimplementing sync truth in React only

**What people do:** Build a shell badge from `navigator.onLine` plus local component state.
**Why it's wrong:** The UI says "online" while queued work is still pending or failing.
**Do this instead:** Derive the badge from the sync engine, queue, and last success metadata.

### Anti-Pattern 2: Tying export to rendered rows

**What people do:** Export whatever happens to be loaded in the current table/card list.
**Why it's wrong:** Admin pagination and infinite scroll silently produce incomplete files.
**Do this instead:** Define export scope explicitly and fetch/map all matching rows for that scope.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase Auth metadata | Trusted backend SQL / server-side router access | Good enough for leaderboard fallback in this milestone |
| Browser install APIs | Client-side event listeners and display-mode checks | Chromium prompt support is different from iOS Safari |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `components/app-topbar.tsx` ↔ `lib/sync/*` | Read-only status model | Likely home for a connectivity/sync badge |
| `app/(app)/leads/*` ↔ `lib/lead/export-csv.ts` | Direct utility call | Existing entry point already exists |
| `app/(app)/admin/leads/*` ↔ `lib/lead/export-csv.ts` | Direct utility call | Needs scope correctness beyond paginated rows |
| `packages/api/src/routers/leaderboard.ts` ↔ `auth.users` | Server-side SQL | Fallback logic should live here before cache population |

## Sources

- Current codebase modules for sync, export, app shell, and leaderboard
- Next.js manifest/PWA documentation
- Supabase user metadata documentation

---
*Architecture research for: offline-first lead collection milestone enhancements*
*Researched: 2026-03-28*
