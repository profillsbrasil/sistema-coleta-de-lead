# Phase 12: Export Workflows - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-29
**Phase:** 12-Export Workflows
**Areas discussed:** Export Scope, File Contract, Export Surface, Feedback

---

## Export Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Scope-aware full dataset | Export the full dataset matching the current seller/filter scope, not just rendered rows | ✓ |
| Rendered rows only | Export whatever is currently loaded on screen | |
| Dedicated export wizard | Separate export flow where the user chooses scope first | |

**User's choice:** `[auto] Scope-aware full dataset`
**Notes:** Auto mode selected the recommended default because Phase 12 success criteria explicitly call out complete seller/admin exports and the current code already shows partial dataset risk.

---

## File Contract

| Option | Description | Selected |
|--------|-------------|----------|
| Excel-friendly UTF-8 CSV only | One spreadsheet-safe CSV contract for v1.2 | ✓ |
| Native `.xlsx` | Add workbook generation now | |
| Multiple formats | Offer CSV plus extra export targets immediately | |

**User's choice:** `[auto] Excel-friendly UTF-8 CSV only`
**Notes:** Auto mode selected the recommended default because `.xlsx` and multiple formats are explicitly out of scope for v1.2.

---

## Export Surface

| Option | Description | Selected |
|--------|-------------|----------|
| Keep export in existing screens | Reuse seller/admin entry points already present in the UI | ✓ |
| Separate export center | Add a new dedicated export page or modal flow | |
| Background export job | Convert export into an async job with later retrieval | |

**User's choice:** `[auto] Keep export in existing screens`
**Notes:** Auto mode selected the recommended default because the milestone is about trustworthy export behavior, not a new product surface.

---

## Feedback

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit lightweight feedback | Confirm exported scope/count after download starts | ✓ |
| Silent download only | Trigger the file with no extra confirmation | |
| Heavy async progress flow | Add staged progress or job tracking | |

**User's choice:** `[auto] Explicit lightweight feedback`
**Notes:** Auto mode selected the recommended default because handoff confidence is part of the phase goal.

---

## the agent's Discretion

- Exact filename template
- Exact UI wording for scope labels
- Whether success feedback is toast-only, inline-only, or both

## Deferred Ideas

- Native `.xlsx` export
- CRM or cloud export integrations
- Mobile share-sheet-first export flow
