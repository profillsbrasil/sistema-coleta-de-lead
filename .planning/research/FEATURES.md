# Feature Research

**Domain:** Sidebar navigation + mobile responsiveness for lead collection dashboard
**Researched:** 2026-03-26
**Confidence:** HIGH

**Scope:** This research covers v1.1 milestone only -- UI refactor from topbar to sidebar navigation and achieving 100% mobile responsiveness across all pages. v1.0 product features (offline, sync, capture, etc.) are already shipped.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in a modern mobile-friendly dashboard. Missing these = product feels broken on phones.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Sidebar navigation (desktop) | Every modern dashboard uses persistent sidebar; topbar-only feels dated and wastes vertical space on wide screens | MEDIUM | shadcn `Sidebar` component already in `packages/ui`. AdminSidebar already uses it. Extend to full app replacing `Header` topbar |
| Mobile drawer navigation (hamburger + sheet) | Users expect hamburger menu on mobile; persistent sidebar eats 100% of mobile width | LOW | shadcn Sidebar handles this automatically via `Sheet` when `useIsMobile()` returns true (768px breakpoint). Already proven in admin layout |
| Collapsible sidebar (icon-only mode) | Power users want more content space; standard in Vercel, Linear, Supabase dashboards | LOW | Built into shadcn Sidebar (`SIDEBAR_WIDTH_ICON = "3rem"`, `state: "expanded" | "collapsed"`). Cookie persistence already wired |
| Touch targets min 44x44px | Apple HIG and Google Material mandate; users on phones cant reliably tap smaller elements | LOW | Audit all interactive elements. shadcn Button/SidebarMenuButton already meet this. Focus on custom links, tag filters, table action buttons |
| Responsive tables to card layout on mobile | Tables are unusable on 360px screens; horizontal scrolling hides data | MEDIUM | Admin leads table + admin users table need card transformation below `md` breakpoint. Use `hidden md:table-cell` for non-essential columns + stacked card layout on small screens |
| Responsive form inputs (full-width on mobile) | Half-width inputs on 360px screens are impossible to use; autocomplete breaks with narrow inputs | LOW | Lead form (`lead-form.tsx`) needs grid adjustment: `grid-cols-1` on mobile, `grid-cols-2` on `md`+. Use native `<select>` on mobile for better UX |
| Active route indicator in sidebar | Users need to know where they are; standard in all sidebar-based apps | LOW | AdminSidebar already implements `pathname.startsWith(href)` with `isActive`. Apply same pattern to unified sidebar |
| Sticky sidebar (scroll-independent) | Sidebar should not scroll with page content; users expect it fixed | LOW | shadcn Sidebar uses `position: fixed` by default. Already handled |
| Responsive stat cards | Dashboard stat cards must stack vertically on mobile, grid on desktop | LOW | Ensure `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` pattern on stat card container |
| Responsive chart containers | Recharts charts must resize to container width on all screens without overflow | LOW | Use `ResponsiveContainer` from Recharts (width="100%"). shadcn `ChartContainer` already wraps this. Verify no fixed-width charts exist |
| Content area accounts for sidebar width | Main content must not be hidden behind sidebar on desktop | LOW | shadcn `SidebarInset` component handles this via CSS variable `--sidebar-width`. Use it as the main content wrapper |

### Differentiators (Competitive Advantage)

Features that elevate the product above "basic responsive". Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Unified sidebar for vendedor+admin (role-based sections) | Single navigation component with expandable "Admin" section visible only to admins. No jarring context switch between layouts | MEDIUM | Current architecture has separate `Header` (vendedor) and `AdminSidebar` (admin only inside `/admin`). Merge into one `AppSidebar` with conditional admin `SidebarGroup` using `Collapsible`. Requires restructuring root `layout.tsx` |
| Sidebar state persistence via cookie | Sidebar remembers expanded/collapsed state between browser sessions; no re-collapsing on refresh | LOW | Already built into shadcn Sidebar (`SIDEBAR_COOKIE_NAME`, 7-day expiry). Just wire the `defaultOpen` prop from cookie in root layout |
| Responsive leaderboard with smart layout | Leaderboard stays comparative on mobile (horizontal scroll with position+name+score visible) instead of card-per-row which kills comparison | LOW | Use `overflow-x-auto` wrapper. Leaderboard has few columns -- show rank + name + score, hide other columns on mobile |
| FAB position aware of sidebar | "New lead" FAB button must not overlap with sidebar on desktop or be hidden behind drawer on mobile | LOW | `fab.tsx` exists. Offset `left` via CSS variable `--sidebar-width` when sidebar is expanded |
| Smooth sidebar transitions | Sidebar expands/collapses with CSS transition; feels native, not janky | LOW | shadcn Sidebar has built-in transitions via `transition-[width,transform]`. Already handled, just verify on Safari |
| Breadcrumb navigation on mobile | Shows current location when sidebar is hidden; helps users orient after deep navigation | LOW | `breadcrumb.tsx` already in UI package. Add to content header area, visible on `md:hidden` |
| User info in sidebar footer | Shows avatar + name + role at sidebar bottom; standard in modern dashboards | LOW | Use `SidebarFooter` with user data from Supabase auth. Avatar component exists in UI package |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems for this specific project.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Bottom tab bar navigation (mobile) | "Native app feel" on mobile | Conflicts with sidebar drawer pattern; two nav paradigms confuse users. Conflicts with FAB positioning. iOS Safari bottom chrome overlaps with bottom tabs | Hamburger + sheet drawer from left. Consistent mental model with desktop sidebar |
| Infinite nested sidebar menus | "Future-proofing" for more pages/sections | App has ~8 routes total. Nesting adds cognitive load without value. Deeply nested menus are terrible on mobile touch | Flat sidebar with two `SidebarGroup`s (Vendedor / Admin). Use `SidebarGroupLabel` for visual separation |
| Horizontal scroll tables everywhere | Quick responsive fix without redesigning | Users miss data off-screen, bad UX on touch (fights with page scroll), accessibility nightmare | Card layout below `md` for data-heavy tables (admin leads, admin users). Keep horizontal scroll only for inherently comparative data like leaderboard |
| Custom sidebar width per user (drag to resize) | "Personalization" | Breaks layout assumptions, causes content reflow bugs across breakpoints, complex pointer event handling, broken on touch | Fixed widths only: 16rem expanded, 3rem collapsed. shadcn defaults are battle-tested |
| Lead photos in table cells | "Visual recognition" of leads | Photos in tables cause layout shifts, slow rendering on infinite scroll lists, waste mobile bandwidth | Avatar initials in table/card. Full photo only on lead detail page (`/leads/[id]`) |
| Separate mobile and desktop navigation components | "Optimized for each" | Duplicate navigation state, double maintenance burden, inconsistent behavior between platforms, bugs when items change | Single `AppSidebar` component. shadcn Sidebar internally handles mobile (Sheet) vs desktop (fixed) rendering |
| Skeleton loading per sidebar item | "Polished loading state" | Sidebar nav items are static/hardcoded, not fetched. Loading skeletons on static content looks broken | Show sidebar immediately (items are static). Use skeleton only for dynamic content like user info in sidebar footer |

---

## Feature Dependencies

```
[Unified AppSidebar]
    |-- requires --> [SidebarProvider in root layout]
    |                   |-- requires --> [Remove Header topbar from root layout]
    |-- requires --> [Role detection in sidebar] (getClaims already works)
    |-- requires --> [UserMenu migration to sidebar footer]

[Responsive tables (card layout)]
    |-- requires --> [Reusable card-row component] (used by admin leads + admin users)
    |-- enhances --> [Unified AppSidebar] (sidebar width affects available table space)

[Responsive forms]
    |-- independent (no blockers)
    |-- enhances --> [Lead capture form] (existing lead-form.tsx)

[Touch target audit]
    |-- requires --> [Unified AppSidebar] (audit after sidebar is in place)
    |-- requires --> [Responsive tables] (audit card layout touch targets)
    |-- requires --> [Responsive forms] (audit form input sizes)

[Visual polish]
    |-- requires --> ALL above (polish is the final pass after all structural work)
```

### Dependency Notes

- **Unified AppSidebar requires root layout restructure:** Current root layout uses `Header` in a `grid-rows-[auto_1fr]` pattern. Must change to `SidebarProvider` wrapping a `flex` layout with `Sidebar` + `SidebarInset` (main content area). This is the foundational, breaking change. Everything else builds on it.
- **Admin layout becomes simpler after unification:** Current `admin/layout.tsx` wraps its own `SidebarProvider` + `AdminSidebar`. After unification, admin layout just renders `{children}` -- sidebar is handled at root level.
- **Responsive tables need a reusable pattern:** Admin leads table and admin users table both need table-to-card. Build a pattern/component once, apply to both. Could be conditional rendering via `useIsMobile()` or CSS-only approach with `hidden md:table-row` + visible mobile card.
- **Touch target audit is a final-pass activity:** No point auditing elements that will be replaced or restructured by sidebar/table work.
- **Role detection already works:** `getClaims()` pattern is established in `admin/layout.tsx` and `dashboard/page.tsx`. Sidebar just needs the same check to show/hide admin `SidebarGroup`.
- **UserMenu must migrate to sidebar:** Currently in `Header`. Move to `SidebarFooter` with avatar + name + dropdown for logout/settings.

---

## MVP Definition

### Launch With (v1.1 core -- must ship)

Minimum viable refactor to replace topbar with sidebar and achieve basic responsiveness.

- [ ] Unified `AppSidebar` component replacing `Header` -- single navigation for all roles
- [ ] `SidebarProvider` in root layout with `SidebarInset` for main content
- [ ] Mobile drawer behavior via shadcn Sheet (automatic from Sidebar + `useIsMobile`)
- [ ] Remove `Header` topbar component and `grid-rows` layout
- [ ] Admin section in sidebar (collapsible `SidebarGroup`, visible only to admins via role check)
- [ ] `UserMenu` + `ModeToggle` migration to sidebar footer
- [ ] Responsive admin leads table (card layout on mobile, table on `md`+)
- [ ] Responsive admin users table (same card pattern)
- [ ] Responsive lead form inputs (full-width on mobile)
- [ ] Touch target audit (min 44x44px on all interactive elements)

### Add After Validation (v1.1 polish)

Features to add once core sidebar and responsiveness are stable.

- [ ] Responsive stat cards grid (`grid-cols-1 -> sm:2 -> lg:4`)
- [ ] Responsive chart containers (verify `ResponsiveContainer` usage in all charts)
- [ ] Breadcrumb in main content header for mobile context
- [ ] User info (avatar + name) in sidebar footer
- [ ] FAB position offset accounting for sidebar width
- [ ] Sidebar cookie persistence verification (confirm `defaultOpen` reads from cookie)
- [ ] Visual polish pass: consistent spacing, typography scale, loading skeletons, empty states

### Future Consideration (v1.2+)

Features to defer until v1.1 is stable and validated.

- [ ] Swipe gesture verification on iOS Safari (known overscroll issues)
- [ ] Sidebar search/filter for nav items (unnecessary for ~8 routes)
- [ ] Dark mode polish specific to sidebar colors
- [ ] PWA install prompt integration with sidebar layout

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Unified AppSidebar (replace topbar) | HIGH | MEDIUM | P1 |
| SidebarProvider in root layout | HIGH | MEDIUM | P1 |
| Mobile drawer (hamburger + sheet) | HIGH | LOW | P1 |
| Remove Header component | HIGH | LOW | P1 |
| Role-based sidebar sections (admin group) | HIGH | LOW | P1 |
| UserMenu + ModeToggle to sidebar | HIGH | LOW | P1 |
| Responsive admin leads table | HIGH | MEDIUM | P1 |
| Responsive admin users table | HIGH | LOW | P1 |
| Responsive lead form | MEDIUM | LOW | P1 |
| Touch target audit (44x44px) | MEDIUM | LOW | P1 |
| Responsive stat cards grid | MEDIUM | LOW | P2 |
| Responsive charts | MEDIUM | LOW | P2 |
| Breadcrumb on mobile | LOW | LOW | P2 |
| User info in sidebar footer | LOW | LOW | P2 |
| FAB sidebar-aware positioning | LOW | LOW | P2 |
| Visual polish pass | MEDIUM | MEDIUM | P2 |
| Sidebar keyboard shortcut | LOW | LOW | P3 |

**Priority key:**
- P1: Must have -- core sidebar + responsiveness (structural changes)
- P2: Should have -- polish and refinement (after structure is stable)
- P3: Nice to have -- power user features

---

## Existing Component Inventory

Components already available in `packages/ui/src/components/` relevant to v1.1:

| Component | File | Role in v1.1 | Status |
|-----------|------|--------------|--------|
| Sidebar (full compound) | `sidebar.tsx` | Core navigation: Provider, Content, Group, GroupLabel, Menu, MenuItem, MenuButton, Trigger, Rail, Footer, Header | Ready to use |
| Sheet | `sheet.tsx` | Mobile drawer (used internally by Sidebar on mobile) | Ready (used by Sidebar) |
| Collapsible | `collapsible.tsx` | Admin section expand/collapse in sidebar | Ready to use |
| Table | `table.tsx` | Desktop table rendering for admin pages | Already in use |
| Card | `card.tsx` | Mobile card layout for table rows on small screens | Ready to use |
| Separator | `separator.tsx` | Visual separation between sidebar groups | Already in use |
| Breadcrumb | `breadcrumb.tsx` | Mobile location indicator in content header | Ready to use |
| Skeleton | `skeleton.tsx` | Loading states for dynamic sidebar content | Ready to use |
| Avatar | `avatar.tsx` | User avatar in sidebar footer | Ready to use |
| Tooltip | `tooltip.tsx` | Labels for icon-only sidebar mode | Ready (used by Sidebar) |
| Badge | `badge.tsx` | Tag indicators in card layout | Ready to use |
| Empty | `empty.tsx` | Empty states in responsive layouts | Ready to use |
| Scroll Area | `scroll-area.tsx` | Scrollable sidebar content when nav items overflow | Ready to use |
| Dropdown Menu | `dropdown-menu.tsx` | User menu dropdown in sidebar footer | Ready to use |

**Key hook:** `useIsMobile()` from `packages/ui/src/hooks/use-mobile.ts` (breakpoint: 768px, uses `matchMedia`)

**Components to create:**
- `AppSidebar` -- unified sidebar component (replaces both `Header` and `AdminSidebar`)
- `ResponsiveLeadCard` -- mobile card layout for lead table rows (reusable)
- `ResponsiveUserCard` -- mobile card layout for user table rows (or generic pattern)

**Components to remove:**
- `Header` (`apps/web/src/components/header.tsx`) -- replaced by AppSidebar

---

## Competitor Feature Analysis

| Feature | Vercel Dashboard | Supabase Dashboard | Linear App | Our Approach |
|---------|-----------------|-------------------|------------|--------------|
| Sidebar type | Collapsible, icon-only mode | Fixed left sidebar | Collapsible with `Cmd+\` | Collapsible with icon-only mode + `Ctrl+B` (shadcn default) |
| Mobile nav | Full-screen sheet from left | Bottom sheet + hamburger | Full-screen overlay | Sheet from left (shadcn Sidebar built-in behavior) |
| Tables on mobile | Card layout with stacked key-value | Horizontal scroll with sticky first column | Minimal table, detail view preferred | Card layout below `md`, full table on `md`+ |
| Forms on mobile | Full-width single column | Full-width with large inputs | Modal/sheet-based forms | Full-width single column, same page (speed matters for lead capture) |
| Touch targets | 40-48px consistently | 44px+ on primary actions | 36-44px | 44px minimum on all interactive elements |
| Role-based nav | Separate admin panel (vercel.com/~/admin) | Separate org settings page | Role-based sidebar sections | Single sidebar with collapsible admin group (no context switch) |
| User info | Avatar + name in sidebar header | Avatar + org switcher in sidebar header | Avatar in sidebar footer | Avatar + name + role in sidebar footer |

---

## Sources

- [shadcn/ui Sidebar documentation](https://ui.shadcn.com/docs/components/radix/sidebar) -- HIGH confidence, official docs
- [shadcn/ui Sidebar blocks/examples](https://ui.shadcn.com/blocks/sidebar) -- HIGH confidence, reference implementations
- [Existing codebase: `packages/ui/src/components/sidebar.tsx`] -- HIGH confidence, already installed and proven in admin layout
- [Existing codebase: `apps/web/src/components/admin-sidebar.tsx`] -- HIGH confidence, working pattern to extend
- [Existing codebase: `apps/web/src/components/header.tsx`] -- HIGH confidence, component to replace
- [Existing codebase: `apps/web/src/app/layout.tsx`] -- HIGH confidence, root layout to restructure
- [Apple Human Interface Guidelines: Touch targets](https://developer.apple.com/design/human-interface-guidelines/pointing-and-clicking) -- HIGH confidence, industry standard
- [Build a Dashboard with shadcn/ui: Complete Guide](https://designrevision.com/blog/shadcn-dashboard-tutorial) -- MEDIUM confidence, community guide
- [Responsive table patterns with card layout](https://medium.com/@other.world.html/adaptive-responsive-tables-using-react-table-library-c6da779de2bf) -- MEDIUM confidence, community pattern

---
*Feature research for: Sidebar navigation + mobile responsiveness (v1.1)*
*Researched: 2026-03-26*
