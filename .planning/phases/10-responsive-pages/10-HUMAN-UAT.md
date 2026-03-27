---
status: partial
phase: 10-responsive-pages
source: [10-VERIFICATION.md]
started: 2026-03-27T11:53:19Z
updated: 2026-03-27T11:53:19Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Admin Leads Card Layout at 320px
expected: Card layout com DropdownMenu (3-dots), sem horizontal overflow, stat cards em coluna unica
result: [pending]

### 2. Admin Users Card Layout at 320px
expected: Card layout com Name + Role badge + Lead count + Status badge, DropdownMenu actions, inline role editing via Select
result: [pending]

### 3. Lead Form Responsive Grid
expected: 320px: campos em coluna unica, sem overflow. 768px+: grid 2-colunas com Collapsible/Notas/buttons full-width
result: [pending]

### 4. FAB Keyboard Detection on iOS
expected: FAB desaparece quando teclado virtual abre (visualViewport.height < 75% innerHeight)
result: [pending]

### 5. DropdownMenu 44px Touch Targets
expected: min-h-[44px] min-w-[44px] renderizados como >= 44px nas dimensoes computadas
result: [pending]

### 6. Infinite Scroll with Sidebar
expected: IntersectionObserver dispara loadMore com sidebar aberta, novos items aparecem
result: [pending]

### 7. No Horizontal Overflow at 320px (All Routes)
expected: Sem scrollbar horizontal em /dashboard, /leads, /leads/new, /admin/leads, /admin/users
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps
