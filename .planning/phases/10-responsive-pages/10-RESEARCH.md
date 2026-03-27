# Phase 10: Responsive Pages - Research

**Researched:** 2026-03-27
**Domain:** CSS responsive patterns, mobile card layouts, visualViewport API, IntersectionObserver root scoping
**Confidence:** HIGH

## Summary

Phase 10 converts admin tables to mobile card layouts, makes the lead form grid responsive, fixes the FAB for virtual keyboard scenarios on iOS, and verifies IntersectionObserver works correctly within the sidebar layout. All changes are CSS/JSX-level -- no new dependencies, no API changes, no database migrations.

The codebase already has every UI primitive needed: Card, Badge, DropdownMenu, Collapsible, Button are all installed in `packages/ui`. The `useIsMobile()` hook exists but should NOT be used for table/card switching (hydration mismatch risk) -- instead use CSS `hidden md:block` / `md:hidden` as specified in CONTEXT.md D-01. The `visualViewport` API is baseline-available since August 2021 across all major browsers and provides the `resize` event needed for keyboard detection.

**Primary recommendation:** Use CSS-only visibility switching (`hidden`/`md:hidden`) for table-to-card transitions. Use `window.visualViewport.resize` event to detect keyboard open/close for FAB hide. IntersectionObserver likely works as-is (document is the scroll container, not SidebarInset), but add a runtime check as safety net.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Admin leads table e admin users table transformam de `<Table>` para card layout em mobile (< 768px). Breakpoint via Tailwind `md:` -- cards no default, tabela em `md:` e acima.
- **D-02:** Cards mostram info resumida sem expansao -- clicar no card abre DropdownMenu de acoes. Sem accordion/expansao.
- **D-03:** Admin leads card mostra: Nome + Tag (badge quente/morno/frio), Vendedor (quem coletou), Telefone ou Email. Campos como Segmento, Data de criacao, Empresa ficam ocultos no mobile.
- **D-04:** Admin users card mostra: Nome + Role (badge Admin/Vendedor), Contagem de leads, Status (ativo/banido). Email fica oculto no mobile.
- **D-05:** Acoes (editar, excluir, trocar role) acessiveis via DropdownMenu 3-pontos (icone MoreVertical) no canto do card. Touch target minimo 44px no trigger do DropdownMenu.
- **D-06:** Touch targets 44px (WCAG) em todos os elementos interativos das tabelas mobile -- mesmo padrao da sidebar nav (Phase 9).
- **D-07:** FAB esconde quando teclado virtual esta ativo (via `visualViewport` API). Reaparece ao fechar teclado.
- **D-08:** FAB aparece apenas em `/leads` e `/dashboard` -- nao aparece em rotas admin, `/leads/new`, ou `/leads/[id]`.
- **D-09:** Converter lead-form.tsx de flex-col para CSS grid responsivo: `grid-cols-1` no mobile, `grid-cols-2` em `md`+.

### Claude's Discretion
- Estrategia de hide/show colunas no breakpoint (hidden class vs conditional render)
- Exact card design (padding, spacing, border radius) -- seguir padrao shadcn Card
- IntersectionObserver root adjustment para funcionar com sidebar SidebarInset scroll container
- Animacao de transicao entre table e card layout (se houver)
- `visualViewport` API implementation details para FAB hide

### Deferred Ideas (OUT OF SCOPE)
- Charts responsivos (Recharts ResponsiveContainer) -- Phase 11
- Breadcrumb contextual (AppTopbar) -- Phase 11
- Dark mode audit -- Phase 11
- Polish visual final (spacing, typography) -- Phase 11
- Leaderboard scroll horizontal mobile -- Phase 11
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RESP-01 | Admin leads table renderiza como card layout em mobile (< 768px) com acoes acessiveis via DropdownMenu | New `AdminLeadCard` component with DropdownMenu; CSS visibility switching `hidden md:block` / `md:hidden`; existing Card, Badge, DropdownMenu primitives ready |
| RESP-02 | Admin users table renderiza como card layout em mobile (< 768px) com acoes acessiveis via DropdownMenu | New `AdminUserCard` component; same pattern as leads; reuse existing `RoleBadge`, `StatusBadge` functions |
| RESP-03 | Formulario de captura de lead usa `grid-cols-1` em mobile e `grid-cols-2` em `md`+ | Replace `flex flex-col gap-4` with `grid grid-cols-1 md:grid-cols-2 gap-4`; required fields stay `col-span-1`; Notas and submit use `md:col-span-2` |
| RESP-06 | Lead list com infinite scroll funciona corretamente dentro do layout com sidebar | IntersectionObserver with `root: null` (viewport) works because SidebarInset has no `overflow-auto`; add runtime safety check for scrollable ancestor |
| RESP-07 | Todas as rotas autenticadas renderizam corretamente em 320px sem overflow horizontal | Remove `max-w-[480px]` on mobile for lead form; verify no horizontal overflow in admin panels; card layout inherently avoids wide table overflow |
| TOUCH-02 | Acoes nas tabelas admin acessiveis via DropdownMenu no mobile | DropdownMenu trigger with `min-h-[44px] min-w-[44px]`; DropdownMenuItem default height is ~40px, add padding to meet 44px |
| TOUCH-03 | FAB nao sobrepoe sidebar trigger; nao salta quando teclado virtual abre no iOS | FAB position `fixed right-6 bottom-6` is bottom-right, sidebar trigger is top-left (no overlap); `visualViewport.resize` hides FAB when keyboard opens |
</phase_requirements>

## Standard Stack

### Core (already installed -- no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TailwindCSS | 4.1.18 | Responsive breakpoints (`md:`, `hidden`, `grid-cols-*`) | Already configured, mobile-first by default |
| shadcn/ui Card | n/a (workspace) | Mobile card layout containers | Already installed at `packages/ui/src/components/card.tsx` |
| shadcn/ui DropdownMenu | n/a (workspace) | Actions menu on mobile cards | Already installed at `packages/ui/src/components/dropdown-menu.tsx`, built on Base UI React Menu |
| shadcn/ui Badge | n/a (workspace) | Tag and role badges on cards | Already installed and used in both panels |
| Lucide React | 1.6.0 | `MoreVertical`, `Pencil`, `Trash2`, `Ban`, `CheckCircle` icons | Already installed and used throughout codebase |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `window.visualViewport` | Web API (baseline since Aug 2021) | Detect virtual keyboard open/close for FAB hide | In `fab.tsx` -- listen to `resize` event, compare `visualViewport.height` to `window.innerHeight` |
| `IntersectionObserver` | Web API | Infinite scroll sentinel detection | Already used in `lead-list.tsx` -- verify `root` option works with sidebar layout |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS `hidden`/`md:hidden` for table/card switch | `useIsMobile()` conditional render | `useIsMobile()` returns `false` on SSR causing hydration mismatch flash; CSS approach avoids flash entirely |
| `visualViewport.resize` for keyboard detection | CSS `100dvh` unit alone | `dvh` resizes the layout but doesn't give programmatic control to hide/show elements; we need to hide FAB, not reposition it |
| DropdownMenu for mobile actions | Inline action buttons on cards | Inline buttons conflict with card tap targets and take horizontal space; DropdownMenu consolidates all actions behind single 44px trigger |

**Installation:** None needed. All dependencies already installed.

## Architecture Patterns

### Recommended Project Structure (new/modified files only)

```
apps/web/src/
  app/(app)/
    admin/
      leads/
        admin-lead-card.tsx    # NEW: mobile card for admin leads
        leads-panel.tsx        # MODIFIED: add card list + DropdownMenu desktop
      users/
        admin-user-card.tsx    # NEW: mobile card for admin users
        users-panel.tsx        # MODIFIED: add card list + DropdownMenu desktop
  components/
    fab.tsx                    # MODIFIED: visualViewport keyboard detection + route restriction
    lead-form.tsx              # MODIFIED: flex-col -> CSS grid responsive
  app/(app)/
    leads/
      lead-list.tsx            # MODIFIED: verify IntersectionObserver root
```

### Pattern 1: CSS Visibility Switching (Table/Card)

**What:** Render both table and card list in the DOM, use Tailwind `hidden`/`md:hidden` to show the correct one per breakpoint.
**When to use:** Any responsive table-to-card conversion.
**Why:** Avoids hydration mismatch (SSR renders desktop first, `useIsMobile()` returns `false` initially). Both render in DOM but only one is visible. No layout flash.

```tsx
// In leads-panel.tsx:
{selectedVendor && leadsQuery.isSuccess && leads.length > 0 && (
  <>
    {/* Mobile: card list */}
    <div className="flex flex-col gap-4 md:hidden">
      {leads.map((lead) => (
        <AdminLeadCard
          key={lead.localId}
          lead={lead}
          onDelete={() => setDeletingLeadId(lead.localId)}
        />
      ))}
    </div>

    {/* Desktop: table */}
    <div className="hidden md:block">
      <Table>
        {/* existing table code */}
      </Table>
    </div>
  </>
)}
```

### Pattern 2: DropdownMenu on Card with 44px Touch Target

**What:** DropdownMenu trigger button inside card, positioned top-right with minimum 44px touch area.
**When to use:** Any mobile card with multiple actions.

```tsx
// In admin-lead-card.tsx:
import { MoreVertical, Pencil, Trash2 } from "lucide-react";

<Card className="p-4">
  <div className="flex items-start justify-between gap-2">
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="truncate font-semibold text-sm">{lead.name}</span>
        <Badge>{tagLabel}</Badge>
      </div>
      <span className="text-muted-foreground text-sm">
        Vendedor: {lead.vendorName}
      </span>
      <span className="text-muted-foreground text-sm">
        {lead.phone ?? lead.email ?? "-"}
      </span>
    </div>
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            aria-label="Abrir menu de acoes"
            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg hover:bg-muted"
            type="button"
          />
        }
      >
        <MoreVertical className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>
          <Pencil className="size-4" />
          Editar lead
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive">
          <Trash2 className="size-4" />
          Excluir lead
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</Card>
```

### Pattern 3: CSS Grid Responsive Form

**What:** Replace `flex flex-col` with `grid grid-cols-1 md:grid-cols-2` for form layouts.
**When to use:** Forms with fields that should stack on mobile but pair on desktop.

```tsx
<form className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* Required fields: always full width (col-span-1 in both breakpoints) */}
  <div className="flex flex-col gap-2">
    <Label>Nome *</Label>
    <Input />
  </div>
  <div className="flex flex-col gap-2">
    <Label>Telefone</Label>
    <div className="flex gap-2">
      <Input className="flex-1" />
      <Button size="icon" variant="outline"><QrCode /></Button>
    </div>
  </div>

  {/* Collapsible details: each field takes 1 column (2-col on desktop) */}
  <Collapsible className="md:col-span-2">
    <CollapsibleTrigger>Mais detalhes</CollapsibleTrigger>
    <CollapsibleContent>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
        <div>Empresa</div>
        <div>Cargo</div>
        <div>Segmento</div>
        <div className="md:col-span-2">Notas (textarea)</div>
      </div>
    </CollapsibleContent>
  </Collapsible>

  {/* Submit: full width on both */}
  <Button className="md:col-span-2" size="lg" type="submit">
    Salvar Lead
  </Button>
</form>
```

### Pattern 4: visualViewport Keyboard Detection for FAB

**What:** Listen to `visualViewport.resize` event to hide FAB when virtual keyboard opens.
**When to use:** Any fixed-position element that conflicts with virtual keyboard on mobile.

```tsx
"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

function useKeyboardVisible(): boolean {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) {
      return; // Graceful fallback: FAB stays visible
    }

    const threshold = 0.75;

    function handleResize() {
      if (!viewport) return;
      const keyboardOpen = viewport.height < window.innerHeight * threshold;
      setIsKeyboardVisible(keyboardOpen);
    }

    viewport.addEventListener("resize", handleResize);
    return () => viewport.removeEventListener("resize", handleResize);
  }, []);

  return isKeyboardVisible;
}

const VISIBLE_ROUTES = ["/leads", "/dashboard"];

export default function FAB() {
  const pathname = usePathname();
  const isKeyboardVisible = useKeyboardVisible();

  const isVisibleRoute = VISIBLE_ROUTES.some(
    (route) => pathname === route
  );

  if (!isVisibleRoute || isKeyboardVisible) {
    return null;
  }

  return (
    <Link href="/leads/new">
      <Button className="fixed right-6 bottom-6 z-50 h-14 w-14 rounded-full shadow-lg" size="icon-lg">
        <Plus className="size-6" />
      </Button>
    </Link>
  );
}
```

### Anti-Patterns to Avoid

- **Using `useIsMobile()` for table/card conditional render:** Returns `false` on SSR, causes flash of desktop layout on mobile. Use CSS `hidden`/`md:hidden` instead.
- **Wrapping entire card in `role="button"` for admin cards:** Admin cards are NOT interactive themselves -- actions are via DropdownMenu only. Vendedor LeadCard is clickable (navigates), admin cards are not.
- **Using `position: sticky` for FAB:** D-07 says FAB hides when keyboard opens, not repositions. Hiding via state + `return null` is the correct approach.
- **Creating separate components for mobile and desktop that diverge in functionality:** Actions must exist in both table (desktop) and card (mobile) views. Extract action logic into shared functions.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mobile action menu | Custom bottom sheet or inline button row | shadcn DropdownMenu | Already installed, accessible, handles positioning/portal, Base UI React keyboard nav |
| Card layout container | Custom `div` with manual padding/border | shadcn Card + CardContent | Consistent border-radius, background, shadow across light/dark modes |
| Touch target enforcement | Manual pixel calculations | Tailwind `min-h-[44px] min-w-[44px]` | Declarative, matches WCAG 2.5.5, consistent with Phase 9 sidebar |
| Keyboard detection | `focus`/`blur` event on inputs | `visualViewport.resize` API | `focus`/`blur` fires for every input, doesn't correlate to actual keyboard visibility on all browsers |
| Badge variants | Custom styled spans | shadcn Badge with existing TAG_CONFIG/RoleBadge/StatusBadge | Already defined in `leads-panel.tsx` and `users-panel.tsx` |

**Key insight:** This phase adds zero new dependencies. Every UI primitive exists. The work is purely structural -- reorganizing existing components into responsive layouts.

## Common Pitfalls

### Pitfall 1: Hydration Mismatch from useIsMobile()

**What goes wrong:** `useIsMobile()` returns `false` on server render (initial value is `undefined`, cast to `false`). If used for conditional rendering (`isMobile ? <Card> : <Table>`), SSR renders the table, client hydration re-renders as card on mobile devices, causing a visible flash.
**Why it happens:** `useIsMobile()` depends on `window.matchMedia` which doesn't exist on the server.
**How to avoid:** Use CSS `hidden md:block` and `md:hidden` to switch between layouts. Both render in DOM, CSS controls visibility. Zero hydration mismatch.
**Warning signs:** Brief flash of table layout before cards appear on mobile.

### Pitfall 2: DropdownMenu Trigger Renders as Base UI Menu.Trigger

**What goes wrong:** The codebase's DropdownMenu is built on `@base-ui/react/menu`, not Radix. The `DropdownMenuTrigger` component uses `MenuPrimitive.Trigger` which requires the `render` prop pattern (like `TooltipTrigger` in the existing code) to render a custom element.
**Why it happens:** Base UI React uses `render` prop for polymorphism, not `asChild` like Radix.
**How to avoid:** Use `render={<button ... />}` on `DropdownMenuTrigger`, placing children (icon) between the trigger tags. Follow the existing pattern in `user-menu.tsx` and `mode-toggle.tsx`.
**Warning signs:** TypeScript errors about missing props, or trigger element not rendering correctly.

### Pitfall 3: FAB Rendering on Wrong Routes

**What goes wrong:** FAB currently renders unconditionally wherever it's imported (in `lead-list.tsx` and `dashboard/page.tsx`). D-08 says FAB should only appear on `/leads` and `/dashboard`. If the FAB component doesn't check its route, importing it in other pages would show it incorrectly.
**Why it happens:** FAB is a dumb component with no route awareness.
**How to avoid:** Add `usePathname()` check inside FAB. Only render if pathname exactly matches `/leads` or `/dashboard`. Alternatively, only import FAB in those specific pages (current approach) AND add pathname guard as defense-in-depth.
**Warning signs:** FAB appearing on `/leads/new` or `/leads/[id]` pages.

### Pitfall 4: Stat Cards Grid Overflow on Mobile

**What goes wrong:** `leads-panel.tsx` currently uses `grid-cols-3 gap-4` for stat cards. On 320px screens, 3 columns means each card is ~93px wide, which may be too narrow for the "Total de Leads" label.
**Why it happens:** Fixed 3-column grid doesn't adapt to screen width.
**How to avoid:** Change to `grid-cols-1 sm:grid-cols-3 gap-4` per the UI-SPEC. Cards stack vertically on mobile, 3-column on `sm` (640px) and above.
**Warning signs:** Stat card labels truncating or overflowing on 320px.

### Pitfall 5: lead-form.tsx max-w-[480px] Constraint on Mobile

**What goes wrong:** The form currently has `max-w-[480px]` on the Card wrapper. On mobile screens (320px-480px), this constraint is irrelevant (screen is smaller). However, the header and Card both have `max-w-[480px] mx-auto` which is fine. The UI-SPEC says to remove `max-w-[480px]` on mobile but keep on `md:+`. The current code applies it unconditionally.
**Why it happens:** Original form designed for single-column narrow layout.
**How to avoid:** Change to `max-w-none md:max-w-[480px]` or simply keep the constraint (it's a max, so on mobile screens narrower than 480px it has no effect). For the 2-column desktop grid, the 480px max is too narrow -- need to widen to accommodate 2 columns. Change to `max-w-none md:max-w-2xl` (672px).
**Warning signs:** Two-column grid looking cramped on tablet if max-width is too small.

### Pitfall 6: IntersectionObserver Root False Alarm

**What goes wrong:** Developers may add a `root` reference to SidebarInset thinking it's the scroll container, when actually the document body is the scroll container.
**Why it happens:** Assumption that sidebar layout creates a nested scroll container.
**How to avoid:** Verified: `SidebarInset` has NO `overflow-auto` class. `SidebarProvider` wrapper uses `flex min-h-svh` without overflow. Document body is the scroll container. IntersectionObserver with `root: null` (default viewport) works correctly. No change needed unless future CSS changes add overflow to SidebarInset.
**Warning signs:** IntersectionObserver never fires (root is set to a non-scrolling element).

## Code Examples

### AdminLeadCard Component Structure

```tsx
// Source: Derived from 10-UI-SPEC.md card wireframe + existing leads-panel.tsx data shape
interface AdminLeadCardProps {
  lead: {
    localId: string;
    name: string;
    phone: string | null;
    email: string | null;
    interestTag: string;
    vendorName?: string;
  };
  onDelete: () => void;
}

// Card layout:
// +--------------------------------------------------+
// | Nome do Lead                    [Tag Badge] [...] |
// | Vendedor: Fulano                                  |
// | (11) 99999-9999                                   |
// +--------------------------------------------------+
```

### AdminUserCard Component Structure

```tsx
// Source: Derived from 10-UI-SPEC.md card wireframe + existing users-panel.tsx UserRow type
interface AdminUserCardProps {
  user: UserRow; // { id, name, email, role, isBanned, leadCount }
  currentUserId: string | null;
  onEditRole: (userId: string) => void;
  onDeactivate: (user: { id: string; name: string }) => void;
  onReactivate: (user: { id: string; name: string }) => void;
}

// Card layout:
// +--------------------------------------------------+
// | Nome do Usuario    [Role Badge]            [...] |
// | 42 leads                     [Status Badge]      |
// +--------------------------------------------------+
```

### Desktop Table DropdownMenu Replacement

Both leads-panel and users-panel currently use inline Tooltip-wrapped icon buttons for actions. On desktop, these should ALSO be migrated to DropdownMenu for consistency (per UI-SPEC: "DropdownMenu replaces inline Tooltip actions"). This is a significant change:

```tsx
// BEFORE (current desktop):
<TableCell className="text-right">
  <div className="flex justify-end gap-1">
    <Tooltip><TooltipTrigger render={<Link>}><Pencil /></TooltipTrigger>...</Tooltip>
    <Tooltip><TooltipTrigger render={<button>}><Trash2 /></TooltipTrigger>...</Tooltip>
  </div>
</TableCell>

// AFTER (both desktop and mobile):
<TableCell className="text-right">
  <DropdownMenu>
    <DropdownMenuTrigger render={<button className="..." type="button" />}>
      <MoreVertical className="size-4" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem render={<Link href={`/admin/leads/${lead.localId}`} />}>
        <Pencil className="size-4" />
        Editar lead
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem className="text-destructive" onClick={() => onDelete(lead.localId)}>
        <Trash2 className="size-4" />
        Excluir lead
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</TableCell>
```

### visualViewport Keyboard Detection Hook

```tsx
// Source: MDN VisualViewport API + 10-CONTEXT.md D-07
function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    function handleResize() {
      if (!vv) return;
      // When keyboard opens, visualViewport.height shrinks significantly
      // 75% threshold distinguishes keyboard from browser chrome changes
      setVisible(vv.height < window.innerHeight * 0.75);
    }

    vv.addEventListener("resize", handleResize);
    return () => vv.removeEventListener("resize", handleResize);
  }, []);

  return visible;
}
```

**Browser support:** `window.visualViewport` is Baseline Widely Available since August 2021. All target browsers (Chrome mobile, Safari mobile) support it. Fallback: if `visualViewport` is not available, hook returns `false` (FAB stays visible -- acceptable degradation per UI-SPEC).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useIsMobile()` conditional render | CSS `hidden`/`md:hidden` | Always preferred for SSR apps | Avoids hydration mismatch CLS |
| `100vh` for full-height | `100svh` or `100dvh` | 2022+ | Safari iOS compatibility |
| Radix `asChild` on triggers | Base UI React `render` prop | shadcn migration to Base UI | Different API for polymorphic triggers |
| `focus`/`blur` for keyboard detection | `visualViewport.resize` API | Baseline Aug 2021 | Accurate detection across browsers |

**Deprecated/outdated:**
- `100vh` on mobile: Does not account for browser chrome, use `100svh` or `100dvh`
- Radix-based shadcn components: This codebase uses Base UI React (not Radix). Trigger components use `render` prop, not `asChild`

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.1 with jsdom environment |
| Config file | `apps/web/vitest.config.ts` |
| Quick run command | `bun run test -- --filter web` |
| Full suite command | `bun run test` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RESP-01 | Admin leads card renders with correct fields on mobile | manual-only | Visual verification at 320px viewport | n/a |
| RESP-02 | Admin users card renders with correct fields on mobile | manual-only | Visual verification at 320px viewport | n/a |
| RESP-03 | Lead form grid switches to 2-col on md+ | manual-only | Visual verification at 768px+ viewport | n/a |
| RESP-06 | IntersectionObserver works with sidebar | manual-only | Scroll lead list until infinite scroll triggers | n/a |
| RESP-07 | No horizontal overflow on 320px | manual-only | Check all routes at 320px viewport | n/a |
| TOUCH-02 | DropdownMenu trigger 44px touch target | manual-only | Inspect element dimensions in DevTools | n/a |
| TOUCH-03 | FAB hides on keyboard, shows on correct routes | unit | `bun vitest run apps/web/src/components/fab.test.ts` | Wave 0 |

**Justification for manual-only:** RESP-01 through RESP-07 (except TOUCH-03) are visual/responsive layout requirements. Testing them requires actual browser rendering at specific viewport sizes. jsdom does not support CSS media queries, viewport sizing, or visual rendering. These are best verified through manual DevTools testing or future Playwright e2e tests.

### Sampling Rate
- **Per task commit:** `bun run check-types && bun run check`
- **Per wave merge:** `bun run test && bun run build`
- **Phase gate:** Full suite green + manual visual check at 320px and 768px viewports

### Wave 0 Gaps
- [ ] `apps/web/src/components/fab.test.ts` -- test `useKeyboardVisible` hook behavior and route filtering logic (unit testable with mocked `visualViewport`)
- [ ] Vitest jsdom environment does not support `window.visualViewport` -- mock it in test setup

## Open Questions

1. **IntersectionObserver root -- is it actually needed?**
   - What we know: `SidebarInset` has NO overflow-auto. SidebarProvider wrapper is `flex min-h-svh`. Document body scrolls. IntersectionObserver with `root: null` observes against viewport, which works correctly.
   - What's unclear: Future CSS changes could add overflow to SidebarInset, breaking the assumption.
   - Recommendation: Keep `root: null` (current behavior). Add a comment in `lead-list.tsx` documenting the assumption. If infinite scroll breaks after future layout changes, the fix is setting `root` to the scrollable ancestor.

2. **DropdownMenu item height for 44px touch target**
   - What we know: Base UI React Menu items have default padding. The rendered height needs verification.
   - What's unclear: Exact rendered height of `DropdownMenuItem` in this codebase.
   - Recommendation: After implementation, inspect rendered DropdownMenuItem height. If < 44px, add `className="min-h-[44px]"` to each DropdownMenuItem.

3. **leads-panel.tsx vendorName field availability**
   - What we know: Admin leads card (D-03) needs "Vendedor: Fulano" but the current `leadsQuery` returns lead data that may not include vendor name.
   - What's unclear: Whether `listByUser` tRPC endpoint returns vendor name alongside lead data.
   - Recommendation: Check the tRPC router. If vendor name is not in the response, the selected vendor's name from `vendorsQuery` can be used (since all leads shown are for the selected vendor anyway).

## Project Constraints (from CLAUDE.md)

- **Indentation:** tabs (Biome)
- **Quotes:** double quotes (Biome)
- **Imports:** organized automatically by Biome
- **CSS classes:** sorted via `cn()` from `@dashboard-leads-profills/ui/lib/utils`
- **Commits:** Conventional Commits em Portugues
- **Components:** Check `packages/ui/src/components/` before creating any UI component
- **UI imports:** Path-based, not barrel (`@dashboard-leads-profills/ui/components/button`)
- **No console.log:** Enforced by Biome/Hookify rules
- **No `any` types:** Use `unknown` if genuinely unknown
- **Biome check:** Run `bun run check` before committing
- **Type check:** Run `bun run check-types` before committing

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `leads-panel.tsx`, `users-panel.tsx`, `lead-form.tsx`, `fab.tsx`, `lead-list.tsx`, `(app)/layout.tsx` -- direct code inspection
- Codebase analysis: `packages/ui/src/components/sidebar.tsx` -- verified SidebarInset has no overflow, SidebarProvider uses `flex min-h-svh`
- [MDN VisualViewport API](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport) -- properties, events, browser support (Baseline Widely Available since Aug 2021)
- [MDN Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) -- root option behavior, nested scroll containers

### Secondary (MEDIUM confidence)
- `.planning/research/PITFALLS.md` -- Pitfall #4 (IntersectionObserver root), Pitfall #5 (iOS Safari viewport), Pitfall #7 (Table-to-card conversion)
- [DEV.to: Fix mobile keyboard overlap with VisualViewport](https://dev.to/franciscomoretti/fix-mobile-keyboard-overlap-with-visualviewport-3a4a) -- modern approach recommends CSS dvh units but confirms visualViewport works for programmatic control
- [Safari 13 Mobile Keyboards and VisualViewport API](https://tkte.ch/articles/2019/09/23/safari-13-mobile-keyboards-and-the-visualviewport-api.html) -- iOS Safari keyboard detection via resize event

### Tertiary (LOW confidence)
- None -- all findings verified against codebase or official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all components already installed, verified in codebase
- Architecture: HIGH -- patterns derived directly from existing code and locked decisions
- Pitfalls: HIGH -- verified against codebase structure (SidebarInset overflow, hydration mismatch, Base UI render prop)
- visualViewport API: HIGH -- MDN documents it as Baseline Widely Available, 0.75 threshold is a reasonable heuristic

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable -- no moving parts, all Web APIs are baseline)
