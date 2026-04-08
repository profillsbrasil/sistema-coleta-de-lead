# Supabase-Inspired Design System — Pencil Implementation

## Context

O projeto sistema-coleta-de-lead usa um design system inspirado no Supabase (`.design/DESIGN.md`) mas o arquivo Pencil (`pencil-shadcn.pen`) contém componentes shadcn genéricos em Light mode que não refletem essa identidade visual. O objetivo é recriar o design system do zero no Pencil, fiel à estética Supabase dark-mode-native com verde esmeralda, usando os componentes como building blocks reutilizáveis para composição de telas futuras.

## Decisões Validadas

| Decisão | Escolha |
|---------|---------|
| Escopo | Apagar tudo, recriar do zero |
| Font primária | Geist Sans |
| Font mono | Geist Mono |
| Tema | Dark + Light (variáveis com tema Mode) |
| Cor brand | Supabase Green #3ecf8e / #00c573 |
| Componentes | Kit Completo (~25 componentes) |
| Organização | Catálogo de Referência (frame único, seções organizadas) |
| Ícones | Lucide apenas (icon_font, iconFontFamily: "lucide"), nunca emojis |
| Tamanho ícones | 18-20px sidebar/cards, 16px buttons/dropdowns, 14px breadcrumbs, 22-24px modals/alerts |

## 1. Estrutura do Canvas

Um frame principal `"Supabase Design System"` com `layout: "vertical"`, background `$--background`, contendo seções organizadas verticalmente:

```
Supabase Design System (frame, ~3200x4000)
├── Color Tokens (visual reference)
├── Typography Scale
├── Buttons
├── Cards
├── Form Inputs
├── Form Controls
├── Data Display (Table, Badges, Avatar, Progress)
├── Navigation (Sidebar, Tabs, Breadcrumbs, Pagination)
└── Feedback (Alert, Tooltip, Modal, Dialog, Dropdown)
```

Cada componente reutilizável tem `reusable: true` para ser instanciado via `ref` em composições futuras.

## 2. Variáveis (themes: Mode = Dark | Light)

### Surfaces

| Variável | Dark | Light |
|----------|------|-------|
| `--background` | #0f0f0f | #fafafa |
| `--card` | #171717 | #ffffff |
| `--secondary` | #262626 | #f5f5f5 |
| `--muted` | #262626 | #f5f5f5 |
| `--popover` | #171717 | #ffffff |
| `--sidebar` | #171717 | #fafafa |
| `--sidebar-accent` | #262626 | #f4f4f4 |

### Text

| Variável | Dark | Light |
|----------|------|-------|
| `--foreground` | #fafafa | #171717 |
| `--card-foreground` | #fafafa | #171717 |
| `--secondary-foreground` | #b4b4b4 | #525252 |
| `--muted-foreground` | #898989 | #737373 |
| `--popover-foreground` | #fafafa | #171717 |
| `--sidebar-foreground` | #fafafa | #171717 |
| `--sidebar-accent-foreground` | #fafafa | #171717 |

### Brand

| Variável | Dark | Light |
|----------|------|-------|
| `--primary` | #3ecf8e | #3ecf8e |
| `--primary-foreground` | #0f0f0f | #0f0f0f |
| `--ring` | #3ecf8e | #3ecf8e |
| `--sidebar-primary` | #3ecf8e | #3ecf8e |
| `--sidebar-primary-foreground` | #0f0f0f | #0f0f0f |

### Borders

| Variável | Dark | Light |
|----------|------|-------|
| `--border` | #2e2e2e | #e5e5e5 |
| `--border-subtle` | #242424 | #efefef |
| `--border-prominent` | #363636 | #d4d4d4 |
| `--brand-border` | #3ecf8e4d | #3ecf8e40 |
| `--input` | #2e2e2e | #e5e5e5 |
| `--sidebar-border` | #2e2e2e | #e5e5e5 |
| `--sidebar-ring` | #3ecf8e | #3ecf8e |

### Semantic

| Variável | Dark | Light |
|----------|------|-------|
| `--destructive` | #e7000b | #e7000b |
| `--success` | #3ecf8e | #3ecf8e |
| `--warning` | #eab308 | #eab308 |

### Utility

| Variável | Valor |
|----------|-------|
| `--white` | #ffffff |
| `--black` | #000000 |

## 3. Tipografia

Font primária: Geist Sans (fallback: system-ui, sans-serif)
Font mono: Geist Mono (fallback: monospace)

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notas |
|------|------|------|--------|-------------|----------------|-------|
| Display Hero | Geist Sans | 72px | 400 | 1.00 | normal | Compressão máxima, assinatura visual |
| Section Heading | Geist Sans | 36px | 400 | 1.25 | normal | Títulos de seção |
| Card Title | Geist Sans | 24px | 400 | 1.33 | -0.16px | Negative tracking sutil |
| Sub-heading | Geist Sans | 18px | 400 | 1.56 | normal | Subtítulos |
| Body | Geist Sans | 16px | 400 | 1.50 | normal | Texto padrão |
| Nav Link | Geist Sans | 14px | 500 | 1.43 | normal | Único uso de 500 fora de buttons |
| Button | Geist Sans | 14px | 500 | 1.14 | normal | Labels de botão |
| Caption | Geist Sans | 14px | 400 | 1.43 | normal | Metadata, tags |
| Small | Geist Sans | 12px | 400 | 1.33 | normal | Footer, fine print |
| Code Label | Geist Mono | 12px | 400 | 1.33 | 1.2px | text-transform: uppercase |

**Regras**: weight 400 padrão, 500 apenas para buttons e nav. Sem bold (700). Hero LH 1.00 é a assinatura.

## 4. Componentes

### 4.1 Buttons (6 variantes + icon variants)

**Primary Pill**
- fill: `$--background` (dark: #0f0f0f)
- text: `$--foreground` (#fafafa)
- border: 1px solid `$--foreground`
- radius: 9999px
- padding: 8px 32px
- font: 14px weight 500

**Secondary Pill**
- fill: `$--background`
- text: `$--foreground`
- border: 1px solid `$--border`
- radius: 9999px
- padding: 8px 32px
- opacity: 0.8

**Brand Pill**
- fill: `$--primary` (#3ecf8e)
- text: `$--primary-foreground` (#0f0f0f)
- border: 1px solid `$--primary`
- radius: 9999px
- padding: 8px 32px

**Outline**
- fill: transparent
- text: `$--foreground`
- border: 1px solid `$--border`
- radius: 6px
- padding: 8px 16px

**Ghost**
- fill: transparent
- text: `$--foreground`
- border: 1px solid transparent
- radius: 6px
- padding: 8px 16px

**Destructive**
- fill: `$--destructive`
- text: `$--white`
- radius: 6px
- padding: 8px 16px

**Large variants**: padding 8px 24px, icon 24px
**Icon Button variants**: padding 8px, square

### 4.2 Cards (4 variantes)

Todas: fill `$--card`, border 1px solid `$--border`, radius 8px, sem shadows.

**Card (base)**: 3 slots — Header (padding 16px), Content (padding 16px), Actions (padding 16px). Border-bottom `$--border-subtle` entre slots.

**Card Plain (Stats)**: Padding 16px compacto. Layout: label + icon (topo) → número grande (28px) → badge de variação. Sem divisores internos.

**Card Action**: Label → descrição → CTA button outline.

**Card Accent**: Mesma estrutura, mas border `$--brand-border` (green/30%).

### 4.3 Form Inputs (5 variantes)

Todas: bg `$--card`, border 1px solid `$--input`, radius 6px, padding 10px 12px.

- **Input Group**: label (14px 500) + input (Default/Filled)
- **Textarea Group**: label + textarea (height 80px)
- **Select Group**: label + trigger com chevron-down
- **Combobox**: label + trigger com search
- **Input OTP Group**: label + OTP slots

### 4.4 Form Controls

- **Checkbox**: Checked = fill `$--primary`, icon check 12px white. Unchecked = border `$--input`.
- **Radio**: Selected = border `$--input`, inner dot `$--primary`. Unselected = border only.
- **Switch**: On = bg `$--primary`, thumb white. Off = bg `$--input`, thumb `$--muted-foreground`.

### 4.5 Data Display

**Badges** (4 variantes):
- Default: fill `$--primary`, text `$--primary-foreground`, radius 16px
- Secondary: fill `$--secondary`, text `$--foreground`
- Destructive: fill `$--destructive`, text `$--white`
- Outline: border `$--border`, text `$--foreground`

**Avatar** (2 variantes):
- Text: fill `$--muted`, radius 9999px, 40x40, initials 14px 600
- Image: fill image, radius 9999px, 40x40

**Progress**: bg `$--secondary`, bar `$--primary`, radius 9999px, height 8px

**Table**: border `$--border`, radius 8px, fill `$--background`.
- Column Header: padding 12px, text `$--muted-foreground`
- Row: border-bottom `$--border-subtle`
- Cell: padding 12px, text `$--foreground`

**Data Table**: Header (search input + action buttons) + Table + Footer (count + pagination)

### 4.6 Navigation

**Sidebar**: width 256px, fill `$--sidebar`, border-right `$--sidebar-border`.
- Header: logo (24x24 green square) + app name
- Section Title: 12px uppercase `$--muted-foreground`
- Item Active: fill `$--sidebar-accent`, radius 6px, icons Lucide 18px
- Item Default: no fill, text `$--secondary-foreground`
- Footer: avatar + username

**Tabs**: container fill `$--secondary`, radius 6px, padding 4px.
- Active: fill `$--card`, radius 4px, text `$--foreground`
- Inactive: text `$--muted-foreground`

**Breadcrumbs**: items separated by chevron-right (14px). Current = `$--foreground`, previous = `$--muted-foreground`.

**Pagination**: Previous/Next ghost buttons + page numbers. Active = fill `$--card`, border `$--border`, radius 6px.

### 4.7 Feedback

**Alert** (2 variantes):
- Default: border `$--border`, icon info (Lucide, 20px, `$--foreground`)
- Destructive: border `$--destructive`, icon triangle-alert (Lucide, 20px, `$--destructive`)

**Tooltip**: fill `$--popover`, border `$--border`, radius 6px, padding 6px 12px

**Dropdown**: fill `$--popover`, border `$--border`, radius 6px, padding 4px.
- Title: 12px `$--muted-foreground`
- Item: 14px `$--foreground`, hover fill `$--secondary`, icons Lucide 16px
- Divider: border-top `$--border-subtle`
- Destructive item: text `$--destructive`

**Modal** (3 variantes):
- Left: título left-aligned + descrição + action buttons
- Center: título center-aligned
- Icon: icon circle (48px, fill `$--secondary`) + título + actions

**Dialog**: Card base com título 18px weight 400 + descrição 14px `$--muted-foreground` + Continue/Cancel buttons

## 5. Regras de Profundidade (sem shadows)

| Level | Tratamento | Uso |
|-------|-----------|-----|
| 0 (Flat) | border `$--border` (#2e2e2e) | Estado padrão |
| 1 (Interactive) | border `$--border-prominent` (#363636) | Hover, interactive |
| 2 (Focus) | ring `$--ring` (#3ecf8e) | Focus states |
| 3 (Accent) | border `$--brand-border` (green/30%) | Elementos destacados |

## 6. Ícones

- Font: Lucide exclusivamente (`iconFontFamily: "lucide"`)
- **Nunca** usar emojis
- Tamanhos proporcionais ao contexto:
  - 14px: breadcrumb separators, inline small
  - 16px: dropdown items, button icons (small)
  - 18px: sidebar items, card header icons
  - 20px: alert icons, card stat icons, standalone
  - 22-24px: modal icons, hero elements
- Stroke width: 1.5 (padrão Lucide)

## 7. Border Radius Scale

| Valor | Uso |
|-------|-----|
| 4px | Checkbox, inner tab active, dropdown item hover |
| 6px | Ghost/outline buttons, inputs, sidebar items, tooltips, dropdowns |
| 8px | Cards, tables, alerts, modals |
| 16px | Badges |
| 9999px | Primary/secondary pill buttons, tabs container, avatars, progress, switch, radio |

## 8. Responsivo / Mobile

Breakpoint principal: 600px (Supabase usa mobile-first com breakpoint único).

### Comportamento mobile dos componentes

| Componente | Desktop | Mobile (<600px) |
|-----------|---------|-----------------|
| Buttons Pill | inline, padding 8px 32px | full-width, stacked |
| Cards grid | 2-4 colunas | single column, stacked |
| Sidebar | fixa lateral 256px | sheet/drawer overlay |
| Navigation | horizontal links | hamburger menu |
| Data Table | colunas visíveis | scroll horizontal ou colunas priorizadas |
| Tabs | horizontal | horizontal scroll |
| Modal | centered 360-480px | full-width com padding |
| Section spacing | 90-128px | 48-64px |

### No Pencil

Usar theme axis `Device: ["Desktop", "Phone"]` para variantes que mudam entre breakpoints:
- Sidebar width: 256px (Desktop) → full-width sheet (Phone)
- Button width: fit_content (Desktop) → fill_container (Phone)
- Cards: horizontal layout (Desktop) → vertical stacked (Phone)

Componentes base são os mesmos — apenas layout e sizing mudam via theme.

## 9. Implementação no Pencil

### Ordem de execução

1. **Limpar canvas** — deletar todos os nodes existentes (MzSDs, nSNTs, TZ4am, 6LMCW, prompts)
2. **Definir variáveis** — criar todas as variáveis com valores Dark/Light via document.variables
3. **Criar frame container** — "Supabase Design System" com layout vertical, fill `$--background`, theme Mode: Dark
4. **Seção Color Tokens** — swatches visuais das cores para referência
5. **Seção Typography** — exemplos de cada role tipográfico
6. **Seção Buttons** — todos os 6+ variantes como componentes reusable
7. **Seção Cards** — 4 variantes reusable
8. **Seção Form Inputs** — 5 variantes reusable
9. **Seção Form Controls** — checkbox, radio, switch reusable
10. **Seção Data Display** — table, badges, avatar, progress reusable
11. **Seção Navigation** — sidebar, tabs, breadcrumbs, pagination reusable
12. **Seção Feedback** — alert, tooltip, dropdown, modal, dialog reusable
13. **Verificação visual** — screenshot de cada seção para validar

### Detalhes técnicos Pencil

- Temas no document: `{ "Mode": ["Dark", "Light"] }` (remover Accent e Base)
- Variáveis usam array de valores com theme overrides
- Todos os componentes usam variáveis ($-prefixed), nunca hex direto
- Componentes com `reusable: true` para instanciação via `ref`
- Text sempre com `fill` property (text não tem cor por padrão no .pen)
- Ícones via `icon_font` com `iconFontFamily: "lucide"`
- Layout flex para tudo exceto quando posição absoluta é necessária

## 10. Verificação

1. `get_screenshot` de cada seção após criação
2. Verificar que variáveis respondem ao toggle Dark/Light
3. Confirmar que todos os componentes são `reusable: true`
4. Validar que nenhum hex hardcoded existe nos componentes (tudo via variáveis)
5. Verificar proporção de ícones Lucide em cada contexto
6. Confirmar zero emojis no canvas inteiro
