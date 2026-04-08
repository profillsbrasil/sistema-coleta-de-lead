# Migração UI para Supabase Design System

## Context

O sistema de coleta de leads já tem uma estética parcialmente alinhada com Supabase (dark mode padrão, `--primary: #3ecf8e`), mas precisa de uma migração completa que inclui: alinhamento total dos tokens CSS, reestruturação da navegação por roles (vendedor vs admin), criação de um dashboard gamificado com pódio competitivo, e polimento dos componentes. O app é usado principalmente no **mobile** (vendedores em eventos/congressos), com desktop como uso secundário.

## Decisões Validadas

| Decisão | Escolha |
|---------|---------|
| Font | Plus Jakarta Sans → Geist (+ Geist Mono) |
| Tema | Dark + Light (manter ambos) |
| Background dark | #171717 → #0f0f0f (page), #171717 (cards) |
| Nav mobile | Bottom tabs fixos com FAB central "+" |
| Nav desktop | Sidebar estática (não colapsável) |
| Sync UI | Esconder de vendedores, visível só para admin |
| Dashboard | Merge personal + leaderboard → tela gamificada com pódio |
| Gamificação | Arena competitiva, transparência total (todos veem dados de todos) |
| Organização | Manter padrões existentes do sistema |

## Decomposição em 4 Sub-Projetos

Ordem: 1 → 2 → 3 → 4. Cada sub-projeto é deployável independentemente.

---

## Sub-projeto 1: CSS Tokens + Tipografia

**Objetivo:** Atualizar `globals.css` para alinhar todos os tokens com a spec Supabase. Maior impacto visual com menor risco — 1 arquivo principal propaga para 100% do app.

### Arquivo principal
`packages/ui/src/styles/globals.css`

### Mudanças de tokens (Dark mode)

| Token | Antes | Depois |
|-------|-------|--------|
| `--background` | #171717 | #0f0f0f |
| `--card` | #1c1c1c | #171717 |
| `--sidebar` | #1c1c1c | #171717 |
| `--secondary` | #2a2a2a | #262626 |
| `--input` | #363636 | #2e2e2e |
| `--primary` (light) | #00c573 | #3ecf8e |

### Tokens mantidos (já corretos)
- `--primary` dark: #3ecf8e
- `--border`: #2e2e2e
- `--border-subtle`, `--border-prominent`, `--border-accent`
- `--tag-quente-*`, `--tag-morno-*`, `--tag-frio-*`

### Tipografia

| Antes | Depois |
|-------|--------|
| `Plus Jakarta Sans Variable` | `Geist Variable` |
| `Source Code Pro Variable` | `Geist Mono Variable` |

Mudanças em:
- `packages/ui/src/styles/globals.css` — `--font-sans`, `--font-mono`
- `apps/web/src/app/layout.tsx` — imports de fonte (next/font ou CDN)

### Scroll theming (adicionar ao globals.css)
```css
* {
  scrollbar-width: thin;
  scrollbar-color: var(--border) var(--background);
}
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--background); }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 9999px; }
```

---

## Sub-projeto 2: Navegação + Roles

**Objetivo:** Experiências distintas por role. Vendedor vê UI simplificada sem sync. Admin vê tudo.

### Vendedor (mobile: bottom tabs, desktop: sidebar estática)
- **Ranking** (dashboard gamificado)
- **Leads** (lista pessoal)
- **+ (FAB)** (novo lead)

### Admin (mobile: bottom tabs + menu admin, desktop: sidebar estática)
- Mesmos 3 do vendedor na bottom nav (Ranking, +, Leads)
- Ícone de menu/hamburguer no header abre drawer com seção "Admin": Todos os Leads, Usuarios, Estatísticas
- Sync Status visível no drawer admin
- No desktop: sidebar estática mostra tudo (vendedor + admin sections)

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `apps/web/src/components/app-sidebar.tsx` | Desktop: sidebar estática sem colapso. Vendedor: 3 items. Admin: + seção admin com Leads/Users/Stats. |
| `apps/web/src/components/authenticated-app-shell.tsx` | Substituir `SidebarProvider` no mobile por bottom nav fixa. Manter sidebar para desktop via media query. |
| `apps/web/src/components/sidebar-user-menu.tsx` | `SyncStatusIcon` condicionado a `isAdmin`. Mostrar role abaixo do nome. |
| `apps/web/src/app/(app)/dashboard/leaderboard-tab.tsx` | `StalenessIndicator` condicionado a `isAdmin` (prop do parent). |
| `apps/web/src/components/sync-error-banner.tsx` | Quando usado, gatar com `isAdmin`. |
| **Novo**: `apps/web/src/components/bottom-nav.tsx` | Bottom nav mobile com 2 tabs (Ranking, Leads) + FAB central "+" |

### Bottom Nav Mobile

```
______________________________
     |         ___        |
| Ranking  |  | + |  | Leads |
|__________|  |___|  |_______|
```

- FAB "+" — 52px, `border-radius: 9999px`, fill `--primary`, `top: -12px` (levemente elevado), borda 3px cor da navbar
- Sem label no FAB
- Tabs: ícone Lucide 20px + label 10px
- `position: fixed; bottom: 0` com `safe-area-inset-bottom` para iOS
- Desktop `md:hidden` — no desktop usa sidebar estática

### Padrões mantidos
- Mesmo `isAdmin` check de `authenticated-app-shell.tsx` (line 80)
- Mesmo padrão condicional `{isAdmin && (...)}` de `app-sidebar.tsx` (line 104)
- Sync engine continua rodando silenciosamente para todos (offline-first)

---

## Sub-projeto 3: Dashboard Gamificado

**Objetivo:** Merge "Meu Dashboard" + "Leaderboard" numa tela única com experiência de arena competitiva.

### Layout da tela (mobile-first)

**1. Header compacto**
- Nome do evento (ex: "SP Tech 2026")
- Avatar + posição do vendedor (#4) + stats rápidos

**2. Pódio Top 3 (centro visual)**
- Layout 2-1-3 clássico com blocos de altura diferente
- #1: avatar 48px, border 2px `--primary`, glow `box-shadow: 0 0 16px rgba(62,207,142,0.25)`, estrela dourada
- #2: avatar 40px, border `#b4b4b4`
- #3: avatar 36px, border `#898989` 40%
- Background: gradient sutil `rgba(62,207,142,0.04)` no centro
- Dados: nome, leads count, pontos
- Animações:
  - Barras do pódio: scale-y 0→1 staggered (3o → 2o → 1o)
  - Avatars: scale + opacity com bounce suave
  - Estrela: rotate pulse contínuo
  - Glow do 1o: box-shadow pulse

**3. Ranking 4+ (lista scrollável)**
- Cada row: posição + avatar 24px + nome + leads count + pontos
- Progress bar relativa ao líder (width proporcional ao % do 1o lugar)
- Vendedor atual: progress bar `--primary`, posição em verde, sem background especial excessivo
- Demais: progress bar `#4d4d4d`, texto `--secondary-foreground`
- Animação: fade-in staggered por row

### Dados (API existente)
- `packages/api/src/routers/leaderboard.ts` — já retorna ranking
- Se `score` não existir na API, calcular client-side como `leads_count × 10` (simplificação inicial, pode evoluir depois)

### Arquivos

| Ação | Arquivo |
|------|---------|
| Reescrever | `apps/web/src/app/(app)/dashboard/page.tsx` — orquestra os 3 componentes |
| Novo | `apps/web/src/components/podium.tsx` — pódio top 3 com animações |
| Novo | `apps/web/src/components/ranking-list.tsx` — lista 4+ com progress bars |
| Novo | `apps/web/src/components/personal-stats-bar.tsx` — barra header compacta |
| Deprecar | `apps/web/src/app/(app)/dashboard/personal-dashboard.tsx` (absorvido) |
| Deprecar | `apps/web/src/app/(app)/dashboard/leaderboard-tab.tsx` (absorvido) |
| Manter | `packages/api/src/routers/leaderboard.ts` (dados existem) |

### Desktop
No desktop (md+), a mesma tela renderiza com mais espaço horizontal:
- Pódio pode ter avatars maiores
- Ranking list com colunas mais largas
- Content area ao lado da sidebar estática

---

## Sub-projeto 4: Component Polish

**Objetivo:** Alinhar componentes individuais com a estética Supabase. Baixo risco, refinamento.

### Mudanças

| Componente | Mudança |
|-----------|---------|
| `packages/ui/src/components/button.tsx` | Adicionar variant `pill` com `border-radius: 9999px`, padding `8px 32px`. Usar em CTAs primários. |
| Componentes com shadow | Grep por `shadow` e substituir por border hierarchy. Manter depth via `--border` / `--border-prominent`. |
| `apps/web/src/components/stat-card.tsx` | Padding 16px compacto, sem divisores internos. |
| `apps/web/src/components/lead-card.tsx` | Border `--border`, sem shadow. |
| Forms (`lead-form.tsx`) | Input radius 6px consistente, border `--input`. |
| `apps/web/src/components/fab.tsx` | Remover — funcionalidade absorvida pela bottom nav (FAB central). |

### Padrões mantidos
- Modificar componentes existentes, não criar novos wrappers
- Manter imports path-based de `@dashboard-leads-profills/ui/*`
- Manter `cn()` para composição de classes

---

## Verificação por Sub-projeto

### SP1: CSS Tokens
1. `bun run dev:web` — verificar visual dark/light mode
2. Verificar contraste de texto nos dois temas
3. Confirmar font Geist renderizando
4. Grep por hex hardcoded em componentes (não deveria haver)

### SP2: Navegação + Roles
1. Login como vendedor — deve ver só Ranking/Leads/+ na bottom nav
2. Login como admin — deve ver sidebar completa com seção admin + sync icon
3. Resize para desktop — bottom nav some, sidebar aparece
4. `SyncStatusIcon` invisível para vendedor
5. Sync engine ainda funciona silenciosamente (criar lead offline, verificar IndexedDB)

### SP3: Dashboard Gamificado
1. Verificar pódio com dados reais do leaderboard
2. Verificar highlight do vendedor logado na lista
3. Verificar animações (scale, fade, pulse)
4. Testar scroll suave no ranking list
5. Testar responsivo: mobile (320px) → tablet → desktop
6. Verificar que dados completos aparecem para todos (transparência)

### SP4: Component Polish
1. Verificar pill buttons nos CTAs
2. Grep por `shadow` — deve retornar zero ou quase zero resultados
3. Verificar stat-card compacto
4. Verificar lead-card sem shadow
5. `bun run check-types` passa
6. `bun run build` passa
