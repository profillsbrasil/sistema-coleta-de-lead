# Stack Research

**Domain:** UI Refactor -- Sidebar Navigation + Mobile Responsiveness
**Researched:** 2026-03-26
**Confidence:** HIGH

## Executive Summary

O projeto ja possui todas as dependencias necessarias para o v1.1 UI refactor. Os componentes shadcn/ui criticos (Sidebar, Sheet, Drawer, Collapsible, ScrollArea, Table) ja estao instalados em `packages/ui/src/components/`. O hook `useIsMobile` ja existe. A AdminSidebar ja funciona com `SidebarProvider` no admin layout. **Nenhuma nova dependencia e necessaria.** O trabalho e 100% de composicao e refatoracao de layout.

## Current State (Already Installed)

### shadcn/ui Components -- Ready to Use

| Component | File | Purpose for v1.1 | Status |
|-----------|------|-------------------|--------|
| `Sidebar` (full suite) | `sidebar.tsx` (20KB) | Navigation principal, SidebarProvider, SidebarTrigger, SidebarMenu*, SidebarGroup*, SidebarFooter, SidebarHeader, SidebarRail | Instalado, usado no admin |
| `Sheet` | `sheet.tsx` | Mobile sidebar overlay (usado internamente pelo Sidebar no mobile) | Instalado |
| `Drawer` | `drawer.tsx` | Bottom drawer para acoes mobile (ex: filtros, acoes rapidas) | Instalado (via `vaul`) |
| `Collapsible` | `collapsible.tsx` | Secao "Admin" expandivel na sidebar por role | Instalado |
| `ScrollArea` | `scroll-area.tsx` | Scroll dentro da sidebar quando muitos itens | Instalado |
| `Table` | `table.tsx` | Tabelas de leads/users (ja tem overflow-x-auto) | Instalado |
| `Separator` | `separator.tsx` | Divisores entre grupos na sidebar | Instalado |
| `Tooltip` | `tooltip.tsx` | Labels em sidebar collapsed (icon-only mode) | Instalado |
| `Skeleton` | `skeleton.tsx` | Loading states na sidebar | Instalado |
| `Card` | `card.tsx` | Card layout alternativo no mobile para tabelas | Instalado |
| `Badge` | `badge.tsx` | Tags quente/morno/frio nos cards mobile | Instalado |
| `Accordion` | `accordion.tsx` | Alternativa ao Collapsible para grupos de nav | Instalado |
| `DropdownMenu` | `dropdown-menu.tsx` | User menu na sidebar footer | Instalado |
| `Avatar` | `avatar.tsx` | User avatar na sidebar footer | Instalado |

### Hooks -- Ready to Use

| Hook | File | Purpose |
|------|------|---------|
| `useIsMobile` | `hooks/use-mobile.ts` | Breakpoint 768px, usado pelo Sidebar component internamente | Instalado |

### Dependencies -- Already Present

| Dependency | Version | Used By |
|------------|---------|---------|
| `vaul` | ^1.1.2 | Drawer component (bottom sheet) |
| `@base-ui/react` | ^1.3.0 | Sheet component primitives |
| `class-variance-authority` | ^0.7.1 | Sidebar variant styles |
| `lucide-react` | ^1.6.0 | Navigation icons |
| `cmdk` | ^1.1.1 | Command palette (opcional para search na sidebar) |

## Recommended Stack -- Zero New Dependencies

### Core Pattern: SidebarProvider no Root Layout

O padrao ja funciona no admin layout. Para v1.1, mover o `SidebarProvider` do admin layout para o root layout (ou um layout intermediario de app autenticado).

**Por que:** O shadcn Sidebar component ja gerencia:
- Estado collapsed/expanded via cookie (`sidebar_state`)
- Mobile detection via `useIsMobile` hook
- Mobile drawer automatico via Sheet (built-in no Sidebar component)
- Keyboard shortcut (Ctrl+B) para toggle
- Width constants: 16rem (desktop), 18rem (mobile), 3rem (icon-only)

### Responsive Patterns com TailwindCSS 4

TailwindCSS 4 ja esta no projeto. Os breakpoints default sao suficientes:

| Breakpoint | Width | Uso no v1.1 |
|------------|-------|-------------|
| `sm` | 640px | Cards de lead empilhados |
| `md` | 768px | Sidebar collapse threshold (alinhado com `useIsMobile`) |
| `lg` | 1024px | Sidebar expanded + tabela completa |
| `xl` | 1280px | Espacamento extra, colunas adicionais visiveis |

**Padrao para tabelas responsivas:** `hidden md:table-cell` para colunas secundarias + card layout via `md:hidden` para mobile.

**Padrao para touch targets:** `min-h-11 min-w-11` (44px) nos botoes interativos. TailwindCSS 4 usa `size-11` = 2.75rem = 44px.

### Sidebar Architecture

```
RootLayout
  Providers (theme, trpc, query)
    AuthenticatedLayout          // novo layout para rotas autenticadas
      SidebarProvider
        AppSidebar               // novo componente unificado
          SidebarHeader          // logo/brand
          SidebarContent
            SidebarGroup "Vendedor"
              - Home
              - Dashboard
              - Leads
              - Captura
            SidebarGroup "Admin" (Collapsible, role-gated)
              - Leads (admin)
              - Usuarios
              - Stats Globais
          SidebarFooter
            - UserMenu (avatar + dropdown)
            - ModeToggle
        SidebarRail              // resize handle desktop
        main (conteudo da pagina)
```

## What NOT to Install

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@tanstack/react-table` | Overkill para tabelas simples de leads/users. Adiciona ~50KB. Tabelas do app tem <10 colunas, sem sorting complexo | Composicao manual com `Table` + `hidden md:table-cell` + card layout mobile |
| `react-responsive` | Duplica funcionalidade do `useIsMobile` hook e dos breakpoints TailwindCSS | `useIsMobile` hook + Tailwind responsive classes |
| `framer-motion` | Transicoes ja cobertas por CSS transitions no Sheet/Drawer/Sidebar. Adiciona ~30KB gzipped | CSS transitions + `tw-animate-css` (ja instalado) |
| `hamburger-react` | Icon de menu ja disponivel via `lucide-react` (Menu, PanelLeftIcon) | `PanelLeftIcon` (usado pelo SidebarTrigger) ou `Menu` do lucide |
| `react-swipeable` | Drawer/vaul ja tem gesture handling built-in para swipe | `vaul` (Drawer component) |
| `@radix-ui/react-*` | Projeto usa `@base-ui/react` (successor do Radix). Nao misturar | `@base-ui/react` (ja presente) |

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| shadcn Sidebar (built-in) | Custom sidebar com Sheet | Nunca neste projeto -- o Sidebar component ja resolve 100% do caso |
| `hidden md:table-cell` + card layout | `@tanstack/react-table` com responsive plugin | Quando tiver >15 colunas, sorting, filtering, pagination complexa |
| `useIsMobile` hook (768px) | CSS-only via Tailwind breakpoints | Preferir CSS-only quando possivel; hook so para logica JS (ex: Drawer vs Dialog) |
| `vaul` Drawer (bottom sheet) | Sheet (side panel) | Drawer para acoes contextuais no mobile (filtros); Sheet para navegacao (ja usado pelo Sidebar) |

## Integration Notes

### Sidebar Mobile Behavior (Already Built-in)

O componente `Sidebar` do shadcn (ja instalado em `sidebar.tsx`) **ja** renderiza um Sheet no mobile automaticamente:
- Quando `useIsMobile()` retorna true, o sidebar vira um Sheet
- `SidebarTrigger` renderiza um botao hamburguer
- `openMobile`/`setOpenMobile` controlam o estado
- Nao precisa implementar nada -- so usar o componente

### Cookie Persistence

O `SidebarProvider` persiste o estado collapsed/expanded via cookie (`sidebar_state`, 7 dias). Isso significa que o estado sobrevive a navegacao e refresh. Ja esta implementado no componente.

### Keyboard Shortcut

`Ctrl+B` (ou `Cmd+B` no Mac) ja esta implementado no `SidebarProvider` para toggle. Padrao do componente shadcn.

### Admin Section Gating

Usar `Collapsible` dentro de um `SidebarGroup` para a secao admin. A visibilidade e controlada por role no client (ja existe logica similar no `header.tsx` com `isAdmin` state). No v1.1, mover essa logica para o AppSidebar unificado.

### Touch Target Compliance

TailwindCSS 4 utilities para garantir 44x44px:
- Botoes: `min-h-11 min-w-11 p-2.5` (44px minimo)
- SidebarMenuButton ja usa `h-8` (32px) -- precisa aumentar para `h-11` no mobile via `md:h-8`
- Links de navegacao: `py-3` no mobile, `py-2` no desktop

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| shadcn `sidebar.tsx` | v4 (shadcn ^4.1.0) | @base-ui/react ^1.3.0 | Sheet interno usa @base-ui/react Dialog |
| vaul (Drawer) | ^1.1.2 | React 19 | Compativel, sem issues conhecidos |
| TailwindCSS | 4.x | tw-animate-css ^1.4.0 | Animacoes funcionam com v4 |
| useIsMobile hook | custom | Sidebar component | Breakpoint alinhado (768px = md) |

## Installation

```bash
# NENHUMA instalacao necessaria.
# Todos os componentes e dependencias ja estao presentes.

# Verificacao:
ls packages/ui/src/components/sidebar.tsx   # Sidebar suite (20KB)
ls packages/ui/src/components/sheet.tsx      # Sheet (usado pelo Sidebar mobile)
ls packages/ui/src/components/drawer.tsx     # Drawer (bottom sheet)
ls packages/ui/src/components/collapsible.tsx # Collapsible (admin section)
ls packages/ui/src/hooks/use-mobile.ts       # useIsMobile hook
```

## Lucide Icons Recomendados para Sidebar

| Icon | Import | Uso |
|------|--------|-----|
| `Home` | `lucide-react` | Link Home |
| `LayoutDashboard` | `lucide-react` | Dashboard (ja usado no admin) |
| `Users` | `lucide-react` | Leads / Usuarios (ja usado) |
| `ClipboardList` | `lucide-react` | Leads admin (ja usado) |
| `PlusCircle` | `lucide-react` | Captura rapida |
| `QrCode` | `lucide-react` | QR Scanner |
| `Camera` | `lucide-react` | Foto de cartao |
| `BarChart3` | `lucide-react` | Stats globais |
| `Trophy` | `lucide-react` | Leaderboard |
| `Shield` | `lucide-react` | Secao Admin (collapsible header) |
| `ChevronDown` | `lucide-react` | Collapsible trigger |
| `Settings` | `lucide-react` | Configuracoes (futuro) |
| `LogOut` | `lucide-react` | Logout no footer |

## Sources

- Codebase analysis: `packages/ui/src/components/sidebar.tsx` (20KB, shadcn v4 Sidebar completo) -- HIGH confidence
- Codebase analysis: `packages/ui/package.json` (todas dependencias verificadas) -- HIGH confidence
- Codebase analysis: `apps/web/src/app/admin/layout.tsx` (SidebarProvider + AdminSidebar ja funcional) -- HIGH confidence
- Codebase analysis: `apps/web/src/components/header.tsx` (topbar atual a ser substituido) -- HIGH confidence
- Codebase analysis: `packages/ui/src/hooks/use-mobile.ts` (breakpoint 768px) -- HIGH confidence
- TailwindCSS 4 default breakpoints: sm=640px, md=768px, lg=1024px, xl=1280px -- HIGH confidence
- shadcn/ui Sidebar component: keyboard shortcut, cookie persistence, auto-mobile Sheet -- HIGH confidence (verified in source code)

---
*Stack research for: UI Refactor -- Sidebar Navigation + Mobile Responsiveness*
*Researched: 2026-03-26*
