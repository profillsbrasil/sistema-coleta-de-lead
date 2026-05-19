# packages/ui — Convenções locais

Arquitetura e stack: ver `../../CLAUDE.md`.

## Imports

- Sempre path-based: `@dashboard-leads-profills/ui/components/<nome>`.
- Não crie barrel files novos (`index.ts` reexportando módulos).
- `cn()` vem de `@dashboard-leads-profills/ui/lib/utils`.

## Componentes

- Primitives shadcn/ui path-based. Para adicionar um componente, use o MCP `shadcn` ou
  a CLI shadcn e ajuste os imports para o namespace do workspace.
- `DESIGN.md` na raiz é a referência de design system (tema dark Supabase-inspired,
  Geist Sans, tokens HSL).
