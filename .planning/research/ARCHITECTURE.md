# Architecture Research

**Domain:** Offline-first lead capture with sync — Next.js + tRPC + Drizzle + Supabase + Dexie
**Researched:** 2026-03-24
**Confidence:** HIGH (stack is defined; patterns are well-established for this scale)

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│  BROWSER (Client Layer)                                              │
│                                                                      │
│  ┌──────────────────┐   ┌───────────────────┐  ┌──────────────────┐ │
│  │  React UI        │   │  Dexie DB         │  │  Sync Engine     │ │
│  │  (Next.js App    │   │  (IndexedDB)       │  │  (background     │ │
│  │   Router)        │   │                   │  │   loop)          │ │
│  │                  │   │  leads table       │  │                  │ │
│  │  useLiveQuery()  │◄──│  + syncQueue table │  │  online/offline  │ │
│  │  (reactive)      │   │  + leaderboard     │  │  detection       │ │
│  │                  │   │    snapshot        │  │  + tRPC calls    │ │
│  └──────────────────┘   └───────────────────┘  └────────┬─────────┘ │
│           │                      ▲                       │           │
│           │ write (optimistic)   │ read                  │ sync      │
│           └──────────────────────┘                       │           │
└──────────────────────────────────────────────────────────┼───────────┘
                                                           │
                                              HTTP POST /api/trpc
                                                           │
┌──────────────────────────────────────────────────────────▼───────────┐
│  SERVER (packages/api + apps/web)                                    │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  tRPC Router (packages/api)                                  │    │
│  │  - leads.sync (batch upsert, returns server state)           │    │
│  │  - leads.list (own leads, paginated)                         │    │
│  │  - leads.leaderboard (aggregated cross-user stats)           │    │
│  └─────────────────────────────┬────────────────────────────────┘    │
│                                │                                     │
│  ┌─────────────────────────────▼────────────────────────────────┐    │
│  │  Drizzle ORM (packages/db)                                   │    │
│  │  - leads table (source of truth)                             │    │
│  │  - user FK from Better-Auth                                  │    │
│  └─────────────────────────────┬────────────────────────────────┘    │
└────────────────────────────────┼─────────────────────────────────────┘
                                 │
                    PostgreSQL (Supabase)
```

### Component Responsibilities

| Component | Responsibility | Location |
|-----------|----------------|----------|
| Dexie DB | Local source of truth while offline; cache while online | `apps/web/src/lib/db/` |
| Sync Engine | Watches online status, flushes syncQueue to tRPC, updates local state with server response | `apps/web/src/lib/sync/` |
| syncQueue table | Ordered log of mutations (CREATE/UPDATE/DELETE) waiting to reach server | Inside Dexie DB |
| leaderboard snapshot | Cached read from server stored in Dexie; shown when offline | Inside Dexie DB |
| tRPC `leads.sync` | Batch upsert with server-wins conflict resolution; returns authoritative records | `packages/api/src/routers/leads.ts` |
| tRPC `leads.leaderboard` | Aggregates all users' lead counts/quality when online | `packages/api/src/routers/leads.ts` |
| Drizzle `leads` table | Permanent record with `userId`, timestamps, business fields | `packages/db/src/schema/leads.ts` |

## Recommended Project Structure

```
apps/web/src/
├── lib/
│   ├── db/
│   │   ├── index.ts          # Dexie instance, singleton
│   │   ├── schema.ts         # Dexie table definitions (leads, syncQueue, leaderboardSnapshot)
│   │   └── queries.ts        # Typed Dexie query helpers
│   └── sync/
│       ├── engine.ts         # Core sync loop: flush queue, handle response
│       ├── detector.ts       # navigator.onLine + window events
│       └── status.ts         # React context: 'online'|'offline'|'syncing'|'error'
├── features/
│   └── leads/
│       ├── hooks/
│       │   ├── useLeads.ts         # useLiveQuery on Dexie leads
│       │   └── useCreateLead.ts    # writes to Dexie + enqueues sync op
│       ├── components/             # UI forms, list, capture
│       └── types.ts                # Shared Lead type (Dexie shape)
└── app/
    ├── leads/                # Lead list + capture pages
    └── dashboard/            # Stats + leaderboard

packages/
├── api/src/routers/
│   └── leads.ts              # sync, list, leaderboard procedures
└── db/src/schema/
    └── leads.ts              # Drizzle: leads table
```

### Structure Rationale

- **`lib/db/`:** Dexie is infrastructure, not a feature — isolated from UI and business logic.
- **`lib/sync/`:** Sync is a cross-cutting concern that runs independently of any specific feature; keeps engine logic out of components.
- **`features/leads/`:** All lead-specific UI, hooks, and types colocated. Hooks are the boundary between Dexie reads and React components.

## Architectural Patterns

### Pattern 1: Dexie as Primary Write Target (Optimistic Local-First)

**What:** Every write (create/update/delete) goes to Dexie immediately. The UI reads from Dexie via `useLiveQuery`. Sync to server happens asynchronously in the background.

**When to use:** Always — for all lead mutations during the event.

**Trade-offs:** UI is always fast; server eventually consistent. Acceptable for lead capture where speed matters more than immediate cross-device consistency.

**Example:**
```typescript
// apps/web/src/features/leads/hooks/useCreateLead.ts
export const useCreateLead = () => {
  return async (data: CreateLeadInput) => {
    const localId = crypto.randomUUID();
    // 1. Write to Dexie immediately
    await db.leads.add({
      localId,
      ...data,
      syncStatus: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    // 2. Enqueue sync operation
    await db.syncQueue.add({
      operation: "CREATE",
      localId,
      payload: data,
      timestamp: Date.now(),
      retryCount: 0,
      status: "pending",
    });
  };
};
```

### Pattern 2: syncQueue as Ordered Mutation Log

**What:** Every mutation appends to a `syncQueue` table in Dexie (not just a flag on the record). The queue tracks: operation type, localId, payload, timestamp, retryCount, status.

**When to use:** Whenever you need ordered replay, retry on failure, and deduplication.

**Trade-offs:** Slightly more storage/complexity than a simple `syncStatus` flag on records. Worth it for correctness when handling retries and deletions.

**Why not just a flag:** A flag on the lead record can't represent a DELETE (record is gone), can't handle multiple operations on the same record in sequence, and can't retry independently.

```typescript
// Dexie schema (apps/web/src/lib/db/schema.ts)
export interface SyncQueueItem {
  id?: number;           // auto-increment
  operation: "CREATE" | "UPDATE" | "DELETE";
  localId: string;       // references leads.localId
  serverId?: string;     // set after first successful sync
  payload: unknown;
  timestamp: number;
  retryCount: number;
  status: "pending" | "processing" | "failed";
  error?: string;
}
```

### Pattern 3: Server Wins — Pull After Push

**What:** After the sync engine pushes mutations to `leads.sync`, the tRPC procedure returns the authoritative server state for all affected records. The client overwrites local Dexie records with the server response.

**When to use:** Always for conflict resolution in this system. Rationale from PROJECT.md: server is source of truth.

**Trade-offs:** A user who edited a lead offline and another user edited the same lead online will silently lose their offline change. Acceptable for a max-10-user team at a single event.

**Implementation:**
```typescript
// Sync engine receives server response and overwrites local
for (const serverLead of syncResponse.leads) {
  await db.leads.where("serverId").equals(serverLead.id).modify({
    ...serverLead,
    syncStatus: "synced",
    serverId: serverLead.id,
  });
}
```

### Pattern 4: Leaderboard as Read-Through Cache

**What:** The leaderboard data is server-only (requires aggregating all users). When online, the sync engine fetches it after each successful sync and writes a snapshot to a `leaderboardSnapshot` Dexie table. When offline, the UI reads the cached snapshot.

**When to use:** For any cross-user aggregate data that cannot be computed locally.

**Trade-offs:** Offline leaderboard is stale (last sync). Acceptable — event context means data is "good enough" for a few minutes. No need for a real-time subscription.

```typescript
// After successful sync
const leaderboard = await trpc.leads.leaderboard.query();
await db.leaderboardSnapshot.put({
  id: 1, // single record, always overwrite
  data: leaderboard,
  cachedAt: new Date().toISOString(),
});
```

## Data Flow

### Offline Write Flow (Lead Capture)

```
User submits form
       |
       v
useCreateLead()
       |
       +---> db.leads.add({ syncStatus: "pending", localId: uuid })
       |
       +---> db.syncQueue.add({ operation: "CREATE", localId, payload })
       |
       v
useLiveQuery() detects change
       |
       v
UI updates immediately (optimistic)
       |
       v
[network available?]
       |
  YES  +---> Sync Engine triggers (see Online Sync Flow)
  NO       Nothing. Data persists in IndexedDB until reconnection.
```

### Online Sync Flow (Reconnect or Periodic)

```
network online event OR 30s poll
       |
       v
Sync Engine
       |
       +---> Read all syncQueue WHERE status = "pending" (ordered by timestamp)
       |
       +---> Group by localId, collapse redundant operations
       |         (CREATE + UPDATE = CREATE with latest payload)
       |         (CREATE + DELETE = discard both)
       |
       +---> POST to tRPC leads.sync({ mutations: [...] })
       |
       v
tRPC leads.sync procedure (packages/api)
       |
       +---> Validate input (Zod)
       |
       +---> For each mutation:
       |         CREATE: INSERT leads ON CONFLICT DO UPDATE (upsert by localId+userId)
       |         UPDATE: UPDATE leads WHERE id = serverId AND userId = ctx.userId
       |         DELETE: soft DELETE (deletedAt timestamp, not physical row removal)
       |
       +---> Return { leads: AuthoritativeRecord[], leaderboard: LeaderboardData }
       |
       v
Client receives server response
       |
       +---> Overwrite Dexie leads with server records (server wins)
       |
       +---> Set syncStatus = "synced" on affected records
       |
       +---> Remove processed items from syncQueue
       |
       +---> Write leaderboard to leaderboardSnapshot
       |
       v
useLiveQuery() triggers re-render with fresh data
```

### Read Flow (Online vs Offline)

```
Component mounts
       |
       v
useLiveQuery(db.leads.where("userId").equals(currentUserId))
       |
       v
Always reads from Dexie (fast, same code online or offline)
       |
       v
syncStatus field on each lead indicates freshness:
  "pending"    → lead not yet confirmed by server (show indicator)
  "synced"     → lead confirmed by server
  "failed"     → sync failed after retries (show error action)
```

### Leaderboard Read Flow

```
Component mounts
       |
       v
[network available?]
       |
  YES  +---> trpc.leads.leaderboard.query() → live server data
       |      on success: update leaderboardSnapshot in Dexie
       |
  NO   +---> useLiveQuery(db.leaderboardSnapshot) → cached data
       |      show staleness indicator (cachedAt timestamp)
```

## Key Design Decisions

### `localId` vs `serverId` duality

Every lead record has two identifiers:

- `localId` (UUID, generated client-side at creation) — permanent, never changes, used to correlate Dexie record with syncQueue entries
- `serverId` (UUID or serial from Postgres, assigned on first successful sync) — null until synced

The Dexie `leads` table is indexed on `localId`. The server upserts on `(localId, userId)` as a natural key to prevent duplicate rows if a CREATE is replayed.

### Soft deletes

Physical deletes in Dexie cause a sync problem: there is no payload to send to the server once the record is gone. Soft deletes (`deletedAt` timestamp) solve this — the record persists in Dexie with `deletedAt` set until sync confirms deletion server-side, then it can be removed from IndexedDB.

### Batch sync, not per-operation

Send all pending operations in a single tRPC call per sync cycle. This reduces round-trips on reconnect after extended offline periods (e.g., 2 hours in a conference hall with no signal).

### No real-time subscription

Supabase Realtime is out of scope for v1. The leaderboard updates on sync cycle completion (every 30s when online), which is sufficient for a 10-person team. Saves complexity of WebSocket management.

## Build Order (What Depends on What)

```
1. Drizzle leads schema (packages/db)
       ↓
2. tRPC leads router — basic CRUD (packages/api)
       ↓
3. Dexie schema + db singleton (apps/web/src/lib/db)
       ↓
4. Sync Engine + detector (apps/web/src/lib/sync)
       ↓
5. Lead capture UI hooks (features/leads/hooks)
       ↓
6. Lead capture form + list (features/leads/components)
       ↓
7. Dashboard + leaderboard (app/dashboard)
```

Dependency rationale:
- Dexie schema must mirror the Drizzle schema (same fields) — define server schema first.
- Sync engine depends on both Dexie DB and tRPC client — build both before the engine.
- UI hooks depend only on Dexie (not tRPC directly) — decouples UI from network.
- Leaderboard depends on sync being functional (it piggybacks on sync cycle).

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1-10 users (v1 target) | Single Postgres DB, no caching layer, 30s sync poll, batch sync. Current design sufficient. |
| 10-100 users | Add Supabase Realtime for leaderboard push instead of poll. Index `leads(userId, createdAt)` in Postgres. |
| 100+ users | Separate leaderboard into a materialized view or Redis sorted set. Rate-limit sync endpoint per user. |

### First bottleneck

At 10 users creating leads rapidly, the `leads.leaderboard` query runs a COUNT aggregation on every sync. At 10 users this is trivial. First real bottleneck would be the leaderboard query — add a `GROUP BY userId` index or materialized view at 50+ users.

## Anti-Patterns

### Anti-Pattern 1: Reading from tRPC in UI Components Directly (Bypassing Dexie)

**What people do:** Use `trpc.leads.list.useQuery()` for the leads list page (normal React Query pattern).

**Why it's wrong:** This works only when online. Going offline silently shows a loading state or error. The UI becomes non-functional when the network drops — exactly what this system is designed to prevent.

**Do this instead:** Always read from Dexie via `useLiveQuery`. The sync engine keeps Dexie populated. UI never talks to tRPC directly for reads — only the sync engine does.

### Anti-Pattern 2: syncStatus Flag on Lead Record Instead of a Separate Queue

**What people do:** Add a `syncStatus: "pending" | "synced"` field to the lead Dexie record and loop over pending records on reconnect.

**Why it's wrong:** Cannot represent DELETE operations (record is gone). Cannot handle sequenced operations (update then delete). Cannot retry independently from the read model. Creates race conditions if the same lead is modified again before the first sync completes.

**Do this instead:** Separate `syncQueue` table with one row per mutation operation, ordered by timestamp.

### Anti-Pattern 3: Syncing One Record at a Time

**What people do:** When online, immediately fire a tRPC mutation for every Dexie write.

**Why it's wrong:** At an event with intermittent WiFi, the user may capture 30 leads offline. On reconnect, firing 30 sequential requests creates waterfall latency, partial failures, and race conditions.

**Do this instead:** Batch all pending operations into a single `leads.sync` call. The server processes them transactionally.

### Anti-Pattern 4: Physical Deletes in Dexie Before Server Confirmation

**What people do:** `db.leads.delete(id)` immediately when user hits delete, then enqueue a DELETE to the server.

**Why it's wrong:** If the app closes before sync runs, the delete intent is preserved in the queue but the original record is gone — the server can't be told which record to delete (no payload to reference).

**Do this instead:** Soft delete (`deletedAt = new Date()`), keep the record in Dexie until server confirms deletion, then remove from IndexedDB.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase (Postgres) | Drizzle ORM → connection string via `DATABASE_URL` | Standard; no Supabase-specific SDK needed in v1 |
| Better-Auth | Session cookie read in tRPC context (`packages/api/src/context.ts`) | `leads.sync` must be a `protectedProcedure` |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Dexie DB ↔ Sync Engine | Direct Dexie API calls (not via hooks) | Engine runs outside React tree |
| Sync Engine ↔ tRPC | `createTRPCClient` (vanilla client, not React hooks) | Engine is not a component; cannot use `useMutation` |
| UI ↔ Dexie | `useLiveQuery()` from `dexie-react-hooks` (v4.2.0 installed) | Reactive; re-renders on any Dexie change |
| UI ↔ Sync Status | React Context (`SyncStatusContext`) | Exposes 'online'\|'offline'\|'syncing'\|'error' to components |
| tRPC procedure ↔ Drizzle | Direct: `db.insert(leads).values(...)` in router handler | Follows existing pattern from `packages/api` |

## Sources

- Dexie.js docs — [useLiveQuery()](https://dexie.org/docs/dexie-react-hooks/useLiveQuery())
- [Offline sync & conflict resolution patterns practical guide (Feb 2026)](https://www.sachith.co.uk/offline-sync-conflict-resolution-patterns-architecture-trade%E2%80%91offs-practical-guide-feb-19-2026/)
- [Offline-first frontend apps in 2025 — LogRocket Blog](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/)
- [Build-from-scratch sync engine — DEV Community](https://dev.to/daliskafroyan/builing-an-offline-first-app-with-build-from-scratch-sync-engine-4a5e)
- Existing codebase: `.planning/codebase/ARCHITECTURE.md` (tRPC + Drizzle + Better-Auth patterns)
- `package.json` root: dexie@^4.3.0, dexie-react-hooks@^4.2.0 (already installed)

---
*Architecture research for: offline-first lead capture — Dexie + tRPC + Drizzle + Supabase*
*Researched: 2026-03-24*
