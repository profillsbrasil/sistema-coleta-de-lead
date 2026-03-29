# Pitfalls Research

**Domain:** Offline-first lead collection app milestone enhancements
**Researched:** 2026-03-28
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Exporting only what is currently rendered

**What goes wrong:**
Exports silently omit records because they use the loaded page or the currently rendered infinite-scroll subset.

**Why it happens:**
It is tempting to pass the existing UI array directly to the CSV utility.

**How to avoid:**
Define export scope explicitly per screen and gather all matching rows for that scope before generating the file.

**Warning signs:**
Admin export count does not match total results; search-filtered exports ignore hidden matches.

**Phase to address:**
Phase 12

---

### Pitfall 2: Showing a misleading connectivity badge

**What goes wrong:**
The shell says "online" even when there are pending writes, sync retries, or recent failures.

**Why it happens:**
Developers use `navigator.onLine` as a proxy for data safety.

**How to avoid:**
Model UI state from connectivity, queue length, sync-in-flight state, and last successful sync time.

**Warning signs:**
Users still ask whether leads were sent even while the badge says connected.

**Phase to address:**
Phase 13

---

### Pitfall 3: Assuming install prompts work everywhere

**What goes wrong:**
The app renders a broken install button on iOS Safari or other unsupported browsers.

**Why it happens:**
`beforeinstallprompt` looks like a standard event but is non-standard and not broadly supported.

**How to avoid:**
Gate the CTA on actual browser support, detect standalone mode, and show manual iOS guidance instead of a dead button.

**Warning signs:**
Install UI is visible immediately on every browser, or users report tapping install with no result.

**Phase to address:**
Phase 15

---

### Pitfall 4: Fixing the SQL join but keeping the wrong fallback chain

**What goes wrong:**
Leaderboard rows still show generic names because different auth providers populate different metadata keys.

**Why it happens:**
The query assumes one metadata key (`name`) is always present.

**How to avoid:**
Resolve display name with a deterministic chain such as `full_name` -> `name` -> email prefix -> short id.

**Warning signs:**
Only some providers display real names; non-current users still collapse to the same label.

**Phase to address:**
Phase 14

---

### Pitfall 5: Letting "PWA" expand into a platform rewrite

**What goes wrong:**
The milestone balloons into service workers, push notifications, cache strategy, and deployment headers.

**Why it happens:**
PWA work is often treated as a bundle of loosely related capabilities.

**How to avoid:**
Keep v1.2 limited to manifest, icons, install CTA, and install-state UX. Defer push/service-worker work to a future milestone.

**Warning signs:**
Tasks start mentioning push keys, notification subscriptions, or offline asset caching.

**Phase to address:**
Phase 15

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Export current array only | Fastest implementation | Incomplete handoff data | Never for admin; only acceptable in a throwaway prototype |
| Hardcode one auth metadata key | Quick bug fix | Future provider regressions | Never if multiple OAuth providers remain supported |
| Reuse one install CTA everywhere | Minimal UI work | Broken or spammy install UX | Acceptable only if gated by real capability checks |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Browser install prompt | Assume `beforeinstallprompt` is standard and universal | Treat it as Chromium-specific and provide fallback guidance |
| Supabase Auth metadata | Assume auth metadata keys are uniform across providers | Normalize fallback logic server-side |
| Existing sync engine | Add a parallel status hook that is not driven by sync state | Expose a single derived status model from the runtime |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Building huge CSVs from paginated UI data | Wrong file contents or repeated re-fetches | Fetch/map the export scope intentionally | As soon as admin exports more than one page |
| Frequent sync-status re-renders | Shell UI flickers or rerenders excessively | Publish coarse-grained status transitions | During unstable network conditions |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing auth user data outside trusted server code | Sensitive identity leakage | Keep metadata reads in backend router logic only |
| Exporting fields the current role should not see | Data overexposure | Reuse role-scoped datasets already permitted on each screen |
| Writing user-controlled cells directly to CSV | Spreadsheet formula injection when files are opened | Prefix dangerous leading characters and test malicious row fixtures |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Generic "online/offline" only | Users still do not trust whether their lead is safe | Show queue or last sync context |
| Install CTA after app is already installed | Feels broken or repetitive | Hide CTA in standalone mode |
| Export with unclear scope | Users hand off incomplete data | Label scope clearly and align counts with the file |

## "Looks Done But Isn't" Checklist

- [ ] **Export:** verify the file contains all rows in scope, not just the current page
- [ ] **Connectivity UI:** verify pending local changes remain visible even when the browser is online
- [ ] **Leaderboard fix:** verify names across multiple OAuth providers and missing-metadata cases
- [ ] **Install CTA:** verify Chromium prompt behavior and iOS fallback copy in a real browser

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Partial export scope | MEDIUM | Redefine export query/scope, add count-based tests, regenerate sample files |
| Misleading status badge | MEDIUM | Replace browser-only status with derived sync state and add manual QA cases |
| Broken install CTA | LOW | Hide unsupported CTA and ship guided fallback copy |
| Wrong leaderboard names | LOW | Patch server fallback logic and invalidate leaderboard cache |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Exporting only rendered data | Phase 12 | Export counts match visible scope totals |
| Misleading connectivity badge | Phase 13 | Pending/syncing states change correctly under offline/online transitions |
| Wrong leaderboard fallback chain | Phase 14 | Mixed-provider test data renders readable names |
| Install prompt assumptions / PWA overreach | Phase 15 | Real-browser install test passes on Chromium and iOS guidance path |

## Sources

- Next.js PWA/manifest docs
- MDN install prompt guidance
- Supabase metadata docs
- Existing export, sync, and leaderboard code paths

---
*Pitfalls research for: offline-first lead collection milestone enhancements*
*Researched: 2026-03-28*
