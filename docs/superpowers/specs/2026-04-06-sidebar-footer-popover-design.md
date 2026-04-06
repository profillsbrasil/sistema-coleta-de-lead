# Sidebar Footer → DropdownMenu

## Contexto

O footer da sidebar atualmente comprime 5 elementos numa linha horizontal (Avatar, Nome/Role, Sync Status, Theme Toggle, Sign Out). Isso cria sobrecarga visual e não segue o padrão administrativo convencional.

A mudança reorganiza o footer para seguir o padrão clássico de dashboards admin: a linha do footer vira um trigger clicável que abre um DropdownMenu acima com as ações secundárias.

## Design

### Footer (sempre visível)

```
[ [Avatar OQ] [Othavio Quiliao / Admin] [⌃ ChevronsUpDown] ] [🟢 Sync]
  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  DropdownMenuTrigger (clicável)                               Sibling (fora do trigger)
```

- O `DropdownMenuTrigger` envolve Avatar + Nome/Role + Chevron
- `SyncStatusIcon` fica como **sibling fora do trigger** (evita nesting de `<button>` dentro de `<button>` — `SyncStatusIcon` renderiza um `Button` via `TooltipTrigger render`)
- Avatar com gravatar + fallback de iniciais (sem mudança)
- Nome + role (sem mudança)
- Ícone `ChevronsUpDown` de lucide-react indica interatividade

### DropdownMenu (ao clicar)

```
┌─────────────────────────┐
│  👤  Minha Conta         │  → router.push("/account")
│─────────────────────────│
│  🌙  Tema Escuro         │  ← toggle light/dark
│─────────────────────────│
│  ↩  Sair                 │  ← variant="destructive"
└─────────────────────────┘
```

- Abre com `side="top"`, `align="start"`
- Largura explícita via className (ex: `w-56`) — não herdar `--anchor-width` do trigger
- 3 itens separados por `DropdownMenuSeparator`
- "Minha Conta" com ícone `User` — **usa `onClick` + `router.push("/account")`**, não `<Link>` (evita problemas de semântica `<a>` dentro de `menuitem`)
- "Tema Escuro/Claro" com ícone `Moon`/`Sun` — toggle inline, label muda conforme tema. **Mantém `mounted` guard** para evitar flicker de SSR
- "Sair" com ícone `LogOut` e `variant="destructive"`

## Componente a Usar

**`DropdownMenu`** de `packages/ui/src/components/dropdown-menu.tsx` — não `Popover`.

Motivos:
- Semântica correta: são itens de menu acionáveis, não conteúdo informativo
- `DropdownMenuItem` já suporta `variant="destructive"` para o "Sair"
- `DropdownMenuSeparator` para divisores
- Navegação por teclado nativa (arrow keys, Escape)
- É o padrão usado pelo sidebar demo do shadcn/ui

## Arquivo Modificado

**`apps/web/src/components/sidebar-user-menu.tsx`** — refatoração in-place, sem criar arquivos novos.

### Mudanças:

1. Wrapping de Avatar + Nome + Chevron com `DropdownMenu` + `DropdownMenuTrigger`
2. `SyncStatusIcon` fica como sibling do `DropdownMenu`, não dentro do trigger
3. Remover `Button` de theme toggle e sign out da linha principal
4. Adicionar `DropdownMenuContent` com `side="top"` e `className="w-56"` contendo:
   - `DropdownMenuItem` "Minha Conta" com `onClick={() => router.push("/account")}`
   - `DropdownMenuItem` para toggle de tema (`onClick` mantém lógica existente)
   - `DropdownMenuSeparator` entre itens
   - `DropdownMenuItem variant="destructive"` para sign out
5. Adicionar ícone `ChevronsUpDown` de lucide-react dentro do trigger
6. Manter `mounted` guard existente para o label do tema

### Imports Adicionados:

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@dashboard-leads-profills/ui/components/dropdown-menu";
import { ChevronsUpDown, User } from "lucide-react";
```

### Imports Removidos:

```tsx
// Button não é mais necessário neste componente
import { Button } from "@dashboard-leads-profills/ui/components/button";
```

## Rota /account

- Não será criada neste escopo
- O link usa `router.push("/account")` — rota futura
- Não há necessidade de fallback ou 404 handler especial

## Decisões do Review Adversarial

| Issue | Decisão |
|-------|---------|
| `SyncStatusIcon` renderiza `Button` → nesting inválido | Mover para fora do trigger, como sibling |
| `Link` dentro de `DropdownMenuItem` sem precedente | Usar `onClick` + `router.push` em vez de `<Link>` |
| Largura do menu herda `--anchor-width` | Definir `className="w-56"` explicitamente |
| `mounted` guard para tema | Manter existente |
| `icon mode` da sidebar | Não tratar — app usa `collapsible="offcanvas"` |
| Sign out limpa snapshot antes de signOut() | Fora de escopo desta task — bug preexistente, endereçar separadamente |

## Verificação

1. `bun run dev:web` e abrir http://localhost:3001
2. Verificar footer da sidebar mostra: `[Trigger: Avatar + Nome + Chevron] [Sync]`
3. Clicar no trigger → DropdownMenu abre acima com largura fixa
4. "Minha Conta" navega para /account
5. Theme toggle funciona (label muda entre "Tema Escuro"/"Tema Claro")
6. "Sair" faz sign out e redireciona para /login
7. Verificar em mobile (sheet sidebar) que o menu funciona
8. Verificar que `SyncStatusIcon` tooltip funciona independente do menu
9. `bun run check-types` passa sem erros
