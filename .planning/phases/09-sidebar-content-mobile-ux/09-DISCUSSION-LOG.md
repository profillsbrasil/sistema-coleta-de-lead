# Phase 9: Sidebar Content + Mobile UX - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-26
**Phase:** 09-sidebar-content-mobile-ux
**Areas discussed:** Desktop collapse mode, User menu no footer, Mobile drawer auto-close, Touch targets e sizing

---

## Desktop collapse mode

| Option | Description | Selected |
|--------|-------------|----------|
| Habilitar collapse icon-only | Ctrl+B alterna entre expandida e icon-only. Estado persistido via cookie. | |
| Manter sempre expandida | Sem toggle no desktop. Sidebar fixa com labels completos. | ✓ |
| Collapse só em telas médias | Icon-only automático em md-lg, expandida em xl+. | |

**User's choice:** Manter sempre expandida
**Notes:** Decisão Phase 8 (D-07/D-09) prevalece. Success criteria #6 do roadmap cancelado.

---

## User menu no footer

| Option | Description | Selected |
|--------|-------------|----------|
| Avatar + nome + DropdownMenu | Padrão shadcn sidebar com dropdown | |
| Avatar + nome inline + botão logout | Avatar + nome + role visíveis, botão 'Sair' direto | ✓ |
| Minimal: só nome + logout | Sem avatar, minimalista | |

**User's choice:** Avatar + nome inline + botão logout
**Notes:** 1 clique para logout, sem dropdown.

### Avatar source

| Option | Description | Selected |
|--------|-------------|----------|
| Iniciais do nome | Background com cor derivada do nome | |
| Gravatar via email | Hash MD5 do email, fallback iniciais | ✓ |
| Você decide | Claude escolhe | |

**User's choice:** Gravatar via email

### User data source

| Option | Description | Selected |
|--------|-------------|----------|
| Server props do layout | (app)/layout.tsx passa dados como props | ✓ |
| Client-side fetch | Busca via supabase client no useEffect | |
| Você decide | Claude escolhe | |

**User's choice:** Server props do layout

---

## Mobile drawer auto-close

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-close via usePathname | useEffect + setOpenMobile(false) | ✓ |
| Close com delay de animação | 150ms delay antes de fechar | |
| Você decide | Claude escolhe | |

**User's choice:** Auto-close via usePathname

### iOS viewport

| Option | Description | Selected |
|--------|-------------|----------|
| 100svh | Small viewport height | |
| 100dvh | Dynamic viewport height | |
| Você decide | Claude escolhe baseado nos pitfalls | ✓ |

**User's choice:** Você decide

---

## Touch targets e sizing

### Target size

| Option | Description | Selected |
|--------|-------------|----------|
| Override altura do SidebarMenuButton | min-h-11 (44px) via className | ✓ |
| Override global no sidebar.tsx | Modificar componente base | |
| Você decide | Claude escolhe | |

**User's choice:** Override altura do SidebarMenuButton

### Target scope

| Option | Description | Selected |
|--------|-------------|----------|
| Só nav items | Outros mantêm sizing padrão | ✓ |
| Todos os interativos | Tudo com 44px mínimo | |
| Você decide | Claude avalia caso a caso | |

**User's choice:** Só nav items

---

## Claude's Discretion

- iOS Safari viewport unit (100svh vs 100dvh)
- Cor do background do avatar de iniciais (fallback)
- Estilo do role badge
- Animação de transição do drawer

## Deferred Ideas

- Desktop collapse icon-only com Ctrl+B — cancelado
- Cookie persistence do estado sidebar — não aplicável
- Touch targets em tabelas/formulários — Phase 10
