# Pitfalls Research

**Domain:** UI sidebar refactor + mobile responsiveness (Next.js App Router + shadcn/ui Sidebar)
**Researched:** 2026-03-26
**Confidence:** HIGH (verified against codebase analysis, shadcn/ui GitHub issues, Safari known bugs, and official docs)

---

## Critical Pitfalls

### Pitfall 1: Layout nesting conflict — SidebarProvider at root vs admin layout

**What goes wrong:**
The current codebase has `SidebarProvider` only inside `apps/web/src/app/admin/layout.tsx`. The root layout (`app/layout.tsx`) uses a `<Header />` topbar with `grid-rows-[auto_1fr]`. Moving to a global sidebar means the `SidebarProvider` must wrap the entire app at root level. If you keep the admin layout's `SidebarProvider` AND add one at root, you get nested providers — the admin sidebar breaks because `useSidebar()` resolves to the wrong context.

**Why it happens:**
Incremental refactoring — developers add the global sidebar without removing the admin-scoped provider, or try to have two independent sidebars.

**How to avoid:**
- Single `SidebarProvider` at root layout level, wrapping all routes
- Remove the `SidebarProvider` from `admin/layout.tsx` entirely
- The sidebar component itself handles role-based sections (admin group visible only to admins)
- Admin layout becomes a simple auth guard wrapper, no sidebar provider

**Warning signs:**
- `useSidebar()` throws "must be used within SidebarProvider" in non-admin routes
- Sidebar state (open/closed) resets when navigating between admin and vendedor routes
- Two overlapping Sheet drawers appear on mobile

**Phase to address:**
Phase 1 (Layout skeleton) — must be the very first change, before any sidebar content.

---

### Pitfall 2: Root layout grid → flex transition causes CLS on every page

**What goes wrong:**
Current root layout uses `grid min-h-svh grid-rows-[auto_1fr]` with `<Header />` as the first row. Switching to `flex` for sidebar layout (sidebar + main content) changes the fundamental document flow. If done incrementally (some pages adapted, others not), users see content jump — Cumulative Layout Shift (CLS) on every navigation.

**Why it happens:**
The topbar is in root layout. If you replace it with sidebar but some routes still expect the old `grid-rows` structure (e.g., login page), those pages break. The admin layout already compensates with `min-h-[calc(100svh-49px)]` for the topbar height — this breaks when topbar is removed.

**How to avoid:**
- Atomic swap: remove `<Header />` from root layout and add `<Sidebar />` in the same PR/phase
- Login page gets its own route group `(auth)` with a separate layout that has NO sidebar
- All `calc(100svh - 49px)` references must be audited and replaced with `h-svh` or `flex-1`
- Use `(app)` route group for all authenticated routes that share the sidebar

**Warning signs:**
- Hardcoded pixel values like `49px`, `64px` in CSS referencing old topbar height
- Pages render with a blank gap where the topbar used to be
- Login page shows sidebar when it should not

**Phase to address:**
Phase 1 (Layout skeleton) — route groups and layout restructure must happen atomically.

---

### Pitfall 3: shadcn Sidebar drawer does not close after navigation on mobile

**What goes wrong:**
On mobile, shadcn's Sidebar renders as a `Sheet` (drawer). When the user taps a nav link, Next.js navigates to the new route BUT the drawer stays open, covering the content. The user must manually dismiss it. This is the #1 reported issue with shadcn sidebar mobile (GitHub issues #5561, #6265).

**Why it happens:**
Next.js client-side navigation does not trigger a page reload, so the Sheet's `open` state is never reset. The `SidebarProvider` maintains `openMobile` state that nobody resets on route change.

**How to avoid:**
- Add a `useEffect` in the sidebar component that watches `usePathname()` and calls `setOpenMobile(false)` on route change:
```typescript
const pathname = usePathname();
const { setOpenMobile } = useSidebar();

useEffect(() => {
  setOpenMobile(false);
}, [pathname, setOpenMobile]);
```
- Apply this in the sidebar nav component, NOT in the layout

**Warning signs:**
- QA reports: "sidebar stays open after clicking a link on phone"
- Users have to swipe/tap outside the drawer after every navigation
- Only happens on mobile, works fine on desktop

**Phase to address:**
Phase 2 (Sidebar navigation content) — when implementing nav links.

---

### Pitfall 4: iOS Safari `position: fixed` breaks with virtual keyboard

**What goes wrong:**
The current `FAB` component uses `fixed right-6 bottom-6`. On iOS Safari, when the virtual keyboard opens (e.g., in lead form), Safari converts `position: fixed` to `position: absolute` internally, causing the FAB to jump up to the middle of the screen or disappear. This also affects any sidebar trigger buttons that use `fixed` positioning.

**Why it happens:**
iOS Safari has two viewport systems (layout viewport and visual viewport). When the keyboard opens, Safari shifts the layout viewport upward but does NOT resize it. Fixed elements stay anchored to the shifted layout viewport, causing visual displacement.

**How to avoid:**
- Move the FAB inside the scrollable content area using `position: sticky` at the bottom, OR
- Place it inside the sidebar-adjacent main content container (not at document root)
- For sidebar triggers on mobile: use `sticky top-0` instead of `fixed top-0`
- Never use `position: fixed` for elements that must coexist with form inputs on iOS
- Test every fixed-position element with keyboard open on a real iPhone

**Warning signs:**
- FAB floats over the keyboard on iOS
- Sidebar trigger disappears when user taps a search/filter input
- Element positions are correct on Android but wrong on iOS

**Phase to address:**
Phase 3 (Responsive pages) — when adapting forms and interactive elements.

---

### Pitfall 5: `100vh` / `100dvh` Safari iOS 26 overlay gap bug

**What goes wrong:**
Since iOS 26 (2025), Safari changed how overlays and backdrop elements handle `100dvh`. Drawers and modals using `100dvh` no longer cover 100% of the screen height — a gap appears at the bottom. This directly affects the shadcn Sheet component that the Sidebar uses for mobile drawer mode.

**Why it happens:**
Safari iOS 26 changed the behavior of how top/bottom UI bars interact with viewport height calculations based on the page background color. The `dvh` unit now sometimes leaves space for Safari's bottom toolbar even when the overlay is visible.

**How to avoid:**
- Use `100svh` (small viewport height) for full-screen overlays — it's the most conservative and guarantees fitting within the visible area
- For the sidebar Sheet specifically: verify the shadcn Sheet component uses `h-svh` or `min-h-svh`, NOT `100vh` or `100dvh`
- Test on a real iOS 26+ device (simulator is insufficient for viewport bugs)
- Fallback: add `position: fixed; inset: 0` for overlays instead of height-based approaches

**Warning signs:**
- Visible gap at bottom of mobile drawer on iPhone
- Sheet backdrop doesn't cover the full screen
- Works perfectly in Chrome DevTools mobile simulation but fails on real iPhone

**Phase to address:**
Phase 2 (Sidebar navigation) — when implementing the mobile drawer mode.

---

### Pitfall 6: Recharts/ChartContainer breaks in sidebar-constrained width

**What goes wrong:**
The dashboard uses Recharts `BarChart` inside `ChartContainer` with `className="h-[120px] w-full"`. When the sidebar is added, the main content area shrinks. Recharts does NOT automatically resize — it calculates dimensions on mount and doesn't react to container width changes from sidebar open/collapse transitions. Charts overflow their container or render at 0 width.

**Why it happens:**
Recharts uses SVG with fixed dimensions calculated at mount time. CSS transitions (sidebar collapse/expand animation) happen over ~200ms, but Recharts only reads container width once. `w-full` means "100% of parent", but the parent width is animating.

**How to avoid:**
- Wrap charts in a `ResponsiveContainer` from Recharts (NOT just ChartContainer)
- Add a `ResizeObserver` or use the `onResize` callback to trigger chart redraw after sidebar transition ends
- Alternatively: use `aspect-ratio` on the chart container instead of fixed height
- Debounce resize handling to avoid jank during sidebar animation
- Test both collapsed and expanded sidebar states

**Warning signs:**
- Charts render with 0 width when page loads with sidebar expanded
- Charts don't resize when sidebar is toggled
- Chart tooltips appear outside the visible area
- Horizontal scrollbar appears in main content area

**Phase to address:**
Phase 4 (Dashboard responsive) — when adapting chart layouts.

---

### Pitfall 7: Table → Card layout responsive switch loses inline actions

**What goes wrong:**
Admin panels (`leads-panel.tsx`, `users-panel.tsx`) use `<Table>` with actions in the last column (edit, delete buttons, role select). When converting to card layout for mobile, developers often forget to include the action buttons, or place them where they conflict with the card's tap target (the whole card becomes clickable but action buttons inside it also trigger).

**Why it happens:**
Desktop table rows have clear column separation. Card layout collapses this hierarchy. Action buttons that were in a dedicated column now share space with content. Event bubbling causes card-tap AND button-tap to fire simultaneously.

**How to avoid:**
- Use `e.stopPropagation()` on action buttons inside clickable cards
- Place actions in a dedicated row at the bottom of each card, visually separated
- Use a `DropdownMenu` (three-dot menu) for actions instead of inline buttons on mobile — saves horizontal space and avoids tap conflicts
- Keep the same component for both layouts (conditionally render table row vs card), not two separate components
- Ensure action buttons meet 44x44px touch targets even in card layout

**Warning signs:**
- Clicking "delete" on mobile also navigates to the detail page
- Action buttons are too small or overlap on mobile
- Two separate components diverge in behavior (table has actions, card doesn't)

**Phase to address:**
Phase 3 (Responsive pages) — when converting admin tables.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `as unknown as "/"` type casts on routes | Silences typed routes errors | Every new route needs the same hack; breaks if route is removed | Never — fix the typedRoutes config or use proper route types |
| Separate Header + AdminSidebar components for nav | Worked for v1.0 MVP | Two places to update navigation; role check duplicated in Header (client-side) and admin/layout (server-side) | Only in MVP — must unify in v1.1 |
| Hardcoded `min-h-[calc(100svh-49px)]` in admin layout | Compensates for topbar height | Breaks if topbar height changes; couples layouts together | Never after sidebar refactor |
| `useIsMobile()` returns `false` on SSR (initial render) | Avoids hydration mismatch | Flash of desktop layout on mobile before hydration completes; causes CLS | Acceptable if content is similar between mobile/desktop; problematic for sidebar/drawer toggle |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| shadcn Sidebar + Next.js App Router | Putting `SidebarProvider` in a nested layout — sidebar unmounts/remounts on route change between groups | Place `SidebarProvider` in the root `(app)` layout that covers ALL authenticated routes |
| Dexie `useLiveQuery` + sidebar layout | Dexie queries fire on every re-render including sidebar open/close (layout changes trigger re-renders) | Memoize query parameters; ensure Dexie queries only depend on actual data filters, not layout state |
| shadcn Sheet (mobile drawer) + Safari `overscroll-behavior` | Scrolling inside the drawer causes the body to scroll behind it on iOS Safari | Add `overscroll-behavior: contain` to the Sheet content AND `overflow: hidden` to body when Sheet is open |
| `usePathname()` + sidebar active state | Using exact match (`pathname === href`) misses nested routes (e.g., `/admin/leads/123` doesn't highlight `/admin/leads`) | Use `pathname.startsWith(href)` (already correct in current admin-sidebar, must maintain in new unified sidebar) |
| Recharts + CSS transitions | Chart calculates dimensions during sidebar open/close animation, gets wrong width | Delay chart resize until CSS transition completes (listen to `transitionend` event on sidebar container) |
| FAB + Sidebar | FAB at `fixed right-6 bottom-6` overlaps sidebar trigger or gets hidden behind sidebar on certain breakpoints | FAB position must be sidebar-aware: offset `right` value when sidebar is expanded on desktop |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Sidebar re-renders entire page tree | Every sidebar toggle re-renders all child components because `SidebarProvider` context changes propagate | Split context: sidebar state context separate from sidebar data context; use `React.memo` on page content wrappers | Noticeable on pages with Dexie live queries (dashboard, lead list) |
| CSS animation jank on sidebar transition | Sidebar open/close is choppy on mid-range Android phones | Use `transform: translateX()` for sidebar animation, not `width` or `margin-left`; enable `will-change: transform` | Devices with < 4GB RAM, especially with heavy chart rendering |
| `IntersectionObserver` sentinel inside sidebar layout | Infinite scroll sentinel calculates visibility relative to viewport, not scroll container — loads all items at once | Set `root` option on IntersectionObserver to the scrollable container (main content area), not the default viewport | When sidebar makes main content a nested scroll container instead of document scroll |
| Large component tree hydration with sidebar | Server renders desktop sidebar + full page content; mobile hydrates and throws away sidebar HTML (renders Sheet instead) | Use `suppressHydrationWarning` on sidebar wrapper OR accept the hydration trade-off (shadcn sidebar already handles this with `useIsMobile`) | First paint on 3G connections with slow hydration |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Role check only in sidebar visibility (hiding admin links) | Non-admin users can still access `/admin/*` routes by typing URL directly | Keep server-side role guard in admin layout (already exists) — sidebar visibility is UX only, never security |
| Sidebar shows user email/name from client-side state | Stale session data could show wrong user info if session expired | Always derive user info from server-side session in layout, pass down as props; client-side auth check is for UX polish only |
| Mobile drawer swipe exposes admin section briefly | Fast swipe animation may show admin nav items before role check hides them | Render admin section only when `userRole === "admin"` is confirmed — use `null` not `display: none` (CSS can be overridden) |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Hamburger icon with no label | Vendedores at a conference won't discover sidebar exists; 45% of users don't recognize hamburger alone (Nielsen Norman Group) | Add text "Menu" next to hamburger icon OR keep sidebar visible by default on tablet-sized screens (768px+) |
| Sidebar covers 100% of mobile screen | User loses context of where they are; feels like a new page, not a menu | Use shadcn's default `SIDEBAR_WIDTH_MOBILE = "18rem"` (72% of 320px screen); keep a sliver of content visible behind the overlay |
| Touch targets < 44px on sidebar nav items | Misclicks in a noisy conference environment where hands are unsteady | Enforce `min-h-[44px]` on all `SidebarMenuButton` items; shadcn's default may be smaller |
| No swipe-to-close on mobile drawer | Users expect swipe gesture on drawers (native app muscle memory) | shadcn Sheet supports swipe by default — verify it's not disabled; add `onPointerDown` swipe handling if needed |
| Pagination controls too small on mobile admin tables | Admin can't navigate pages of leads/users on phone | Use larger pagination buttons or switch to infinite scroll on mobile (already implemented for vendedor leads) |
| Sidebar state not persisted across sessions | User collapses sidebar, navigates away, comes back — sidebar is expanded again | shadcn sidebar already uses cookie (`sidebar_state`) for persistence — verify the cookie is set correctly and has adequate `max-age` |

## "Looks Done But Isn't" Checklist

- [ ] **Sidebar mobile drawer:** Test on real iPhone Safari (not just Chrome DevTools) — verify no bottom gap, drawer closes on nav, no scroll bleed-through
- [ ] **Route groups:** Login/signup pages must NOT have sidebar — verify `(auth)` group has its own layout without `SidebarProvider`
- [ ] **Admin role gate:** Server-side redirect in admin layout still works after layout restructure — test by visiting `/admin` as vendedor
- [ ] **FAB position:** FAB doesn't overlap sidebar trigger on mobile; doesn't jump when keyboard opens on lead form
- [ ] **Offline indicator:** Sidebar or header area should still show sync status / connectivity — don't lose the `staleness-indicator.tsx` functionality
- [ ] **Tables on mobile:** All admin tables (leads, users, stats) render usably on 320px wide screen — not just "technically visible"
- [ ] **Chart resize:** Dashboard charts redraw correctly after sidebar toggle — test expanded AND collapsed states
- [ ] **Touch targets:** Run Chrome DevTools audit for tap target size on mobile viewport — all interactive elements >= 44x44px
- [ ] **Keyboard navigation:** Sidebar can be opened/closed via keyboard shortcut (shadcn default: `b`) — don't break it during customization
- [ ] **Dark mode:** Sidebar styling works in both light and dark themes — test both, especially active state colors
- [ ] **Scroll position:** Navigating between routes doesn't reset scroll position of the sidebar itself (sidebar should maintain its scroll independently)
- [ ] **Deep links:** Sidebar highlights correct item when user arrives via direct URL (e.g., bookmark to `/admin/stats`)

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Nested SidebarProvider | LOW | Remove inner provider, move to root — 1 file change |
| Drawer doesn't close on navigate | LOW | Add `useEffect` with pathname watch — 5 lines of code |
| CLS from layout grid→flex swap | MEDIUM | Must update root layout + all route groups atomically — plan a single PR |
| iOS Safari fixed position bugs | MEDIUM | Replace `fixed` with `sticky` in affected components; test on real device |
| Recharts not resizing | MEDIUM | Wrap in ResponsiveContainer + add resize debounce — per-chart change |
| Table→card conversion missing actions | HIGH | If done with two separate components, must retrofit actions into card component and add e2e tests |
| `100dvh` Safari gap bug | LOW | Replace with `100svh` or `inset: 0` — CSS-only fix |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Nested SidebarProvider context | Phase 1 (Layout skeleton) | Only one `SidebarProvider` in codebase; `grep -r SidebarProvider` returns 1 result |
| Root layout grid→flex CLS | Phase 1 (Layout skeleton) | No `grid-rows-[auto_1fr]` in root layout; no hardcoded topbar height references |
| Drawer not closing on navigate | Phase 2 (Sidebar nav content) | Manual test: tap nav link on mobile, drawer closes automatically |
| iOS Safari fixed positioning | Phase 3 (Responsive pages) | FAB and sidebar trigger work correctly with keyboard open on real iPhone |
| Safari 100dvh gap | Phase 2 (Sidebar nav content) | Mobile drawer covers full screen on iPhone Safari — visual test |
| Recharts resize on sidebar toggle | Phase 4 (Dashboard responsive) | Toggle sidebar 3 times — charts resize correctly each time |
| Table→card mobile conversion | Phase 3 (Responsive pages) | All action buttons accessible on 320px viewport in admin panels |
| Touch targets < 44px | Phase 5 (Polish) | Chrome DevTools tap target audit passes with 0 warnings |
| Sidebar hamburger discoverability | Phase 2 (Sidebar nav content) | User testing: 3/3 new users find navigation within 5 seconds |
| IntersectionObserver sentinel | Phase 3 (Responsive pages) | Infinite scroll works in lead list when sidebar is present — loads 20 items, then more on scroll |

## Sources

- [shadcn Sidebar official docs](https://ui.shadcn.com/docs/components/radix/sidebar)
- [shadcn/ui #5561: Sidebar drawer not closing on mobile navigation](https://github.com/shadcn-ui/ui/issues/5561)
- [shadcn/ui #6265: Sidebar hidden in mobile view](https://github.com/shadcn-ui/ui/issues/6265)
- [shadcn/ui #5545: Main content width expansion with sidebar](https://github.com/shadcn-ui/ui/issues/5545)
- [shadcn/ui #7808: useSidebar state not updating on mobile](https://github.com/shadcn-ui/ui/issues/7808)
- [iOS Safari position: fixed + virtual keyboard bug](https://medium.com/@im_rahul/safari-and-position-fixed-978122be5f29)
- [iOS 26 viewport/dvh overlay gap](https://developer.apple.com/forums/thread/803987)
- [100vh Safari problem on iOS](https://www.bram.us/2020/05/06/100vh-in-safari-on-ios/)
- [Viewport units guide: svh, lvh, dvh](https://medium.com/@tharunbalaji110/understanding-mobile-viewport-units-a-complete-guide-to-svh-lvh-and-dvh-0c905d96e21a)
- [WCAG 2.5.5 Target Size requirements](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [Smashing Magazine: Accessible target sizes](https://www.smashingmagazine.com/2023/04/accessible-tap-target-sizes-rage-taps-clicks/)
- [Next.js layout shift discussion #71333](https://github.com/vercel/next.js/discussions/71333)
- [MUI #12285: Safari fixed elements behind toolbar](https://github.com/mui/material-ui/issues/12285)
- Codebase analysis: `apps/web/src/app/layout.tsx`, `apps/web/src/app/admin/layout.tsx`, `apps/web/src/components/fab.tsx`, `packages/ui/src/components/sidebar.tsx`, `packages/ui/src/hooks/use-mobile.ts`

---
*Pitfalls research for: UI sidebar refactor + mobile responsiveness (v1.1)*
*Researched: 2026-03-26*
