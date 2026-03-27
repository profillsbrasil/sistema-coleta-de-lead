# Phase 8: Layout Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-26
**Phase:** 08-layout-foundation
**Areas discussed:** Rotas e route groups, Sidebar shell, Auth guard e roles, Cleanup strategy

---

## Rotas e Route Groups

### /todos page
| Option | Description | Selected |
|--------|-------------|----------|
| (public) — sem sidebar | Pagina demo/publica, acessivel sem login | |
| (app) — com sidebar | Move para area autenticada | |
| Remover | Pagina era so demo do v1.0 | ✓ |

**User's choice:** Remover — junto com Home page. Unica pagina publica e login.
**Notes:** User enfatizou: "A primeira tela e unica se caso o user nao ta autenticado seria o login!"

### /auth/callback
| Option | Description | Selected |
|--------|-------------|----------|
| Manter na raiz | Fica em app/auth/callback/ fora dos route groups | ✓ |
| Mover para (public) | Callback vai para (public) com layout minimo | |
| Voce decide | Claude resolve | |

**User's choice:** Manter na raiz (Recomendado)

### Home page (/)
| Option | Description | Selected |
|--------|-------------|----------|
| (public) — landing page | Home fica publica, sem sidebar | |
| (app) — redireciona para dashboard | / redireciona automaticamente | ✓ |

**User's choice:** (app) — redireciona para dashboard. Mas tambem removeu a pagina home — / redireciona, nao tem conteudo.

---

## Sidebar Shell (AppSidebar)

### Nav items na Phase 8
| Option | Description | Selected |
|--------|-------------|----------|
| Shell com nav items basicos | Dashboard, Leads, Novo Lead + Admin collapsible | ✓ |
| Shell vazio | Apenas estrutura, nav items na Phase 9 | |

**User's choice:** Shell com nav items basicos

### Brand no SidebarHeader
| Option | Description | Selected |
|--------|-------------|----------|
| Sim — nome do app | Texto 'Leads Profills' ou similar | |
| Sim — icone + nome | Icone lucide + nome | |
| Voce decide | Claude resolve | ✓ |

**User's choice:** Claude decide

### Modo collapsible
| Option | Description | Selected |
|--------|-------------|----------|
| Collapsible habilitado | collapsible='icon', Ctrl+B, cookie | |
| Sempre expandida | Sem modo icon-only | ✓ (desktop) |

**User's choice:** Sempre expandida no desktop, collapsible via Sheet no mobile
**Notes:** User esclareceu explicitamente: "a sidebar no desktop e para estar sempre aberta e no mobile colapsavel"

---

## Auth Guard e Roles

### Auth check method
| Option | Description | Selected |
|--------|-------------|----------|
| getUser() + getClaims() | Mesmo padrao do admin/layout.tsx atual | ✓ |
| Apenas getUser() com app_metadata | Le role de app_metadata no user object | |

**User's choice:** getUser() + getClaims() (Recomendado)

### Admin role guard
| Option | Description | Selected |
|--------|-------------|----------|
| Sim — role guard server-side | Admin pages verificam role no server | ✓ |
| Nao — sidebar escondida e suficiente | Confia na sidebar | |

**User's choice:** Sim — role guard server-side (Recomendado)

---

## Cleanup Strategy

### Ordem de execucao
| Option | Description | Selected |
|--------|-------------|----------|
| Sequencial: groups → shell → cleanup | 3 plans sequenciais | ✓ |
| Atomico: tudo em 1 plan grande | Tudo junto | |

**User's choice:** Sequencial (Recomendado)

---

## Claude's Discretion

- Brand/logo no SidebarHeader
- Estilo e espacamento do sidebar shell
- Loading state durante auth check

## Deferred Ideas

- UserMenu completo no SidebarFooter — Phase 9
- Touch targets 44px — Phase 9
- Drawer fecha ao navegar — Phase 9
- Breadcrumb — Phase 11
