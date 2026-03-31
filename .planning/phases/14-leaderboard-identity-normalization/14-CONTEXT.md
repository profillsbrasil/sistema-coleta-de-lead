# Phase 14: Leaderboard Identity Normalization - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 14 corrige a exibição de nomes no leaderboard e nas superfícies admin relacionadas ao vendedor. O escopo é substituir o placeholder genérico "Vendedor" por um nome legível e canônico, incluindo a consistência no cache offline do leaderboard. Novos perfis de usuário, avatares, ou páginas de perfil são fases separadas.

</domain>

<decisions>
## Implementation Decisions

### Fallback canônico de nome
- **D-01:** A query do leaderboard usa apenas `raw_user_meta_data->>'name'`. Quando `name` é null, o fallback é `"Vendedor #N"` onde N é a posição no ranking (1-indexed). Não adicionar COALESCE com `full_name` ou email — manter a query simples.
- **D-02:** O placeholder numerado `"Vendedor #N"` é rank-based e dinâmico — muda conforme o score muda. Isso é aceitável para v1.2.

### "Você" vs nome real
- **D-03:** Remover o tratamento especial do usuário atual no leaderboard. Todos os vendedores — incluindo o usuário autenticado — veem nomes reais. O destaque visual (`isCurrentUser` no `LeaderboardEntry`) continua para identificar o usuário atual, mas o texto exibe o nome real.
- **D-04:** O `leaderboard.getRanking` no servidor não precisa mais do `currentUserId` para resolver nomes. O campo `isCurrentUser` permanece no payload para o destaque visual no cliente.

### Cache offline: invalidação
- **D-05:** Não alterar o schema Dexie para esta fase. O `leaderboard-tab.tsx` já executa `clear()` + `bulkPut()` quando `serverData` chega — entradas antigas com "Vendedor" são sobrescritas automaticamente no próximo sync online. Zero mudança de versão ou migration no Dexie.

### Escopo das superfícies admin
- **D-06:** Além do leaderboard, corrigir as seguintes superfícies admin com o mesmo padrão de fallback:
  - `admin/leads.ts → listVendors`: seletor de filtro/exportação no painel admin
  - `admin/stats.ts → breakdown por vendedor`: query que exibe nome no stats breakdown
- **D-07:** Para superfícies admin (`listVendors`, stats), o fallback quando `name` é null pode usar email prefix (parte antes do `@`) como alternativa ao rank-based, já que não há conceito de "posição" nessas queries. Decisão final fica a critério do agente.

### Claude's Discretion
- Fallback exato para `listVendors` e admin stats quando `name` é null (email prefix vs outro label) — admins conhecem sua equipe, nível de visibilidade é interno
- Extração de uma função/helper `resolveDisplayName` compartilhado entre as 3 queries, ou manter inline
- Formato exato do rank no fallback (ex: "Vendedor #3" vs "#3 Vendedor")

</decisions>

<specifics>
## Specific Ideas

- O destaque visual de `isCurrentUser` no `LeaderboardEntry` continua — só o texto do nome muda de "Você" para o nome real.
- Para o leaderboard, a solução mais simples é a correta: um único `COALESCE(u.raw_user_meta_data->>'name', 'Vendedor #' || ROW_NUMBER()...)` ou equivalente na query SQL.
- Não há referência visual específica — a exibição atual do leaderboard já é aceitável, só o nome está errado.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Escopo e requisitos da fase
- `.planning/ROADMAP.md` — Phase 14 goal, success criteria, plans (14-01 e 14-02)
- `.planning/REQUIREMENTS.md` — `ENH-06` (nome legível no leaderboard) e `ENH-09` (consistência no cache offline e admin)
- `.planning/PROJECT.md` — tech debt ativo: "Leaderboard mostra 'Vendedor' para nao-current users (JOIN a auth.users pendente)"

### Código afetado (leitura obrigatória antes de tocar)
- `packages/api/src/routers/leaderboard.ts` — query atual com `raw_user_meta_data->>'name'` e fallback "Vendedor"/"Voce"; ponto principal da correção
- `packages/api/src/routers/admin/stats.ts` — query com mesmo pattern na linha 124; superfície admin a corrigir
- `packages/api/src/routers/admin/leads.ts` — `listVendors` query (linha 127) sem fallback explícito; superfície admin a corrigir
- `apps/web/src/app/(app)/dashboard/leaderboard-tab.tsx` — cache strategy (clear + bulkPut); confirmar que D-05 já está implementado
- `apps/web/src/components/leaderboard-entry.tsx` — componente de exibição; verificar como `isCurrentUser` é usado visualmente

### Schema e cache offline
- `apps/web/src/lib/db/index.ts` — schema Dexie com `leaderboardCache`; confirmar estrutura antes de qualquer mudança

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/api/src/lib/supabase-admin.ts`: `supabaseAdmin` disponível no server — alternativa para buscar nomes via Admin SDK se SQL não for suficiente (mas SQL é preferível)
- `apps/web/src/components/leaderboard-entry.tsx`: componente existente com prop `isCurrentUser` — não precisa de mudança de interface, apenas o `name` passado muda
- SQL `ROW_NUMBER() OVER (ORDER BY score DESC)`: disponível para gerar o índice rank-based no fallback

### Established Patterns
- Queries SQL raw via `db.execute(sql\`...\`)` com `auth.users` JOIN — padrão já usado no leaderboard e admin stats
- `raw_user_meta_data` acessado via `->>'field'` em SQL — padrão estabelecido
- `supabaseAdmin.auth.admin.listUsers()` em `admin/users.ts` usa `u.user_metadata?.name` no JS layer — padrão alternativo mas menos eficiente para queries agregadas

### Integration Points
- `leaderboard.ts`: correção na query SQL + remover lógica `currentUserId` para nome (manter apenas para `isCurrentUser` flag)
- `admin/stats.ts`: mesma correção na query SQL do breakdown
- `admin/leads.ts → listVendors`: adicionar fallback na query SQL
- `leaderboard-tab.tsx`: sem mudança esperada (D-05); verificar apenas que `clear()` + `bulkPut()` funciona corretamente
- `leaderboard-entry.tsx`: sem mudança esperada; o `name` correto chega via prop

</code_context>

<deferred>
## Deferred Ideas

- **ENH-05 (backlog):** Supabase Realtime para leaderboard sub-5s — mencionado no backlog, permanece fora do escopo
- **Perfis públicos de usuário** — fora do escopo (REQUIREMENTS.md Out of Scope)
- **Fallback com email completo** — decidido não expor email de outros vendedores no leaderboard público; descartado
- **Schema version no cache** — schema versioning no Dexie foi considerado e descartado para esta fase (D-05)

</deferred>

---

*Phase: 14-leaderboard-identity-normalization*
*Context gathered: 2026-03-31*
