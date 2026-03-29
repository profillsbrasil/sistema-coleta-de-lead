# Phase 12: Export Workflows - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 12 delivers trustworthy lead export for vendedor and admin workflows. The scope is limited to export correctness, spreadsheet compatibility, and handoff confidence inside the existing app surfaces. New integration capabilities such as CRM sync, cloud sharing, or native `.xlsx` generation remain out of scope.

</domain>

<decisions>
## Implementation Decisions

### Export Scope
- **D-01:** [auto] Seller export must respect the active `/leads` scope and include all matching leads for that scope, not just the currently loaded infinite-scroll slice.
- **D-02:** [auto] Admin export must respect the selected vendor and active filters and include the full matching dataset, not only the current paginated page.

### File Contract
- **D-03:** [auto] v1.2 ships one spreadsheet-friendly export contract: UTF-8 CSV that opens cleanly in Excel and Google Sheets. Native `.xlsx` is explicitly deferred.
- **D-04:** [auto] The CSV contract must preserve readable pt-BR labels/values, deterministic file naming, and spreadsheet safety, including neutralizing formula-like user input before download.

### Export Surface and Feedback
- **D-05:** [auto] Export stays in the existing seller and admin screens instead of introducing a separate export center or background job flow.
- **D-06:** [auto] Export UX must make scope explicit and confirm what was exported, including row count or equivalent confidence feedback after download starts.

### the agent's Discretion
- Exact filename shape beyond being deterministic and scope-aware
- Whether seller/admin surfaces use one explicit export action or contextual variants such as "Exportar filtrados" vs "Exportar tudo", as long as scope is unambiguous
- Exact success-feedback presentation (toast, inline text, or both) as long as it remains lightweight

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase scope
- `.planning/ROADMAP.md` — Phase 12 goal, success criteria, and plan breakdown
- `.planning/REQUIREMENTS.md` — `ENH-01` and `ENH-07`, plus v1.2 out-of-scope boundaries
- `.planning/PROJECT.md` — current milestone goal and the offline-first constraint that export must reinforce rather than weaken

### Research inputs
- `.planning/research/SUMMARY.md` — roadmap rationale and milestone-level risks
- `.planning/research/FEATURES.md` — table-stakes export behavior, differentiators, and anti-features
- `.planning/research/ARCHITECTURE.md` — export integration points, reusable modules, and data flow split between seller/admin
- `.planning/research/PITFALLS.md` — partial-dataset export, Excel compatibility, and CSV formula-injection risks

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/web/src/lib/lead/export-csv.ts`: existing CSV generator and download trigger; good starting point for file contract hardening
- `apps/web/src/lib/lead/queries.ts`: seller-side Dexie query path that already understands tag-based filtering
- `apps/web/src/app/(app)/leads/lead-list.tsx`: existing seller export button and search/filter state
- `apps/web/src/app/(app)/admin/leads/leads-panel.tsx`: existing admin export button plus selected-vendor context and paginated data view
- `apps/web/src/lib/masks/phone.ts`: existing formatting helper for spreadsheet-friendly phone output

### Established Patterns
- Lead-domain logic lives under `apps/web/src/lib/lead/*` and is reused across screens
- Seller workflows use Dexie/live queries; admin workflows use tRPC/react-query against server datasets
- Action buttons live inline in page headers and use existing shadcn `Button` components with immediate user feedback
- Tests for lead utilities use colocated `*.test.ts` files and should cover edge cases like sanitization and encoding

### Integration Points
- Seller export connects to the `/leads` screen and must stop depending on the limited infinite-scroll slice
- Admin export connects to the `/admin/leads` screen and must stop depending on the paginated `listByUser` result for correctness
- Export scope should reuse existing seller/admin filter state rather than inventing a separate filter model

</code_context>

<specifics>
## Specific Ideas

- No specific visual reference was provided; standard admin/seller export actions are acceptable.
- Auto mode selected scope-aware export over rendered-row export.
- Auto mode selected Excel-friendly CSV as the sole file format for v1.2.
- Auto mode selected lightweight, inline export feedback instead of a new export center or async job flow.

</specifics>

<deferred>
## Deferred Ideas

- Native `.xlsx` generation — future milestone if CSV proves insufficient
- CRM/email/cloud export integrations — separate capability, out of scope for Phase 12
- Share-sheet-first mobile export flow — nice-to-have, not required for the first export milestone

</deferred>

---

*Phase: 12-export-workflows*
*Context gathered: 2026-03-29*
