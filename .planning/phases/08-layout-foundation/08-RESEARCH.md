# Phase 8: Layout Foundation - Research

**Researched:** 2026-03-26
**Domain:** Next.js App Router route groups + shadcn Sidebar layout restructure
**Confidence:** HIGH

## Summary

Phase 8 replaces the topbar `Header` with a sidebar navigation using shadcn's Sidebar component suite already installed in the project. The core technique is Next.js route groups: `(public)` for login pages (no sidebar) and `(app)` for authenticated pages (with sidebar). A single `SidebarProvider` in `(app)/layout.tsx` replaces the current nested pattern where `admin/layout.tsx` has its own `SidebarProvider`. The auth guard moves from per-page `getUser()` + `redirect()` calls to a centralized Server Component check in `(app)/layout.tsx`.

This is a structural-only phase. Zero new dependencies are needed -- all shadcn Sidebar components (`Sidebar`, `SidebarProvider`, `SidebarInset`, `SidebarContent`, `SidebarGroup`, `SidebarMenu`, etc.) are already installed in `packages/ui/src/components/sidebar.tsx`. The existing `AdminSidebar` component already demonstrates the exact same composition pattern that the new `AppSidebar` will use.

**Primary recommendation:** Execute as three sequential plans: (1) create route groups and move pages, (2) build `(app)/layout.tsx` with auth guard + SidebarProvider + AppSidebar shell, (3) delete Header, AdminSidebar, admin/layout.tsx and clean root layout.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Unica pagina publica e `/login` -- fica em `app/(public)/login/page.tsx` com layout sem sidebar
- **D-02:** `/` (home) redireciona para `/dashboard` se logado, `/login` se nao logado -- nao e mais uma pagina com conteudo
- **D-03:** Paginas `/todos` e `page.tsx` (home) sao DELETADAS -- nao tem utilidade no produto
- **D-04:** `/auth/callback` fica na raiz (`app/auth/callback/`) fora dos route groups -- callback nao precisa de layout
- **D-05:** Todas as outras paginas (/dashboard, /leads, /leads/new, /leads/[id], /admin/*) ficam em `app/(app)/`
- **D-06:** AppSidebar ja inclui nav items basicos na Phase 8: Dashboard, Leads, Novo Lead + secao Admin (collapsible, role-gated)
- **D-07:** Sidebar no desktop e SEMPRE EXPANDIDA -- sem modo icon-only, sem Ctrl+B para colapsar. `collapsible="none"` ou equivalente
- **D-08:** Sidebar no mobile (< 768px) usa Sheet drawer built-in do shadcn Sidebar -- hamburguer abre, conteudo ocupa tela
- **D-09:** Sidebar no desktop e fixa e nao colapsa -- labels completos sempre visiveis
- **D-10:** `(app)/layout.tsx` usa `getUser()` para auth check + `getClaims()` para role detection -- mesmo padrao do admin/layout.tsx atual
- **D-11:** `isAdmin` e passado como prop ao `AppSidebar` -- sem client-side role fetch
- **D-12:** Paginas admin dentro de `(app)/admin/` MANTEM role guard server-side proprio -- sidebar esconder links nao e seguranca, e UX only
- **D-13:** Execucao sequencial em 3 plans: Plan 1 (route groups + mover paginas) -> Plan 2 ((app)/layout + AppSidebar shell) -> Plan 3 (remover Header, AdminSidebar, admin/layout, limpar root layout)
- **D-14:** `Header` (`components/header.tsx`) e DELETADO completamente -- sem referencias restantes
- **D-15:** `AdminSidebar` (`components/admin-sidebar.tsx`) e DELETADO -- funcionalidade absorvida pelo AppSidebar
- **D-16:** `admin/layout.tsx` e DELETADO -- auth guard vai para `(app)/layout.tsx`, role guard fica inline nas admin pages
- **D-17:** Root `layout.tsx` perde `<Header />` e o `grid min-h-svh grid-rows-[auto_1fr]` -- fica apenas Providers + `{children}`

### Claude's Discretion
- Brand/logo no SidebarHeader -- Claude decide melhor approach (texto, icone+texto, etc.)
- Estilo e espacamento do sidebar shell
- Tratamento de loading state durante auth check no layout

### Deferred Ideas (OUT OF SCOPE)
- UserMenu completo no SidebarFooter (avatar, nome, role, logout) -- Phase 9
- Touch targets 44px nos nav items -- Phase 9
- Drawer fecha ao navegar no mobile (usePathname fix) -- Phase 9
- Breadcrumb no AppTopbar -- Phase 11
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LAYOUT-01 | App possui sidebar de navegacao (shadcn Sidebar) substituindo o topbar Header em todas as rotas autenticadas | Architecture Pattern 2: SidebarProvider in (app)/layout.tsx wraps all authenticated routes; AppSidebar renders sidebar; collapsible="offcanvas" with no desktop toggle |
| LAYOUT-02 | Route groups (public) e (app) separam paginas sem sidebar de paginas com sidebar -- zero condicional no root layout | Architecture Pattern 1: route groups provide layout separation without conditional rendering; root layout becomes Providers + {children} only |
| LAYOUT-03 | SidebarProvider unico em (app)/layout.tsx -- nenhum SidebarProvider aninhado | Current codebase has exactly 1 SidebarProvider (admin/layout.tsx); Plan 2 creates the new one, Plan 3 deletes admin/layout.tsx; grep verification confirms 1 result |
| LAYOUT-05 | Header topbar removido -- sem referencia a header.tsx no codebase apos migracao | Plan 3 deletes components/header.tsx and removes import from root layout.tsx; only 1 import currently exists |
| LAYOUT-06 | AdminSidebar e admin/layout.tsx removidos -- admin layout simplificado para guard de role apenas | Plan 3 deletes both files; admin pages stay simple (no auth guard needed, only role guard in individual pages like admin/page.tsx) |
| LAYOUT-07 | Auth guard centralizado em (app)/layout.tsx como Server Component -- paginas individuais nao duplicam getUser() + redirect() | Architecture Pattern 3: async Server Component layout calls getUser() + getClaims(), passes isAdmin to AppSidebar; pages drop their own auth boilerplate |
| MOBILE-03 | Sidebar nao aparece nas paginas de login e home -- layout publico sem sidebar | Route group (public) has its own layout WITHOUT SidebarProvider; login page renders in (public) group |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| shadcn Sidebar suite | v4 (installed) | Full sidebar navigation with mobile Sheet drawer | Already installed in `packages/ui/src/components/sidebar.tsx`; handles mobile/desktop automatically |
| Next.js App Router | 16.2 | Route groups `(public)`/`(app)` for layout splitting | Built-in feature, zero config |
| Supabase Auth | @supabase/ssr 0.9 | Server-side auth guard via `getUser()` + `getClaims()` | Already used in admin/layout.tsx -- exact same pattern |
| Lucide React | 1.6.0 | Navigation icons (LayoutDashboard, ClipboardList, PlusCircle, Users, BarChart3) | Already used in AdminSidebar and Header |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `usePathname` | Next.js built-in | Active state detection in sidebar nav items | Used in AppSidebar to highlight current route |
| `cn()` | from `@dashboard-leads-profills/ui/lib/utils` | Conditional className composition | Every component with dynamic classes |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shadcn Sidebar | Custom sidebar with Sheet | Zero reason -- shadcn Sidebar is already installed and battle-tested |
| Route groups | Conditional rendering in root layout | Causes layout flash, forces root to be client component |
| Server Component auth guard | Middleware-only auth | Middleware cannot pass user data to components; server component can pass props |

**Installation:**
```bash
# NENHUMA instalacao necessaria.
# Todos os componentes e dependencias ja estao presentes.
```

## Architecture Patterns

### Recommended Project Structure

```
apps/web/src/app/
├── layout.tsx                    # Root: html + body + Providers + {children} (NO sidebar, NO header)
├── (public)/
│   ├── layout.tsx                # Centered container, no nav
│   ├── login/page.tsx            # /login (moved from app/login/)
│   └── page.tsx                  # / (redirect to /dashboard or /login)
├── (app)/
│   ├── layout.tsx                # Auth guard + SidebarProvider + AppSidebar + SidebarInset
│   ├── dashboard/page.tsx        # /dashboard (auth guard removed)
│   ├── leads/
│   │   ├── page.tsx              # /leads (auth guard removed)
│   │   ├── new/page.tsx          # /leads/new (auth guard removed)
│   │   └── [id]/page.tsx         # /leads/[id] (auth guard removed)
│   └── admin/
│       ├── page.tsx              # /admin (redirect to /admin/leads)
│       ├── leads/
│       │   ├── page.tsx
│       │   └── [id]/page.tsx
│       ├── users/page.tsx
│       └── stats/page.tsx
├── auth/callback/route.ts        # Auth callback (stays at root, outside groups)
└── api/trpc/[trpc]/route.ts      # tRPC handler (stays at root)
```

### Pattern 1: collapsible="offcanvas" (NOT "none") for Desktop-Fixed + Mobile-Sheet

**What:** D-07 says sidebar is always expanded on desktop. The natural instinct is `collapsible="none"`, but the shadcn Sidebar source code reveals that `collapsible="none"` **skips the mobile Sheet entirely** -- it renders a plain div without any mobile drawer handling.

**When to use:** When sidebar must be both always-visible on desktop AND a Sheet drawer on mobile.

**Implementation:**
```typescript
// Use collapsible="offcanvas" (default) -- provides both desktop sidebar AND mobile Sheet
// Desktop: sidebar stays expanded because defaultOpen={true} and no toggle UI
// Mobile: sidebar renders as Sheet via built-in useIsMobile() detection
<Sidebar collapsible="offcanvas">
  {/* children */}
</Sidebar>
```

**Critical detail:** Do NOT render `SidebarRail` (the toggle handle on sidebar edge) and do NOT render `SidebarTrigger` on desktop. Without a trigger, the sidebar cannot be collapsed on desktop. On mobile, render `SidebarTrigger` inside the `SidebarInset` header for the hamburger menu.

**Also:** Remove the Ctrl+B keyboard shortcut behavior by NOT using `SidebarProvider`'s built-in toggle. The keyboard shortcut is always active when `SidebarProvider` is used. To disable it on desktop only, add a wrapper that intercepts the event OR accept it as-is (minimal impact since sidebar re-expands on page navigation).

### Pattern 2: Server Component Auth Guard at Layout Level

**What:** `(app)/layout.tsx` as an async Server Component that checks auth and passes user/role data down via props.

**Existing pattern in codebase:** `admin/layout.tsx` already does exactly this.

**Example:**
```typescript
// app/(app)/layout.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: claimsData } = await supabase.auth.getClaims();
  const userRole = (claimsData?.claims as Record<string, unknown>)?.user_role;
  const isAdmin = userRole === "admin";

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar isAdmin={isAdmin} />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4 md:hidden">
          <SidebarTrigger />
        </header>
        <div className="flex-1 p-4 md:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

### Pattern 3: SidebarMenuButton with render Prop for Links

**What:** The existing AdminSidebar demonstrates the correct pattern for nav items with Next.js typed routes.

**Source:** `apps/web/src/components/admin-sidebar.tsx` (verified in codebase)

**Example:**
```typescript
<SidebarMenuButton
  isActive={pathname.startsWith(href)}
  render={<Link href={href as unknown as "/"} />}
>
  <Icon />
  {label}
</SidebarMenuButton>
```

**Notes:**
- Uses `render` prop (base-ui pattern, NOT `asChild` which is Radix)
- `as unknown as "/"` is existing tech debt for typedRoutes -- maintain for now
- `pathname.startsWith(href)` for nested route active states
- Per shadcn skill rules: no sizing classes on icons inside components

### Pattern 4: Public Layout (Minimal)

**What:** `(public)/layout.tsx` provides centered container for login page.

**Example:**
```typescript
// app/(public)/layout.tsx
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh items-center justify-center">
      {children}
    </div>
  );
}
```

**Note:** Login page already has its own centering (`flex min-h-svh items-center justify-center p-4`), so the public layout may just pass through `{children}` without wrapping. Decide based on whether the login page's own styling is sufficient.

### Pattern 5: Home Page as Redirect

**What:** `/` (home) redirects to `/dashboard` if logged in, `/login` if not. Not a content page.

**Example:**
```typescript
// app/(public)/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  redirect("/login");
}
```

### Anti-Patterns to Avoid

- **Conditional sidebar in root layout:** Never use `pathname.includes("/login") ? null : <Sidebar />`. Forces root to become client component, causes layout flash.
- **Multiple SidebarProviders:** Never have SidebarProvider in both `(app)/layout.tsx` and `admin/layout.tsx`. The admin layout's SidebarProvider MUST be removed.
- **Client-side role fetching in sidebar:** Never use `useEffect` + `getUser()` in AppSidebar (like current Header does). Pass `isAdmin` as a prop from the Server Component layout.
- **`collapsible="none"` with mobile expectation:** This mode renders a plain div WITHOUT mobile Sheet support.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mobile drawer sidebar | Custom Sheet + state management | shadcn `Sidebar` with `collapsible="offcanvas"` | Built-in Sheet, state management, cookie persistence |
| Active nav state | Custom router watching logic | `usePathname()` + `pathname.startsWith(href)` | Already working in AdminSidebar |
| Layout separation | Conditional rendering with `usePathname()` | Next.js route groups `(public)` / `(app)` | Zero flash, SSR compatible, standard pattern |
| Auth guard per page | Duplicated `getUser()` in every page | Single check in `(app)/layout.tsx` | DRY, consistent, one place to maintain |

**Key insight:** Every building block for this phase already exists in the codebase. AdminSidebar proves the sidebar pattern works. admin/layout.tsx proves the Server Component auth guard works. The phase is purely about unifying and restructuring.

## Common Pitfalls

### Pitfall 1: `collapsible="none"` Kills Mobile Sheet
**What goes wrong:** Developer uses `collapsible="none"` to prevent desktop collapse (per D-07), but this also removes the mobile Sheet drawer entirely (per source code at line 166-178 of sidebar.tsx).
**Why it happens:** Intuitive assumption that "none" means "no collapse" but it actually means "no collapsibility at all -- no Sheet, no toggle, nothing."
**How to avoid:** Use `collapsible="offcanvas"` (default) and simply don't render `SidebarRail` or desktop `SidebarTrigger`. Desktop sidebar stays expanded because there's no way to collapse it. Mobile Sheet still works.
**Warning signs:** Sidebar works on desktop but nothing happens when tapping hamburger on mobile; no Sheet drawer appears.

### Pitfall 2: Nested SidebarProvider After Migration
**What goes wrong:** If admin/layout.tsx's SidebarProvider is not removed in Plan 3, navigating between `/dashboard` and `/admin/*` causes two nested SidebarProviders -- sidebar state breaks.
**Why it happens:** Plan 2 adds SidebarProvider to `(app)/layout.tsx`, but admin/layout.tsx still has its own.
**How to avoid:** Plan 3 must delete `admin/layout.tsx` entirely. Verify with `grep -r SidebarProvider apps/web/src` -- should return exactly 1 result.
**Warning signs:** `useSidebar()` resolves to wrong context; sidebar state resets when entering/leaving admin routes.

### Pitfall 3: Root Layout Grid Remains After Header Removal
**What goes wrong:** After Header is deleted but the `grid min-h-svh grid-rows-[auto_1fr]` wrapper stays in root layout, the first grid row (now empty) consumes `auto` height = 0, but the grid container still applies, causing nested grid-in-flex conflicts with SidebarProvider's own `flex min-h-svh` wrapper.
**Why it happens:** Forgetting to remove the grid wrapper when removing Header.
**How to avoid:** Plan 3 must change root layout to just `<Providers>{children}</Providers>` without the `<div className="grid ...">` wrapper.
**Warning signs:** Unexpected whitespace at top; SidebarProvider's min-h-svh doesn't fill viewport correctly.

### Pitfall 4: Admin Pages Lose Auth Guard After Layout Deletion
**What goes wrong:** Current admin pages (leads, users, stats) don't have their own auth guard -- they rely entirely on `admin/layout.tsx`. After deleting admin/layout.tsx, non-admin users can access admin pages by URL.
**Why it happens:** The admin pages themselves are simple wrappers like `<LeadsPanel />` with zero auth logic.
**How to avoid:** `(app)/layout.tsx` handles user authentication (redirect to /login). For **role** authorization, admin/page.tsx already redirects to `/admin/leads`, but admin sub-pages need role verification. Currently admin/layout.tsx does the role check. When it's deleted, either: (a) add a new minimal `(app)/admin/layout.tsx` with just the role guard (no SidebarProvider), or (b) add role guards to each admin page. Option (a) is cleaner.
**Warning signs:** Vendedor user can access `/admin/leads` after the migration.

### Pitfall 5: Typed Routes Break When Moving Pages to Route Groups
**What goes wrong:** Next.js `typedRoutes: true` generates route types from file system. When pages move from `app/dashboard/` to `app/(app)/dashboard/`, the generated types remain the same (route groups don't affect URLs), but TypeScript may need a fresh type generation.
**Why it happens:** TypeScript route types are generated at build time; stale `.next` cache may have old types.
**How to avoid:** After moving pages, run `bun run build` or `bun run check-types` to regenerate route types. Delete `.next` cache if types don't update.
**Warning signs:** TypeScript errors on `Link href` props after file moves.

### Pitfall 6: SidebarProvider Wrapper Conflicts with Providers Component
**What goes wrong:** `SidebarProvider` renders a `<div>` with `flex min-h-svh w-full` (verified in source line 128-146). If root layout also has a wrapper div, the nesting may cause unexpected layout.
**Why it happens:** Root layout currently has `<div className="grid min-h-svh grid-rows-[auto_1fr]">`. After cleanup, root should be just `<Providers>{children}</Providers>`.
**How to avoid:** Ensure root layout has NO wrapper div after Plan 3. `SidebarProvider` in `(app)/layout.tsx` provides its own `min-h-svh` wrapper.
**Warning signs:** Double min-h-svh; scrollbar appears unnecessarily.

## Code Examples

### Current AdminSidebar Pattern (Source: codebase verified)

```typescript
// apps/web/src/components/admin-sidebar.tsx
"use client";
import {
  Sidebar, SidebarContent, SidebarGroup,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@dashboard-leads-profills/ui/components/sidebar";
import { ClipboardList, LayoutDashboard, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin/leads", label: "Leads", icon: ClipboardList },
  { href: "/admin/users", label: "Usuarios", icon: Users },
  { href: "/admin/stats", label: "Stats Globais", icon: LayoutDashboard },
] as const;

export default function AdminSidebar() {
  const pathname = usePathname();
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarMenu>
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname.startsWith(href);
              return (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    isActive={isActive}
                    render={<Link href={href as unknown as "/"} />}
                  >
                    <Icon />
                    {label}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
```

### Current Admin Layout Auth Guard (Source: codebase verified)

```typescript
// apps/web/src/app/admin/layout.tsx
export default async function AdminLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: claimsData } = await supabase.auth.getClaims();
  const userRole = (claimsData?.claims as Record<string, unknown>)?.user_role;

  if (userRole !== "admin") {
    redirect("/dashboard");
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-[calc(100svh-49px)] w-full">
        <AdminSidebar />
        <main className="flex-1 p-6">
          <div className="mb-4 md:hidden"><SidebarTrigger /></div>
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
```

### Auth Guard Pattern Per Page (to be removed from pages)

```typescript
// Current pattern in dashboard/page.tsx, leads/page.tsx, leads/new/page.tsx, leads/[id]/page.tsx
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  redirect("/login");
}
```

These 4 pages all duplicate this exact pattern. After `(app)/layout.tsx` handles auth, these blocks can be removed from pages that only need the `user` object.

### Files to Move (Plan 1)

| Source | Destination | Notes |
|--------|-------------|-------|
| `app/login/page.tsx` | `app/(public)/login/page.tsx` | No changes needed |
| `app/page.tsx` | `app/(public)/page.tsx` | Rewrite to redirect only |
| `app/dashboard/` | `app/(app)/dashboard/` | Remove auth guard from page.tsx |
| `app/dashboard/dashboard.tsx` | `app/(app)/dashboard/dashboard.tsx` | No changes |
| `app/dashboard/leaderboard-tab.tsx` | `app/(app)/dashboard/leaderboard-tab.tsx` | No changes |
| `app/dashboard/personal-dashboard.tsx` | `app/(app)/dashboard/personal-dashboard.tsx` | No changes |
| `app/leads/` | `app/(app)/leads/` | Remove auth guard from pages |
| `app/admin/` | `app/(app)/admin/` | Delete admin/layout.tsx (Plan 3) |

### Files to Create (Plan 2)

| File | Purpose |
|------|---------|
| `app/(public)/layout.tsx` | Minimal public layout (no sidebar) |
| `app/(app)/layout.tsx` | Auth guard + SidebarProvider + AppSidebar + SidebarInset |
| `components/app-sidebar.tsx` | Unified sidebar with vendedor + admin groups |

### Files to Delete (Plan 3)

| File | Reason | Current Import Count |
|------|--------|---------------------|
| `components/header.tsx` | Replaced by AppSidebar | 1 (root layout.tsx) |
| `components/admin-sidebar.tsx` | Merged into AppSidebar | 1 (admin/layout.tsx) |
| `app/admin/layout.tsx` | Merged into (app)/layout.tsx | N/A (auto-loaded by Next.js) |
| `app/todos/page.tsx` | D-03: deleted, no utility in product | N/A |

### Critical Sidebar Component API (Source: packages/ui/src/components/sidebar.tsx)

```
Sidebar props:
  side: "left" | "right" (default: "left")
  variant: "sidebar" | "floating" | "inset" (default: "sidebar")
  collapsible: "offcanvas" | "icon" | "none" (default: "offcanvas")

Key behavior per collapsible value:
  "none"     -> Renders plain div, NO mobile Sheet, NO toggle capability
  "offcanvas"-> Desktop: sidebar with width transition; Mobile: Sheet drawer
  "icon"     -> Desktop: collapses to icon-only (3rem); Mobile: Sheet drawer

SidebarProvider:
  defaultOpen: boolean (default: true)
  Renders: <div> with flex min-h-svh w-full
  Cookie: sidebar_state (persisted, 7 days)
  Keyboard: Ctrl+B / Cmd+B toggles sidebar

SidebarInset:
  Renders: <main> tag
  Handles peer-data margins automatically based on sidebar state

Width constants:
  SIDEBAR_WIDTH = "16rem" (256px)
  SIDEBAR_WIDTH_MOBILE = "18rem" (288px)
  SIDEBAR_WIDTH_ICON = "3rem" (48px)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` export | `middleware.ts` still works in Next.js 16 | Next.js 16 introduced `proxy.ts` as rename | Project already uses `middleware.ts` with `updateSession` from `proxy.ts` module -- no change needed |
| `forwardRef` for refs | `ref` as prop (React 19) | React 19 | shadcn components already updated |
| `asChild` (Radix) | `render` prop (Base UI) | shadcn v4 migration | Project uses `base` mode -- use `render` prop |

## Open Questions

1. **Ctrl+B keyboard shortcut on desktop**
   - What we know: `SidebarProvider` always registers the Ctrl+B handler (line 96-109 of sidebar.tsx). With `collapsible="offcanvas"`, pressing Ctrl+B will collapse the sidebar even though we don't want that.
   - What's unclear: Whether to override/intercept this or accept it as harmless (sidebar re-expands on page reload via `defaultOpen`).
   - Recommendation: Accept it for now -- the cookie persistence means it will stay collapsed until refresh. If problematic, pass `open={true}` as controlled prop to `SidebarProvider` to force always-open. This disables the toggle completely (cookie becomes irrelevant).

2. **Admin role guard after admin/layout.tsx deletion**
   - What we know: Current admin pages have NO individual role guards. admin/layout.tsx provides the only role check.
   - What's unclear: Whether to add a new minimal `(app)/admin/layout.tsx` (role guard only, no SidebarProvider) or add role guards to each admin page.
   - Recommendation: Create a minimal `(app)/admin/layout.tsx` with just the role guard. This is the cleaner DRY approach and matches D-12 ("admin pages MAINTAIN role guard server-side").

3. **Dashboard page needs isAdmin and userId**
   - What we know: Dashboard page currently passes `isAdmin` and `userId` to `<Dashboard />` component. After auth guard moves to layout, the page still needs these values.
   - What's unclear: Whether layout should pass these via React context or if pages should still call `getUser()` for page-specific data needs.
   - Recommendation: Pages that need `user.id` or `isAdmin` for their own rendering (not auth gating) should keep a lightweight `getUser()` call. The layout auth guard prevents unauthenticated access; page-level calls are for data, not security. Alternatively, use React's `cache()` to deduplicate the Supabase call.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2 |
| Config file | `apps/web/vitest.config.ts` (jsdom environment) |
| Quick run command | `bun run test` |
| Full suite command | `bun run test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LAYOUT-01 | Sidebar renders on authenticated routes | manual | Visual check: navigate to /dashboard, verify sidebar visible | N/A |
| LAYOUT-02 | Route groups separate sidebar from no-sidebar | manual | Visual check: /login has no sidebar, /dashboard has sidebar | N/A |
| LAYOUT-03 | Single SidebarProvider in codebase | smoke | `grep -r SidebarProvider apps/web/src \| wc -l` returns 2 (import + usage) | N/A (shell command) |
| LAYOUT-05 | No references to header.tsx | smoke | `grep -r "header" apps/web/src/app apps/web/src/components --include="*.tsx" --include="*.ts"` | N/A (shell command) |
| LAYOUT-06 | admin/layout.tsx deleted, AdminSidebar deleted | smoke | `test ! -f apps/web/src/app/admin/layout.tsx && test ! -f apps/web/src/components/admin-sidebar.tsx` | N/A (shell command) |
| LAYOUT-07 | Auth guard centralized in (app)/layout.tsx | unit | Verify layout exports async function with getUser() call | N/A |
| MOBILE-03 | Login page has no sidebar | manual | Mobile viewport: /login renders without sidebar | N/A |

### Sampling Rate
- **Per task commit:** `bun run check-types && bun run check` (type check + biome lint)
- **Per wave merge:** `bun run build` (full build validates all routes)
- **Phase gate:** `bun run build` green + visual verification of sidebar on authenticated routes

### Wave 0 Gaps
- None -- this phase is structural (file moves, component creation/deletion). Automated tests are grep-based smoke checks and visual verification. No unit test files needed for layout restructuring. The existing `bun run build` validates that all imports resolve and components render.

## Project Constraints (from CLAUDE.md)

- **Indentation:** tabs (Biome enforced)
- **Quotes:** double quotes (Biome enforced)
- **Imports:** organized automatically (Biome)
- **Commits:** Conventional Commits em Portugues
- **CSS classes:** use `cn()` from `@dashboard-leads-profills/ui/lib/utils`
- **UI imports:** path-based, not barrel -- `@dashboard-leads-profills/ui/components/sidebar`
- **shadcn rules:** use `render` prop (base-ui), not `asChild` (Radix); items inside Groups; no icon sizing classes inside components
- **No console.log** in production code
- **TypedRoutes:** `typedRoutes: true` in next.config.ts -- route types generated from file system
- **Module type:** `type: "module"` in all packages
- **Format before commit:** `bun x ultracite fix`
- **No `space-x-*` or `space-y-*`:** use `flex` with `gap-*`

## Sources

### Primary (HIGH confidence)
- `packages/ui/src/components/sidebar.tsx` -- Full sidebar component source code analyzed (collapsible behavior, SidebarProvider, SidebarInset, width constants)
- `apps/web/src/app/admin/layout.tsx` -- Existing auth guard + SidebarProvider pattern verified
- `apps/web/src/components/admin-sidebar.tsx` -- Existing sidebar composition pattern verified
- `apps/web/src/components/header.tsx` -- Current topbar to be deleted, import references confirmed
- `apps/web/src/app/layout.tsx` -- Current root layout with grid wrapper to be cleaned
- `.planning/research/ARCHITECTURE.md` -- Milestone research on route groups and component architecture
- `.planning/research/PITFALLS.md` -- Milestone research on nested providers, CLS, mobile drawer issues
- `.planning/research/STACK.md` -- Confirmed zero new dependencies needed

### Secondary (MEDIUM confidence)
- `.claude/skills/shadcn/SKILL.md` -- shadcn composition rules (render prop, items in groups, no icon sizing)
- `.claude/skills/next-best-practices/file-conventions.md` -- Route groups, file conventions for Next.js 16

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all components verified in codebase, zero new dependencies
- Architecture: HIGH - route group pattern is standard Next.js, auth guard pattern already exists in admin/layout.tsx
- Pitfalls: HIGH - `collapsible="none"` behavior verified directly in source code; nested provider issue confirmed via grep

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable -- no dependencies changing)
