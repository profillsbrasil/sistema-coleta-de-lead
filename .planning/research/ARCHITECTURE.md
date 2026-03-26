# Architecture Research

**Domain:** Sidebar navigation + mobile responsiveness integration with Next.js App Router
**Researched:** 2026-03-26
**Confidence:** HIGH

## Current Architecture Assessment

### Layout Hierarchy (Before)

```
RootLayout (apps/web/src/app/layout.tsx)
├── <html> + <body>
├── Providers (ThemeProvider, QueryClient, SyncInitializer, Toaster)
├── grid min-h-svh grid-rows-[auto_1fr]
│   ├── Header (topbar — client component, role-checks client-side)
│   └── {children}
│       ├── / (Home — public, health check)
│       ├── /login (public)
│       ├── /todos (public)
│       ├── /dashboard (auth-guarded per-page via server component)
│       ├── /leads (auth-guarded per-page via server component)
│       ├── /leads/new (auth-guarded per-page)
│       ├── /leads/[id] (auth-guarded per-page)
│       └── /admin/* (AdminLayout — nested layout with its own SidebarProvider)
│           ├── AdminSidebar (shadcn Sidebar component)
│           └── admin pages (leads, users, stats)
```

### Key Observations

1. **Header is in RootLayout** — renders on ALL pages including login and home, wastes space on mobile
2. **Admin already uses shadcn Sidebar** — `SidebarProvider` + `Sidebar` + `Sheet` mobile drawer already working
3. **Auth guards are per-page** — each page does its own `supabase.auth.getUser()` + `redirect("/login")`
4. **No route group separation** — public pages (/, /login, /todos) and authenticated pages share the same layout
5. **Header checks role client-side** — `useEffect` + `getUser()` to show/hide "Admin" link (flash potential)

## Recommended Architecture

### Layout Hierarchy (After)

```
RootLayout (apps/web/src/app/layout.tsx)
├── <html> + <body>
├── Providers (ThemeProvider, QueryClient, SyncInitializer, Toaster)
└── {children}
    │
    ├── (public)/               # Route group — NO sidebar
    │   ├── layout.tsx          # Minimal layout (no nav, centered)
    │   ├── page.tsx            # Home
    │   └── login/page.tsx      # Login
    │
    └── (app)/                  # Route group — WITH sidebar
        ├── layout.tsx          # AppLayout: auth guard + SidebarProvider + AppSidebar + SidebarInset
        ├── dashboard/page.tsx
        ├── leads/page.tsx
        ├── leads/new/page.tsx
        ├── leads/[id]/page.tsx
        └── admin/
            ├── leads/page.tsx
            ├── users/page.tsx
            └── stats/page.tsx
```

### Why This Structure

**Route groups `(public)` and `(app)` solve the core problem:** the sidebar should only appear on authenticated pages. Without route groups, the sidebar either renders on login (bad) or requires conditional rendering in the root layout (worse — client-side flash, layout shifts).

**Admin pages lose their dedicated layout.** The current `admin/layout.tsx` with its own `SidebarProvider` + `AdminSidebar` is replaced by the unified `(app)/layout.tsx` that holds a single `AppSidebar` with role-conditional admin section. This eliminates the double-sidebar problem (topbar + admin sidebar).

**Auth guard centralizes in `(app)/layout.tsx`.** Instead of each page doing its own `getUser()` + `redirect()`, the group layout handles auth once. Individual admin pages still need role checks, but user authentication is guaranteed by the parent layout.

## Component Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     RootLayout                               │
│  (html, body, Providers — NO navigation)                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐    ┌───────────────────────────────┐  │
│  │  (public)/layout  │    │  (app)/layout                 │  │
│  │  - No sidebar     │    │  - Auth guard (server)        │  │
│  │  - Centered       │    │  - SidebarProvider            │  │
│  │  - Login, Home    │    │  - AppSidebar + SidebarInset  │  │
│  └──────────────────┘    └──────────┬────────────────────┘  │
│                                      │                       │
│                          ┌───────────┴───────────┐          │
│                          │     AppSidebar         │          │
│                          │  ┌─────────────────┐   │          │
│                          │  │ SidebarHeader   │   │          │
│                          │  │ (logo, trigger) │   │          │
│                          │  ├─────────────────┤   │          │
│                          │  │ SidebarContent  │   │          │
│                          │  │ ┌─────────────┐ │   │          │
│                          │  │ │ Vendedor    │ │   │          │
│                          │  │ │ nav group   │ │   │          │
│                          │  │ └─────────────┘ │   │          │
│                          │  │ ┌─────────────┐ │   │          │
│                          │  │ │ Admin group │ │   │          │
│                          │  │ │ (if admin)  │ │   │          │
│                          │  │ └─────────────┘ │   │          │
│                          │  ├─────────────────┤   │          │
│                          │  │ SidebarFooter   │   │          │
│                          │  │ (user, theme)   │   │          │
│                          │  └─────────────────┘   │          │
│                          └────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Status | Location |
|-----------|----------------|--------|----------|
| `RootLayout` | html/body, fonts, Providers | **MODIFY** — remove Header, remove grid | `app/layout.tsx` |
| `PublicLayout` | Centered container, no nav | **NEW** | `app/(public)/layout.tsx` |
| `AppLayout` | Auth guard, SidebarProvider, sidebar + main area | **NEW** | `app/(app)/layout.tsx` |
| `AppSidebar` | Unified sidebar with vendedor + admin sections | **NEW** | `components/app-sidebar.tsx` |
| `SidebarUserMenu` | User info + sign out in sidebar footer | **NEW** | `components/sidebar-user-menu.tsx` |
| `AppTopbar` | Mobile trigger + breadcrumb/page title in SidebarInset | **NEW** | `components/app-topbar.tsx` |
| `Header` | Top navigation bar | **DELETE** | `components/header.tsx` |
| `AdminSidebar` | Admin-only sidebar | **DELETE** | `components/admin-sidebar.tsx` |
| `AdminLayout` | Admin wrapper with SidebarProvider | **DELETE** | `app/admin/layout.tsx` |
| `UserMenu` | Dropdown user menu in topbar | **REPURPOSE** into `SidebarUserMenu` | `components/user-menu.tsx` |
| `ModeToggle` | Theme switcher | **MOVE** into sidebar footer | `components/mode-toggle.tsx` |

## Architectural Patterns

### Pattern 1: Route Group Layout Splitting

**What:** Use Next.js route groups `(public)` and `(app)` to apply different layouts without affecting URL paths.

**When to use:** When authenticated and public pages need fundamentally different UI chrome (sidebar vs no sidebar).

**Trade-offs:**
- PRO: Clean separation, no conditional rendering, no layout flash
- PRO: Server-side auth guard in one place
- CON: Moving pages into route groups changes file paths (requires moving files)
- CON: Shared components between groups need to live outside groups

**Example:**
```
app/
├── (public)/
│   ├── layout.tsx        # <main className="flex min-h-svh items-center justify-center">
│   ├── page.tsx           # / (home)
│   └── login/page.tsx     # /login
└── (app)/
    ├── layout.tsx         # Auth + SidebarProvider + AppSidebar + SidebarInset
    ├── dashboard/page.tsx # /dashboard (URL unchanged)
    └── leads/page.tsx     # /leads (URL unchanged)
```

### Pattern 2: Server Component Auth Guard at Layout Level

**What:** The `(app)/layout.tsx` is an async Server Component that checks auth and passes user/role data down.

**When to use:** When all child routes require authentication.

**Trade-offs:**
- PRO: Auth check runs once per navigation, not per page
- PRO: User data available to sidebar without client-side fetch
- CON: Next.js caches layouts across navigations — this is desirable (avoids re-fetching auth on every page transition)

**Example:**
```typescript
// app/(app)/layout.tsx
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: claimsData } = await supabase.auth.getClaims();
  const userRole = (claimsData?.claims as Record<string, unknown>)?.user_role;
  const isAdmin = userRole === "admin";

  return (
    <SidebarProvider>
      <AppSidebar isAdmin={isAdmin} user={user} />
      <SidebarInset>
        <AppTopbar />
        <div className="flex-1 p-4 md:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

### Pattern 3: Role-Conditional Sidebar Groups

**What:** Single `AppSidebar` component with vendedor nav items always visible and admin nav items conditionally rendered based on `isAdmin` prop.

**When to use:** When different user roles share the same shell but see different navigation options.

**Trade-offs:**
- PRO: One sidebar component to maintain
- PRO: Admin section appears/disappears without page reload
- CON: Sidebar component needs role prop from server

**Example:**
```typescript
// components/app-sidebar.tsx
"use client";

const VENDEDOR_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: ClipboardList },
  { href: "/leads/new", label: "Novo Lead", icon: PlusCircle },
] as const;

const ADMIN_ITEMS = [
  { href: "/admin/leads", label: "Todos os Leads", icon: ClipboardList },
  { href: "/admin/users", label: "Usuarios", icon: Users },
  { href: "/admin/stats", label: "Stats Globais", icon: BarChart3 },
] as const;

export default function AppSidebar({ isAdmin, user }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        {/* Logo / App name */}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Vendedor</SidebarGroupLabel>
          <SidebarMenu>
            {VENDEDOR_ITEMS.map(/* nav items with isActive */)}
          </SidebarMenu>
        </SidebarGroup>
        {isAdmin ? (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarMenu>
              {ADMIN_ITEMS.map(/* nav items with isActive */)}
            </SidebarMenu>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        <SidebarUserMenu user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
```

### Pattern 4: SidebarInset for Main Content

**What:** Use shadcn's `SidebarInset` component as the main content wrapper inside `SidebarProvider`. It automatically handles margin/padding based on sidebar state.

**When to use:** Always when using shadcn Sidebar — it handles the responsive layout math.

**Example:**
```typescript
<SidebarProvider>
  <AppSidebar />
  <SidebarInset>
    <header className="flex h-14 items-center gap-2 border-b px-4">
      <SidebarTrigger />
      {/* Breadcrumb or page title */}
    </header>
    <main className="flex-1 p-4 md:p-6">
      {children}
    </main>
  </SidebarInset>
</SidebarProvider>
```

## Data Flow

### Auth + Role Data Flow

```
(app)/layout.tsx (Server Component)
    │
    ├── supabase.auth.getUser() → user object
    ├── supabase.auth.getClaims() → user_role
    │
    ├── isAdmin = userRole === "admin"
    │
    ├──→ AppSidebar (client) ← props: { isAdmin, user }
    │       ├── Vendedor nav items (always)
    │       ├── Admin nav items (if isAdmin)
    │       └── SidebarUserMenu ← props: { user }
    │
    └──→ {children} (page components)
            └── Individual pages NO LONGER need auth guard
                (except admin pages still need role guard)
```

### Mobile Sidebar State Flow

```
SidebarProvider (context)
    │
    ├── useIsMobile() hook (768px breakpoint)
    │
    ├── Desktop: Sidebar renders as fixed side panel
    │   └── collapsible="icon" — collapses to icons only
    │
    └── Mobile: Sidebar renders inside Sheet (drawer)
        ├── SidebarTrigger (hamburger) in AppTopbar opens drawer
        ├── Sheet slides from left
        └── Sheet auto-closes on navigation (via Link click)
```

### Navigation State

```
usePathname() (Next.js hook)
    ↓
AppSidebar compares pathname to nav item hrefs
    ↓
SidebarMenuButton isActive={pathname.startsWith(href)}
    ↓
Active item highlighted via data-active styles
```

## Integration Points

### Files to Create

| File | Purpose | Dependencies |
|------|---------|-------------|
| `app/(public)/layout.tsx` | Public pages layout (no sidebar) | None |
| `app/(app)/layout.tsx` | Auth guard + sidebar shell | `AppSidebar`, `AppTopbar`, Supabase server client |
| `components/app-sidebar.tsx` | Unified sidebar with role groups | shadcn Sidebar, Lucide icons, `usePathname` |
| `components/app-topbar.tsx` | SidebarTrigger + page context bar | `SidebarTrigger` from shadcn |
| `components/sidebar-user-menu.tsx` | User info + sign out in footer | Supabase client, `DropdownMenu` |

### Files to Modify

| File | Change | Reason |
|------|--------|--------|
| `app/layout.tsx` | Remove `Header` import, remove grid layout | Sidebar replaces topbar |
| `app/(app)/dashboard/page.tsx` | Remove auth guard boilerplate | Layout handles auth |
| `app/(app)/leads/page.tsx` | Remove auth guard boilerplate | Layout handles auth |
| `app/(app)/leads/new/page.tsx` | Remove auth guard boilerplate | Layout handles auth |
| `app/(app)/leads/[id]/page.tsx` | Remove auth guard boilerplate | Layout handles auth |
| `app/(app)/admin/*/page.tsx` | Remove user auth guard (keep role guard) | Layout handles user auth |

### Files to Delete

| File | Reason |
|------|--------|
| `components/header.tsx` | Replaced by AppSidebar |
| `components/admin-sidebar.tsx` | Merged into AppSidebar |
| `app/admin/layout.tsx` | Merged into (app)/layout.tsx |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| RootLayout -> (app)/layout | children prop (Next.js routing) | No data passing needed |
| (app)/layout -> AppSidebar | Props: `isAdmin`, `user` | Server-to-client boundary |
| (app)/layout -> page children | children prop | Pages receive no layout props; use own data fetching |
| AppSidebar -> SidebarUserMenu | Props: `user` | User data flows from layout through sidebar |
| SidebarProvider -> all sidebar children | React Context | State: open/collapsed/mobile managed by context |

## Anti-Patterns

### Anti-Pattern 1: Conditional Sidebar in Root Layout

**What people do:** Keep Header/Sidebar in root layout with `pathname.includes("/login") ? null : <Sidebar />`.
**Why it's wrong:** Client-side conditional causes layout flash. Root layout is a Server Component by default, so `usePathname()` forces it to become a client component (losing SSR benefits). Layout shifts on navigation.
**Do this instead:** Use route groups. `(public)` has no sidebar, `(app)` has sidebar. Zero conditionals, zero flash.

### Anti-Pattern 2: Separate SidebarProviders per Section

**What people do:** Keep the admin `SidebarProvider` + `AdminSidebar` separate from a new vendedor sidebar.
**Why it's wrong:** Two sidebars means inconsistent state (one open, one closed), doubled mobile drawers, and users "switch context" instead of smoothly navigating.
**Do this instead:** Single `SidebarProvider` in `(app)/layout.tsx`, single `AppSidebar` with role-conditional groups.

### Anti-Pattern 3: Client-Side Role Fetching in Sidebar

**What people do:** Sidebar component does its own `useEffect` + `getUser()` to determine role (like current Header does).
**Why it's wrong:** Flash of unauthenticated content, race condition with page render, duplicate Supabase calls.
**Do this instead:** `(app)/layout.tsx` is a Server Component that fetches auth/role and passes as props to `AppSidebar`. No client-side fetch needed for role detection.

### Anti-Pattern 4: Keeping the Topbar Alongside Sidebar

**What people do:** Keep `Header` for non-admin pages and add sidebar only for admin.
**Why it's wrong:** Inconsistent navigation UX, wasted vertical space on mobile (topbar + hamburger trigger), navigation items split between topbar and sidebar.
**Do this instead:** Remove Header entirely. All navigation moves to sidebar. The only "topbar" is the `AppTopbar` inside `SidebarInset` with the `SidebarTrigger` button and optional breadcrumbs.

## Build Order

The build order respects component dependencies (bottom-up) and minimizes broken states.

### Phase 1: Foundation (no visual changes yet)

1. Create `app/(public)/layout.tsx` — minimal wrapper
2. Move `app/page.tsx` -> `app/(public)/page.tsx`
3. Move `app/login/` -> `app/(public)/login/`
4. Verify: public pages render identically, URLs unchanged

### Phase 2: App Shell

5. Create `components/app-sidebar.tsx` — vendedor + admin nav items
6. Create `components/sidebar-user-menu.tsx` — user footer
7. Create `components/app-topbar.tsx` — SidebarTrigger + title area
8. Create `app/(app)/layout.tsx` — auth guard + SidebarProvider + AppSidebar + SidebarInset

### Phase 3: Migration

9. Move `app/dashboard/` -> `app/(app)/dashboard/`
10. Move `app/leads/` -> `app/(app)/leads/`
11. Move `app/admin/` -> `app/(app)/admin/` (remove admin/layout.tsx)
12. Remove auth boilerplate from moved page components
13. Verify: all pages render with sidebar, admin items visible for admin role

### Phase 4: Cleanup

14. Remove `components/header.tsx`
15. Remove `components/admin-sidebar.tsx`
16. Update `app/layout.tsx` — remove Header import, simplify to just `{children}`
17. Move `app/todos/` -> `app/(public)/todos/` or `app/(app)/todos/` depending on auth requirement
18. Verify: no references to deleted components, clean build

### Phase ordering rationale

- Phase 1 first because route groups are non-breaking (same URLs)
- Phase 2 before Phase 3 because the shell must exist before pages move into it
- Phase 3 is the critical migration — old and new coexist briefly
- Phase 4 cleanup only after everything works to avoid breaking mid-migration

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (10 vendedores) | Single sidebar with 2 groups is perfect |
| 50+ vendedores | No sidebar changes needed; pagination in admin lists |
| Multi-event (future) | Add event selector in SidebarHeader, no structural change |

### Sidebar Navigation Growth

The sidebar has ~6 nav items total (3 vendedor + 3 admin). shadcn Sidebar handles up to ~15-20 items comfortably before needing collapsible sub-groups or scrolling. No concern for this project.

## Sources

- Codebase analysis: `apps/web/src/app/layout.tsx`, `admin/layout.tsx`, `components/header.tsx`, `components/admin-sidebar.tsx`
- shadcn Sidebar component: `packages/ui/src/components/sidebar.tsx` (already installed, fully functional with Sheet mobile drawer)
- shadcn `useIsMobile` hook: `packages/ui/src/hooks/use-mobile.ts` (768px breakpoint, already used by Sidebar)
- Next.js App Router route groups: standard pattern — parenthesized folders create layout boundaries without affecting URLs

---
*Architecture research for: Sidebar navigation + mobile responsiveness integration*
*Researched: 2026-03-26*
