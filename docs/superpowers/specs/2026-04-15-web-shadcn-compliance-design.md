# Spec: apps/web — Conformidade com shadcn + Design System

**Data:** 2026-04-15
**Branch:** eager-neumann
**Escopo:** Auditoria e refactor de `apps/web` para 100% de conformidade com primitives shadcn e tokens de `globals.css` / `DESIGN.md`, sem alterar UX ou identidade visual.

---

## Contexto

Percepcao inicial do user: "componentes em `apps/web` reinventam botoes, nao usam shadcn, nao respeitam cores de `globals.css`".

Parte da percepcao estava incorreta — `packages/ui` ja tem 55 primitives shadcn e `apps/web` **nao duplica** nenhum. Mas uma auditoria exaustiva revelou violacoes reais:

1. **8 locais com `<button>` HTML raw** em vez de `<Button>` shadcn (dropdown triggers, clear-search, toggle patterns).
2. **~12 usos de cores Tailwind** fora do token system (amber-500, emerald-500, indigo-400, yellow-500, white, rgba hardcoded) — servem propositos semanticos (warning/success/rank/gold) que nao tem token correspondente.
3. **~20 usos de typography arbitraria** (`text-[10px]`, `text-[11px]`, `text-[13px]`, `text-[15px]`, `tracking-[2px]`) fora da escala padrao.
4. **1 shadow hardcoded** em `podium.tsx` com RGBA inline.

Meta: conformidade total sem regressao visual. Comportamento preservado 1:1.

## Non-goals

- Nao refatorar componentes custom legitimos (podium, fab, interest-icon, sync-status-icon, event-countdown, ranking-list, loader, stat-card) — apenas ajustar tokens/classes internas.
- Nao mover arquivos entre pastas (colocated `_components/`).
- Nao tocar `packages/ui/src/components/` primitives.
- Nao alterar comportamento, UX, texto, fluxos de dados.
- Nao tocar `photo-capture.tsx` raw `<input type="file" capture>` (excecao legitima).

---

## Arquivos afetados

### Tokens (1)
- [packages/ui/src/styles/globals.css](packages/ui/src/styles/globals.css)

### Raw `<button>` (7 arquivos, 8 locais)
- [apps/web/src/components/tag-selector.tsx](apps/web/src/components/tag-selector.tsx)
- [apps/web/src/components/tag-filter.tsx](apps/web/src/components/tag-filter.tsx)
- [apps/web/src/app/(app)/leads/lead-list.tsx](apps/web/src/app/(app)/leads/lead-list.tsx)
- [apps/web/src/app/(app)/admin/users/users-panel.tsx](apps/web/src/app/(app)/admin/users/users-panel.tsx)
- [apps/web/src/app/(app)/admin/users/admin-user-card.tsx](apps/web/src/app/(app)/admin/users/admin-user-card.tsx)
- [apps/web/src/app/(app)/admin/leads/leads-panel.tsx](apps/web/src/app/(app)/admin/leads/leads-panel.tsx)
- [apps/web/src/app/(app)/admin/leads/admin-lead-card.tsx](apps/web/src/app/(app)/admin/leads/admin-lead-card.tsx)

### Cores hardcoded (5 arquivos)
- [apps/web/src/components/sync-status-indicator.tsx](apps/web/src/components/sync-status-indicator.tsx)
- [apps/web/src/components/sync-status-icon.tsx](apps/web/src/components/sync-status-icon.tsx)
- [apps/web/src/components/global-header.tsx](apps/web/src/components/global-header.tsx)
- [apps/web/src/components/event-countdown.tsx](apps/web/src/components/event-countdown.tsx)
- [apps/web/src/components/podium.tsx](apps/web/src/components/podium.tsx)

### Typography arbitraria (~10 arquivos)
- global-header, podium, bottom-nav, stat-card, ranking-list, admin-user-card, event-countdown, sync-status-indicator

---

## Fase 1 — Tokens semanticos novos

Extender [packages/ui/src/styles/globals.css](packages/ui/src/styles/globals.css).

### Adicoes em `:root` (light)

```css
/* Status colors */
--warning: #eab308;
--warning-foreground: #fefce8;
--success: #22c55e;
--success-foreground: #f0fdf4;

/* Accents semanticos */
--gold: #eab308;
--rank-accent: #818cf8;

/* Effects */
--glow-primary: 0 0 16px rgba(62, 207, 142, 0.25);
```

### Adicoes em `.dark`

```css
--warning: #fbbf24;
--warning-foreground: #0f0f0f;
--success: #34d399;
--success-foreground: #0f0f0f;
--gold: #facc15;
--rank-accent: #a5b4fc;
--glow-primary: 0 0 16px rgba(62, 207, 142, 0.3);
```

### Adicoes em `@theme inline`

```css
--color-warning: var(--warning);
--color-warning-foreground: var(--warning-foreground);
--color-success: var(--success);
--color-success-foreground: var(--success-foreground);
--color-gold: var(--gold);
--color-rank-accent: var(--rank-accent);
--shadow-glow-primary: var(--glow-primary);
```

### Resultado

Classes Tailwind disponiveis em todo o monorepo: `bg-warning`, `text-warning`, `bg-success`, `text-success`, `fill-gold text-gold`, `text-rank-accent`, `shadow-glow-primary`.

### Verificacao Fase 1
- `bun run check-types` passa
- `bun run dev:web` compila sem erro de CSS
- Inspecionar em devtools que `--warning` resolve corretamente em light/dark

---

## Fase 2 — Raw `<button>` → shadcn

### 2.1 DropdownMenuTrigger (x4, mesmo pattern)

**Locais:**
- [users-panel.tsx:435](apps/web/src/app/(app)/admin/users/users-panel.tsx:435)
- [admin-user-card.tsx:118](apps/web/src/app/(app)/admin/users/admin-user-card.tsx:118)
- [leads-panel.tsx:338](apps/web/src/app/(app)/admin/leads/leads-panel.tsx:338)
- [admin-lead-card.tsx:73](apps/web/src/app/(app)/admin/leads/admin-lead-card.tsx:73)

**Antes:**
```tsx
<DropdownMenuTrigger
  render={
    <button
      aria-label="Abrir menu de acoes"
      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg hover:bg-muted"
      type="button"
    />
  }
>
  <MoreVertical className="size-4" />
</DropdownMenuTrigger>
```

**Depois:**
```tsx
<DropdownMenuTrigger asChild>
  <Button
    aria-label="Abrir menu de acoes"
    className="min-h-11 min-w-11"
    size="icon"
    type="button"
    variant="ghost"
  >
    <MoreVertical className="size-4" />
  </Button>
</DropdownMenuTrigger>
```

Adicionar import `Button` de `@dashboard-leads-profills/ui/components/button`.

### 2.2 Clear search X (lead-list.tsx:300)

**Antes:**
```tsx
<button
  aria-label="Limpar busca"
  className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
  onClick={() => setSearchTerm("")}
  type="button"
>
  <X className="size-4" />
</button>
```

**Depois:**
```tsx
<Button
  aria-label="Limpar busca"
  className="absolute top-1/2 right-3 -translate-y-1/2"
  onClick={() => setSearchTerm("")}
  size="icon-sm"
  type="button"
  variant="ghost"
>
  <X className="size-4" />
</Button>
```

### 2.3 tag-selector.tsx → ToggleGroup

**Antes:** 3 `<button role="radio">` dentro de `<div role="radiogroup">` com biome-ignore.

**Depois:**
```tsx
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@dashboard-leads-profills/ui/components/toggle-group";

export default function TagSelector({
  value,
  onChange,
  disabled = false,
}: TagSelectorProps) {
  return (
    <ToggleGroup
      aria-label="Tag de interesse"
      className="gap-5"
      disabled={disabled}
      onValueChange={(val) => {
        if (val) {
          onChange(val as InterestTag);
        }
      }}
      type="single"
      value={value}
    >
      {TAGS.map((tag) => {
        const config = getTagConfig(tag);
        const isSelected = value === tag;
        return (
          <ToggleGroupItem
            className="flex h-auto flex-col items-center gap-1.5 rounded-xl p-1 data-[state=on]:bg-transparent"
            key={tag}
            value={tag}
          >
            <InterestIcon selected={isSelected} size="lg" tag={tag} />
            <span
              className={cn(
                "font-medium text-xs transition-colors",
                isSelected ? config.textClass : "text-muted-foreground",
              )}
            >
              {config.label}
            </span>
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
```

Remover `biome-ignore lint/a11y/useSemanticElements`.

### 2.4 tag-filter.tsx → ToggleGroup

**Comportamento atual:** "todos" + 3 tags. Clicar em tag ativa desativa e volta pra "todos".

**Depois:**
```tsx
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@dashboard-leads-profills/ui/components/toggle-group";

export default function TagFilter({ value, onChange }: TagFilterProps) {
  return (
    <ToggleGroup
      aria-label="Filtrar por interesse"
      className="gap-2"
      onValueChange={(val) => onChange((val as FilterTag) || "todos")}
      type="single"
      value={value}
    >
      <ToggleGroupItem
        className="min-h-11 rounded-md border border-transparent px-3 font-medium text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=off]:border-border data-[state=off]:bg-input"
        value="todos"
      >
        Todos
      </ToggleGroupItem>
      {INTEREST_TAGS.map((tag) => (
        <ToggleGroupItem
          className="min-h-11 min-w-11 rounded-full"
          key={tag}
          value={tag}
        >
          <InterestIcon selected={value === tag} size="md" tag={tag} />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
```

Fallback vazio (`|| "todos"`) preserva o comportamento de "desmarcar volta pra todos".

### Verificacao Fase 2
- `bun run check` (ultracite) passa
- `bun run check-types` passa
- Manual: abrir DropdownMenu em `/admin/leads` (tabela e cards mobile), `/admin/users` (tabela e cards mobile), funcionam 1:1
- Manual: clear-search X em `/leads` funciona
- Manual: TagSelector no form de novo lead (`/leads/new`) e edicao (`/leads/[id]`) — troca de tag funciona
- Manual: TagFilter no `/leads` — filtra, tag ativa desmarca volta pra "todos"
- Nenhum `biome-ignore useSemanticElements` restante em apps/web

---

## Fase 3 — Cores hardcoded → tokens

**Pre-requisito:** Fase 1 concluida.

### 3.1 sync-status-indicator.tsx

```tsx
const STATE_DOT_COLORS: Record<string, string> = {
  synced: "bg-success",
  syncing: "bg-primary animate-pulse",
  pending: "bg-warning",
  offline: "bg-destructive",
  error: "bg-warning",
  retrying: "bg-warning animate-pulse",
  authExpired: "bg-destructive",
  stalled: "bg-destructive",
};
```

### 3.2 sync-status-icon.tsx

- `"text-amber-500 animate-spin"` → `"text-warning animate-spin"`
- `"text-amber-500"` → `"text-warning"`
- Badge: `"bg-amber-500 ... text-white"` → `"bg-warning ... text-warning-foreground"`

### 3.3 global-header.tsx

- `text-emerald-400` (linha 93) → `text-success`
- `text-indigo-400` (linha 138) → `text-rank-accent`
- `bg-amber-500` (linhas 204, 220) → `bg-warning`

### 3.4 event-countdown.tsx

- `text-amber-500` → `text-warning`

### 3.5 podium.tsx

- `fill-yellow-500 text-yellow-500` → `fill-gold text-gold`
- `shadow-[0_0_16px_rgba(62,207,142,0.25)]` → `shadow-glow-primary`

### Verificacao Fase 3
- `bun run check-types` passa
- Grep: nenhum `bg-amber-|text-amber-|bg-emerald-|text-emerald-|text-indigo-|fill-yellow-|text-yellow-|text-white` em `apps/web/src/**` (excecao permitida: nenhuma)
- Grep: nenhum `shadow-\[.*rgba` em `apps/web/src/**`
- Manual: comparar visualmente `/dashboard` (podium, header stats, live dot), `/leads` (sync indicator), `/admin` (sync icon badge) antes/depois. Diferenca so aceitavel dentro do shift de hex definido nos tokens.

---

## Fase 4 — Typography arbitraria → escala padrao

**Pre-requisito:** Fase 3 concluida.

### Mapa de substituicao

| Antes | Depois | Justificativa |
|---|---|---|
| `text-[9px]` | `text-xs` (12px) | +3px aceitavel |
| `text-[10px]` | `text-xs` | +2px aceitavel |
| `text-[11px]` | `text-xs` | +1px |
| `text-[13px]` | `text-sm` (14px) | +1px |
| `text-[15px]` | `text-base` (16px) | +1px |
| `text-[28px]` | `text-3xl` (30px) | +2px em stat-card |
| `tracking-[2px]` | `tracking-widest` | equivalente |
| `size-[5px]` | `size-1.5` (6px) | +1px, dot visual |
| `min-h-[44px]` | `min-h-11` | 11*4 = 44px, identico |
| `min-w-[44px]` | `min-w-11` | identico |
| `border-[3px]` | `border` custom | avaliar |

### Preservados (legitimos)

- `max-w-[400px]` (login-card) — dimensao layout card
- `max-w-[320px]` (qr-scanner) — dimensao video viewport
- `w-[110px]`, `w-[96px]`, `h-[88px]` (podium) — dimensoes do layout do podium
- `size-[30px]` (header avatar) — dimensao exata avatar
- `h-[72px]` (skeletons lead-list) — match altura lead-card
- `h-[160px]`, `h-[120px]` (dashboard skeletons) — match altura real

### Arquivos e substituicoes especificas

- **global-header.tsx**: `text-[10px]` x4 → `text-xs`; `text-[15px]` x2 → `text-base`; `text-[11px]` → `text-xs`
- **podium.tsx**: `text-[10px]` x2 → `text-xs`; `text-[11px]` x2 → `text-xs`; `tracking-[2px]` → `tracking-widest`
- **bottom-nav.tsx**: `text-[10px]` x2 → `text-xs`; `border-[3px]` — **manter** (spec visual legitimo do FAB mobile)
- **stat-card.tsx**: `text-[28px]` → `text-3xl`
- **ranking-list.tsx**: `text-[9px]` → `text-xs`; `text-[13px]` x2 → `text-sm`
- **admin-user-card.tsx**: `text-[13px]` → `text-sm`
- **event-countdown.tsx**: `text-[13px]` → `text-sm`
- **sync-status-indicator.tsx**: `text-[10px]` → `text-xs`; `size-[5px]` → `size-1.5`

### Verificacao Fase 4
- Grep: nenhum `text-\[\d+px\]` em `apps/web/src/**/*.tsx`
- Grep: nenhum `tracking-\[` em `apps/web/src/**/*.tsx`
- Grep: nenhum `min-h-\[44px\]|min-w-\[44px\]|min-h-\[48px\]` (substituidos por escala)
- Visual: `/dashboard`, `/leads`, `/admin/*`, `/login` — shift tipografico minimo aceitavel (1-3px)
- `bun run check` + `bun run check-types` passam

---

## Commits

Um commit por fase em Conventional Commits pt:

1. `feat(ui): adicionar tokens semanticos warning/success/gold/rank`
2. `refactor(web): substituir raw <button> por Button e ToggleGroup shadcn`
3. `refactor(web): mapear cores hardcoded para tokens semanticos`
4. `refactor(web): normalizar typography arbitraria para escala padrao`

---

## Verificacao end-to-end final

Apos Fase 4:

1. `bun run check-types` passa em toda a repo
2. `bun run check` (ultracite) passa sem warnings em `apps/web`
3. `bun run test` passa
4. `bun run build` passa
5. `bun run dev:web` na porta 3001
6. Percurso manual completo:
   - `/login` — LoginCard renderiza, tipografia ok
   - `/dashboard` — Podium animado com `shadow-glow-primary`, header stats com `text-success` no total, Star com `text-gold`, live dot `bg-warning`
   - `/leads` — Search clear X funciona (Button ghost icon), TagFilter ToggleGroup filtra, cards renderizam
   - `/leads/new` — TagSelector ToggleGroup troca tag, salva lead
   - `/leads/[id]` — Detail + TagSelector edit funciona
   - `/admin/leads` — Tabela desktop + cards mobile com DropdownMenu Button-based abrem e executam acoes
   - `/admin/users` — Tabela desktop + cards mobile com DropdownMenu funcionam, RoleBadge e StatusBadge renderizam
   - `/admin/stats` — panel/charts/filters OK
7. DevTools: toggle dark/light mode — todos os `bg-warning`/`text-success` mudam corretamente via tokens

---

## Riscos e mitigacoes

| Risco | Mitigacao |
|---|---|
| ToggleGroup muda data attributes de `aria-checked` para `data-state=on`; estilos atuais usam `isSelected` prop | Usar classes `data-[state=on]:` no ToggleGroupItem. Preservar `isSelected` prop apenas para InterestIcon filho que ja aceita. |
| tag-filter comportamento de desmarcar → "todos" depende de onValueChange receber "" | Testar manualmente. `ToggleGroup type="single"` emite string vazia ao desmarcar; fallback `|| "todos"` cobre. |
| Cores dark mode podem ter contraste diferente do original amber-500 | Tokens dark usam amber-400/emerald-400 calibrados para background dark `#171717` |
| Fase 4 text-[28px]→text-3xl (30px) e +2px visivel em stat-card titulo | Delta aceitavel. Comparar visualmente antes de commit. Se rejeitado, reverter so essa linha e manter `text-[28px]` como excecao documentada. |
| `lead-form.tsx` compartilhado entre 3 rotas (leads/new, leads/[id], admin/leads/[id]) — NAO TOCAR | Fase 2 nao modifica lead-form. Apenas TagSelector/TagFilter filhos. |
| Biome pode reclamar de mudancas em ordem de props (sort) | Rodar `bun run fix` antes de cada commit |

---

## Progresso

- [ ] Fase 1 — Tokens em globals.css
- [ ] Fase 2.1 — 4x DropdownMenuTrigger asChild + Button
- [ ] Fase 2.2 — Clear search Button
- [ ] Fase 2.3 — tag-selector ToggleGroup
- [ ] Fase 2.4 — tag-filter ToggleGroup
- [ ] Fase 3 — Cores → tokens
- [ ] Fase 4 — Typography → escala padrao
- [ ] Verificacao end-to-end manual
