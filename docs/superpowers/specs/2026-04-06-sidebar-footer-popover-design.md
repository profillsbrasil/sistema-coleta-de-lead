# Sidebar Footer → DropdownMenu

## Contexto

O footer da sidebar atualmente comprime 5 elementos numa linha horizontal (Avatar, Nome/Role, Sync Status, Theme Toggle, Sign Out). Isso cria sobrecarga visual e não segue o padrão administrativo convencional.

A mudança reorganiza o footer para seguir o padrão clássico de dashboards admin: a linha do footer vira um trigger clicável que abre um DropdownMenu acima com as ações secundárias.

## Design

### Footer (sempre visível)

```
[Avatar OQ] [Othavio Quiliao / Admin] [🟢 Sync] [⌃ ChevronsUpDown]
```

- Toda a linha é um `DropdownMenuTrigger`
- Avatar com gravatar + fallback de iniciais (sem mudança)
- Nome + role (sem mudança)
- `SyncStatusIcon` permanece visível no footer (info crítica offline-first)
- Ícone `ChevronsUpDown` de lucide-react indica interatividade

### DropdownMenu (ao clicar)

```
┌─────────────────────────┐
│  👤  Minha Conta         │  → Link para /account
│─────────────────────────│
│  🌙  Tema Escuro         │  ← toggle light/dark
│─────────────────────────│
│  ↩  Sair                 │  ← variant="destructive"
└─────────────────────────┘
```

- Abre com `side="top"`, `align="start"`
- 3 itens separados por `DropdownMenuSeparator`
- "Minha Conta" com ícone `User` — link para `/account` (rota futura, não será criada agora)
- "Tema Escuro/Claro" com ícone `Moon`/`Sun` — toggle inline, label muda conforme tema
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

1. Wrapping da linha do footer com `DropdownMenu` + `DropdownMenuTrigger`
2. Remover `Button` de theme toggle e sign out da linha principal
3. Adicionar `DropdownMenuContent` com `side="top"` contendo:
   - `DropdownMenuItem` com link para `/account` (usa `Link` do Next.js)
   - `DropdownMenuItem` para toggle de tema (onClick mantém lógica existente)
   - `DropdownMenuSeparator` entre itens
   - `DropdownMenuItem variant="destructive"` para sign out
4. Adicionar ícone `ChevronsUpDown` de lucide-react no lugar dos botões removidos

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
import Link from "next/link";
```

### Imports Removidos:

```tsx
// Button não é mais necessário neste componente
import { Button } from "@dashboard-leads-profills/ui/components/button";
```

## Rota /account

- Não será criada neste escopo
- O link aponta para `/account` — rota futura
- Não há necessidade de fallback ou 404 handler especial

## Verificação

1. `bun run dev:web` e abrir http://localhost:3001
2. Verificar footer da sidebar mostra: Avatar + Nome + Sync + Chevron
3. Clicar no footer → DropdownMenu abre acima
4. "Minha Conta" navega para /account
5. Theme toggle funciona (label muda entre "Tema Escuro"/"Tema Claro")
6. "Sair" faz sign out e redireciona para /login
7. Verificar em mobile (sheet sidebar) que o menu funciona
8. `bun run check-types` passa sem erros
