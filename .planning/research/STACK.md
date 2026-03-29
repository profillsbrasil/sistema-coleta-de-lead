# Stack Research

**Domain:** Offline-first lead collection app milestone enhancements
**Researched:** 2026-03-28
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js App Router | 16.2.1 | Manifest metadata, root layout, public assets, install surface | Official support exists for `app/manifest.ts`; no extra framework layer is needed for installability work. |
| Existing browser APIs | Platform built-ins | CSV download, install prompt, display-mode detection | `Blob`, `URL.createObjectURL`, `matchMedia`, and `beforeinstallprompt` cover this milestone without adding runtime packages; CSV should keep UTF-8 BOM and spreadsheet-friendly line endings. |
| Existing Dexie + sync engine | Dexie 4 + current app code | Connectivity and sync state surface | The app already has `syncQueue`, connectivity detection, and sync orchestration. The milestone should expose that state, not replace it. |
| Supabase Auth metadata + Postgres | Current stack | Seller identity resolution for leaderboard | The backend already queries `auth.users`; fixing the metadata fallback is lower cost than introducing a new profile subsystem in v1.2. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| No new CSV library | Current app code | Generate Excel-compatible CSV with UTF-8 BOM | Use the existing export utility pattern unless native `.xlsx` becomes a hard requirement later. |
| No new PWA plugin | N/A | Avoid unnecessary service-worker/plugin complexity | Use only if the scope expands beyond manifest + install UX into robust offline caching or push infrastructure. |
| Existing shadcn/ui components | Current workspace | Install CTA, sync badge, inline status UI | Reuse for badges, alerts, buttons, and empty states to keep UI consistent. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Browser verification | Confirm install CTA and display-mode behavior | Required for Chromium install prompt and iOS Safari fallback validation. |
| Existing test stack | Verify CSV generation and fallback logic | Unit tests fit export formatting and leaderboard name fallback well. |

## Installation

```bash
# Core
# No new runtime packages required for the planned v1.2 scope.

# Supporting
# No new supporting libraries required by default.

# Dev dependencies
# None required unless later phases expand into service workers or push notifications.
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| UTF-8 BOM CSV export | Native `.xlsx` generation | Use only if downstream stakeholders reject CSV/Sheets compatibility and explicitly require workbook features like multiple tabs or cell styling. |
| `app/manifest.ts` + public icons | `next-pwa` / Serwist setup | Use only if the milestone expands to service-worker-managed offline assets, cache strategies, or push notification delivery. |
| Fix `auth.users` metadata fallback in trusted server code | New `public.profiles` mirror table | Use only if user metadata stays inconsistent across providers and starts affecting more features than the leaderboard. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Heavy spreadsheet packages for v1.2 | Adds dependency weight and format complexity without clear milestone need | CSV with BOM and stable column mapping |
| Full PWA plugin rollout for installability only | Pulls service-worker and cache invalidation work into a milestone that only needs install UX | Built-in Next.js manifest support plus targeted install UI |
| Browser-only `navigator.onLine` badge as the whole status model | Can say "online" while sync is still failing or pending | Combine connectivity, sync queue, and last successful sync state |

## Stack Patterns by Variant

**If the requirement stays "installable app only":**
- Use `app/manifest.ts`, static icons in `public/`, and a small client install controller.
- Because Next.js already supports manifest generation and install prompts do not require offline support.

**If the requirement expands to offline asset caching later:**
- Add a deliberate service-worker layer in a future milestone.
- Because cache invalidation, update strategy, and browser support need separate design and verification.

**If auth metadata is missing for some OAuth providers:**
- Use a deterministic fallback chain (`full_name` -> `name` -> email prefix -> short id).
- Because the leaderboard must stop showing the generic label for every non-current user.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `next@16.2.1` | App Router metadata files | Official docs cover `app/manifest.ts` for this version line. |
| Chromium install prompt APIs | Manifest + installable criteria | `beforeinstallprompt` is non-standard and should be treated as Chromium-only behavior. |
| Supabase Auth metadata | Server-side SQL access to `auth.users` | Suitable in trusted backend code; direct client exposure remains inappropriate. |

## Sources

- Next.js docs: `manifest.json` metadata file reference — verified `app/manifest.ts` support for App Router
- Next.js docs: PWA guide — verified installability can be added without offline support and that iOS home-screen UX needs explicit handling
- MDN: `beforeinstallprompt` / install prompt guidance — verified Chromium-only and non-standard nature of the in-app prompt API
- Microsoft support guidance for UTF-8 CSV in Excel — verified BOM-based compatibility expectations
- Supabase docs: managing user data — verified metadata lives in `auth.users.raw_user_meta_data`
- Current codebase: `apps/web/src/lib/sync/connectivity.ts`, `apps/web/src/lib/sync/engine.ts`, `packages/api/src/routers/leaderboard.ts`, `apps/web/src/lib/lead/export-csv.ts`

---
*Stack research for: offline-first lead collection milestone enhancements*
*Researched: 2026-03-28*
