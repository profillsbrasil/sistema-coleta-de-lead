# Feature Research

**Domain:** Offline-first lead collection app milestone enhancements
**Researched:** 2026-03-28
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Export own and admin lead lists | Sales teams expect to hand off captured leads after the event | MEDIUM | Must export the correct scope, not only visible cards or the current admin page. |
| Connectivity and sync visibility | Offline-first promises create trust expectations around what has synced | MEDIUM | A simple online/offline badge is not enough; users need pending/in-progress context. |
| Real seller names in leaderboard | Rankings lose value if identities are generic or ambiguous | LOW | Deterministic fallback matters more than a schema redesign in this milestone. |
| Installable mobile experience | Event staff often pin tools to the home screen for quick access | MEDIUM | Requires manifest/icons and browser-aware install UX, especially for iOS Safari. |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Filter-aware export | Makes the export immediately useful for follow-up workflows | MEDIUM | Export should respect selected vendor/filter scope and include all matching rows. |
| Sync freshness feedback | Reduces fear of data loss during unstable connectivity | MEDIUM | Showing pending changes or last successful sync can reinforce the app's core value. |
| Contextual install CTA | Helps sales teams adopt the app in the field without needing training | LOW | Best surfaced where users already arrive during event use, not via a generic modal everywhere. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Native `.xlsx` export in v1.2 | "Excel export" is common shorthand from stakeholders | Adds dependency weight, format complexity, and testing surface | Ship Excel-friendly CSV first |
| Push notifications and service worker expansion | Feels adjacent to "PWA" | Turns a focused milestone into a platform/infrastructure project | Limit v1.2 to installability metadata and install UX |
| Aggressive install modal on every visit | Teams want to boost installs quickly | Annoying UX, unsupported on some browsers, easy to implement badly | Show a dismissible CTA only when install is actually possible or relevant |

## Feature Dependencies

```text
[Install CTA]
    └──requires──> [Manifest + icons]

[Connectivity UI]
    └──requires──> [Readable sync state from engine]

[Leaderboard names]
    └──requires──> [Metadata fallback strategy]

[Export UX]
    └──enhances──> [Post-event follow-up workflow]

[Push/service worker scope] ──conflicts──> [Tight v1.2 milestone focus]
```

### Dependency Notes

- **Install CTA requires manifest + icons:** browsers do not surface install behavior cleanly without install metadata.
- **Connectivity UI requires readable sync state:** queue length, in-flight status, and last success matter more than raw browser network state.
- **Leaderboard names require metadata fallback strategy:** current generic fallback is the user-facing bug.
- **Push/service worker scope conflicts with tight v1.2 focus:** it adds platform work that is not required to satisfy the installability goal.

## MVP Definition

### Launch With (v1.2)

- [ ] Export actions for vendedor and admin lead workflows
- [ ] Connectivity/sync status surfaced in the authenticated app shell
- [ ] Real seller names with deterministic fallback in the leaderboard
- [ ] Installability metadata plus browser-aware install CTA/guidance

### Add After Validation (v1.2.x)

- [ ] Manual sync retry control if users still need reassurance after the status UI ships
- [ ] More granular export presets if sales operations ask for different column sets

### Future Consideration (v2+)

- [ ] Native `.xlsx` export if CSV proves insufficient
- [ ] Public profile table for broader identity features beyond leaderboard
- [ ] Push notifications / richer service-worker behavior

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Export workflows | HIGH | MEDIUM | P1 |
| Connectivity/sync visibility | HIGH | MEDIUM | P1 |
| Leaderboard identity fix | MEDIUM | LOW | P1 |
| Installability + CTA | MEDIUM | MEDIUM | P1 |
| Manual sync retry | MEDIUM | MEDIUM | P2 |
| Native `.xlsx` export | LOW | HIGH | P3 |

## Competitor Feature Analysis

| Feature | Competitor A | Competitor B | Our Approach |
|---------|--------------|--------------|--------------|
| Export | Usually CSV or spreadsheet handoff | Usually CSV from filtered CRM views | Keep v1.2 focused on clean CSV handoff that works in Excel/Sheets |
| Offline trust | Often vague "saved" language | Often hidden status until failure | Surface explicit sync/connectivity state to reinforce offline-first trust |
| PWA install | Often browser-default only | Often unsupported on iOS | Add browser-aware CTA with graceful iOS guidance |

## Sources

- Existing milestone notes in `.planning/PROJECT.md`
- Current codebase touchpoints for export, sync, and leaderboard
- Next.js PWA documentation
- MDN install prompt guidance

---
*Feature research for: offline-first lead collection milestone enhancements*
*Researched: 2026-03-28*
