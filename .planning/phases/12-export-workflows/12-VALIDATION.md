---
phase: 12
slug: export-workflows
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-29
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 workspace (`apps/web` in `jsdom`, `packages/api` in `node`) |
| **Config file** | `vitest.workspace.ts`, `apps/web/vitest.config.ts`, `packages/api/vitest.config.ts` |
| **Quick run command** | `bun run --cwd apps/web test src/lib/lead/export-csv.test.ts src/lib/lead/export-scope.test.ts && bun run --cwd packages/api test src/__tests__/admin-leads.test.ts` |
| **Full suite command** | `bun run test` |
| **Phase-close gate** | `bun run check && bun run check-types && bun run test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run the affected package tests for export scope and CSV contract coverage
- **After every plan wave:** Run `bun run test`
- **Before phase sign-off:** Run `bun run check && bun run check-types && bun run test`
- **Before `$gsd-verify-work`:** Full suite must be green, plus manual spreadsheet open checks in Excel and Google Sheets
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | ENH-01 | unit | `bun run --cwd apps/web test src/lib/lead/export-scope.test.ts` | ✅ | ⬜ pending |
| 12-01-02 | 01 | 1 | ENH-07 | router | `bun run --cwd packages/api test src/__tests__/admin-leads.test.ts` | ✅ | ⬜ pending |
| 12-02-01 | 02 | 2 | ENH-01 | unit | `bun run --cwd apps/web test src/lib/lead/export-csv.test.ts` | ✅ | ✅ green |
| 12-02-02 | 02 | 2 | ENH-01, ENH-07 | targeted integration | `bun run --cwd apps/web test src/lib/lead/export-csv.test.ts src/lib/lead/export-scope.test.ts && bun run --cwd packages/api test src/__tests__/admin-leads.test.ts` | ✅ | ⬜ pending |
| 12-02-03 | 02 | 2 | ENH-01, ENH-07 | phase gate + manual | `bun run check && bun run check-types && bun run test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/web/src/lib/lead/export-scope.test.ts` — add seller full-scope export coverage independent of render `limit`
- [x] `apps/web/src/lib/lead/export-csv.test.ts` — extend with accented text, multiline notes, dangerous formula-leading cells, and filename helper coverage
- [ ] `packages/api/src/__tests__/admin-leads.test.ts` — expand to assert dedicated export contract without pagination leakage
- [ ] Manual QA checklist artifact — capture one malicious fixture and one accented fixture opened in Excel and Google Sheets

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| UTF-8 CSV opens with accents preserved in Excel | ENH-01 | Direct spreadsheet rendering is environment-specific | Export a CSV containing `Ações`, `Negociação`, the header `Data de Criação`, and multiline notes, then open the file directly in Excel and confirm accents and line breaks render correctly |
| Spreadsheet-dangerous cells are neutralized on open | ENH-01, ENH-07 | The safety requirement depends on spreadsheet execution behavior after file open | Export rows containing cells that start with `=`, `+`, `-`, `@`, and tab/newline variants, then open in Excel and Google Sheets and confirm they render as text instead of formulas |
| Admin export row count matches selected vendor scope, not the visible page | ENH-07 | The behavior depends on UI state plus server data volume | Select a vendor with more than one paginated page, export from `/admin/leads`, and confirm the downloaded row count matches the total scope shown in the UI rather than the current page length |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all missing references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `bun run check` passes
- [ ] `bun run check-types` passes
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
