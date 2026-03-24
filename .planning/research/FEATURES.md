# Feature Research

**Domain:** Event lead capture — sales team at conferences and trade shows
**Researched:** 2026-03-24
**Confidence:** HIGH (industry patterns well-established; vendor sources + community practices cross-verified)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features sellers and field sales teams assume exist. Missing these = product feels broken in the field.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Manual lead entry form | Baseline — badge scanners aren't always available; fallback must exist | LOW | Name + phone required; rest optional. Target: < 3 taps to save |
| QR code scanning | Fastest capture method; every badge and many business cards carry one | MEDIUM | Camera API on mobile Chrome/Safari. WhatsApp QR format is `https://wa.me/55XXXXXXXXXXX` — extract phone with regex |
| Offline data entry | Conference venues have unreliable WiFi; data loss is unacceptable | HIGH | IndexedDB via Dexie. All writes go local first; server is sync target |
| Auto-sync when online | Users expect data to appear on other devices without manual action | HIGH | Background sync on Chromium; polling fallback for Safari/Firefox. Server-wins conflict strategy |
| Lead list (own leads) | Reps need to review, edit, and recall who they talked to | LOW | Sorted by recency; filter by qualification tag |
| Lead detail edit | Notes and tags added after conversations; memory fades fast | LOW | Edit inline; mark quente/morno/frio in < 2 taps |
| Qualification tags | Sales orgs universally use hot/warm/cold or equivalent | LOW | Three values: quente, morno, frio. Displayed with color coding |
| Personal stats dashboard | Reps want to know their own count; motivates during the event | LOW | Total leads, breakdown by tag, leads today |
| Connectivity indicator | Users must know if they are offline so they trust the app | LOW | Simple banner or icon; no guessing if data was saved |

### Differentiators (Competitive Advantage)

Features that set this product apart from generic lead capture tools for this specific team context.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Team leaderboard | Friendly competition drives volume; Leady and Captello both prove this increases capture rate | MEDIUM | Ranked by lead count and/or weighted score (quente = 3, morno = 2, frio = 1). Must work offline with last-sync data |
| WhatsApp-specific QR decode | Target audience is Brazilian market where WhatsApp is primary contact channel | LOW | Parse `wa.me` URL, extract phone, pre-fill field — no extra OCR or AI needed |
| Business card photo attachment | Captures extra context without slowing down the conversation | MEDIUM | Camera capture → stored as blob in Dexie locally → uploaded on sync. Main pitfall: blob size and Safari storage quota |
| Segment free-text field | Allows reps to tag industry/interest without admin-defined taxonomies | LOW | Free input; no autocomplete needed for v1. Enables post-event filtering |
| Notes field | Best practice from trade show research: add notes during conversation, not hours later | LOW | Multi-line text; no rich text formatting needed |
| Leaderboard offline fallback | Competitors don't handle offline leaderboard — ours shows last-synced rankings | LOW | Display staleness timestamp ("atualizado 12 min atrás") |

### Anti-Features (Things to Deliberately NOT Build)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time collaborative lead list | Seems useful for managers watching live | Requires WebSockets or SSE; adds complexity that breaks offline model; data contention at scale | Leaderboard refreshes on sync; manager sees totals without live streaming |
| Custom field builder / form configurator | Admin wants flexible forms | Multiplies schema complexity, form rendering logic, and offline sync surface area; overkill for a fixed team event | Use "segmento" (free text) + "notas" as escape hatches; covers 90% of real needs |
| Push notifications | "Notify rep when they fall behind on leaderboard" sounds motivating | Requires service worker + push subscription management; Safari support is still incomplete on iOS 16 and earlier; adds infra dependency | Reps check leaderboard voluntarily during the event |
| CRM integration (Salesforce, HubSpot) | Standard enterprise request | Zero ROI for a 10-person team at a single event; CRM integrations need per-instance OAuth setup, field mapping, error handling, and maintenance | Export CSV in v2 if needed; manual copy-paste is acceptable at this scale |
| Multi-event support | "We go to multiple events per year" | Changes data model fundamentally (event scoping, per-event leaderboard, cross-event stats); out of scope for v1 validation | Scope is single active event; redeploy or reset for next event |
| Lead deduplication / merge | Avoids duplicate contacts | High complexity for marginal benefit at conference scale; reps rarely capture the same person twice | Visual warning if same phone number entered twice is sufficient |
| Magic link / OAuth login | "Easier login for reps" | Better-Auth already provides email/password; adding OAuth needs redirect URI setup and env vars per provider | Pre-create accounts for each rep; event is short-lived |
| Business card OCR (AI) | Auto-extract name/email/phone from photo | Requires paid AI API (Google Vision, AWS Textract) or on-device ML; latency is poor offline; accuracy on Portuguese names is uneven | Photo attachment stores card for manual review; rep fills fields verbally during conversation |

---

## Feature Dependencies

```
Offline data entry (Dexie)
    └──required by──> All lead entry features (form, QR scan, photo)
    └──required by──> Lead list (read)
    └──required by──> Leaderboard offline fallback

Auto-sync (Dexie → Supabase)
    └──required by──> Team leaderboard (needs server-side aggregation)
    └──required by──> Personal stats cross-device

QR scan (camera API)
    └──enhances──> Manual lead entry (pre-fills phone field)

Photo attachment
    └──depends on──> Offline data entry (blob storage in Dexie)
    └──syncs via──> Auto-sync (upload blob on reconnect)

Qualification tags
    └──feeds into──> Personal stats dashboard (tag breakdown)
    └──feeds into──> Leaderboard weighted score (optional)

Personal stats dashboard
    └──depends on──> Lead list (own leads)
    └──enhances by──> Leaderboard (comparative context)

Team leaderboard
    └──requires──> Auto-sync (for cross-rep data)
    └──degrades gracefully to──> Leaderboard offline fallback (last-sync data)
```

### Dependency Notes

- **All capture features require offline storage:** Nothing should block on network. Dexie must be set up before any lead entry work begins.
- **Leaderboard requires sync:** A leaderboard showing only local data is useless for competition. The leaderboard is only meaningful after the first sync cycle.
- **Photo attachment is the highest-risk differentiator:** Blob storage in IndexedDB hits Safari's 50MB storage quota quickly if multiple reps store photos. Needs explicit size cap (e.g., resize to max 800px before storing) and clear sync-then-purge strategy.
- **QR scan is additive, not blocking:** Form works without QR. QR scan enhances speed but is not a prerequisite.

---

## MVP Definition

### Launch With (v1)

Minimum viable product to validate the concept at one conference with 10 reps.

- [ ] Manual lead entry form (nome + telefone obrigatorios, segmento + notas opcionais) — core capture loop
- [ ] Qualification tag picker (quente/morno/frio) — fast, in-conversation rating
- [ ] Lead list with edit and delete (own leads only) — rep needs to manage their own data
- [ ] Offline-first with Dexie — data cannot be lost; this is the core constraint
- [ ] Auto-sync Dexie → Supabase — data persists server-side after event
- [ ] QR code scanner (WhatsApp `wa.me` format → phone) — speed-of-capture differentiator for Brazilian market
- [ ] Personal stats dashboard (count, tag breakdown) — motivates reps
- [ ] Team leaderboard (count + weighted score) — drives competition during the event
- [ ] Connectivity indicator — reps must trust the app when offline
- [ ] Leaderboard offline fallback with staleness timestamp — leaderboard must not break offline

### Add After Validation (v1.x)

Features to add once core loop is validated and stable.

- [ ] Business card photo attachment — adds context; defer until offline blob handling is battle-tested
- [ ] Segment-based filtering on lead list — useful post-event; not needed during capture
- [ ] Export to CSV — post-event data handoff; manual is OK for v1

### Future Consideration (v2+)

Defer until product-market fit and multi-event need is confirmed.

- [ ] Multi-event support — changes schema fundamentally; wait for demand
- [ ] CRM integration — only if team scales beyond 10 reps or events become frequent
- [ ] Push notifications — only if iOS PWA support matures and team requests it
- [ ] AI business card OCR — only if photo attachment proves insufficient

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Manual lead entry form | HIGH | LOW | P1 |
| Offline-first (Dexie) | HIGH | HIGH | P1 |
| Auto-sync Dexie → Supabase | HIGH | HIGH | P1 |
| Qualification tags (quente/morno/frio) | HIGH | LOW | P1 |
| Lead list (own leads, CRUD) | HIGH | LOW | P1 |
| Connectivity indicator | HIGH | LOW | P1 |
| QR scan (WhatsApp) | HIGH | MEDIUM | P1 |
| Personal stats dashboard | MEDIUM | LOW | P1 |
| Team leaderboard | MEDIUM | MEDIUM | P1 |
| Leaderboard offline fallback | MEDIUM | LOW | P1 |
| Business card photo attachment | MEDIUM | HIGH | P2 |
| Segment-based filtering | LOW | LOW | P2 |
| Export to CSV | LOW | LOW | P2 |
| Push notifications | LOW | HIGH | P3 |
| CRM integration | LOW | HIGH | P3 |
| Multi-event support | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | iCapture / Captello | Popl / Bizzabo | This Product (v1) |
|---------|---------------------|----------------|-------------------|
| Badge/QR scan | Yes (event badge QR) | Yes (universal scanner + AI enrichment) | Yes (WhatsApp QR → phone; no badge integration needed) |
| Offline capture | Yes | Partial | Yes (Dexie, full offline) |
| Custom forms | Yes (complex, admin-configured) | Yes | No (fixed fields; segmento + notas as escape hatches) |
| Lead qualification | Star ratings / custom questions | AI scoring | Simple 3-value tag (quente/morno/frio) |
| Photo / business card | Yes (OCR in premium tiers) | Yes (AI OCR) | Photo only, no OCR |
| Team leaderboard | Yes (Captello, Leady) | No (individual-focused) | Yes |
| CRM integration | Yes (Salesforce, HubSpot, Marketo) | Yes | No (v1 out of scope) |
| Real-time sync | Yes | Yes | On-reconnect sync (not real-time) |
| Price for small team | $99+/month | $99+/month | Self-hosted, no per-seat cost |
| WhatsApp-native flow | No | No | Yes (Brazilian market fit) |

---

## Sources

- [The Event Lead Capture Landscape in 2026 — Event Tech Live](https://eventtechlive.com/the-event-lead-capture-landscape-in-2026-navigating-diy-tools-platform-consolidation-and-the-data-advantage/)
- [8 Best Event Lead Capture Systems — InviteDesk](https://invitedesk.com/en-gb/blog/best-event-lead-capture-systems/)
- [7 Essential Lead Capture Apps for Trade Shows — Spreadly](https://spreadly.app/en/blog/lead-capture-app-for-trade-shows)
- [Captello — Universal Lead Capture with Gamification](https://www.captello.com/event-lead-capture/)
- [Leady — Free Lead Capture with Leaderboard](https://www.getleady.app/)
- [Bizzabo — Event Lead Retrieval Guide](https://www.bizzabo.com/blog/event-lead-retrieval)
- [Popl — Event Lead Capture](https://popl.co/pages/event-lead-capture)
- [The Anatomy of a Great Event Lead Capture Form — Lead Liaison](https://www.leadliaison.com/revenue-generation-blog/the-anatomy-of-a-great-event-lead-capture-form/)
- [How to Elevate Lead Retrieval with Custom Qualifiers — Fielddrive](https://www.fielddrive.com/blog/lead-retrieval-custom-qualifiers)
- [Offline-first frontend apps 2025: IndexedDB and SQLite — LogRocket](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/)
- [Data Synchronization in PWAs: Offline-First Strategies — GTC Systems](https://gtcsys.com/comprehensive-faqs-guide-data-synchronization-in-pwas-offline-first-strategies-and-conflict-resolution/)
- [Lead Generation at Events: 2025 Playbook — LeadBeam](https://www.leadbeam.ai/blog/lead-generation-at-events)

---
*Feature research for: Event lead capture — sales team at conferences*
*Researched: 2026-03-24*
