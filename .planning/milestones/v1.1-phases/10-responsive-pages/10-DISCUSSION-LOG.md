# Phase 10: Responsive Pages - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-27
**Phase:** 10-responsive-pages
**Areas discussed:** Table → Card mobile, Ações nas tabelas mobile, FAB + teclado virtual, Lead form grid responsivo

---

## Table → Card mobile

| Option | Description | Selected |
|--------|-------------|----------|
| Card com info resumida | Cada row vira card com 3-4 campos. Sem expandir — DropdownMenu de ações. | ✓ |
| Card expansível (accordion) | Card mostra campos principais. Tap expande para ver todos. | |
| Manter tabela com scroll | overflow-x-auto. Simples mas UX ruim em 320px. | |

**User's choice:** Card com info resumida (Recommended)
**Notes:** Sem accordion — clicar no card abre DropdownMenu de ações

### Leads card fields

| Option | Description | Selected |
|--------|-------------|----------|
| Nome + Tag (badge) | Linha principal com badge quente/morno/frio | ✓ |
| Telefone ou Email | Contato primário | ✓ |
| Vendedor | Quem coletou o lead | ✓ |
| Data de criação | Quando foi coletado | |

### Users card fields

| Option | Description | Selected |
|--------|-------------|----------|
| Nome + Role (badge) | Nome com badge Admin/Vendedor | ✓ |
| Email | Contato | |
| Status (ativo/banido) | Badge de status | ✓ |
| Contagem de leads | Quantos leads coletou | ✓ |

---

## Ações nas tabelas mobile

| Option | Description | Selected |
|--------|-------------|----------|
| DropdownMenu 3-pontos | Ícone ⋮ no canto do card abre menu com ações | ✓ |
| Botões inline no card | Botões visíveis direto no card | |
| Swipe actions | Deslizar o card revela ações (estilo iOS Mail) | |

**User's choice:** DropdownMenu 3-pontos (Recommended)

### Touch target size

| Option | Description | Selected |
|--------|-------------|----------|
| 44px mínimo (WCAG) | Mesmo padrão da sidebar nav | ✓ |
| 48px mínimo (Material Design) | Padrão Google Material | |
| You decide | Claude escolhe | |

**User's choice:** 44px mínimo (WCAG, Recommended)

---

## FAB + teclado virtual

| Option | Description | Selected |
|--------|-------------|----------|
| Esconder o FAB | FAB desaparece quando keyboard ativo (visualViewport API) | ✓ |
| FAB sticky no topo | Reposicionar como botão sticky no topo | |
| Manter fixed | Aceitar conflito com teclado | |
| You decide | Claude escolhe | |

**User's choice:** Esconder o FAB (Recommended)

### FAB scope

| Option | Description | Selected |
|--------|-------------|----------|
| Apenas /leads e /dashboard | FAB onde vendedor vê leads ou stats | ✓ |
| Todas exceto /leads/new | FAB sempre visível exceto no form | |
| You decide | Claude decide por rota | |

**User's choice:** Apenas /leads e /dashboard (Recommended)

---

## Lead form grid responsivo

| Option | Description | Selected |
|--------|-------------|----------|
| Converter para grid responsivo | grid-cols-1 mobile, grid-cols-2 md+. Obrigatórios em coluna única. | ✓ |
| Manter flex-col | Já funciona em 320px. Não mudar layout. | |
| You decide | Claude avalia grid vs flex | |

**User's choice:** Converter para grid responsivo (Recommended)

---

## Claude's Discretion

- Estratégia hide/show colunas no breakpoint
- Card design exact (padding, spacing, border radius)
- IntersectionObserver root adjustment
- visualViewport API implementation details
- Animação de transição table/card

## Deferred Ideas

- Charts responsivos — Phase 11
- Breadcrumb contextual — Phase 11
- Dark mode audit — Phase 11
- Polish visual final — Phase 11
