# Admin UI — Quick Wins

Data: 2026-05-22
Escopo: `apps/web/src/app/(app)/admin/**`
Objetivo: corrigir bugs, problemas de a11y e violações do DESIGN.md sem
redesenhar componentes. Refactors estruturais (toolbar única, chips de
filtros ativos, label visível em selects, paginação compartilhada) ficam
fora deste spec.

## Princípios

- Manter o sistema visual de DESIGN.md: weight 400 default, 500 apenas em
  ações/nav, sem 600/700; spacing na escala `4, 6, 8, 12, 16, 20, 24…`.
- Strings PT-BR sempre acentuadas (Geist Sans renderiza sem problema; a
  app já mistura — padronizar para "com acento").
- Sentinela explícita (`"all"`) para selects de filtro que representam
  "todos"; o componente Radix `Select` quebra com `value=""`.
- Filtros disponíveis no mobile com o mesmo conjunto do desktop.

## Mudanças por arquivo

### `apps/web/src/app/(app)/admin/stats/stats-filters.tsx`

1. Trocar `SelectItem value=""` por `SelectItem value="all"` nos três
   selects (vendedor, tag, segmento). Estado local começa em `"all"`.
   No `handleApply`, mapear `"all" → undefined` antes de chamar
   `onApply`.
2. Remover `hidden lg:flex` dos três selects e do `PopoverTrigger` do
   date picker. Layout no mobile vira stack vertical (`flex-col`); no
   `lg` vira grid de 5 colunas (mantido).
3. Trocar `gap-2.5` por `gap-3` no container dos filtros.
4. Adicionar `aria-label="Selecionar período"` no `Button` do
   `PopoverTrigger`.
5. Adicionar botão "Limpar" no popover ao lado dos presets quando
   `dateRange?.from` está definido. Limpa para `undefined`.
6. Placeholders:
   - "Selecionar vendedor" → "Todos os vendedores"
   - "Todas as tags" (mantém)
   - "Todos os segmentos" (mantém)
   - "Selecionar periodo" → "Selecionar período" (default só quando
     não há range; após selecionar, mostra o range formatado).
7. Botões de preset: "Ultimos 7/30 dias" → "Últimos 7/30 dias";
   "Todo periodo" → "Todo período".
8. **Auto-apply**: remover botão "Aplicar filtros". Cada mudança em
   select ou date range dispara `onApply` direto (usar `useEffect` que
   observa o estado consolidado). `isLoading` continua exposto pra
   feedback no parent.

### `apps/web/src/app/(app)/admin/leads/leads-panel.tsx`

1. Envolver o `Select` de vendedor num `<div className="px-4">` e
   trocar `className="mx-4 w-[calc(100%-2rem)] max-w-sm"` por
   `className="w-full max-w-sm"`.
2. Placeholder: "Selecionar vendedor" → "Todos os vendedores".
   (Apesar do select aqui exigir seleção, o placeholder é só visual
   inicial — manter consistência com stats.) **Decisão**: manter
   "Selecionar vendedor" porque aqui é gatilho obrigatório, não
   filtro de "todos". Não acentuar — já está ASCII puro.
3. `Pagination`: remover `href="#"` e `e.preventDefault()`. Substituir
   `PaginationPrevious`/`Next`/`Link` por versões só com `onClick`
   (mesmo padrão de `users-panel`).
4. Strings:
   - "Acoes" → "Ações" (`TableHead`)
   - "Abrir menu de acoes" → "Abrir menu de ações" (2 ocorrências)
   - "Lead excluido!" → "Lead excluído!"
   - "Nenhum vendedor selecionado" / "Selecione um vendedor no seletor
     acima para visualizar seus leads." (já acentuado, ok)
   - "Verifique sua conexao e tente novamente." → "Verifique sua
     conexão e tente novamente."
   - "Este vendedor ainda nao coletou nenhum lead." → "…ainda não
     coletou…"
   - "Essa acao nao pode ser desfeita." → "Essa ação não pode ser
     desfeita."

### `apps/web/src/app/(app)/admin/leads/admin-lead-card.tsx`

1. "Abrir menu de acoes" → "Abrir menu de ações".

### `apps/web/src/app/(app)/admin/leads/[id]/admin-lead-edit.tsx`

1. "Lead excluido!" → "Lead excluído!"
2. "Lead nao encontrado" → "Lead não encontrado"
3. "O lead solicitado nao existe ou foi excluido." → "…não existe ou
   foi excluído."

### `apps/web/src/app/(app)/admin/users/users-panel.tsx`

1. Strings:
   - "Usuario desativado/reativado com sucesso" → "Usuário…"
   - "Desativar Usuario" / "Reativar Usuario" → "Desativar usuário" /
     "Reativar usuário" (também tirar Title Case, alinhar com
     "Excluir Lead" → ver item de alert dialog em leads-panel; manter
     sentence case por consistência tipográfica do DESIGN.md).
   - "O usuario <strong>" → "O usuário <strong>" (2 lugares)
   - "perdera" → "perderá"
   - "voltara" → "voltará"
   - "Desativar usuario" (dropdown) → "Desativar usuário"
   - "Reativar usuario" (dropdown) → "Reativar usuário"
   - "Abrir menu de acoes" → "Abrir menu de ações" (2 lugares)
   - "Acoes" (TableHead) → "Ações"
   - "Proximo" → "Próximo" (prop `text` do `PaginationNext`)

### `apps/web/src/app/(app)/admin/users/admin-user-card.tsx`

1. "Abrir menu de acoes" → "Abrir menu de ações"
2. "Desativar usuario" → "Desativar usuário"
3. "Reativar usuario" → "Reativar usuário"

### `apps/web/src/app/(app)/admin/stats/stats-panel.tsx`

1. `font-semibold` (linha 92) → `font-medium`. DESIGN.md proíbe weight
   600/700.
2. "Sem dados para o periodo. Nao ha leads…" → "Sem dados para o
   período. Não há leads…"

### `apps/web/src/app/(app)/admin/sorteio/_components/sorteio-client.tsx`

1. Reordenar `STATE_OPTIONS`: mover `{ value: "ALL", label: "Todos os
   estados" }` para o início. Trocar label "Todos" por "Todos os
   estados".
2. `<SelectValue placeholder="Estado" />` → `placeholder="Todos os
   estados"`.

### Strings que **não** mudam

- Cópia já acentuada (`Estatísticas globais`, `Mostrando 1–20`, etc.).
- Abreviações intencionais (`Aguard. consentimento`, etc.).
- Termos técnicos sem versão acentuada (`role`, `Admin`, `WA ID`).

## Validação

Após cada commit:

```bash
bun run check          # ultracite/biome
bun run check-types    # turbo check-types
```

Manual: abrir `/admin/stats` em mobile (devtools) e confirmar que
todos os filtros aparecem; trocar um filtro e ver query refetch sem
clicar em botão; abrir `/admin/leads` e paginar.

## Plano de commits

1. `fix(admin/stats): sentinela "all" em Select + filtros visíveis no mobile`
2. `fix(admin/stats): auto-apply em filtros + botão limpar no date picker`
3. `style(admin/stats): font-medium em vez de font-semibold + gap-3`
4. `fix(admin/leads): Pagination sem href + wrapper px-4 no Select`
5. `fix(admin/sorteio): placeholder "Todos os estados" + ALL primeiro`
6. `style(admin): acentos PT-BR consistentes em todas as strings`

## Fora de escopo

- Toolbar única com chips de filtros ativos.
- Label visível nos selects (refactor de `Select` no `packages/ui`).
- Date picker com inputs de range editáveis.
- Refactor de paginação compartilhada entre admin/leads e admin/users.
- Substituir `Badge` `bg-primary/10 text-primary` no `StatusBadge` por
  variante customizada (verde sutil — funciona, decisão visual fica
  para iteração futura).
