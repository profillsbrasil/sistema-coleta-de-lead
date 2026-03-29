# Phase 12: Export Workflows - Research

**Researched:** 2026-03-29
**Domain:** Offline-first CSV export workflows for seller and admin lead datasets
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** [auto] Seller export must respect the active `/leads` scope and include all matching leads for that scope, not just the currently loaded infinite-scroll slice.
- **D-02:** [auto] Admin export must respect the selected vendor and active filters and include the full matching dataset, not only the current paginated page.
- **D-03:** [auto] v1.2 ships one spreadsheet-friendly export contract: UTF-8 CSV that opens cleanly in Excel and Google Sheets. Native `.xlsx` is explicitly deferred.
- **D-04:** [auto] The CSV contract must preserve readable pt-BR labels/values, deterministic file naming, and spreadsheet safety, including neutralizing formula-like user input before download.
- **D-05:** [auto] Export stays in the existing seller and admin screens instead of introducing a separate export center or background job flow.
- **D-06:** [auto] Export UX must make scope explicit and confirm what was exported, including row count or equivalent confidence feedback after download starts.

### Claude's Discretion
- Exact filename shape beyond being deterministic and scope-aware
- Whether seller/admin surfaces use one explicit export action or contextual variants such as "Exportar filtrados" vs "Exportar tudo", as long as scope is unambiguous
- Exact success-feedback presentation (toast, inline text, or both) as long as it remains lightweight

### Deferred Ideas (OUT OF SCOPE)
- Native `.xlsx` generation - future milestone if CSV proves insufficient
- CRM/email/cloud export integrations - separate capability, out of scope for Phase 12
- Share-sheet-first mobile export flow - nice-to-have, not required for the first export milestone
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ENH-01 | Vendedor pode exportar seus leads a partir de `/leads` em CSV UTF-8 compativel com Excel e Google Sheets | Seller export must use a full-scope Dexie query helper, not the infinite-scroll slice, and must keep BOM + spreadsheet-safe cell sanitization in one shared CSV formatter |
| ENH-07 | Admin pode exportar todos os leads que correspondem ao vendedor e filtros selecionados, nao apenas a pagina atualmente renderizada | Admin export must use a dedicated server export query/procedure without pagination offsets and must map the same row contract as seller export |
</phase_requirements>

## Summary

Phase 12 should be planned as a data-contract separation task first, and a CSV hardening task second. The main bug is not the serializer itself; it is that both export buttons currently operate on render datasets. Seller export uses `queryLeads(userId, tag, limit)` and therefore only sees the currently loaded infinite-scroll slice. Admin export uses `listByUser` with `limit`/`offset` and therefore only sees the current page. Planning should assume two distinct dataset paths per surface: one optimized for UI rendering and another optimized for export correctness.

The existing stack is already enough. Seller export can stay client-side over Dexie, admin export can stay on tRPC/React Query, and the shared CSV contract can remain in `apps/web/src/lib/lead/export-csv.ts`. No `.xlsx` dependency is needed. The implementation work is to introduce explicit export-scope helpers, move spreadsheet sanitization into the shared row formatter, and make success feedback include what scope was exported plus row count.

The critical hardening decision is formula injection mitigation. OWASP's current CSV Injection guidance is explicit that quotes-only escaping is not enough, and that spreadsheet-oriented exports need a dedicated mitigation for dangerous leading characters. Because this phase is for human spreadsheet handoff rather than machine re-import, the safest recommendation is to keep normal CSV escaping plus a spreadsheet sanitizer applied per cell before serialization, then manually verify the resulting file in Excel and Google Sheets.

**Primary recommendation:** Add dedicated seller/admin export-scope adapters, keep one shared UTF-8 CSV formatter with centralized spreadsheet sanitization, and verify exported row counts against explicit scope totals.

## Project Constraints (from CLAUDE.md)

- Use the existing stack only: Next.js 16 App Router, React 19, Dexie on the client, tRPC/Drizzle/Postgres on the server, shadcn/ui, Sonner, Vitest, and TypeScript strict.
- Follow offline-first architecture: Dexie is the primary client store; do not redesign seller export around a server dependency.
- Keep App Router boundaries clean: no async client components, and do not leak Dexie access into server runtimes.
- Reuse existing UI primitives from `packages/ui` before creating custom markup. Export actions should stay in existing screen surfaces.
- Use `cn()` for class composition and existing shadcn/Button patterns instead of bespoke button styling.
- Keep imports path-based; avoid barrel files.
- Validate env-driven code through the existing packages; do not add ad hoc env access.
- Keep code Biome/Ultracite compliant: explicit naming, early returns, no nested ternaries, no console logging, no non-null assertions.
- Testing remains Vitest-based. The app web package already has `jsdom` + `fake-indexeddb`; planner should use that instead of adding a new test stack.
- From `AGENTS.md` / Ultracite: prefer explicit types when they clarify intent, use semantic HTML/ARIA, and remove debugging artifacts from production code.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.0 installed / 16.2.1 latest verified (2026-03-20) | App Router screens, client/server boundaries, browser download surfaces | Already owns seller/admin pages; no new delivery surface is needed |
| Dexie | 4.3.0 installed / 4.4.1 latest verified (2026-03-24) | Seller-side full-scope lead reads from IndexedDB | Official Dexie docs support reactive browser-side queries and sorting from query helpers |
| dexie-react-hooks | 4.2.0 installed / 4.4.0 latest verified (2026-03-18) | `useLiveQuery` integration for seller export scope and count updates | Matches the existing seller screen architecture |
| @tanstack/react-query | 5.90.12 installed / 5.95.2 latest verified (2026-03-23) | Admin-side fetch/caching for export triggers and feedback | Already wraps `trpc.admin.leads.*` queries in the admin screen |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Sonner | 2.0.5 installed / 2.0.7 latest verified (2025-08-02) | Lightweight success/error feedback after export starts | Use for seller/admin success confirmation without building new UI infrastructure |
| Vitest | 3.2.4 installed / 4.1.2 latest verified (2026-03-26) | Unit tests for CSV contract, export scope helpers, and admin router behavior | Use for all automated validation in this phase |
| Browser Blob + `URL.createObjectURL()` | Built-in Web API | Final download handoff for CSV files | Keep current browser download path; no background job or file service is needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| UTF-8 CSV + BOM | Native `.xlsx` generation | Heavier dependency surface, more compatibility testing, explicitly deferred by scope |
| Dedicated export query/procedure | Reusing paginated `listByUser` with a larger `limit` | Current router caps `limit` at 100 and keeps pagination semantics; widening it couples export to list rendering |
| Client-side seller export from Dexie | Server-side seller export endpoint | Breaks offline-first value and adds unnecessary server dependency for local data already in IndexedDB |

**Installation:**
```bash
# No new packages required for Phase 12.
# Version verification used during research:
npm view next version
npm view dexie version
npm view dexie-react-hooks version
npm view @tanstack/react-query version
npm view sonner version
npm view vitest version
```

## Architecture Patterns

### Recommended Project Structure
```text
apps/web/src/
├── lib/lead/export-csv.ts        # Shared CSV row contract, escaping, BOM, filename builder
├── lib/lead/export-scope.ts      # New seller/admin scope helpers for full export datasets
├── app/(app)/leads/lead-list.tsx # Seller export trigger + scope/count feedback
├── app/(app)/admin/leads/leads-panel.tsx
│                                 # Admin export trigger + scope/count feedback
└── lib/masks/phone.ts            # Reuse for spreadsheet-friendly phone formatting

packages/api/src/routers/admin/leads.ts
                                  # Keep paginated listByUser; add dedicated export query/procedure
```

### Pattern 1: Separate Export Scope From Render Scope
**What:** Introduce dedicated export-scope helpers that return the full matching dataset and total count, independent of UI pagination or infinite scroll.
**When to use:** Every export action in seller and admin flows.
**Why now:** Current seller export uses the limited `queryLeads(..., limit)` path, and current admin export uses paginated `listByUser`, so both can silently under-export.
**Example:**
```typescript
// Source: https://dexie.org/docs/dexie-react-hooks/useLiveQuery%28%29
export async function queryLeadExportScope(input: {
  userId: string;
  tag: FilterTag;
  searchTerm: string;
}): Promise<{ leads: Lead[]; total: number }> {
  const allForScope = await db.leads
    .where("userId")
    .equals(input.userId)
    .filter((lead) => lead.deletedAt === null)
    .toArray();

  const tagFiltered =
    input.tag === "todos"
      ? allForScope
      : allForScope.filter((lead) => lead.interestTag === input.tag);

  const text = input.searchTerm.trim().toLowerCase();
  const leads =
    text === ""
      ? tagFiltered
      : tagFiltered.filter((lead) =>
          [lead.name, lead.company ?? "", lead.email ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(text)
        );

  leads.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { leads, total: leads.length };
}
```

### Pattern 2: Keep Admin Pagination Contract and Add a Dedicated Export Contract
**What:** Leave `listByUser` paginated for tables/cards, but add a second admin query/procedure that accepts the same filter object and returns all matching export rows without `offset`.
**When to use:** Admin export button only.
**Why now:** `packages/api/src/routers/admin/leads.ts` caps `limit` at 100 and is intentionally paginated, so export should not overload it.
**Example:**
```typescript
// Source: current router contract + existing tRPC/React Query usage in the codebase
adminProcedure
  .input(z.object({ userId: z.string().uuid() }))
  .query(async ({ input }) => {
    const rows = await db
      .select({
        localId: leads.localId,
        name: leads.name,
        phone: leads.phone,
        email: leads.email,
        company: leads.company,
        position: leads.position,
        segment: leads.segment,
        notes: leads.notes,
        interestTag: leads.interestTag,
        followUpStatus: leads.followUpStatus,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .where(and(eq(leads.userId, input.userId), isNull(leads.deletedAt)))
      .orderBy(sql`${leads.createdAt} DESC`);

    return { leads: rows, total: rows.length };
  });
```

### Pattern 3: Centralize Spreadsheet Sanitization In The CSV Mapper
**What:** Keep CSV escaping and spreadsheet formula neutralization in one cell-formatting pipeline before joining fields.
**When to use:** Every user-controlled text field: `name`, `email`, `company`, `position`, `segment`, `notes`, and any future free-text columns.
**Why now:** The current `escapeCsvField()` only handles commas/quotes/newlines; it does not address spreadsheet execution.
**Example:**
```typescript
// Source: https://owasp.org/www-community/attacks/CSV_Injection
const DANGEROUS_PREFIX = /^[=+\-@\t\r\n]/;

function sanitizeSpreadsheetCell(value: string): string {
  const normalized = value.replace(/\r\n/g, "\n");
  return DANGEROUS_PREFIX.test(normalized) ? `\t${normalized}` : normalized;
}

function toCsvCell(value: string): string {
  const safe = sanitizeSpreadsheetCell(value);
  return `"${safe.replace(/"/g, "\"\"")}"`;
}
```

### Anti-Patterns to Avoid
- **Exporting `leads` directly from the screen state:** seller `leads` is the current infinite-scroll slice, not the full scope.
- **Reusing `listByUser` for export by raising `limit`:** it keeps pagination semantics and has a hard max of 100.
- **Duplicating CSV logic in seller and admin:** format drift will follow immediately.
- **Treating CSV escaping as formula injection protection:** quoting alone does not neutralize spreadsheet execution.
- **Adding a new export center, background job, or `.xlsx` path:** this contradicts the phase boundary and deferred scope.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Role-specific export formatting | Separate seller/admin CSV serializers | One shared `lib/lead/export-csv.ts` contract | Prevents header drift, encoding drift, and duplicated sanitization bugs |
| Spreadsheet file format expansion | Native `.xlsx` generator for v1.2 | UTF-8 CSV with BOM and readable pt-BR labels | Meets requirement with less dependency and testing surface |
| Export from rendered arrays | "Whatever is on screen" export logic | Explicit seller/admin export-scope helpers | Current screen arrays are incomplete by design |
| Ad hoc success messaging | Manual DOM banners or custom modal flow | Existing Sonner toast + inline scope/count text | Fits current UI patterns and keeps feedback lightweight |
| Per-field security patches in UI components | Sanitizing only before `Button` click or in one screen | Centralized spreadsheet cell sanitizer in the CSV mapper | Security logic must stay with serialization, not with button placement |

**Key insight:** The phase is mostly about not building the wrong abstraction. The right move is one CSV contract plus separate scope fetchers, not more UI or more file formats.

## Common Pitfalls

### Pitfall 1: Seller export still uses the infinite-scroll slice
**What goes wrong:** The downloaded file contains only the currently loaded cards, while the UI suggests a broader scope.
**Why it happens:** `lead-list.tsx` currently exports `leads` from `queryLeads(userId, tag, limit)`, and that helper slices after sorting.
**How to avoid:** Add a dedicated seller export helper that ignores render `limit` and applies tag + search filtering to the full local dataset.
**Warning signs:** Exported file row count increases only after the user scrolls.

### Pitfall 2: Admin export is tied to paginated `listByUser`
**What goes wrong:** The admin CSV only contains page `n`, not all matches for the selected vendor.
**Why it happens:** `leads-panel.tsx` exports `leadsQuery.data?.leads`, and the router enforces `limit`/`offset`.
**How to avoid:** Add a dedicated admin export query/procedure without `offset`, using the same filter object as the page.
**Warning signs:** UI says `Mostrando 21-40 de 87`, but exported CSV contains 20 rows.

### Pitfall 3: CSV escaping is mistaken for spreadsheet safety
**What goes wrong:** User-controlled cells like `=HYPERLINK(...)` or `+cmd|...` execute as formulas when opened in Excel or other spreadsheet software.
**Why it happens:** The current formatter only escapes commas, quotes, and line breaks.
**How to avoid:** Run every user-controlled cell through spreadsheet-specific sanitization before CSV escaping, then test malicious fixtures.
**Warning signs:** Any exported cell can begin with `=`, `+`, `-`, `@`, tab, CR, or LF after normalization.

### Pitfall 4: BOM exists, but compatibility coverage is still incomplete
**What goes wrong:** Accents, multiline notes, or long text look correct in tests but break or display poorly in spreadsheet apps.
**Why it happens:** Current tests cover BOM and commas/quotes, but not accented text, multiline notes, or malicious cells.
**How to avoid:** Extend `export-csv.test.ts` with accented pt-BR fixtures, multiline notes, and spreadsheet attack fixtures; keep one manual open test in Excel and Google Sheets.
**Warning signs:** "Joao" passes but "Joao, Acoes & Negociacao" or multiline notes are never tested.

### Pitfall 5: UI confidence text still reflects render counts, not export counts
**What goes wrong:** The screen says one thing and the file contains another, even after the export path is fixed.
**Why it happens:** Current seller count text derives from `filteredLeads.length` and `leads.length`, both render-oriented.
**How to avoid:** Build export feedback from the export-scope result returned by the dedicated helper/procedure.
**Warning signs:** Count text changes after scroll even if filter scope did not change.

## Code Examples

Verified patterns from official sources:

### Reactively read seller export scope from Dexie
```typescript
// Source: https://dexie.org/docs/dexie-react-hooks/useLiveQuery%28%29
const exportScope = useLiveQuery(
  () => queryLeadExportScope({ userId, tag: activeTag, searchTerm }),
  [userId, activeTag, searchTerm]
);
```

### Neutralize spreadsheet formulas before CSV escaping
```typescript
// Source: https://owasp.org/www-community/attacks/CSV_Injection
const DANGEROUS_PREFIX = /^[=+\-@\t\r\n]/;

export function sanitizeSpreadsheetCell(value: string): string {
  return DANGEROUS_PREFIX.test(value) ? `\t${value}` : value;
}
```

### Keep UTF-8 BOM at the start of the CSV payload
```typescript
// Source: https://support.microsoft.com/en-us/office/opening-csv-utf-8-files-correctly-in-excel-8a935af5-3416-4edd-ba7e-3dfd2bc4a032
const csvContent = `\uFEFF${header}\n${rows.join("\n")}`;
const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Export whatever is rendered | Export explicit full scope per surface | Current project guidance for Phase 12 (verified 2026-03-29) | Prevents silent data loss from infinite scroll and pagination |
| Quotes-only CSV escaping | CSV escaping plus spreadsheet-specific formula neutralization | Current OWASP CSV Injection guidance (verified 2026-03-29) | Prevents user-entered cells from executing on spreadsheet open |
| CSV without BOM | UTF-8 CSV with BOM for direct Excel open | Current Microsoft support guidance (verified 2026-03-29) | Preserves pt-BR accents when the file is opened directly in Excel |

**Deprecated/outdated:**
- Exporting `leadsQuery.data.leads` or `leads` from screen state as the file payload: outdated because both are render contracts, not export contracts.
- Treating "Excel-friendly CSV" as "quoted CSV only": outdated because it ignores spreadsheet formula execution and direct-open encoding issues.

## Open Questions

1. **Which exact admin filters exist at implementation time?**
   - What we know: today the admin screen exposes vendor selection and pagination only.
   - What's unclear: phase text mentions "vendor/filtro selecionado", so more filters may land before or during implementation.
   - Recommendation: design admin export input as a filter object now, even if v1 only carries `userId`.

2. **Which filename convention best communicates scope without clutter?**
   - What we know: it must be deterministic and scope-aware.
   - What's unclear: whether filename should include vendor name, tag/search markers, or row count.
   - Recommendation: include role + scope token + ISO date; include row count in success feedback even if not in filename.

3. **Should the sanitizer use tab prefix or apostrophe prefix?**
   - What we know: OWASP states there is no universal strategy across all spreadsheet consumers, and specifically calls out an Excel-resistant tab-prefix mitigation.
   - What's unclear: whether tab-prefixed cells create any undesirable behavior in the target Google Sheets workflow.
   - Recommendation: prefer tab-prefix sanitization for human-viewed spreadsheet exports, then manually verify Excel + Google Sheets before ship.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Local scripts and package tooling | ✓ | v25.7.0 | — |
| Bun | Root/package test commands and workspace scripts | ✓ | 1.3.11 | npm can inspect versions, but Bun is the project standard |
| npm | Registry version verification during planning/research | ✓ | 11.12.0 | — |

**Missing dependencies with no fallback:**
- None

**Missing dependencies with fallback:**
- None

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 workspace (`apps/web` in `jsdom`, `packages/api` in `node`) |
| Config file | `vitest.workspace.ts`, `apps/web/vitest.config.ts`, `packages/api/vitest.config.ts` |
| Quick run command | `bun run --cwd apps/web test src/lib/lead/export-csv.test.ts src/lib/lead/queries.test.ts` |
| Full suite command | `bun run test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ENH-01 | Seller export returns all leads in selected local scope, preserves UTF-8/BOM, sanitizes spreadsheet-dangerous cells, and reports matching count | unit + manual spreadsheet QA | `bun run --cwd apps/web test src/lib/lead/export-csv.test.ts src/lib/lead/queries.test.ts` | ✅ existing base tests, but behavior coverage is incomplete |
| ENH-07 | Admin export returns all leads for the selected vendor/filter scope, not the current page | unit/router + manual UI QA | `bun run --cwd packages/api test src/__tests__/admin-leads.test.ts` | ✅ existing file, but only smoke coverage today |

### Sampling Rate
- **Per task commit:** Run the affected package tests (`apps/web` or `packages/api`) for export scope and CSV contract.
- **Per wave merge:** `bun run test`
- **Phase gate:** Full suite green plus manual open test in Excel and Google Sheets before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/web/src/lib/lead/export-scope.test.ts` - missing seller full-scope export coverage independent of render `limit`
- [ ] `apps/web/src/lib/lead/export-csv.test.ts` - extend with accented text, multiline notes, dangerous formula-leading cells, and filename/scope feedback helpers
- [ ] `packages/api/src/__tests__/admin-leads.test.ts` - expand from smoke tests to real export query contract assertions
- [ ] Manual QA checklist artifact - confirm one malicious fixture and one accented fixture open correctly in Excel and Google Sheets

## Sources

### Primary (HIGH confidence)
- Context7 `/websites/dexie` - React `useLiveQuery()` usage and Dexie query/sort patterns: https://dexie.org/docs/dexie-react-hooks/useLiveQuery%28%29 and https://dexie.org/docs/API-Reference
- OWASP CSV Injection guidance - formula-injection risks and mitigations: https://owasp.org/www-community/attacks/CSV_Injection
- Microsoft Support - UTF-8 CSV with BOM opens correctly in Excel: https://support.microsoft.com/en-us/office/opening-csv-utf-8-files-correctly-in-excel-8a935af5-3416-4edd-ba7e-3dfd2bc4a032
- Google Docs Editors Help - Google Sheets can import/open CSV files: https://support.google.com/docs/answer/6000292
- Current codebase integration points: `apps/web/src/lib/lead/export-csv.ts`, `apps/web/src/lib/lead/queries.ts`, `apps/web/src/app/(app)/leads/lead-list.tsx`, `apps/web/src/app/(app)/admin/leads/leads-panel.tsx`, `packages/api/src/routers/admin/leads.ts`
- npm registry metadata via `npm view` for `next`, `dexie`, `dexie-react-hooks`, `@tanstack/react-query`, `sonner`, and `vitest`

### Secondary (MEDIUM confidence)
- `.planning/research/SUMMARY.md`, `.planning/research/FEATURES.md`, `.planning/research/ARCHITECTURE.md`, `.planning/research/PITFALLS.md`

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new library is required and the package/runtime versions were verified against the registry
- Architecture: HIGH - the current code clearly shows where render datasets and export datasets diverge
- Pitfalls: HIGH - the key risks are observable in the current code and reinforced by OWASP/Microsoft guidance

**Research date:** 2026-03-29
**Valid until:** 2026-04-28
