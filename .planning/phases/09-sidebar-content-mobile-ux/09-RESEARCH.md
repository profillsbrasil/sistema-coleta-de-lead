# Phase 9: Sidebar Content + Mobile UX - Research

**Researched:** 2026-03-26
**Domain:** shadcn Sidebar content refinement, mobile drawer UX, Gravatar avatar, touch targets
**Confidence:** HIGH

## Summary

Phase 9 refines the AppSidebar shell created in Phase 8. The sidebar already exists with nav groups (Vendedor + Admin collapsible), `isAdmin` prop, `usePathname` for active state, and empty `SidebarFooter`. This phase adds: (1) SidebarUserMenu with avatar, name, role badge, and logout in the footer; (2) mobile drawer auto-close via `useEffect` on pathname; (3) touch targets 44px on sidebar nav items; (4) iOS Safari viewport fix for the Sheet overlay.

All required shadcn components are already installed (`Avatar`, `AvatarImage`, `AvatarFallback`, `Sidebar` suite, `Sheet`). The project uses Base UI (not Radix) with `render` prop pattern. Zero new dependencies needed -- Gravatar uses SHA-256 hashing via the Web Crypto API (`crypto.subtle.digest`) which is available in all modern browsers and Node.js.

**Primary recommendation:** Keep changes scoped to `app-sidebar.tsx` and the new `sidebar-user-menu.tsx` component. Pass `userName`, `userEmail`, and `userRole` from the server layout. Use `useEffect` + `usePathname()` + `setOpenMobile(false)` for mobile drawer auto-close. Use `inset-y-0` (already present in Sheet) for iOS Safari -- the `100dvh` gap bug was fixed in iOS 26.1.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Sidebar desktop MANTÉM sempre expandida — sem modo icon-only, sem Ctrl+B, sem cookie persistence. Decisão Phase 8 (D-07/D-09) prevalece. Success criteria #6 do roadmap removido do escopo.
- **D-02:** `collapsible="offcanvas"` mantido — permite Sheet mobile mas sem collapse desktop.
- **D-03:** SidebarFooter exibe avatar + nome + role badge + botão "Sair" inline (sem DropdownMenu). 1 clique para logout.
- **D-04:** Avatar via Gravatar usando hash MD5 do email do usuário. Fallback para iniciais do nome quando Gravatar não existe.
- **D-05:** Nome e role vêm de server props — `(app)/layout.tsx` já faz `getUser()`, passa `userName`, `userEmail` e `userRole` como props adicionais ao AppSidebar. Zero client-side fetch.
- **D-06:** Role badge exibe "Admin" ou "Vendedor" como texto simples ao lado do nome.
- **D-07:** `useEffect` monitora `pathname` changes via `usePathname()` + chama `setOpenMobile(false)` do `useSidebar()` hook. Fecha imediatamente após navegação — sem delay.
- **D-08:** iOS Safari viewport height: Claude's Discretion (baseado nos pitfalls documentados — 100svh vs 100dvh).
- **D-09:** Touch targets 44px aplicados SOMENTE nos nav items — `SidebarMenuButton` recebe `className="min-h-11"`. Collapsible trigger, logout button e outros mantêm sizing padrão shadcn.
- **D-10:** Touch target scope é apenas sidebar nav — tabelas, formulários e outros componentes ficam para Phases 10-11.

### Claude's Discretion
- iOS Safari viewport unit (100svh vs 100dvh) para Sheet height
- Cor do background do avatar de iniciais (fallback Gravatar)
- Estilo exato do role badge (texto, chip, etc.)
- Animação de transição do drawer mobile

### Deferred Ideas (OUT OF SCOPE)
- Desktop collapse icon-only com Ctrl+B — cancelado, sidebar sempre expandida
- Cookie persistence do estado da sidebar — não aplicável sem collapse
- Touch targets 44px em tabelas e formulários — Phase 10
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LAYOUT-04 | AppSidebar unificado com dois grupos: "Vendedor" (sempre visivel) e "Admin" (collapsible, visivel apenas para role admin) | Already implemented in Phase 8 -- `app-sidebar.tsx` has both groups with `isAdmin` gating. Phase 9 refines touch targets. |
| LAYOUT-08 | UserMenu e ModeToggle migrados para SidebarFooter — removidos do topbar | SidebarUserMenu component in SidebarFooter, server props pattern, Gravatar avatar |
| MOBILE-01 | No mobile (< 768px), sidebar renderiza como Sheet drawer com botao hamburguer | Already working via `collapsible="offcanvas"` + `useIsMobile()` from Phase 8 |
| MOBILE-02 | Drawer fecha automaticamente apos navegacao no mobile | `useEffect` + `usePathname()` + `setOpenMobile(false)` pattern |
| MOBILE-04 | Sheet mobile nao exibe gap na parte inferior no iOS Safari | Sheet uses `inset-y-0` (h-full equivalent); iOS 26.1 fixed the `dvh` gap bug |
| MOBILE-05 | Sidebar em desktop e collapsible para modo icon-only (Ctrl+B) com estado persistido via cookie | **CANCELLED** per D-01 -- sidebar stays always expanded |
| TOUCH-01 | Todos os elementos interativos da sidebar tem touch target minimo de 44x44px | `className="min-h-11"` on `SidebarMenuButton` (44px = 2.75rem = Tailwind `h-11`) |
| TOUCH-04 | Active state da sidebar indica rota atual corretamente (incluindo rotas aninhadas) | Already uses `pathname.startsWith(href)` -- needs ordering fix for `/leads` vs `/leads/new` |
| POLISH-02 | SidebarFooter exibe avatar + nome + role do usuario logado | SidebarUserMenu with Avatar + AvatarFallback + Gravatar image |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| shadcn/ui Sidebar | (installed, Base UI) | Sidebar shell, Footer, Menu components | Already in use since Phase 8 |
| shadcn/ui Avatar | (installed, Base UI) | Avatar + AvatarImage + AvatarFallback | Already installed in `packages/ui/src/components/avatar.tsx` |
| shadcn/ui Sheet | (installed, Base UI) | Mobile drawer (used internally by Sidebar) | Already installed, used by Sidebar `collapsible="offcanvas"` |
| Lucide React | 1.6.0 | Icons (LogOut) | Already in use across codebase |
| next/navigation | (Next.js 16.2) | `usePathname()` for active state + auto-close | Standard Next.js hook |
| Web Crypto API | (browser built-in) | SHA-256 hash for Gravatar | No dependency needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/ssr | 0.9 | Server-side auth (getUser, getClaims) | Layout fetches user data |
| @supabase/supabase-js | 2.100 | Client-side signOut | Logout button in SidebarUserMenu |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Gravatar (SHA-256 hash) | Dicebear/boring-avatars | Gravatar is decision D-04; no extra dependency needed |
| Inline logout button | DropdownMenu | Decision D-03 mandates inline button, 1 click; simpler UX |
| useEffect pathname auto-close | onClick handler on each Link | onClick is fragile (misses keyboard nav, programmatic nav); useEffect catches all route changes |

## Architecture Patterns

### Recommended Component Structure

```
apps/web/src/
├── components/
│   ├── app-sidebar.tsx          # MODIFY: add touch targets, useEffect auto-close, accept user props
│   └── sidebar-user-menu.tsx    # NEW: avatar + nome + role + logout
├── app/(app)/
│   └── layout.tsx               # MODIFY: extract userName/userEmail/userRole, pass to AppSidebar
└── lib/
    └── gravatar.ts              # NEW: utility to generate Gravatar URL from email hash
```

### Pattern 1: Server-to-Client User Data Flow

**What:** `(app)/layout.tsx` (Server Component) extracts user data from Supabase session, passes as props to `AppSidebar` (Client Component).

**When to use:** When client components need auth data without client-side fetch.

**Example:**
```typescript
// app/(app)/layout.tsx (Server Component)
const { data: { user } } = await supabase.auth.getUser();
const { data: claimsData } = await supabase.auth.getClaims();
const claims = claimsData?.claims as Record<string, unknown>;
const userRole = (claims?.user_role as string) ?? "vendedor";
const userName = (user?.user_metadata?.full_name as string) ?? user?.email?.split("@")[0] ?? "Usuario";
const userEmail = user?.email ?? "";

return (
  <SidebarProvider defaultOpen>
    <AppSidebar
      isAdmin={userRole === "admin"}
      userName={userName}
      userEmail={userEmail}
      userRole={userRole}
    />
    ...
  </SidebarProvider>
);
```

### Pattern 2: Drawer Auto-Close via usePathname

**What:** `useEffect` watches pathname changes and closes mobile drawer.

**When to use:** In the sidebar component, NOT in the layout.

**Example:**
```typescript
// Inside AppSidebar component
const pathname = usePathname();
const { setOpenMobile } = useSidebar();

useEffect(() => {
  setOpenMobile(false);
}, [pathname, setOpenMobile]);
```

**Source:** PITFALLS.md Pitfall #3 (verified against shadcn/ui issues #5561, #6265)

### Pattern 3: Gravatar with SHA-256 Hash

**What:** Generate Gravatar URL using SHA-256 hash of lowercase email.

**When to use:** Avatar source in SidebarUserMenu.

**Important note:** CONTEXT.md D-04 mentions "MD5 hash" but Gravatar has migrated to SHA-256 as the recommended algorithm. Both MD5 and SHA-256 are supported by Gravatar. The research recommends SHA-256 as it is the current standard.

**Example:**
```typescript
// lib/gravatar.ts
export async function getGravatarUrl(email: string, size = 80): Promise<string> {
  const trimmed = email.trim().toLowerCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(trimmed);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return `https://gravatar.com/avatar/${hashHex}?s=${size}&d=404`;
}
```

**Note on `d=404`:** Using `d=404` as the default makes Gravatar return a 404 when no avatar exists, which triggers the `AvatarFallback` component to show initials. If `d=mp` were used, Gravatar always returns an image (the mystery person silhouette) and the fallback never triggers.

**Async concern:** `crypto.subtle.digest` is async. Since the email comes from server props, compute the Gravatar URL in the server layout and pass it as a prop (avoids async in client component). Alternatively, compute synchronously using a pre-built hash utility, but the Web Crypto API is the zero-dependency approach.

### Pattern 4: Avatar with Initials Fallback

**What:** shadcn Avatar with Gravatar image source and initials as fallback.

**Example:**
```typescript
// Source: shadcn skill rules/composition.md
<Avatar>
  <AvatarImage src={gravatarUrl} alt={userName} />
  <AvatarFallback>{getInitials(userName)}</AvatarFallback>
</Avatar>
```

**Initials logic:** Extract first letter of first name + first letter of last name. Single name: first two characters.

### Anti-Patterns to Avoid

- **Client-side auth fetch in sidebar:** Decision D-05 explicitly bans this. The old `UserMenu` does `useEffect + getUser()` on the client -- do NOT replicate this pattern. Data comes from server props.
- **DropdownMenu for logout:** Decision D-03 mandates inline button. Do NOT add a DropdownMenu wrapper.
- **onClick on Link for auto-close:** Fragile -- misses programmatic navigation. Use `useEffect` + `usePathname()` instead.
- **Hardcoded h/w sizing on icons inside sidebar components:** shadcn skill says "No sizing classes on icons inside components" -- components handle icon sizing via CSS.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Avatar with fallback | Custom `<img>` + `<div>` combo | shadcn `Avatar` + `AvatarImage` + `AvatarFallback` | Base UI handles image loading state, error fallback automatically |
| Mobile drawer close on nav | Custom Sheet state management | `useSidebar().setOpenMobile(false)` in `useEffect` | shadcn Sidebar already provides the state setter |
| Touch target sizing | Custom wrapper div with padding | `className="min-h-11"` on `SidebarMenuButton` | Tailwind class is sufficient, no wrapper needed |
| User initials extraction | Regex-heavy string parsing | Simple `split(" ").map(s => s[0]).join("").slice(0, 2)` | Keep it simple -- max 2 characters |

## Common Pitfalls

### Pitfall 1: Active State Overlap on /leads vs /leads/new

**What goes wrong:** Using `pathname.startsWith(href)` means both `/leads` and `/leads/new` highlight when on `/leads/new`, because `/leads/new`.startsWith(`/leads`) is true.

**Why it happens:** The current `VENDEDOR_ITEMS` array has `/leads` before `/leads/new`. Both match because `startsWith` is prefix-based.

**How to avoid:** Check items in reverse order (most specific first), OR use exact match for items whose href has sibling routes with the same prefix:
```typescript
const isActive = href === "/leads"
  ? pathname === "/leads"
  : pathname.startsWith(href);
```
Alternatively, simpler: for nav highlighting purposes, both `/leads` and `/leads/new` highlighting the "Leads" parent is acceptable UX -- many apps do this. The "Novo Lead" item would also highlight independently. This is the **current behavior** and may be intentional.

**Warning signs:** QA reports "two items are highlighted at once" on mobile where visual space is limited.

**Recommendation:** Accept the current behavior (both highlight) since `/leads/new` is a sub-action of `/leads`. Document this as intentional.

### Pitfall 2: Gravatar Hash Async in Client Component

**What goes wrong:** `crypto.subtle.digest` returns a Promise. If called inside a client component's render cycle, it requires state management for the async result, causing a flash of fallback before the Gravatar URL resolves.

**Why it happens:** Web Crypto API is intentionally async for security reasons.

**How to avoid:** Compute the Gravatar URL in the server layout (`(app)/layout.tsx`) and pass it as a `gravatarUrl` prop. The server can use `crypto.subtle.digest` with `await`.

**Alternative:** Pre-compute on server and pass URL string as prop. Server Components can `await` freely.

### Pitfall 3: Client-Side signOut Needs Router Push

**What goes wrong:** After `supabase.auth.signOut()`, the user stays on the current page if no redirect happens.

**Why it happens:** `signOut()` only clears the session. It does not trigger a navigation.

**How to avoid:** Follow the existing pattern from `user-menu.tsx`:
```typescript
const router = useRouter();
async function handleSignOut() {
  const supabase = createClient(); // browser client
  await supabase.auth.signOut();
  router.push("/login");
}
```

### Pitfall 4: iOS Safari Sheet Gap (100dvh Bug)

**What goes wrong:** On iOS 26.0, Sheet overlays using `100dvh` leave a gap at the bottom of the screen.

**Why it happens:** Safari iOS 26.0 changed how viewport height calculations interact with the bottom toolbar.

**How to avoid:** The shadcn Sheet component in this project uses `inset-y-0` (via `data-[side=left]:inset-y-0`) which is equivalent to `top: 0; bottom: 0` -- this does NOT use viewport height units at all, so it is immune to the `dvh` bug. Additionally, the Sidebar component wraps children in `<div className="flex h-full w-full flex-col">` which also avoids viewport units.

**Resolution:** This bug was confirmed **fixed in iOS 26.1** (per shadcn/ui issue #8471). No code change needed for current implementation. The existing CSS is already safe.

**Recommendation:** No action required. The Sheet's `inset-y-0` approach is already the correct fix. If testing reveals issues on older iOS versions, use `h-svh` as a conservative fallback.

### Pitfall 5: SidebarMenuButton Default Height < 44px

**What goes wrong:** The default `SidebarMenuButton` size is `h-8` (32px), which fails WCAG 2.5.5 touch target requirements (44x44px minimum).

**Why it happens:** shadcn's default sizing prioritizes information density over touch-friendliness.

**How to avoid:** Add `className="min-h-11"` to `SidebarMenuButton` (44px = 2.75rem = Tailwind `h-11`). Per D-09, this applies ONLY to nav items, not to collapsible triggers or other sidebar elements.

## Code Examples

### SidebarUserMenu Component

```typescript
// components/sidebar-user-menu.tsx
"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@dashboard-leads-profills/ui/components/avatar";
import { Button } from "@dashboard-leads-profills/ui/components/button";
import {
  SidebarMenu,
  SidebarMenuItem,
} from "@dashboard-leads-profills/ui/components/sidebar";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface SidebarUserMenuProps {
  userName: string;
  userEmail: string;
  userRole: string;
  gravatarUrl: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function SidebarUserMenu({
  userName,
  userEmail,
  userRole,
  gravatarUrl,
}: SidebarUserMenuProps) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar>
            <AvatarImage src={gravatarUrl} alt={userName} />
            <AvatarFallback>{getInitials(userName)}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium">{userName}</span>
            <span className="truncate text-xs text-muted-foreground">
              {userRole === "admin" ? "Admin" : "Vendedor"}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleSignOut}
            aria-label="Sair"
          >
            <LogOut />
          </Button>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
```

### Gravatar URL Helper (Server-Side)

```typescript
// lib/gravatar.ts
export async function getGravatarUrl(
  email: string,
  size = 80
): Promise<string> {
  const trimmed = email.trim().toLowerCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(trimmed);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `https://gravatar.com/avatar/${hashHex}?s=${size}&d=404`;
}
```

### Auto-Close Mobile Drawer

```typescript
// Inside AppSidebar, after existing usePathname()
const { setOpenMobile } = useSidebar();

useEffect(() => {
  setOpenMobile(false);
}, [pathname, setOpenMobile]);
```

### Touch Target on Nav Items

```typescript
<SidebarMenuButton
  className="min-h-11"
  isActive={pathname.startsWith(href)}
  render={<Link href={href as unknown as "/"} />}
>
  <Icon />
  {label}
</SidebarMenuButton>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Gravatar MD5 hash | Gravatar SHA-256 hash | 2024-2025 | Both still supported; SHA-256 is recommended for new implementations |
| `100vh` for overlays | `inset: 0` or `100svh` | 2022+ (viewport units spec) | Avoids iOS Safari toolbar bugs entirely |
| Client-side auth in sidebar | Server Component passes auth props | Next.js 13+ RSC pattern | Zero flash, zero client fetch, zero loading state |
| `asChild` (Radix) | `render` prop (Base UI) | This project uses Base UI | All sidebar components use `render` pattern, not `asChild` |

## Open Questions

1. **Gravatar MD5 vs SHA-256**
   - What we know: D-04 says "MD5 hash". Gravatar now recommends SHA-256 but still supports MD5.
   - What's unclear: Should we follow D-04 literally (MD5) or use the current best practice (SHA-256)?
   - Recommendation: Use SHA-256 since both produce a valid Gravatar URL. The user intent was "use Gravatar", not specifically "use MD5". If the planner prefers to honor D-04 literally, MD5 is available via a simple polyfill or the deprecated `crypto.createHash` in Node.js.

2. **ModeToggle placement**
   - What we know: LAYOUT-08 says "ModeToggle migrado para SidebarFooter". D-03 mentions avatar + nome + role + Sair but does NOT mention ModeToggle.
   - What's unclear: Should ModeToggle be in the SidebarFooter alongside user info, or is it deferred?
   - Recommendation: Include ModeToggle in SidebarFooter as a secondary action (small icon button) since LAYOUT-08 requires it. Place it next to the logout button.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.1 |
| Config file | `vitest.workspace.ts` (root), per-package configs |
| Quick run command | `bun run test` |
| Full suite command | `bun run test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LAYOUT-04 | Vendedor group always visible, Admin group visible only for admin | manual-only | Visual verification in browser | N/A |
| LAYOUT-08 | User menu in SidebarFooter with avatar, name, role, logout | manual-only | Visual verification in browser | N/A |
| MOBILE-01 | Sheet drawer opens from left on mobile | manual-only | Real device or Chrome DevTools | N/A |
| MOBILE-02 | Drawer auto-closes after navigation | manual-only | Chrome DevTools mobile simulation | N/A |
| MOBILE-04 | No bottom gap on iOS Safari | manual-only | Real iOS device testing | N/A |
| TOUCH-01 | Nav items have min 44px touch targets | manual-only | Chrome DevTools element inspector | N/A |
| TOUCH-04 | Active state highlights current route (nested) | manual-only | Navigate to nested routes, verify highlight | N/A |
| POLISH-02 | Avatar + name + role visible in footer | manual-only | Visual verification | N/A |

### Sampling Rate
- **Per task commit:** `bun run check-types && bun run check`
- **Per wave merge:** `bun run build && bun run test`
- **Phase gate:** Full suite green + visual verification checklist

### Wave 0 Gaps
None -- this phase is UI-only with no testable business logic. All requirements are visual/behavioral and require manual verification (browser testing). The existing test infrastructure covers type checking and linting which will catch compilation errors.

## Project Constraints (from CLAUDE.md)

- **Indentation:** tabs (Biome)
- **Quotes:** double quotes (Biome)
- **Imports:** organized automatically (Biome)
- **CSS classes:** use `cn()` for all className composition
- **Icons in components:** no sizing classes on icons inside shadcn components (shadcn skill rule)
- **Avatar:** always needs AvatarFallback (shadcn skill rule)
- **No console.log:** debug statements forbidden in production code
- **Conventional Commits:** in Portuguese (`feat:`, `fix:`, `refactor:`)
- **UI imports:** path-based, not barrel -- e.g. `@dashboard-leads-profills/ui/components/button`
- **`render` prop pattern:** this project uses Base UI, NOT Radix. Use `render={<Link href={...} />}` not `asChild`
- **No `any` types:** use `unknown` if genuinely unknown
- **Semantic colors:** `bg-muted`, `text-muted-foreground` -- never raw values like `bg-blue-500`

## Sources

### Primary (HIGH confidence)
- `packages/ui/src/components/sidebar.tsx` -- Full sidebar component source (SidebarProvider, useSidebar, Sheet mobile rendering)
- `packages/ui/src/components/avatar.tsx` -- Avatar, AvatarImage, AvatarFallback (Base UI based)
- `packages/ui/src/components/sheet.tsx` -- Sheet component using `inset-y-0` for left/right sides
- `apps/web/src/components/app-sidebar.tsx` -- Current AppSidebar from Phase 8
- `apps/web/src/app/(app)/layout.tsx` -- Current app layout with auth guard
- `.planning/research/PITFALLS.md` -- Pitfalls #3 (drawer auto-close), #5 (iOS Safari viewport)
- `.planning/research/ARCHITECTURE.md` -- Component architecture, data flow patterns
- `.planning/phases/09-sidebar-content-mobile-ux/09-CONTEXT.md` -- All locked decisions
- `.claude/skills/shadcn/SKILL.md` + `rules/composition.md` -- Avatar always needs AvatarFallback, render prop pattern

### Secondary (MEDIUM confidence)
- [Gravatar Developer Docs](https://docs.gravatar.com/sdk/images/) -- SHA-256 hash, URL format `https://gravatar.com/avatar/{HASH}?s={size}&d=404`
- [shadcn/ui Issue #8471](https://github.com/shadcn-ui/ui/issues/8471) -- iOS 26 Sheet gap fixed in iOS 26.1
- [shadcn/ui Issues #5561, #6265](https://github.com/shadcn-ui/ui/issues/5561) -- Drawer not closing on mobile navigation
- [Supabase getClaims() API Reference](https://supabase.com/docs/reference/javascript/auth-getclaims) -- Claims include email, user_metadata, user_role (custom)

### Tertiary (LOW confidence)
- None -- all findings verified against codebase or official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all components already installed and verified in codebase
- Architecture: HIGH -- follows established Phase 8 patterns, verified against CONTEXT.md decisions
- Pitfalls: HIGH -- iOS Safari issue verified fixed in iOS 26.1; drawer auto-close pattern verified against shadcn issues

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable -- no fast-moving dependencies)
