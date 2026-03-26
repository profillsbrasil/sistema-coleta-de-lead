# Phase 4: Lead Management - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-03-25
**Phase:** 04-lead-management
**Areas discussed:** Lista de leads, Edicao de lead, Exclusao (soft-delete), Filtro por tag

---

## Lista de leads

| Option | Description | Selected |
|--------|-------------|----------|
| Cards empilhados | Cada lead e um card com nome, tag, timestamp | ✓ |
| Tabela | Linhas e colunas | |
| Lista simples | Sem card, so texto | |

**User's choice:** Cards empilhados

| Option | Description | Selected |
|--------|-------------|----------|
| Tudo de uma vez | Sem paginacao | |
| Infinite scroll | 20 por vez | ✓ |
| Paginacao | Botoes de pagina | |

**User's choice:** Infinite scroll

---

## Edicao de lead

| Option | Description | Selected |
|--------|-------------|----------|
| Pagina de detalhe /leads/[id] | Reutiliza LeadForm em modo edicao | ✓ |
| Edicao inline | Edita direto no card | |
| Modal/bottom sheet | Modal com campos | |

**User's choice:** Pagina de detalhe /leads/[id]

---

## Exclusao (soft-delete)

| Option | Description | Selected |
|--------|-------------|----------|
| Botao na pagina de detalhe | Confirmacao simples, soft-delete | ✓ |
| Swipe-to-delete | Arrastar card | |
| Botao no card | Lixeira visivel na lista | |

**User's choice:** Botao na pagina de detalhe

---

## Filtro por tag

| Option | Description | Selected |
|--------|-------------|----------|
| Botoes toggle no topo | Estilo TagSelector: Todos/Quente/Morno/Frio | ✓ |
| Dropdown | Select com opcoes | |
| Tabs | Abas fixas | |

**User's choice:** Botoes toggle no topo da lista

---

## Claude's Discretion

- Infinite scroll implementation
- LeadForm mode (create vs edit)
- Empty state
- Confirmacao de exclusao
- Timestamp relativo

## Deferred Ideas

None
