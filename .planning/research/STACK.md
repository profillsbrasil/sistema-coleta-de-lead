# Stack Research

**Domain:** Offline-first lead capture with sync, QR scanning, image capture, real-time leaderboard
**Researched:** 2026-03-24
**Confidence:** MEDIUM — core libraries verified; sync strategy derived from architecture constraints

---

## Context: What Already Exists

The existing monorepo uses Drizzle + `pg` to talk to Supabase PostgreSQL directly. There is **no supabase-js SDK installed**. This is a critical constraint: real-time features must be implemented via polling + tRPC or by adding supabase-js selectively, not by assuming the Supabase client is available.

Dexie 4.3.0 and dexie-react-hooks 4.2.0 are **already installed** but not configured. No sync infrastructure exists yet.

---

## Recommended Stack

### Core New Libraries

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@yudiel/react-qr-scanner` | 2.5.1 | QR code scanning via device camera | Explicitly supports React `^17 \|\| ^18 \|\| ^19`; actively maintained (v2.5.1 confirmed); built on ZXing; has camera switch, torch, TypeScript types |
| `@supabase/supabase-js` | 2.100.0 | Supabase Storage upload + Realtime channel for leaderboard | Needed for Storage (image upload from browser) and Realtime (leaderboard push); the `pg`+Drizzle path cannot do either client-side |
| `browser-image-compression` | 2.0.x | Compress camera captures before upload | 732k weekly downloads; canvas-based; pure browser, no server round-trip; prevents large blobs clogging sync queue |

### Already Installed — Needs Configuration

| Library | Version | Purpose | Configuration Needed |
|---------|---------|---------|----------------------|
| `dexie` | 4.3.0 | IndexedDB wrapper — primary offline store | Define leads schema, sync queue table, `updatedAt` timestamps |
| `dexie-react-hooks` | 4.2.0 | Reactive queries on Dexie from React components | No extra install; use `useLiveQuery` for reactive lead lists |

### Supporting Libraries — Already Present

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `@trpc/client` + `@trpc/tanstack-react-query` | 11.x | Sync transport: push local changes, pull server state | tRPC replaces supabase-js as the data API for leads; Storage/Realtime still needs supabase-js |
| `zod` | 4.x | Validate sync payloads at API boundary | Already used project-wide |
| `sonner` | 2.x | Toast feedback for sync status, QR scan success | Already installed |

---

## Sync Architecture: Dexie + tRPC + Supabase (PostgreSQL)

### The Strategy: Timestamp-Based Pull/Push via tRPC

No DexieCloud. No `dexie-syncable`. No RxDB. The existing tRPC + Drizzle stack is the sync transport. This keeps the architecture coherent and avoids adding a second backend communication layer.

**Schema requirements in Dexie:**

```typescript
// packages/db/src/schema/leads.ts (Drizzle — server source of truth)
// id: uuid (primary key)
// userId: text (FK to Better-Auth user)
// syncedAt: timestamp (set by server on insert/update)
// updatedAt: timestamp (set by client, preserved through sync)
// deletedAt: timestamp | null (soft delete for sync tombstones)

// Local Dexie schema (apps/web)
class LeadsDb extends Dexie {
  leads!: Table<Lead>
  syncQueue!: Table<SyncQueueEntry>  // pending operations

  constructor() {
    super("leads-db")
    this.version(1).stores({
      leads: "id, userId, updatedAt, syncedAt",
      syncQueue: "++id, operation, entityId, createdAt",
    })
  }
}
```

**Sync flow:**

1. **Write path (offline):** Every lead mutation writes to Dexie immediately (optimistic). A `syncQueue` entry is appended with `{ operation: "upsert" | "delete", entityId, payload, createdAt }`.

2. **Online detection:** `navigator.onLine` event + `window.addEventListener("online")` trigger sync. Also run on app mount if online.

3. **Push:** Drain `syncQueue` in order. Each entry calls the appropriate tRPC mutation (`leads.upsert`, `leads.softDelete`). On server success, mark queue entry as processed and update `lead.syncedAt` in Dexie.

4. **Pull:** After pushing, call `leads.pullSince({ since: lastPulledAt })` — a tRPC query that returns all server leads with `syncedAt > lastPulledAt`. Merge into Dexie with **server-wins** conflict resolution: server record overwrites local if `serverLead.updatedAt > localLead.updatedAt`.

5. **Conflict resolution:** Server wins. If a lead was edited locally while offline AND on another device, the server's version replaces the local one on next pull. This matches the project's stated constraint.

6. **Image sync:** Images are NOT stored in Dexie. Store the local File/Blob in a separate `imageQueue` Dexie table (or as a `Blob` column). On sync, upload to Supabase Storage via supabase-js client, then store the public URL in the lead record before pushing to tRPC.

**Confidence:** MEDIUM — this pattern (timestamp-based pull/push with a local queue) is the standard approach documented in Dexie.js sync guides. The specific tRPC transport integration is architecture-derived, not copied from an existing open-source reference.

---

## QR Code Scanning

### Recommendation: `@yudiel/react-qr-scanner` 2.5.1

**Why not `react-zxing`:** Last published a year ago (pre-React 19); no explicit React 19 peer dependency declaration. Risky for a React 19 project.

**Why not `html5-qrcode`:** The underlying library is unmaintained. Multiple sources confirm this.

**Why not raw `@zxing/browser`:** Works, but requires building the entire camera/video UI from scratch. `@yudiel/react-qr-scanner` wraps ZXing with camera controls, torch support, and TypeScript types already built. The project's constraint is "< 3 taps to save a lead" — using a ready component is correct.

**WhatsApp QR format:** Supabase QR encodes `https://wa.me/55XXXXXXXXXXX`. Parse with a simple regex:
```typescript
const WHATSAPP_RE = /https:\/\/wa\.me\/(\d+)/
const phone = result.match(WHATSAPP_RE)?.[1] ?? null
```

**Confidence:** HIGH — version confirmed via official GitHub repo (`package.json` at `yudielcurbelo/react-qr-scanner`), React 19 peer dep explicitly declared.

---

## Image Capture and Storage

### Capture: Native Browser `<input type="file" accept="image/*" capture="environment">`

Use the native HTML input with `capture="environment"`. This triggers the rear camera on mobile Chrome and Safari without any library. Works in iOS Safari 14+ and Chrome Mobile. No extra dependency needed.

```typescript
// Sufficient for the use case
<input
  type="file"
  accept="image/*"
  capture="environment"
  onChange={handleCapture}
/>
```

**Why not MediaDevices API directly:** Requires getUserMedia + canvas + manual JPEG encoding. The native input is simpler, well-supported on target devices (Chrome + Safari mobile), and handles orientation correction natively.

### Compression: `browser-image-compression` 2.0.x

Compress before upload to avoid large Supabase Storage costs and slow uploads on poor event Wi-Fi. Target `maxWidthOrHeight: 800, maxSizeMB: 0.5`.

### Storage: Supabase Storage via `@supabase/supabase-js`

Upload from the browser using the Supabase Storage client directly. The file path pattern: `leads/{userId}/{leadId}.jpg`. Return the public URL and store it in the lead record.

```typescript
// supabase-js client (browser, anon key)
const { data } = await supabase.storage
  .from("lead-photos")
  .upload(`${userId}/${leadId}.jpg`, compressedBlob, {
    contentType: "image/jpeg",
    upsert: true,
  })
```

**Env vars needed:**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

These are public (NEXT_PUBLIC_) — safe to expose to the browser. Add to T3 Env `web.ts`.

**Confidence:** HIGH — official Supabase Storage API confirmed. The blob upload pattern is documented in official Supabase JS reference.

---

## Real-Time Leaderboard

### Recommendation: Polling via tRPC (primary) + optional Supabase Realtime (enhancement)

**Why polling first:** The project has no supabase-js installed today. The leaderboard shows aggregate data (count + score per user). Polling every 30s via TanStack Query's `refetchInterval` is sufficient for a conference leaderboard — it does not need sub-second latency.

```typescript
// TanStack Query polling — zero new dependencies
const { data } = trpc.leaderboard.get.useQuery(undefined, {
  refetchInterval: 30_000,
  staleTime: 15_000,
})
```

**If sub-5s latency is needed:** Add Supabase Realtime. Subscribe to `postgres_changes` on the `leads` table in a `useEffect` hook in the leaderboard client component. Trigger a TanStack Query invalidation on each INSERT/UPDATE event. Do not read the change payload for business logic — just use it as an invalidation signal to re-run the tRPC query. This keeps the data layer in tRPC.

```typescript
// Only if polling is not enough — requires @supabase/supabase-js
useEffect(() => {
  const channel = supabase
    .channel("leaderboard-watch")
    .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => {
      utils.leaderboard.get.invalidate()
    })
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}, [utils])
```

**Leaderboard offline behavior:** Serve stale TanStack Query cache. The last fetched leaderboard remains visible. This matches the requirement: "Leaderboard offline com dados da ultima sincronizacao."

**Confidence:** HIGH (polling pattern) / MEDIUM (Realtime enhancement — requires enabling Realtime on the leads table in Supabase dashboard, plus adding NEXT_PUBLIC_SUPABASE env vars).

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `@yudiel/react-qr-scanner` | `react-zxing` | No React 19 peer dep; last update pre-React 19 |
| `@yudiel/react-qr-scanner` | `html5-qrcode` | Underlying library unmaintained (confirmed by multiple 2025 sources) |
| Timestamp pull/push via tRPC | `dexie-syncable` | Addon is experimental, not updated for Dexie 4; would add server-side sync protocol endpoint |
| Timestamp pull/push via tRPC | DexieCloud | Paid SaaS; defeats the purpose of owning the backend; not compatible with existing Better-Auth users |
| Timestamp pull/push via tRPC | PowerSync | External managed service; adds vendor dependency; over-engineered for ≤10 users |
| Timestamp pull/push via tRPC | RxDB | Replaces Dexie entirely; Dexie is already installed and simpler |
| Native `<input capture>` | `react-webcam` | Extra dependency; the native approach works identically on Chrome and Safari mobile |
| `browser-image-compression` | Server-side resizing | Adds latency; requires uploading full-resolution image first |
| TanStack Query polling | Supabase Realtime (primary) | Would require adding supabase-js AND enabling Realtime on table AND handling auth separately; polling is sufficient for ≤10 users in a conference |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `dexie-syncable` | Not maintained for Dexie 4; experimental API; requires server-side ISyncProtocol endpoint | Custom pull/push via tRPC |
| `react-zxing` 2.1.0 | Last published pre-React 19; no explicit React 19 peer dep; project uses React 19.2 | `@yudiel/react-qr-scanner` 2.5.1 |
| `html5-qrcode` | Unmaintained (multiple 2025 sources confirm); decoder is ZXing-js anyway | `@yudiel/react-qr-scanner` |
| DexieCloud | Paid SaaS; auth separate from Better-Auth; not designed for custom backends | tRPC sync endpoints |
| Supabase Realtime as primary data transport | No supabase-js installed; would create parallel auth system; over-engineered for this scale | tRPC + TanStack Query polling |
| `compressorjs` | Less maintained than `browser-image-compression`; smaller community | `browser-image-compression` |

---

## Installation

```bash
# From monorepo root
bun add @yudiel/react-qr-scanner @supabase/supabase-js browser-image-compression --filter web

# @yudiel/react-qr-scanner is a client-side component — goes in apps/web only
# @supabase/supabase-js goes in apps/web (browser client for Storage + optional Realtime)
# browser-image-compression goes in apps/web (browser-only compression)

# dexie and dexie-react-hooks are already installed in apps/web — no new install needed
```

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@yudiel/react-qr-scanner@2.5.1` | React `^17 \|\| ^18 \|\| ^19` | Explicitly declared in peer deps |
| `dexie@4.3.0` | `dexie-react-hooks@4.2.0` | Already installed; peer dep satisfied |
| `@supabase/supabase-js@2.100.0` | Node.js 20+ | Node 18 dropped in v2.79.0; project uses Node 22 — OK |
| `browser-image-compression@2.0.x` | Browser (Canvas API) | Client-side only; do not import in server components |

---

## Environment Variables to Add

```bash
# apps/web/.env — add to existing file
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Add validation in `packages/env/src/web.ts` (client-side T3 Env):

```typescript
NEXT_PUBLIC_SUPABASE_URL: z.url(),
NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
```

---

## Sources

- GitHub: `yudielcurbelo/react-qr-scanner` — version 2.5.1 confirmed, React 19 peer dep confirmed — HIGH confidence
- GitHub: `supabase/supabase-js` — v2.100.0 latest (March 23, 2026) — HIGH confidence
- npm: `dexie@4.3.0` — confirmed via `bun.lock` and `bun info` — HIGH confidence
- npm: `browser-image-compression` — 732k weekly downloads, 2.0.x latest, canvas-based — MEDIUM confidence (npm 403, confirmed via search)
- npm: `react-zxing@2.1.0` — last published pre-React 19; no React 19 compat — HIGH confidence (WebSearch)
- Dexie.js docs: syncable patterns, timestamp sync strategy — MEDIUM confidence (official docs referenced; no Dexie 4-specific sync guide found)
- Supabase Storage docs: blob upload pattern — HIGH confidence (official reference at `supabase.com/docs/reference/javascript/storage-from-upload`)
- Supabase Realtime: postgres_changes pattern for Next.js client components — MEDIUM confidence (multiple 2025 guides corroborate the pattern)
- Architecture constraint: no supabase-js installed — HIGH confidence (verified via `grep` across all `package.json` files in monorepo)

---

*Stack research for: offline-first lead capture (Dexie + tRPC + Supabase sync, QR scanning, image capture, real-time leaderboard)*
*Researched: 2026-03-24*
