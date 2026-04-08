# Redesign do Grau de Interesse (interestTag)

## Contexto

O seletor de grau de interesse atual usa 3 botões retangulares lado a lado com ícones de termômetro (`ThermometerSun`, `Thermometer`, `ThermometerSnowflake`). O design não é intuitivo — os ícones de termômetro são difíceis de diferenciar rapidamente e os botões retangulares não comunicam bem a metáfora quente/morno/frio.

Além disso, a lista de leads usa layout single-column, desperdiçando espaço no desktop.

## Decisões de Design

### Ícones

Substituir os ícones de termômetro por ícones intuitivos de temperatura do Lucide:

| Tag | Ícone antigo | Ícone novo | Cor |
|---|---|---|---|
| `quente` | `ThermometerSun` | `Flame` | Verde `#22c55e` |
| `morno` | `Thermometer` | `Sun` | Amarelo `#eab308` |
| `frio` | `ThermometerSnowflake` | `Snowflake` | Azul `#60a5fa` |

As cores permanecem as mesmas dos tokens CSS existentes (`tag-quente-*`, `tag-morno-*`, `tag-frio-*`).

### Seletor no Formulário (TagSelector)

- Substituir os 3 botões retangulares por **3 círculos** (52px) com o ícone centralizado e label abaixo.
- O círculo não-selecionado tem borda `#333` e fundo `#111`.
- O círculo selecionado ganha a cor da tag: borda com a cor, fundo translúcido, ícone colorido, label colorido.
- Manter `role="radiogroup"` e acessibilidade existente.

### Cards na Lista (LeadCard + AdminLeadCard)

- Substituir o badge de texto (`"Quente"`, `"Morno"`, `"Frio"`) por um **ícone redondo pequeno** (28px).
- Sem texto — a cor e o ícone comunicam o grau de interesse.
- O ícone fica no canto superior direito do card, como o badge atual.

### Filtro (TagFilter)

- Substituir os 4 botões de texto por: botão "Todos" (texto) + 3 ícones redondos (32px).
- O ícone selecionado ganha cor e fundo translúcido.
- O ícone não-selecionado tem borda e ícone sutis.
- Manter a lógica de filtragem existente.

### Layout da Lista — Grid Responsivo

**Lista do usuário** (`lead-list.tsx`):
- Substituir `<ul className="flex flex-col gap-4">` por CSS grid responsivo.
- Breakpoints: `grid-cols-1` (mobile) → `sm:grid-cols-2` (tablet) → `lg:grid-cols-3` (desktop).
- Manter a ordenação `createdAt` descending (mais novo primeiro) — já implementada em `queries.ts`.

**Admin** (`leads-panel.tsx`):
- O admin tem layout dual: cards mobile (`md:hidden`) + table desktop (`hidden md:block`).
- **Cards mobile**: converter `flex flex-col gap-4` para grid responsivo (`grid-cols-1 sm:grid-cols-2`).
- **Table desktop**: manter a table mas substituir o `Badge` na coluna "Tag" por `InterestIcon` size="sm".
- `AdminLeadCard` (mobile): badge texto → `InterestIcon` size="sm".

## Escopo de Arquivos

### Componente novo

- `apps/web/src/components/interest-icon.tsx` — Componente `InterestIcon` que renderiza o ícone redondo em diferentes tamanhos. Centraliza o `TAG_CONFIG` (ícone, cor, label) que hoje está **duplicado em 4 arquivos**.

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `apps/web/src/components/tag-selector.tsx` | Círculos redondos com Flame/Sun/Snowflake; usa `InterestIcon` |
| `apps/web/src/components/tag-filter.tsx` | "Todos" + 3 ícones redondos; usa `InterestIcon` |
| `apps/web/src/components/lead-card.tsx` | Badge de texto → `InterestIcon` size="sm"; remove `TAG_CONFIG` local |
| `apps/web/src/app/(app)/admin/leads/admin-lead-card.tsx` | Badge de texto → `InterestIcon` size="sm"; remove `TAG_CONFIG` local |
| `apps/web/src/app/(app)/leads/lead-list.tsx` | `<ul className="flex flex-col">` → `<ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">` |
| `apps/web/src/app/(app)/admin/leads/leads-panel.tsx` | Cards mobile: `flex-col` → grid; Table desktop: `Badge` → `InterestIcon`; remove `TAG_COLORS`/`TAG_LABELS` locais |

### Arquivos não alterados

- Schema Drizzle, Dexie, tipos, validação Zod — nenhuma mudança de dados.
- Cores CSS em `globals.css` — tokens `tag-quente-*`, `tag-morno-*`, `tag-frio-*` permanecem.

## InterestIcon — API do Componente

```tsx
interface InterestIconProps {
  tag: "quente" | "morno" | "frio";
  size?: "sm" | "md" | "lg";  // sm=28px (cards), md=32px (filtro), lg=52px (seletor)
  selected?: boolean;          // controla estado visual ativo
  className?: string;
}
```

O componente encapsula:
- Mapeamento tag → ícone Lucide (`Flame`, `Sun`, `Snowflake`)
- Mapeamento tag → classes CSS de cor (usando tokens existentes)
- Tamanhos predefinidos para cada contexto de uso

## Verificação

1. `bun run dev:web` — verificar visualmente:
   - Formulário de criação de lead: seletor com 3 círculos
   - Formulário de edição: mesmo seletor, valor pre-selecionado correto
   - Lista de leads: grid 3 colunas no desktop, ícone redondo nos cards
   - Filtro: "Todos" + 3 ícones, filtragem funcional
   - Admin leads: mesma aparência
   - Mobile: 1 coluna, cards adaptados
2. `bun run check-types` — sem erros de tipo
3. `bun run check` — lint ok
4. Testar criação/edição de lead para garantir que `interestTag` persiste corretamente no Dexie
