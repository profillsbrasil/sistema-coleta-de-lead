# Phase 4: Lead Management - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Vendedor consegue visualizar, editar, filtrar e excluir seus proprios leads de qualquer lugar, online ou offline. CRUD completo via Dexie (offline-first), sync automatico via engine da Phase 2.

</domain>

<decisions>
## Implementation Decisions

### Lista de leads
- **D-01:** Cards empilhados. Cada card mostra nome, telefone/email, tag colorida (badge oklch), e timestamp relativo ("ha 5 min"). Reutiliza Card component do shadcn.
- **D-02:** Infinite scroll. Carrega 20 leads por vez conforme vendedor scrolla. Dados vem do Dexie via useLiveQuery (reactivo).
- **D-03:** Ordenacao por recencia (created_at desc) como default. Rota: `/leads` ou dashboard principal.

### Edicao de lead
- **D-04:** Pagina de detalhe `/leads/[id]`. Toca no card da lista, abre pagina com todos os campos editaveis. Reutiliza LeadForm da Phase 3 em modo edicao (pre-preenche campos com dados existentes).
- **D-05:** Botao Salvar atualiza no Dexie + enfileira no syncQueue. Mesma logica de saveLead adaptada para update.

### Exclusao (soft-delete)
- **D-06:** Botao "Excluir" na pagina de detalhe `/leads/[id]`. Confirmacao simples ("Tem certeza?") via dialog.
- **D-07:** Soft-delete: seta `deletedAt = new Date()` no Dexie. Lead some da lista. Sync engine propaga para servidor.
- **D-08:** Sem swipe-to-delete. Sem botao de lixeira no card da lista.

### Filtro por tag
- **D-09:** Botoes toggle no topo da lista, estilo TagSelector (cores oklch): Todos | Quente | Morno | Frio.
- **D-10:** Toggle unico — um filtro ativo por vez. "Todos" e o default.
- **D-11:** Filtro aplica direto no Dexie query (instantaneo, offline). Sem request de rede.

### Claude's Discretion
- Infinite scroll implementation — IntersectionObserver vs scroll event. Claude escolhe.
- LeadForm mode (create vs edit) — como adaptar o componente existente para ambos os modos.
- Empty state da lista — ilustracao e copy quando nao ha leads.
- Confirmacao de exclusao — AlertDialog do shadcn ou confirm nativo.
- Timestamp relativo — lib (date-fns) ou funcao custom. Claude decide baseado em bundle size.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project requirements
- `.planning/REQUIREMENTS.md` — LEAD-01 through LEAD-05 define os requisitos de lead management
- `.planning/ROADMAP.md` §Phase 4 — Goal, success criteria e depends on

### Prior phase artifacts (lead capture)
- `apps/web/src/components/lead-form.tsx` — LeadForm component (reutilizar em modo edicao)
- `apps/web/src/components/tag-selector.tsx` — TagSelector com cores oklch (reutilizar para filtro)
- `apps/web/src/lib/lead/save-lead.ts` — saveLead function (adaptar para update)
- `apps/web/src/lib/lead/validation.ts` — Zod schema de validacao
- `apps/web/src/lib/db/index.ts` — Dexie database (leads table)
- `apps/web/src/lib/db/types.ts` — Lead e SyncQueueItem interfaces

### Offline infra (Phase 2)
- `apps/web/src/lib/sync/engine.ts` — Sync engine singleton
- `packages/api/src/routers/sync.ts` — tRPC pushChanges/pullChanges

### UI Design System
- `.planning/phases/01-auth-migration/01-UI-SPEC.md` — Design tokens base

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lead-form.tsx`: LeadForm ja existe com validacao, tag selector, foto, QR. Adaptar para modo edicao (prop `lead?: Lead` para pre-preencher).
- `tag-selector.tsx`: TagSelector com cores oklch. Reutilizar para filtro na lista (adicionar opcao "Todos").
- `save-lead.ts`: saveLead grava no Dexie + syncQueue. Criar `updateLead` e `deleteLead` seguindo mesmo padrao.
- `db/index.ts`: Dexie DB com leads table. useLiveQuery para queries reativas.
- `fab.tsx`: FAB ja existe no dashboard. Lista de leads pode reutilizar para "novo lead".
- `packages/ui/components/card.tsx`: Card component do shadcn.

### Established Patterns
- Offline-first: escrita no Dexie primeiro, syncQueue enfileira, sync engine envia
- useLiveQuery do dexie-react-hooks para dados reativos
- Sonner para toasts de feedback
- Paginas dedicadas para formularios (pattern de /leads/new)

### Integration Points
- `apps/web/src/app/leads/page.tsx` — nova pagina da lista
- `apps/web/src/app/leads/[id]/page.tsx` — nova pagina de detalhe/edicao
- `apps/web/src/components/lead-card.tsx` — novo componente para card na lista
- `apps/web/src/lib/lead/` — novas funcoes updateLead, deleteLead

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-lead-management*
*Context gathered: 2026-03-25*
