# Phase 14: Leaderboard Identity Normalization - Research

**Researched:** 2026-03-31
**Domain:** PostgreSQL display-name resolution, tRPC server-side query refactor, Dexie offline cache invalidation
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Query uses only `raw_user_meta_data->>'name'`. When null, fallback is `"Vendedor #N"` (N = rank position, 1-indexed). No COALESCE with `full_name` or email for leaderboard.
- **D-02:** Rank-based placeholder `"Vendedor #N"` is dynamic and acceptable for v1.2.
- **D-03:** Remove special "Você" treatment. All vendors — including the authenticated user — display real names.
- **D-04:** `leaderboard.getRanking` no longer needs `currentUserId` for name resolution. `isCurrentUser` stays in payload for visual highlighting only.
- **D-05:** No Dexie schema changes. `leaderboard-tab.tsx` already does `clear()` + `bulkPut()` on every server response — stale "Vendedor" entries are overwritten automatically at next sync. No version bump or migration needed.
- **D-06:** Fix leaderboard + `listVendors` + `admin/stats.getRanking` (all three surfaces).
- **D-07:** For admin surfaces without rank concept (`listVendors`, `stats.getRanking`), fallback when `name` is null may use email prefix — planner's discretion.

### Claude's Discretion

- Fallback exact format for `listVendors` and admin stats when `name` is null (email prefix vs another label).
- Whether to extract a shared `resolveDisplayName` helper or keep fallback inline in each query.
- Exact format of rank in fallback (e.g., `"Vendedor #3"` vs `"#3 Vendedor"`).

### Deferred Ideas (OUT OF SCOPE)

- ENH-05 (backlog): Supabase Realtime for leaderboard sub-5s latency.
- Public user profiles.
- Fallback using full email — decided not to expose other vendors' emails in public leaderboard.
- Dexie schema versioning for this phase.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ENH-06 | Leaderboard mostra um nome legivel para cada vendedor usando fallback canonico quando os metadados de auth estiverem incompletos | D-01/D-02: `ROW_NUMBER()` or runtime rank index used as fallback denominator; SQL pattern confirmed below |
| ENH-09 | Nomes corrigidos permanecem consistentes no cache offline do leaderboard e nas superficies admin relacionadas ao vendedor | D-05: cache overwrite pattern already in place; D-06: all three server surfaces corrected together |
</phase_requirements>

---

## Summary

Phase 14 is a narrow server-side data-hygiene fix: three SQL queries return a display name that is currently null for many users, causing the UI to show a generic static label ("Vendedor" or "Voce"). The fix is to make the database produce a canonical non-null string before the row reaches the application layer.

The core change is replacing the current JS-layer `.map()` fallback in `leaderboard.ts` with a SQL-computed name using `ROW_NUMBER() OVER (ORDER BY score DESC, totalLeads DESC)` as the rank denominator for the leaderboard, and an email-prefix fallback (`SPLIT_PART(u.email, '@', 1)`) for admin surfaces where position is meaningless. The `isCurrentUser` field is retained in the leaderboard payload but is no longer used for name substitution — only for border/background styling in `LeaderboardEntry`.

The Dexie offline cache requires zero structural changes. The existing `clear()` + `bulkPut()` write cycle in `leaderboard-tab.tsx` replaces all cached rows on the next successful network fetch. Stale entries with "Vendedor" are ephemeral: they disappear the moment the device comes back online and the query runs.

**Primary recommendation:** Compute the canonical display name entirely in SQL. Keep the JS layer dumb — no branching on userId, no fallback strings in application code.

---

## Standard Stack

### Core (already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.45 | Raw SQL execution via `db.execute(sql\`...\`)` | Project ORM; `sql` tagged template already used in all three target files |
| PostgreSQL / Supabase | — | `ROW_NUMBER()`, `SPLIT_PART()`, JSONB `->>'key'` operator | All required functions are built-in standard SQL / PostgreSQL; no extensions needed |
| Vitest | 3.2 | Unit tests for router logic | Project test framework; existing `__tests__/` pattern in `packages/api` |

No new packages are required for this phase.

---

## Architecture Patterns

### Recommended Project Structure (unchanged)

```
packages/api/src/
├── routers/
│   ├── leaderboard.ts          # TARGET: SQL fix + remove name-fallback JS logic
│   └── admin/
│       ├── stats.ts            # TARGET: SQL fix in getRanking procedure
│       └── leads.ts            # TARGET: SQL fix in listVendors procedure
apps/web/src/
├── app/(app)/dashboard/
│   └── leaderboard-tab.tsx     # READ-ONLY: verify clear()+bulkPut() still correct
└── components/
    └── leaderboard-entry.tsx   # READ-ONLY: verify isCurrentUser visual-only usage
```

### Pattern 1: Rank-based fallback in SQL (leaderboard query)

**What:** Embed `ROW_NUMBER()` as a subquery or CTE to produce the rank index inside the same SQL statement that fetches the data. Use `COALESCE` to substitute the rank-denominated placeholder when `raw_user_meta_data->>'name'` is null.

**When to use:** Any query that already orders by score and needs a rank-relative fallback without a separate round-trip.

**Example (confirmed pattern — source: existing leaderboard.ts + PostgreSQL docs):**

```sql
-- BEFORE (name can be NULL, fallback in JS):
SELECT
  l.user_id AS "userId",
  u.raw_user_meta_data->>'name' AS "name",
  COUNT(*)::int AS "totalLeads",
  SUM(...)::int AS score
FROM leads l
JOIN auth.users u ON u.id = l.user_id::uuid
WHERE l.deleted_at IS NULL
GROUP BY l.user_id, u.raw_user_meta_data->>'name'
ORDER BY score DESC, "totalLeads" DESC

-- AFTER (name always non-null):
WITH ranked AS (
  SELECT
    l.user_id AS "userId",
    u.raw_user_meta_data->>'name' AS "rawName",
    COUNT(*)::int AS "totalLeads",
    SUM(CASE
      WHEN l.interest_tag = 'quente' THEN 3
      WHEN l.interest_tag = 'morno' THEN 2
      ELSE 1
    END)::int AS score,
    ROW_NUMBER() OVER (
      ORDER BY
        SUM(CASE
          WHEN l.interest_tag = 'quente' THEN 3
          WHEN l.interest_tag = 'morno' THEN 2
          ELSE 1
        END) DESC,
        COUNT(*) DESC
    ) AS rank
  FROM leads l
  JOIN auth.users u ON u.id = l.user_id::uuid
  WHERE l.deleted_at IS NULL
  GROUP BY l.user_id, u.raw_user_meta_data->>'name'
)
SELECT
  "userId",
  COALESCE("rawName", 'Vendedor #' || rank) AS "name",
  "totalLeads",
  score,
  rank
FROM ranked
ORDER BY score DESC, "totalLeads" DESC
```

**Confidence:** HIGH — `ROW_NUMBER() OVER (...)` is standard SQL:2003, confirmed available in PostgreSQL 15+ (Supabase).

### Pattern 2: Email-prefix fallback for admin surfaces

**What:** For `listVendors` and `admin/stats.getRanking`, where no positional rank exists, use `SPLIT_PART(u.email, '@', 1)` as fallback. This is admin-visible only (internal surface), gives useful identification, and does not expose full email to non-admin users.

**When to use:** Admin-only queries without a meaningful rank concept.

```sql
-- listVendors after fix:
SELECT DISTINCT
  l.user_id AS "userId",
  COALESCE(
    u.raw_user_meta_data->>'name',
    SPLIT_PART(u.email, '@', 1)
  ) AS "name"
FROM leads l
JOIN auth.users u ON u.id = l.user_id::uuid
WHERE l.deleted_at IS NULL
ORDER BY "name" ASC

-- admin/stats.getRanking after fix (no positional rank, same COALESCE):
SELECT
  leads.user_id AS "userId",
  COALESCE(
    u.raw_user_meta_data->>'name',
    SPLIT_PART(u.email, '@', 1)
  ) AS "name",
  COUNT(leads.id)::int AS "totalLeads",
  COALESCE(SUM(CASE
    WHEN leads.interest_tag = 'quente' THEN 3
    WHEN leads.interest_tag = 'morno' THEN 2
    ELSE 1
  END), 0)::int AS "score"
FROM leads
JOIN auth.users u ON u.id = leads.user_id::uuid
WHERE ${whereClause}
GROUP BY leads.user_id, u.raw_user_meta_data->>'name', u.email
ORDER BY "score" DESC
```

**Note on GROUP BY:** When adding `u.email` to `COALESCE`, `u.email` must be added to the `GROUP BY` clause. The leaderboard CTE approach sidesteps this by computing the name in the outer SELECT from already-grouped data. For admin stats, adding `u.email` to GROUP BY is safe because `(user_id, email)` is a functional dependency — each `user_id` maps to exactly one email in `auth.users`.

**Confidence:** HIGH — `SPLIT_PART` is a PostgreSQL native string function, confirmed in PostgreSQL 9.1+.

### Pattern 3: JS-layer cleanup in leaderboard.ts

**What:** After moving fallback to SQL, remove the current `.map()` that branches on `currentUserId` to produce "Voce"/"Vendedor". Keep only the `isCurrentUser` flag computation.

```typescript
// BEFORE:
const ranking = (result.rows as Array<{...}>).map((row) => ({
  ...row,
  name:
    row.userId === currentUserId
      ? (row.name ?? "Voce")
      : (row.name ?? "Vendedor"),
  isCurrentUser: row.userId === currentUserId,
}));

// AFTER (name arrives non-null from SQL):
const ranking = (result.rows as Array<{
  userId: string;
  name: string;   // guaranteed non-null by SQL COALESCE
  totalLeads: number;
  score: number;
  rank: number;
}>).map((row) => ({
  ...row,
  isCurrentUser: row.userId === currentUserId,
}));
```

`currentUserId` extraction from `ctx.user.sub` stays — it is still needed to compute `isCurrentUser`.

### Pattern 4: Cache invalidation (no changes needed)

`leaderboard-tab.tsx` already implements the correct pattern:

```typescript
// Line 33-44 in leaderboard-tab.tsx — already correct:
await db.leaderboardCache.clear();
const entries = serverData.ranking.map((r, i) => ({
  userId: r.userId,
  name: r.name,         // will now be "Vendedor #N" instead of "Vendedor"
  totalLeads: r.totalLeads,
  score: r.score,
  rank: i + 1,
  lastSyncAt: serverData.serverTimestamp,
}));
await db.leaderboardCache.bulkPut(entries);
```

When the server returns corrected names, `clear()` wipes all stale "Vendedor" entries, and `bulkPut()` writes the fresh ones. No Dexie schema version bump needed.

### Pattern 5: LeaderboardEntry component (no changes needed)

`leaderboard-entry.tsx` already shows `isCurrentUser` as a visual decoration, not as a name override:

```tsx
// Line 38-41 — already correct, no touch needed:
<p className="font-semibold text-sm">
  {name}
  {isCurrentUser ? " (voce)" : ""}
</p>
```

Per D-03, the " (voce)" suffix should be removed so the user sees only their real name. This is the single UI change: delete the `{isCurrentUser ? " (voce)" : ""}` expression. The `isCurrentUser` prop is still used for the card `border-2 border-primary bg-primary/5` styling on lines 27-31.

### Anti-Patterns to Avoid

- **Fallback in application JS layer:** Do not keep `.name ?? "Vendedor"` in the `.map()`. If the SQL COALESCE is in place, this is redundant and causes double-fallback confusion.
- **Subquery for rank outside CTE:** Using a correlated subquery inside `SELECT` to compute rank is valid but expensive. Use `ROW_NUMBER() OVER (...)` in a CTE or subquery materialized once.
- **Adding `currentUserId` parameter to SQL:** The leaderboard query does not need `WHERE user_id = :currentUserId`; `currentUserId` is only used client-side for styling. Passing it to SQL is unnecessary.
- **schema version bump for Dexie:** Bumping `db.version(6)` for a data-only change (name content, not schema shape) is unnecessary overhead per D-05.
- **Exposing full email in leaderboard:** Confirmed out of scope per deferred section. Email prefix is for admin surfaces only.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rank-indexed placeholder | Custom JS counter | `ROW_NUMBER() OVER (...)` in SQL CTE | SQL window function is atomic with the query; JS counter can desync if rows are filtered post-query |
| Null-safe string | `row.name ?? "fallback"` in JS | `COALESCE(expr, fallback)` in SQL | Single source of truth; consistent across all consumers including future direct DB reads |
| Email extraction | JS `.split('@')[0]` | `SPLIT_PART(u.email, '@', 1)` in SQL | Avoids round-trip to JS for admin queries; consistent grouping behavior |

**Key insight:** The closer to the data source the fallback lives, the fewer places can accidentally return null. Once COALESCE is in SQL, no consumer — tRPC, direct admin client, future analytics — ever sees a null name.

---

## Common Pitfalls

### Pitfall 1: `GROUP BY` mismatch after adding email to COALESCE

**What goes wrong:** `admin/stats.ts` groups by `leads.user_id, u.raw_user_meta_data->>'name'`. Adding `SPLIT_PART(u.email, '@', 1)` to the SELECT requires `u.email` in GROUP BY, otherwise PostgreSQL throws `column "u.email" must appear in the GROUP BY clause`.

**Why it happens:** PostgreSQL requires all non-aggregate SELECT expressions to appear in GROUP BY (unless functionally dependent on a primary key, which requires PostgreSQL 9.6+ functional dependency detection — not reliable here).

**How to avoid:** Add `u.email` to `GROUP BY` in `admin/stats.getRanking`. This is safe: `(user_id, email)` is a functional pair in `auth.users`.

**Warning signs:** `ERROR: column "u.email" must appear in the GROUP BY clause or be used in an aggregate function` at runtime.

### Pitfall 2: CTE score expression duplicated

**What goes wrong:** The leaderboard CTE must repeat the `SUM(CASE WHEN ... END)` expression inside `ROW_NUMBER() OVER (ORDER BY ...)` because window functions cannot reference CTE-computed aggregates in the same SELECT level.

**Why it happens:** SQL evaluation order: window functions run in the same pass as column expressions, before the outer query can reference them.

**How to avoid:** Use a CTE (`WITH ranked AS (...)`) to first compute aggregates, then wrap the window function in the outer SELECT referencing CTE columns — or compute the rank in a subquery. Alternatively, repeat the full CASE expression inside `ROW_NUMBER() OVER (ORDER BY <full expression> DESC)`.

**Warning signs:** `ERROR: aggregate functions are not allowed in window function arguments` when trying to use `score` column directly inside `OVER (ORDER BY score DESC)` in the same query level.

### Pitfall 3: Rank drift between SQL result and JS array index

**What goes wrong:** The rank number embedded in `"Vendedor #N"` is computed by `ROW_NUMBER()` in SQL. The JS `.map((r, i) => ({ rank: i + 1 }))` in `leaderboard-tab.tsx` independently computes `rank` for Dexie cache. If the ORDER BY in SQL changes or row filtering removes entries, the SQL rank and the JS `i+1` will differ.

**Why it happens:** Two independent rank computations on the same data.

**How to avoid:** The SQL query now returns `rank` as an explicit column. Use it in the JS map: `rank: row.rank` instead of `rank: i + 1`. Propagate the `rank` field through the tRPC return type. The Dexie cache then stores the correct SQL-derived rank.

**Warning signs:** A user at position #3 sees "Vendedor #3" in the name but `#4` in the rank display badge — visible inconsistency in tests.

### Pitfall 4: Type mismatch — `name` field changing from `string | null` to `string`

**What goes wrong:** Current tRPC return type for `leaderboard.getRanking` has `name: string | null` in the raw row, then gets cast to `string` in `.map()`. After SQL COALESCE, the column is always `string` but Drizzle's `db.execute()` returns untyped rows — the TypeScript type must be updated manually.

**Why it happens:** `db.execute(sql\`...\`)` returns `{ rows: unknown[] }` — the type annotation in the `.map()` cast must reflect the SQL truth.

**How to avoid:** Update the type annotation for the raw row cast from `name: string | null` to `name: string`. Remove the `?? "..."` fallback in the JS layer entirely.

**Warning signs:** TypeScript showing `name: string` while the JS fallback `?? "Vendedor"` is still present — dead code that will silently mask SQL bugs.

### Pitfall 5: `isCurrentUser` computed in leaderboard-tab.tsx, not from server

**What goes wrong:** After D-04 (`isCurrentUser` stays in payload for visual use), `leaderboard-tab.tsx` at line 98 currently recomputes it client-side: `isCurrentUser={entry.userId === userId}`. If the server-provided `isCurrentUser` field is used instead of the client recomputation, and the tab's `userId` prop is stale, the visual highlighting could break.

**Why it happens:** The tab has dual sources: `entry.isCurrentUser` from server, and `entry.userId === userId` prop comparison.

**How to avoid:** The existing implementation in `leaderboard-tab.tsx` already uses `entry.userId === userId` — this is correct and should remain unchanged. The server `isCurrentUser` field is a convenience that the tab does not need to consume.

---

## Code Examples

### Complete leaderboard query after fix

```typescript
// packages/api/src/routers/leaderboard.ts
// Source: existing code + PostgreSQL ROW_NUMBER() OVER pattern

const result = await db.execute(sql`
  WITH ranked AS (
    SELECT
      l.user_id AS "userId",
      u.raw_user_meta_data->>'name' AS "rawName",
      COUNT(*)::int AS "totalLeads",
      SUM(CASE
        WHEN l.interest_tag = 'quente' THEN 3
        WHEN l.interest_tag = 'morno' THEN 2
        ELSE 1
      END)::int AS score,
      ROW_NUMBER() OVER (
        ORDER BY
          SUM(CASE
            WHEN l.interest_tag = 'quente' THEN 3
            WHEN l.interest_tag = 'morno' THEN 2
            ELSE 1
          END) DESC,
          COUNT(*) DESC
      ) AS rank
    FROM leads l
    JOIN auth.users u ON u.id = l.user_id::uuid
    WHERE l.deleted_at IS NULL
    GROUP BY l.user_id, u.raw_user_meta_data->>'name'
  )
  SELECT
    "userId",
    COALESCE("rawName", 'Vendedor #' || rank) AS "name",
    "totalLeads",
    score,
    rank
  FROM ranked
  ORDER BY score DESC, "totalLeads" DESC
`);

const ranking = (
  result.rows as Array<{
    userId: string;
    name: string;       // non-null guaranteed by COALESCE
    totalLeads: number;
    score: number;
    rank: number;
  }>
).map((row) => ({
  ...row,
  isCurrentUser: row.userId === currentUserId,
}));
```

### listVendors query after fix

```typescript
// packages/api/src/routers/admin/leads.ts — listVendors
const rows = await db.execute(
  sql`
    SELECT DISTINCT
      l.user_id AS "userId",
      COALESCE(
        u.raw_user_meta_data->>'name',
        SPLIT_PART(u.email, '@', 1)
      ) AS "name"
    FROM leads l
    JOIN auth.users u ON u.id = l.user_id::uuid
    WHERE l.deleted_at IS NULL
    ORDER BY "name" ASC
  `
);
return rows.rows as Array<{ userId: string; name: string }>;
```

### admin/stats.getRanking query after fix

```typescript
// packages/api/src/routers/admin/stats.ts — getRanking
const rows = await db.execute(
  sql`
    SELECT
      leads.user_id AS "userId",
      COALESCE(
        u.raw_user_meta_data->>'name',
        SPLIT_PART(u.email, '@', 1)
      ) AS "name",
      COUNT(leads.id)::int AS "totalLeads",
      COALESCE(SUM(CASE
        WHEN leads.interest_tag = 'quente' THEN 3
        WHEN leads.interest_tag = 'morno' THEN 2
        ELSE 1
      END), 0)::int AS "score"
    FROM leads
    JOIN auth.users u ON u.id = leads.user_id::uuid
    WHERE ${whereClause}
    GROUP BY leads.user_id, u.raw_user_meta_data->>'name', u.email
    ORDER BY "score" DESC
  `
);
```

### leaderboard-entry.tsx single-line change

```tsx
// Remove the (voce) suffix per D-03
// BEFORE:
{name}
{isCurrentUser ? " (voce)" : ""}

// AFTER:
{name}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JS-layer fallback `name ?? "Vendedor"` | SQL COALESCE with rank or email prefix | Phase 14 | All consumers get consistent non-null names; JS map is simplified |
| `isCurrentUser` drives name text ("Voce") | `isCurrentUser` drives visual styling only | Phase 14 | Name text is always the real name from auth metadata |

**Deprecated/outdated after this phase:**
- `name ?? "Voce"` branch in `leaderboard.ts` `.map()`: removed.
- `name ?? "Vendedor"` branch: removed.
- `" (voce)"` text suffix in `leaderboard-entry.tsx`: removed.

---

## Open Questions

1. **Helper function extraction (`resolveDisplayName`)**
   - What we know: Three queries have near-identical fallback SQL. A shared SQL fragment (as a TypeScript string constant) would prevent divergence.
   - What's unclear: Drizzle's `sql` tagged template does not support composing template chunks the same way ORMs support computed columns. A reusable SQL snippet would need to be a plain string interpolated inside `sql\`...\``.
   - Recommendation: Planner's discretion (D-07 scoped this as discretionary). A simple TypeScript constant like `const DISPLAY_NAME_EXPR = (prefix: string) => \`COALESCE(${prefix}.raw_user_meta_data->>'name', SPLIT_PART(${prefix}.email, '@', 1))\`` could unify admin surfaces. Leaderboard uses a different fallback (rank-based) so it cannot share the same expression.

2. **`rank` field propagated to Dexie cache type**
   - What we know: `LeaderboardEntry` type in `types.ts` already has `rank: number`. The `leaderboard-tab.tsx` computes it as `i + 1` today.
   - What's unclear: Whether the plan should update `leaderboard-tab.tsx` to use `row.rank` from SQL or keep `i + 1`.
   - Recommendation: Use `row.rank` from SQL (see Pitfall 3). This ensures the "Vendedor #N" placeholder matches the displayed rank badge. The planner should include this as an explicit task step.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is purely code changes to existing tRPC routers and one UI component. No new external tools, services, or runtimes are required. PostgreSQL window functions (`ROW_NUMBER`) and `SPLIT_PART` are available in all PostgreSQL versions used by Supabase (15+).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2 |
| Config file | `packages/api/vitest.config.ts` |
| Quick run command | `cd /home/othavio/Work/profills/sistema-coleta-de-lead && bun run test --filter api` |
| Full suite command | `cd /home/othavio/Work/profills/sistema-coleta-de-lead && bun run test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ENH-06 | `getRanking` returns non-null name for user with null `raw_user_meta_data->>'name'` | unit | `cd ... && bun vitest run packages/api/src/__tests__/leaderboard.test.ts` | ❌ Wave 0 |
| ENH-06 | Fallback format is `"Vendedor #N"` where N matches rank position (1-indexed) | unit | same file | ❌ Wave 0 |
| ENH-06 | `isCurrentUser` flag still present in payload after name-branch removal | unit | same file | ❌ Wave 0 |
| ENH-09 | `listVendors` returns non-null name for user with null metadata | unit | `bun vitest run packages/api/src/__tests__/admin-leads.test.ts` | ✅ (needs new test case) |
| ENH-09 | `admin/stats.getRanking` returns non-null name | unit | `bun vitest run packages/api/src/__tests__/admin-stats.test.ts` | ✅ (needs new test case) |
| ENH-09 | `LeaderboardEntry` renders real name without "(voce)" suffix | unit | `bun vitest run apps/web` | ❌ Wave 0 (optional — UI change is trivial) |

### Sampling Rate

- Per task commit: `bun vitest run packages/api` (fast, node env)
- Per wave merge: `bun run test` (full workspace suite)
- Phase gate: Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `packages/api/src/__tests__/leaderboard.test.ts` — covers ENH-06 fallback logic and `isCurrentUser` flag
- [ ] New test case in `packages/api/src/__tests__/admin-leads.test.ts` — ENH-09 `listVendors` non-null name
- [ ] New test case in `packages/api/src/__tests__/admin-stats.test.ts` — ENH-09 `getRanking` non-null name

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on This Phase |
|-----------|----------------------|
| No `any` — use `unknown` | Row cast in `db.execute()` must use explicit typed interface, not `as any` |
| No `console.log` in production | No debug logging in query functions |
| Biome Ultracite: prefer template literals over string concatenation | `'Vendedor #' \|\| rank` is SQL string concat (PostgreSQL), not JS — fine. JS side uses template literals |
| `cn()` for CSS classes — never string concat | Not applicable to query files |
| Conventional Commits in Portuguese | Commit messages: `fix(14-01): normalizar display name no server...` |
| Indentation: tabs; quotes: double | Apply when editing TypeScript files |
| UI imports: path-based, no barrel | Not applicable — no new UI components |
| `type: "module"` in all packages | Already satisfied; no package.json changes needed |
| GSD workflow required before file edits | Enforce via `/gsd:execute-phase` |

---

## Sources

### Primary (HIGH confidence)

- Direct code inspection: `packages/api/src/routers/leaderboard.ts` — exact current SQL and JS fallback pattern
- Direct code inspection: `packages/api/src/routers/admin/stats.ts` — getRanking query at line 120
- Direct code inspection: `packages/api/src/routers/admin/leads.ts` — listVendors at line 122
- Direct code inspection: `apps/web/src/app/(app)/dashboard/leaderboard-tab.tsx` — clear()+bulkPut() confirmed at lines 33-44
- Direct code inspection: `apps/web/src/components/leaderboard-entry.tsx` — isCurrentUser visual-only usage confirmed
- Direct code inspection: `apps/web/src/lib/db/index.ts` — Dexie at version 5, leaderboardCache schema unchanged
- Direct code inspection: `apps/web/src/lib/db/types.ts` — LeaderboardEntry type confirmed has `rank: number`, `name: string`
- PostgreSQL 15 documentation: `ROW_NUMBER() OVER (...)` window function — standard SQL:2003, available in all PostgreSQL 9.x+
- PostgreSQL 15 documentation: `SPLIT_PART(string, delimiter, field)` — built-in string function since PostgreSQL 7.3
- 14-CONTEXT.md locked decisions D-01 through D-07

### Secondary (MEDIUM confidence)

- Existing test patterns in `packages/api/src/__tests__/` — confirmed mocking style with `vi.doMock` and `vi.resetModules()` per-test for Vitest module isolation

### Tertiary (LOW confidence)

- None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, no new dependencies
- Architecture: HIGH — SQL patterns verified directly from existing query files in codebase
- Pitfalls: HIGH — derived from direct SQL analysis (GROUP BY mismatch, window function ordering, rank drift)
- Test gaps: HIGH — confirmed by glob search, no `leaderboard.test.ts` exists in `packages/api/src/__tests__/`

**Research date:** 2026-03-31
**Valid until:** 2026-05-01 (stable domain — PostgreSQL SQL functions, Dexie schema, project code structure)
