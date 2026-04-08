# Pencil UI Migration — Design Spec

## Contexto

Os designs de todas as telas do app (20 telas: 10 desktop + 10 mobile) foram criados no Pencil (`~/Work/pencil/coleta-de-leads.pen`) seguindo o design system Supabase-inspired documentado em `.design/`. O codigo atual ja esta ~80% alinhado com os designs — a migracao e de polish, nao de reestruturacao.

**Motivacao:** Alinhar a implementacao visual com a especificacao de design aprovada, garantindo que o app em producao corresponda exatamente ao que foi desenhado.

**Resultado esperado:** Todas as 20 telas (vendedor + admin, desktop + mobile) com aparencia identica aos designs do Pencil.

## Decisoes Tomadas

- **Tag colors:** Pencil e a fonte de verdade. Quente = verde (#22c55e), Morno = amarelo (#eab308), Frio = azul (#60a5fa). Mesmos valores para light e dark mode.
- **Card border-radius:** Mudar componente Card global de `rounded-xl` (12px) para `rounded-lg` (8px).
- **QR button no telefone:** Manter no form de lead (feature util em eventos, mesmo que nao apareca no Pencil).
- **Temas:** Manter dark + light. Pencil e referencia para dark mode.
- **Escopo:** Todas as 20 telas migradas de uma vez, em branch unica.

## Abordagem

Branch unica `feat/pencil-ui-migration` com 6 commits atomicos por fase, ordenados por risco crescente.

## Fase 1 — Tokens (~12 linhas, 1 arquivo)

**Arquivo:** `packages/ui/src/styles/globals.css`

Atualizar os 6 tokens de cor de tag em ambos os temas (`:root` e `.dark`):

| Token | Novo valor (ambos temas) |
|-------|-------------------------|
| `--tag-quente-bg` | `#16a34a1a` |
| `--tag-quente-text` | `#22c55e` |
| `--tag-morno-bg` | `#eab3081a` |
| `--tag-morno-text` | `#eab308` |
| `--tag-frio-bg` | `#3b82f61a` |
| `--tag-frio-text` | `#60a5fa` |

Nota: como os valores sao identicos para light e dark, o `:root` e `.dark` recebem os mesmos valores. As cores usam alpha (`1a` = ~10%) para o background, criando tint sutil automaticamente.

**Propagacao:** Todos os componentes que usam `bg-tag-*-bg` e `text-tag-*-text` (lead-card, tag-filter, tag-selector, admin tables, charts) herdam automaticamente.

## Fase 2 — Componentes Compartilhados (~5 arquivos)

### 2.1 Card (packages/ui)

**Arquivo:** `packages/ui/src/components/card.tsx`

- Mudar `rounded-xl` para `rounded-lg` no root do Card.
- Afeta todos os cards do app: lead cards, stat cards, admin cards, form cards, chart cards.

### 2.2 TagFilter

**Arquivo:** `apps/web/src/components/tag-filter.tsx`

- Estado inativo: substituir `border-border bg-background hover:bg-muted hover:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50` por `bg-input border-border hover:bg-input/80`.
- Remove a complexidade do dark override, unificando o visual.

### 2.3 LeadCard

**Arquivo:** `apps/web/src/components/lead-card.tsx`

- Nome do lead: `font-semibold` -> `font-medium` (peso 600 -> 500).
- Badge de tag: `rounded-md` -> `rounded-lg` (6px -> 8px).

### 2.4 Podium

**Arquivo:** `apps/web/src/components/podium.tsx`

- Ja alinhado com Pencil (avatar sizes 48/40/36px, bar heights 88/64/48px).
- Verificar: star icon amarelo (#eab308) no 1st place, border-primary no avatar do 1st place.

### 2.5 RankingList

**Arquivo:** `apps/web/src/components/ranking-list.tsx`

- Verificar spacing de rows (padding [10,0]) e progress bar styling.
- Ajustar se necessario para match Pencil.

### 2.6 PersonalStatsBar

**Arquivo:** `apps/web/src/components/personal-stats-bar.tsx`

- Verificar padding e layout contra Pencil (avatar + nome + rank badge + lead count + today count).

## Fase 3 — Telas Simples (~2 arquivos)

### 3.1 Login

**Arquivo:** `apps/web/src/components/login-card.tsx`

- Ja alinhado: Google usa variant `default` (bg-primary = verde), LinkedIn e Facebook usam `outline`.
- Verificar: tamanho do card (max-w-[400px]), spacing interno, texto do titulo e descricao.

### 3.2 Offline

**Arquivo:** `apps/web/src/app/(public)/offline/page.tsx`

- Ja alinhado: layout centrado, sem card, heading + description + link.
- Verificar: `text-2xl` = 24px (bate com Pencil), `text-sm` na description e link.

## Fase 4 — Admin Panels (~3 arquivos)

### 4.1 Stats Filters Mobile

**Arquivo:** `apps/web/src/app/(app)/admin/stats/stats-filters.tsx`

- Desktop (lg+): manter grid 5-col com todos os filtros + Popover calendar.
- Mobile (< lg): simplificar para Select dropdown unico (vendedor ou periodo) + botao "Aplicar" full-width.
- Referencia Pencil mobile: card com padding 12, gap 10, select dropdown + botao full width.

### 4.2 Admin Lead Card

**Arquivo:** `apps/web/src/app/(app)/admin/leads/admin-lead-card.tsx`

- Ajustar padding e spacing para match Pencil (padding 14, gap entre nome/telefone e tag badge).

### 4.3 Admin User Card

**Arquivo:** `apps/web/src/app/(app)/admin/users/admin-user-card.tsx`

- Ajustar para match Pencil: nome + role badge na top row, email muted, lead count.

## Fase 5 — LeadForm (~1 arquivo)

**Arquivo:** `apps/web/src/components/lead-form.tsx`

- Mobile gap: `gap-4` -> `gap-3 md:gap-4` (12px mobile, 16px desktop).
- Card radius: resolvido pelo Card global (Fase 2).
- QR button: MANTIDO.
- Grid 2-col desktop: ja existe (`grid-cols-1 md:grid-cols-2`).
- Max-width 672px: ja existe (`md:max-w-2xl`).
- Stacked mobile: ja existe.

## Fase 6 — Dashboard (~1 arquivo)

**Arquivo:** `apps/web/src/app/(app)/dashboard/dashboard.tsx`

- Verificar ordering: PersonalStatsBar (top) -> Podium (middle) -> Divider -> RankingList (bottom).
- Ajustar spacing/gap se necessario para match Pencil (gap 24px desktop, gap 16px mobile).

## O Que NAO Muda

- **Arquitetura offline/sync:** Dexie, syncQueue, sync engine — zero mudancas.
- **Auth:** Supabase clients, middleware, tRPC context — zero mudancas.
- **Shell layout:** Sidebar 256px, topbar 56px, bottom nav 64px — ja alinhados.
- **Service worker:** Nenhuma mudanca.
- **tRPC routers:** Nenhuma mudanca.
- **Schema Drizzle/banco:** Nenhuma mudanca.

## Verificacao

### Por fase:

1. **Tokens:** Verificar tag badges em `/leads` — cores verde/amarelo/azul em dark mode.
2. **Componentes:** Verificar Card radius 8px em qualquer pagina com cards. TagFilter active/inactive em `/leads`. LeadCard name weight e badge radius.
3. **Telas simples:** Comparar `/login` e `/offline` com Pencil screenshots.
4. **Admin:** Testar `/admin/stats` em viewport < 768px — filtros devem mostrar Select simples. Verificar cards em `/admin/leads` e `/admin/users`.
5. **LeadForm:** Criar novo lead em mobile — gap entre campos deve ser 12px. Criar em desktop — 2 colunas com gap 16px. Editar lead existente — mesma aparencia. QR button visivel no campo telefone.
6. **Dashboard:** Verificar ordering: stats bar -> podium -> ranking list. Gaps corretos.

### End-to-end:

- Testar todas as telas em dark mode (referencia principal).
- Testar todas as telas em light mode (verificar contraste dos novos tag colors com alpha).
- Testar responsive: desktop (1440px), tablet (768px), mobile (390px).
- Testar offline: criar lead offline, verificar que sync ainda funciona.
- `bun run check-types` — sem erros de tipo.
- `bun run build` — build sucesso.

## Arquivos Criticos

```
packages/ui/src/styles/globals.css              # Fase 1: tokens
packages/ui/src/components/card.tsx             # Fase 2: Card radius
apps/web/src/components/tag-filter.tsx          # Fase 2: inactive state
apps/web/src/components/lead-card.tsx           # Fase 2: name weight, badge radius
apps/web/src/components/podium.tsx              # Fase 2: verify podium details
apps/web/src/components/ranking-list.tsx        # Fase 2: verify ranking spacing
apps/web/src/components/personal-stats-bar.tsx  # Fase 2: verify stats bar
apps/web/src/components/lead-form.tsx           # Fase 5: mobile gap
apps/web/src/app/(app)/admin/stats/stats-filters.tsx  # Fase 4: mobile simplification
apps/web/src/app/(app)/admin/leads/admin-lead-card.tsx # Fase 4: spacing
apps/web/src/app/(app)/admin/users/admin-user-card.tsx # Fase 4: spacing
apps/web/src/app/(app)/dashboard/dashboard.tsx         # Fase 6: spacing
```
