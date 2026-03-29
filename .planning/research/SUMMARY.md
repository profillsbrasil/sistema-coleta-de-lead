# Project Research Summary

**Project:** Dashboard Leads Profills
**Domain:** Offline-first lead collection app milestone enhancements
**Researched:** 2026-03-28
**Confidence:** HIGH

## Executive Summary

This milestone does not need a stack expansion. The existing Next.js 16 App Router, Dexie-backed sync runtime, Supabase-backed server code, and browser APIs are already enough to deliver export, connectivity visibility, leaderboard identity fixes, and installability. The strongest recommendation is to expose more of the app's existing truth instead of adding parallel infrastructure: publish sync state from the current engine, reuse the existing export utility path, fix identity fallback server-side, and add install metadata with a browser-aware CTA.

The main risks are scope drift and false confidence. "PWA" can easily turn into a service-worker rewrite, and a naive connectivity badge can still leave sellers unsure whether their data is safe. The milestone should therefore stay tight: export correctness, trustworthy sync status, readable leaderboard identities, and install UX that works on Chromium while degrading cleanly on iOS Safari.

## Key Findings

### Recommended Stack

The existing stack is sufficient for v1.2. Next.js provides first-class manifest support, CSV export can stay on browser primitives, and Supabase auth metadata can be normalized in trusted backend code without a new profile table.

**Core technologies:**
- Next.js App Router: manifest metadata and installability surface
- Existing browser APIs: CSV download and install prompt handling
- Existing Dexie/sync runtime: trustworthy connectivity and sync state
- Supabase Auth metadata: seller identity fallback for leaderboard rows

### Expected Features

The milestone's table stakes are straightforward and user-facing: export usable lead files, show trustworthy sync/connectivity status, display real seller names in ranking, and support installability on mobile.

**Must have (table stakes):**
- Export lead data in a scope users can trust
- Connectivity and sync status in the authenticated shell
- Real seller names with deterministic fallback
- Install metadata plus browser-aware install CTA/guidance

**Should have (competitive):**
- Filter-aware export scope
- Sync freshness or pending-change feedback
- Contextual install messaging tied to field usage

**Defer (v2+):**
- Native `.xlsx` generation
- Service-worker-led offline asset caching
- Push notifications

### Architecture Approach

Treat each capability as a thin layer over existing boundaries: export remains a shared lead-domain utility, sync visibility is derived from the current runtime, leaderboard names are normalized in the server router before caching, and install UX is a small client-side controller backed by Next.js manifest metadata.

**Major components:**
1. Export utility + screen actions — shared file generation and role-scoped entry points
2. Sync status model — read-only UI state derived from the existing engine
3. Leaderboard name resolver — fallback mapping in the backend router
4. Install controller — CTA visibility, standalone detection, and iOS guidance

### Critical Pitfalls

1. **Partial exports** — avoid exporting only rendered rows or one admin page
2. **Misleading connectivity UI** — avoid equating `navigator.onLine` with successful sync
3. **Broken install CTA** — avoid assuming `beforeinstallprompt` works on all mobile browsers
4. **Weak identity fallback** — avoid relying on one auth metadata key

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 12: Export Workflows
**Rationale:** Highest immediate operational value and there is already clear codebase momentum around CSV export.
**Delivers:** Reliable vendedor/admin export actions with explicit scope rules.
**Addresses:** Export table stakes and the partial-export pitfall.
**Avoids:** Shipping a misleading "export" button that only reflects loaded rows.

### Phase 13: Sync Visibility
**Rationale:** Reinforces the app's core value by turning existing offline/sync machinery into a trustworthy shell signal.
**Delivers:** Connectivity/sync badge or status surface using real runtime state.
**Uses:** Existing connectivity detector, sync queue, and sync cycle.
**Implements:** The sync status read model pattern.

### Phase 14: Leaderboard Identity
**Rationale:** Isolated backend/data fix with clear user-visible value and low dependency surface.
**Delivers:** Readable ranking identities with deterministic fallback.
**Implements:** Server-side identity normalization before cache population.

### Phase 15: PWA Installability
**Rationale:** Cross-cutting but still bounded once the scope is limited to metadata and install UX.
**Delivers:** `app/manifest.ts`, icons, install CTA on supported browsers, and iOS guidance.
**Avoids:** Service-worker and push scope creep.

### Phase Ordering Rationale

- Export comes first because it is the clearest operator-facing value and already has implementation touchpoints.
- Sync visibility comes before installability because trust in saved data matters more than pinning the app.
- Leaderboard identity is isolated and does not need to block export or sync UI.
- PWA work comes last because it requires real-browser verification and the strongest scope discipline.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 15:** browser-specific install behavior and verification matrix

Phases with standard patterns (skip research-phase):
- **Phase 12:** existing browser CSV patterns plus current codebase WIP
- **Phase 13:** derived client status model over known runtime
- **Phase 14:** straightforward server fallback logic

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official docs and current code agree that no new runtime stack is required |
| Features | HIGH | Scope already exists in PROJECT.md and aligns with current codebase gaps |
| Architecture | HIGH | Integration points are already visible in the app shell, sync runtime, and leaderboard router |
| Pitfalls | HIGH | Risks are concrete and tied to current implementation patterns |

**Overall confidence:** HIGH

### Gaps to Address

- Install CTA placement should be chosen deliberately because the public home route currently redirects immediately.
- Export scope rules should be made explicit for admin pagination and vendedor filtering before implementation starts.
- Target-browser install criteria should be verified early; if Chromium testing still requires a minimal service worker, keep it hand-written and narrowly scoped.

## Sources

### Primary (HIGH confidence)
- Next.js docs: `manifest.json` metadata file reference
- Next.js docs: PWA guide
- MDN: `beforeinstallprompt` and install prompt guidance
- Supabase docs: managing user data / auth metadata
- Current codebase modules for export, sync, app shell, and leaderboard

### Secondary (MEDIUM confidence)
- Existing milestone context in `.planning/PROJECT.md` and archived milestone docs

---
*Research completed: 2026-03-28*
*Ready for roadmap: yes*
