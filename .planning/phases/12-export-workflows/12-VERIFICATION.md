---
phase: 12-export-workflows
verified: 2026-03-29T15:45:24Z
status: human_needed
score: 3/4 must-haves verified
human_verification:
  - test: "Abrir um CSV exportado de vendedor no Excel e no Google Sheets"
    expected: "Header `Data de Criação`, valores com acento como `Ações` e `Em Negociação`, e notas com quebra de linha aparecem legíveis sem mojibake"
    why_human: "Os testes validam BOM, header e serialização UTF-8, mas não provam a renderização final nos apps-alvo"
  - test: "Abrir um CSV contendo células iniciadas por `=`, `+`, `-`, `@`, tab, CR ou newline"
    expected: "As células aparecem como texto literal e não executam fórmula ao abrir a planilha"
    why_human: "A neutralização é validada em código e teste unitário, mas a execução real depende do comportamento do Excel/Sheets"
  - test: "Exportar no `/admin/leads` para um vendedor com mais de 20 leads"
    expected: "O toast informa a contagem total exportada e o arquivo contém mais linhas do que a página atualmente renderizada"
    why_human: "A query full-scope está implementada, mas a confirmação final depende de dados reais e inspeção do arquivo gerado"
---

# Phase 12: Export Workflows Verification Report

**Phase Goal:** Exportar datasets completos de vendedor e admin com escopo explicito, arquivo compativel com Excel/Sheets e hardening basico para dados reais de evento
**Verified:** 2026-03-29T15:45:24Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Vendedor exporta todos os leads do escopo selecionado em `/leads`, e a contagem do arquivo bate com a UI | ✓ VERIFIED | `apps/web/src/app/(app)/leads/lead-list.tsx` chama `queryLeadExportScope({ userId, tag: activeTag, searchTerm })` em `handleExport`, exporta `result.leads` e anuncia `result.total` via `toast.success` (linhas 156-184). `apps/web/src/lib/lead/export-scope.ts` consulta o dataset completo sem `limit` e retorna `{ leads, total }` (linhas 32-56). |
| 2 | Admin exporta todos os leads do vendedor/filtro selecionado, nao apenas a pagina atualmente renderizada | ✓ VERIFIED | `apps/web/src/app/(app)/admin/leads/leads-panel.tsx` deriva `adminLeadFilters` do estado vivo e usa `trpc.admin.leads.exportByFilters.queryOptions(adminLeadFilters)` antes de exportar `result.leads` (linhas 103-177). `packages/api/src/routers/admin/leads.ts` implementa `exportByFilters` sem `limit`/`offset` e retorna `{ leads: rows, total: rows.length }` (linhas 42-54). `packages/api/src/__tests__/admin-leads.test.ts` trava a ausencia de paginação (linhas 85-119). |
| 3 | CSV abre corretamente em Excel e Google Sheets com headers legiveis, acentos preservados e colunas uteis para follow-up | ? UNCERTAIN | `apps/web/src/lib/lead/export-csv.ts` gera BOM, header pt-BR e serializa acentos/quebras de linha (linhas 36-129). `apps/web/src/lib/lead/export-csv.test.ts` cobre `Data de Criação`, `Ações`, `Em Negociação` e multiline notes (linhas 35-116). Nao existe evidencia de abertura manual concluida em Excel/Sheets; `12-VALIDATION.md` ainda lista essa verificacao como manual. |
| 4 | Campos controlados por usuario sao neutralizados contra formula injection antes da abertura em planilhas | ✓ VERIFIED | `apps/web/src/lib/lead/export-csv.ts` define `DANGEROUS_SPREADSHEET_PREFIX` e `sanitizeSpreadsheetCell()` para prefixar entradas perigosas com `'` antes do escaping CSV (linhas 43-110). `apps/web/src/lib/lead/export-csv.test.ts` cobre `=`, `+`, `-`, `@`, tab e newline (linhas 98-116). |

**Score:** 3/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `apps/web/src/lib/lead/export-scope.ts` | Helper seller full-scope sem vazamento de paginação | ✓ VERIFIED | Existe, é substantivo e consulta Dexie sem `limit`, ordenando por `createdAt DESC` e retornando `{ leads, total }` (linhas 32-56). |
| `apps/web/src/lib/lead/export-scope.test.ts` | Cobertura seller full-scope, busca e exclusões | ✓ VERIFIED | 3 testes cobrem escopo completo, busca case-insensitive e exclusão de deletados/outro usuário (linhas 30-154). |
| `packages/api/src/routers/admin/leads.ts` | Procedure `exportByFilters` separada da paginação | ✓ VERIFIED | Reusa `adminLeadFilterSchema`, mantém `listByUser` paginado e expõe `exportByFilters` sem `.limit()`/`.offset()` (linhas 9-54). |
| `packages/api/src/__tests__/admin-leads.test.ts` | Cobertura do contrato admin export | ✓ VERIFIED | Confirma que `exportByFilters` existe e não chama `limit`/`offset` (linhas 78-119). |
| `apps/web/src/lib/lead/export-csv.ts` | CSV centralizado com BOM, sanitização e filename determinístico | ✓ VERIFIED | Implementa `DANGEROUS_SPREADSHEET_PREFIX`, `sanitizeSpreadsheetCell`, `buildExportFilename`, `generateCsvContent` e `exportLeadsCsv` (linhas 36-149). |
| `apps/web/src/lib/lead/export-csv.test.ts` | Cobertura BOM, acentos, multiline, neutralização e filenames | ✓ VERIFIED | 14 testes cobrem hardening CSV e contratos de feedback de UI (linhas 35-201). |
| `apps/web/src/app/(app)/leads/lead-list.tsx` | Trigger seller wired ao escopo completo e feedback explícito | ✓ VERIFIED | Botão no header dispara `handleExport`, usa `queryLeadExportScope`, `buildExportFilename`, `exportLeadsCsv(result.leads, filename)` e `toast.success` com escopo/contagem (linhas 156-184, 250-276). |
| `apps/web/src/app/(app)/admin/leads/leads-panel.tsx` | Trigger admin wired ao filtro vivo e feedback explícito | ✓ VERIFIED | Botão no header usa `adminLeadFilters`, busca `exportByFilters`, gera filename com `selectedVendorName` e mostra `toast.success` com contagem (linhas 103-177, 260-278). |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `apps/web/src/app/(app)/leads/lead-list.tsx` | `apps/web/src/lib/lead/export-scope.ts` | export button click handler | ✓ WIRED | `handleExport()` chama `queryLeadExportScope` e exporta o resultado completo (linhas 156-176). |
| `apps/web/src/app/(app)/admin/leads/leads-panel.tsx` | `packages/api/src/routers/admin/leads.ts` | `trpc.admin.leads.exportByFilters` | ✓ WIRED | `queryClient.fetchQuery(trpc.admin.leads.exportByFilters.queryOptions(adminLeadFilters))` consome a procedure dedicada (linhas 166-168). |
| `packages/api/src/routers/admin/leads.ts` | `@dashboard-leads-profills/db/schema/leads` | full-scope SQL query ordered by `createdAt DESC` | ✓ WIRED | `exportByFilters` usa `db.select().from(leads)...orderBy(sql\`${leads.createdAt} DESC\`)` sem paginação (linhas 45-49). |
| `apps/web/src/app/(app)/leads/lead-list.tsx` | `apps/web/src/lib/lead/export-csv.ts` | handleExport success path | ✓ WIRED | Seller export gera filename determinístico e chama `exportLeadsCsv`, seguido de feedback por toast (linhas 169-184). |
| `apps/web/src/app/(app)/admin/leads/leads-panel.tsx` | `apps/web/src/lib/lead/export-csv.ts` | handleExport success path | ✓ WIRED | Admin export gera filename com nome do vendedor, chama `exportLeadsCsv` e anuncia o total exportado (linhas 170-177). |
| `apps/web/src/lib/lead/export-csv.ts` | `apps/web/src/lib/masks/phone.ts` | `formatPhone` before serialization | ✓ WIRED | `serializeLeadRow()` formata o telefone antes de serializar a linha CSV (linhas 83-99). |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `apps/web/src/app/(app)/leads/lead-list.tsx` | `result.leads`, `result.total` | `queryLeadExportScope()` -> `db.leads.where("userId").equals(...).filter(...).toArray()` em `apps/web/src/lib/lead/export-scope.ts` | Yes | ✓ FLOWING |
| `apps/web/src/app/(app)/admin/leads/leads-panel.tsx` | `result.leads`, `result.total` | `trpc.admin.leads.exportByFilters` -> `db.select().from(leads)...orderBy(...)` em `packages/api/src/routers/admin/leads.ts` | Yes | ✓ FLOWING |
| `apps/web/src/lib/lead/export-csv.ts` | serialized CSV rows | Recebe `leads` dos fluxos seller/admin full-scope e serializa campos reais do lead, incluindo telefone, tag, follow-up e data | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Seller full-scope export helper | `bun run --cwd apps/web test src/lib/lead/export-scope.test.ts` | 3 tests passed | ✓ PASS |
| Hardened CSV contract | `bun run --cwd apps/web test src/lib/lead/export-csv.test.ts` | 14 tests passed | ✓ PASS |
| Admin export procedure without pagination leakage | `bun run --cwd packages/api test src/__tests__/admin-leads.test.ts` | 2 tests passed | ✓ PASS |
| Type safety gate | `bun run check-types` | Passed | ✓ PASS |
| Workspace lint gate | `bun run check` | Failed on nested root `biome.json` files under `.claude/worktrees/*` | ✗ FAIL |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| ENH-01 | `12-01-PLAN.md`, `12-02-PLAN.md` | Vendedor pode exportar seus leads a partir de `/leads` em CSV UTF-8 compativel com Excel e Google Sheets | ? NEEDS HUMAN | Seller full-scope export e hardening CSV existem em código e testes, mas a compatibilidade final em Excel/Sheets continua sem evidência manual concluída. |
| ENH-07 | `12-01-PLAN.md`, `12-02-PLAN.md` | Admin pode exportar todos os leads que correspondem ao vendedor e filtros selecionados, nao apenas a pagina atualmente renderizada | ✓ SATISFIED | `exportByFilters` é full-scope sem paginação (`packages/api/src/routers/admin/leads.ts`, linhas 42-54), e `LeadsPanel` usa esse caminho no botão de export (`apps/web/src/app/(app)/admin/leads/leads-panel.tsx`, linhas 158-177). |

Orphaned requirements: none. `REQUIREMENTS.md` mapeia apenas `ENH-01` e `ENH-07` para Phase 12, e ambos aparecem no frontmatter dos dois planos.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| - | - | None found in phase-owned export files | - | No TODOs, placeholders, empty handlers, or hardcoded hollow export paths were found in the inspected phase artifacts. |

### Human Verification Required

### 1. Seller CSV in Spreadsheet Apps

**Test:** Export one seller CSV from `/leads` containing accented text (`Ações`), follow-up `Em Negociação`, and multiline notes, then open it in Excel and Google Sheets.  
**Expected:** The file shows `Data de Criação`, preserves accents, and keeps multiline notes readable.  
**Why human:** Spreadsheet rendering is the real target contract; unit tests cannot prove how Excel/Sheets decode and display the downloaded file.

### 2. Spreadsheet Formula Neutralization

**Test:** Export a row where one field starts with `=HYPERLINK(...)`, another with `+`, another with `-`, another with `@`, and another starts on a newline/tab. Open the file in Excel and Google Sheets.  
**Expected:** Every dangerous cell is shown as plain text and does not execute as a formula.  
**Why human:** The code prefixes dangerous values, but only a real spreadsheet app can confirm runtime behavior on open.

### 3. Admin Full-Scope Export vs Current Page

**Test:** In `/admin/leads`, select a vendor with more than 20 leads, export, and compare the toast count to the generated file row count.  
**Expected:** The toast reports the full-scope total, and the file contains more rows than the current paginated page.  
**Why human:** The full-scope query is implemented and tested, but verifying the actual downloaded file against a real multi-page dataset needs manual inspection.

### Gaps Summary

No implementation gaps were found in the phase-owned export code. Seller and admin export paths are wired to full-scope datasets, the CSV contract is hardened in code and tests, and the declared Phase 12 requirements are fully accounted for in plan frontmatter and `REQUIREMENTS.md`. The remaining blocker for a full `passed` status is human spreadsheet verification for Excel/Google Sheets compatibility and runtime formula neutralization. A separate non-goal workspace issue remains: `bun run check` still fails because nested `.claude/worktrees/*/biome.json` files are treated as conflicting Biome root configs.

---

_Verified: 2026-03-29T15:45:24Z_  
_Verifier: Claude (gsd-verifier)_
