# Design System Migration — Supabase-Inspired Theme

## Context

O app usa um tema shadcn/ui padrão com cores teal/cyan em oklch(). O DESIGN.md em `.design/DESIGN.md` define um design system inspirado no Supabase: dark-mode-native, emerald green (#3ecf8e), border hierarchy sem shadows, tipografia geométrica.

**Objetivo**: Migrar os design tokens, fontes e tema do app para seguir o DESIGN.md, preservando compatibilidade com todos os 55 componentes shadcn existentes.

**Motivação**: Criar identidade visual profissional e consistente com a estética Supabase, aproveitando que o app já é bem disciplinado no uso de tokens semânticos.

## Decisões Tomadas

| Decisão | Escolha |
|---------|---------|
| Fontes | Open-source: Plus Jakarta Sans + Source Code Pro (alternativa: Nunito, a validar visualmente) |
| Dark mode | Dual mode, dark como padrão (`defaultTheme="dark"`) |
| Color space | Migrar de oklch() para hex/hsl |
| Borders | Expandir para 4 níveis (subtle/default/prominent/accent) |
| Escopo | Fase 1: tokens + tema (sem mexer em componentes shadcn) |
| Brand color | Adotar verde Supabase (#3ecf8e) |
| Abordagem | Migração em Camadas (3 PRs sequenciais) |

## Arquitetura

### Como o tema funciona (Tailwind v4)

```
globals.css
├── :root { --background: ... }     ← valores de cor (MUDA)
├── .dark { --background: ... }     ← valores de cor (MUDA)
└── @theme inline {
    --color-background: var(--background)  ← mapeamento (NÃO MUDA)
    }
```

O `@theme inline` é agnóstico ao color space — ele faz `var(--background)` e o Tailwind resolve. Trocar oklch→hex nos `:root`/`.dark` "just works" sem mexer no @theme.

### Componentes shadcn

Os 55 componentes usam classes como `bg-background`, `text-foreground`, `border-border`. Eles herdam cores automaticamente dos tokens CSS. **Nenhum componente precisa ser editado** (exceto o bug fix no sidebar.tsx).

## PR 1: Infraestrutura + Bug Fix

**Impacto visual: zero.**

### 1.1 Bug fix — sidebar.tsx

**Arquivo**: `packages/ui/src/components/sidebar.tsx:483`

**Problema**: `shadow-[0_0_0_1px_hsl(var(--sidebar-border))]` envolve um valor oklch/hex em `hsl()`, produzindo cor inválida.

**Fix**: Trocar `hsl(var(--sidebar-border))` por `var(--sidebar-border)` (e mesmo para `hsl(var(--sidebar-accent))` no hover).

### 1.2 Novos tokens de border

Adicionar ao `globals.css` (`:root` e `.dark`) e ao `@theme inline`:

```css
/* Em .dark */
--border-subtle: #242424;
--border-prominent: #363636;
--border-accent: rgba(62, 207, 142, 0.3);

/* Em :root (light) */
--border-subtle: #f0f0f0;
--border-prominent: #d4d4d4;
--border-accent: rgba(0, 197, 115, 0.3);

/* Em @theme inline */
--color-border-subtle: var(--border-subtle);
--color-border-prominent: var(--border-prominent);
--color-border-accent: var(--border-accent);
```

### 1.3 Novos tokens de tag color

Adicionar ao `globals.css` e `@theme inline`:

```css
/* Em .dark */
--tag-quente-bg: #4a1515;
--tag-quente-text: #fca5a5;
--tag-morno-bg: #4a3415;
--tag-morno-text: #fcd34d;
--tag-frio-bg: #1e2a4a;
--tag-frio-text: #93c5fd;

/* Em :root (light) */
--tag-quente-bg: #fde8e8;
--tag-quente-text: #b91c1c;
--tag-morno-bg: #fef3c7;
--tag-morno-text: #92400e;
--tag-frio-bg: #dbeafe;
--tag-frio-text: #1e40af;

/* Em @theme inline */
--color-tag-quente-bg: var(--tag-quente-bg);
--color-tag-quente-text: var(--tag-quente-text);
--color-tag-morno-bg: var(--tag-morno-bg);
--color-tag-morno-text: var(--tag-morno-text);
--color-tag-frio-bg: var(--tag-frio-bg);
--color-tag-frio-text: var(--tag-frio-text);
```

### Arquivos modificados (PR 1)

- `packages/ui/src/styles/globals.css` — adicionar tokens
- `packages/ui/src/components/sidebar.tsx` — fix hsl() bug

## PR 2: Centralização das Tag Colors

**Impacto visual: idêntico ao atual** (os novos tokens terão valores equivalentes aos oklch hardcoded).

### Arquivos modificados (PR 2)

| Arquivo | Mudança |
|---------|---------|
| `apps/web/src/components/lead-card.tsx` | TAG_CONFIG: oklch → `bg-tag-quente-bg text-tag-quente-text` etc. |
| `apps/web/src/components/tag-filter.tsx` | FILTER_OPTIONS: oklch → tokens |
| `apps/web/src/components/tag-selector.tsx` | TAG_CONFIG: oklch → tokens |
| `apps/web/src/app/(app)/admin/leads/admin-lead-card.tsx` | TAG_CONFIG: oklch → tokens |
| `apps/web/src/app/(app)/admin/leads/leads-panel.tsx` | TAG_COLORS inline → `var(--tag-quente-text)` |
| `apps/web/src/app/(app)/dashboard/personal-dashboard.tsx` | chartConfig + classNames → tokens |
| `apps/web/src/app/(app)/admin/stats/stats-charts.tsx` | tagChartConfig → tokens |

### Padrão de substituição

**Antes** (em className):
```
bg-[oklch(0.936_0.032_17)] text-[oklch(0.45_0.18_17)] dark:bg-[oklch(0.3_0.06_17)] dark:text-[oklch(0.85_0.12_17)]
```

**Depois**:
```
bg-tag-quente-bg text-tag-quente-text
```

**Antes** (em style/chart config):
```js
color: "oklch(0.45 0.18 17)"
```

**Depois**:
```js
color: "var(--tag-quente-text)"
```

## PR 3: A Virada Visual

**Impacto visual: total.** Este é o PR que muda a aparência do app.

### 3.1 Paleta de cores — Dark mode (`.dark`)

| Token | Valor Atual | Novo Valor | Referência DESIGN.md |
|-------|-------------|------------|---------------------|
| `--background` | `oklch(0.145 0 0)` | `#171717` | Page background |
| `--foreground` | `oklch(0.985 0 0)` | `#fafafa` | Primary text |
| `--card` | `oklch(0.205 0 0)` | `#1c1c1c` | Card surface |
| `--card-foreground` | `oklch(0.985 0 0)` | `#fafafa` | Card text |
| `--popover` | `oklch(0.205 0 0)` | `#1c1c1c` | Popover surface |
| `--popover-foreground` | `oklch(0.985 0 0)` | `#fafafa` | Popover text |
| `--primary` | `oklch(0.437 0.078 188)` | `#3ecf8e` | Supabase green |
| `--primary-foreground` | `oklch(0.984 0.014 181)` | `#0f0f0f` | Text on green |
| `--secondary` | `oklch(0.274 0.006 286)` | `#2a2a2a` | Secondary surface |
| `--secondary-foreground` | `oklch(0.985 0 0)` | `#fafafa` | Secondary text |
| `--muted` | `oklch(0.269 0 0)` | `#262626` | Muted surface |
| `--muted-foreground` | `oklch(0.708 0 0)` | `#898989` | Muted text |
| `--accent` | `oklch(0.269 0 0)` | `#262626` | Accent surface |
| `--accent-foreground` | `oklch(0.985 0 0)` | `#fafafa` | Accent text |
| `--destructive` | `oklch(0.704 0.191 22)` | `#ef4444` | Error red |
| `--border` | `oklch(1 0 0 / 10%)` | `#2e2e2e` | Standard border |
| `--input` | `oklch(1 0 0 / 15%)` | `#363636` | Input border |
| `--ring` | `oklch(0.556 0 0)` | `#3ecf8e` | Focus ring (brand) |

### 3.2 Paleta de cores — Light mode (`:root`)

| Token | Valor Atual | Novo Valor |
|-------|-------------|------------|
| `--background` | `oklch(1 0 0)` | `#ffffff` |
| `--foreground` | `oklch(0.145 0 0)` | `#171717` |
| `--card` | `oklch(1 0 0)` | `#ffffff` |
| `--card-foreground` | `oklch(0.145 0 0)` | `#171717` |
| `--popover` | `oklch(1 0 0)` | `#ffffff` |
| `--popover-foreground` | `oklch(0.145 0 0)` | `#171717` |
| `--primary` | `oklch(0.511 0.096 186)` | `#00c573` |
| `--primary-foreground` | `oklch(0.984 0.014 181)` | `#ffffff` |
| `--secondary` | `oklch(0.967 0.001 286)` | `#f5f5f5` |
| `--secondary-foreground` | `oklch(0.21 0.006 286)` | `#171717` |
| `--muted` | `oklch(0.97 0 0)` | `#f5f5f5` |
| `--muted-foreground` | `oklch(0.556 0 0)` | `#737373` |
| `--accent` | `oklch(0.97 0 0)` | `#f5f5f5` |
| `--accent-foreground` | `oklch(0.205 0 0)` | `#171717` |
| `--destructive` | `oklch(0.577 0.245 27)` | `#dc2626` |
| `--border` | `oklch(0.922 0 0)` | `#e5e5e5` |
| `--input` | `oklch(0.922 0 0)` | `#e5e5e5` |
| `--ring` | `oklch(0.708 0 0)` | `#00c573` |

### 3.3 Chart tokens

| Token | Dark | Light |
|-------|------|-------|
| `--chart-1` | `#3ecf8e` | `#3ecf8e` |
| `--chart-2` | `#00c573` | `#00c573` |
| `--chart-3` | `#00a86b` | `#00a86b` |
| `--chart-4` | `#008f5d` | `#008f5d` |
| `--chart-5` | `#007650` | `#007650` |

### 3.4 Sidebar tokens

**Dark mode (`.dark`)**:

| Token | Novo Valor |
|-------|------------|
| `--sidebar` | `#1c1c1c` |
| `--sidebar-foreground` | `#fafafa` |
| `--sidebar-primary` | `#3ecf8e` |
| `--sidebar-primary-foreground` | `#0f0f0f` |
| `--sidebar-accent` | `#262626` |
| `--sidebar-accent-foreground` | `#fafafa` |
| `--sidebar-border` | `#2e2e2e` |
| `--sidebar-ring` | `#3ecf8e` |

**Light mode (`:root`)**:

| Token | Novo Valor |
|-------|------------|
| `--sidebar` | `#fafafa` |
| `--sidebar-foreground` | `#171717` |
| `--sidebar-primary` | `#00c573` |
| `--sidebar-primary-foreground` | `#ffffff` |
| `--sidebar-accent` | `#f5f5f5` |
| `--sidebar-accent-foreground` | `#171717` |
| `--sidebar-border` | `#e5e5e5` |
| `--sidebar-ring` | `#00c573` |

### 3.5 Border radius

```css
--radius: 0.5rem; /* 8px, de 0.625rem/10px */
```

### 3.6 Fontes — layout.tsx

**Remover**: Geist, Geist_Mono (redundantes)
**Substituir**: Inter → Plus Jakarta Sans (ou alternativa aprovada)
**Adicionar**: Source Code Pro

```tsx
import { Plus_Jakarta_Sans, Source_Code_Pro } from "next/font/google";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" });
const sourceCode = Source_Code_Pro({ subsets: ["latin"], variable: "--font-mono" });
```

**globals.css @theme inline**:
```css
--font-sans: "Plus Jakarta Sans Variable", sans-serif;
--font-mono: "Source Code Pro Variable", monospace;
--font-heading: var(--font-sans);
```

### 3.7 Theme default — providers.tsx

```tsx
<ThemeProvider
  attribute="class"
  defaultTheme="dark"     // era "system"
  enableSystem
  disableTransitionOnChange
>
```

### 3.8 Hardcoded colors residuais

Atualizar 4 instâncias de cores Tailwind raw:

| Arquivo | Antes | Depois |
|---------|-------|--------|
| `sync-status-icon.tsx:119` | `text-emerald-500` | `text-primary` |
| `sync-status-icon.tsx:146` | `bg-amber-500` | manter (semantic: warning) |
| `users-panel.tsx:628` | `bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200` | `bg-primary/10 text-primary` |
| `admin-user-card.tsx:56` | mesmo | `bg-primary/10 text-primary` |

### Arquivos modificados (PR 3)

- `packages/ui/src/styles/globals.css` — toda a paleta
- `apps/web/src/app/layout.tsx` — fontes
- `apps/web/src/components/providers.tsx` — defaultTheme
- `apps/web/src/components/sync-status-icon.tsx` — emerald→primary
- `apps/web/src/app/(app)/admin/users/users-panel.tsx` — green→primary
- `apps/web/src/app/(app)/admin/users/admin-user-card.tsx` — green→primary

## Fora de Escopo (Fase 2+)

- Migrar componentes shadcn para pill buttons (9999px radius)
- Adicionar Source Code Pro uppercase labels
- Aplicar border hierarchy (border-subtle/prominent) nos componentes
- Ajustar spacing para padrão Supabase (8px grid rigoroso)
- Migrar login page para estética Supabase
- Logo/branding visual

## Verificação

1. `bun run build` — sem erros de tipo ou compilação
2. `bun run dev:web` — verificar visualmente:
   - Dashboard (dark mode padrão)
   - Toggle para light mode
   - Login page
   - Sidebar
   - Lead cards com tags quente/morno/frio
   - Charts no dashboard
   - Admin pages
3. `bun run check-types` — sem regressões de tipo
4. Verificar WCAG AA contrast ratios nos tokens derivados do light mode
