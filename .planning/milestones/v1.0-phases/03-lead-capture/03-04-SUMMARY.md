---
phase: 03-lead-capture
plan: 04
subsystem: sync
tags: [supabase-storage, photo-upload, dexie, offline-sync, blob]

requires:
  - phase: 03-lead-capture/03
    provides: "Photo capture with compression and preview in lead form"
  - phase: 02-offline-sync/03
    provides: "Sync engine with push/pull cycle and connectivity detection"
provides:
  - "uploadPendingPhotos module for Supabase Storage photo sync"
  - "Sync engine integration: photos upload after pushChanges"
  - "Blob cleanup from Dexie after successful upload"
  - "photoUrl enqueued as update operation for server sync"
affects: [04-dashboard, 05-leaderboard]

tech-stack:
  added: []
  patterns:
    - "Photo upload pipeline: Dexie blob -> Supabase Storage -> public URL -> syncQueue update"
    - "Guard pattern: skip leads without serverId (not yet synced) or without photo"

key-files:
  created:
    - apps/web/src/lib/sync/photo-upload.ts
    - apps/web/src/lib/sync/photo-upload.test.ts
  modified:
    - apps/web/src/lib/sync/engine.ts

key-decisions:
  - "Upload entre pushChanges e pullChanges no sync cycle (leads precisam de serverId do push antes do photo upload)"
  - "Blob local limpo apos upload bem-sucedido para liberar IndexedDB quota"
  - "photoUrl enfileirado como operacao update na syncQueue (nao update direto no servidor)"

patterns-established:
  - "Photo upload pipeline: filter candidates -> upload blob -> get public URL -> enqueue update -> clear local blob"
  - "Error isolation: photo upload failure nao quebra sync cycle (try-catch wrapper)"

requirements-completed: [CAPT-06]

duration: 5min
completed: 2026-03-24
---

# Phase 03 Plan 04: Photo Upload to Supabase Storage Summary

**Upload pipeline de fotos do Dexie para Supabase Storage com integracao no sync engine e cleanup automatico de blobs locais**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-25T01:20:00Z
- **Completed:** 2026-03-25T01:25:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- uploadPendingPhotos module que filtra leads com foto e serverId, faz upload para Supabase Storage, obtem URL publica e enfileira update na syncQueue
- Integracao no sync engine entre pushChanges e pullChanges (fotos so sobem apos leads terem serverId)
- Testes unitarios com mocked Supabase e fake-indexeddb cobrindo todos os cenarios (upload, skip, failure, cleanup)
- Fluxo completo de captura de leads verificado manualmente (form, QR, foto, offline, sync)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create photo upload module with TDD and integrate into sync engine** - `a002f0b` (test) + `7c82c9d` (feat)
2. **Task 2: Verify complete lead capture flow** - checkpoint:human-verify (approved)

Additional fix: `62252d3` (fix: scroll bloqueado no LeadForm e tag selector muito grande)

## Files Created/Modified

- `apps/web/src/lib/sync/photo-upload.ts` - Upload pipeline: Dexie blob -> Supabase Storage -> syncQueue update
- `apps/web/src/lib/sync/photo-upload.test.ts` - Unit tests com mocked Supabase e fake-indexeddb
- `apps/web/src/lib/sync/engine.ts` - Integracao do uploadPendingPhotos no sync cycle
- `apps/web/src/components/lead-form.tsx` - Fix de scroll bloqueado (deviation)
- `apps/web/src/components/tag-selector.tsx` - Fix de tamanho do tag selector (deviation)
- `apps/web/src/app/layout.tsx` - Ajuste relacionado ao scroll fix

## Decisions Made

- Upload posicionado entre pushChanges e pullChanges no sync cycle: leads precisam de serverId (atribuido no push) antes do photo upload
- Blob local limpo (set to null) apos upload bem-sucedido para liberar quota do IndexedDB
- photoUrl enfileirado como operacao "update" na syncQueue em vez de update direto no servidor (consistente com o pattern de sync existente)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Scroll bloqueado no LeadForm e tag selector muito grande**
- **Found during:** Task 2 (human verification)
- **Issue:** Layout do formulario impedia scroll e tag selector ocupava espaco excessivo
- **Fix:** Ajuste de CSS no lead-form e tag-selector components
- **Files modified:** apps/web/src/components/lead-form.tsx, apps/web/src/components/tag-selector.tsx, apps/web/src/app/layout.tsx
- **Verification:** Human re-verified e aprovou
- **Committed in:** 62252d3

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Fix necessario para UX funcional. Sem scope creep.

## Issues Encountered

None beyond the UI fix documented above.

## User Setup Required

**External services require manual configuration.** Supabase Storage bucket "lead-photos" must be created with RLS policies. See plan frontmatter `user_setup` section for SQL commands.

## Known Stubs

None - all data pipelines are fully wired.

## Next Phase Readiness

- Lead capture feature completa: form, QR scanner, photo capture, offline save, sync engine, photo upload
- Phase 03 (lead-capture) totalmente concluida (4/4 plans)
- Pronto para Phase 04 (dashboard) que consumira leads sincronizados

## Self-Check: PASSED

All files verified present. All commits verified in git history.

---
*Phase: 03-lead-capture*
*Completed: 2026-03-24*
