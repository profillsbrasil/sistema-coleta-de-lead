# Phase 6: Admin Panel - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-25
**Phase:** 06-admin-panel
**Areas discussed:** Navegacao e acesso admin, Gerenciamento de leads, Gerenciamento de usuarios, Stats globais e filtros

---

## Navegacao e acesso admin

| Option | Description | Selected |
|--------|-------------|----------|
| Rota separada /admin | Painel admin em /admin/* com layout e navegacao proprios | ✓ |
| Mesmo /dashboard com modo admin | Dashboard com funcionalidades extras para admin | |
| Menu lateral com secoes admin | Sidebar com secoes admin na mesma shell | |

**User's choice:** Rota separada /admin
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| So /admin | Admin usa exclusivamente /admin/* | |
| Ambos | Admin acessa /admin e tambem /dashboard, /leads | ✓ |
| Voce decide | Claude define | |

**User's choice:** Ambos -- admin pode selecionar no /dashboard o vendedor que quer ver (dropdown ao lado das tabs)

| Option | Description | Selected |
|--------|-------------|----------|
| Link no header | Adicionar link Admin no header existente | |
| Sidebar dedicada no /admin | Layout com sidebar propria em /admin | ✓ |
| Voce decide | Claude define | |

**User's choice:** Sidebar dedicada no /admin

---

## Gerenciamento de leads

| Option | Description | Selected |
|--------|-------------|----------|
| Lista unica com filtro | Tabela com todos os leads, dropdown para filtrar | |
| Tela por vendedor | Admin seleciona vendedor, ve leads dele | ✓ |
| Voce decide | Claude define | |

**User's choice:** Tela por vendedor + stats do vendedor selecionado

| Option | Description | Selected |
|--------|-------------|----------|
| Reutilizar LeadForm | Mesmo formulario de edicao | ✓ |
| Formulario simplificado | Versao reduzida para admin | |
| Voce decide | Claude define | |

**User's choice:** Reutilizar LeadForm

| Option | Description | Selected |
|--------|-------------|----------|
| Server-only | tRPC direto, sem Dexie | ✓ |
| Offline-first | Dexie + sync como vendedor | |
| Voce decide | Claude define | |

**User's choice:** Server-only

---

## Gerenciamento de usuarios

| Option | Description | Selected |
|--------|-------------|----------|
| Formulario no /admin | Admin cria com nome, email, senha | |
| Convite por email | Admin envia convite | |
| Cadastro livre | Login com Google aberto | ✓ |

**User's choice:** Cadastro livre -- qualquer pessoa com acesso ao site cria conta via Google

| Option | Description | Selected |
|--------|-------------|----------|
| Listar, ver stats e desativar | Lista com desativacao | |
| Listar, editar perfil e desativar | + edicao de nome e role | ✓ |
| Apenas listar e ver stats | Somente visualizacao | |

**User's choice:** Listar, ver stats, desativar, editar nome e role

| Option | Description | Selected |
|--------|-------------|----------|
| Flag + bloquear auth | Dupla protecao | ✓ |
| Apenas flag no banco | Checa flag no login | |
| Voce decide | Claude define | |

**User's choice:** Flag no banco + bloquear via Supabase Admin API

---

## Stats globais e filtros

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard existente com filtro | Reutilizar components com dropdown | |
| Tela nova com metricas agregadas | Tela completamente nova em /admin/stats | ✓ |
| Voce decide | Claude define | |

**User's choice:** Tela nova com metricas agregadas

**Metricas selecionadas (multiSelect):**
- ✓ Total de leads da equipe
- ✓ Breakdown por tag (quente/morno/frio)
- ✓ Ranking de vendedores
- ✓ Leads por periodo (grafico temporal)

| Option | Description | Selected |
|--------|-------------|----------|
| Filtro por vendedor + periodo | Dropdown + seletor de periodo | |
| Filtros avancados | Vendedor + periodo + tag + segmento | ✓ |
| Sem filtros | Sempre mostra tudo | |

**User's choice:** Filtros avancados

---

## Claude's Discretion

- Layout da sidebar admin
- Design dos graficos
- Granularidade do seletor de periodo
- Paginacao vs infinite scroll na lista de leads

## Deferred Ideas

None
