# Design — Alinhar `lucide-react` entre `packages/ui` e o catalog

- **Issue:** [#21](https://github.com/profillsbrasil/sistema-coleta-de-lead/issues/21)
- **Origem:** `docs/tech-debt.md` item #3 (severidade alta)
- **Data:** 2026-05-19

## Problema

`lucide-react` está declarado em versões major divergentes no monorepo:

| Local | Declaração | Resolvido |
|---|---|---|
| `package.json` (catalog) | `^0.546.0` | 0.546.0 |
| `apps/web/package.json` | `catalog:` | 0.546.0 |
| `packages/ui/package.json` | `^1.6.0` | 1.16.0 |

O `bun.lock` carrega **duas versões em paralelo** (0.546.0 e 1.16.0). `apps/web`
renderiza ícones com 0.546.0; `packages/ui` com 1.16.0.

## Decisão

Alinhar tudo na versão **1.16.0**, subindo o catalog (em vez de fazer downgrade do
`packages/ui`). Mantém a versão mais recente como base única do monorepo.

## Auditoria de compatibilidade

A preocupação do issue era breaking changes entre 0.x e 1.0 — o changelog do Lucide
v1.0 anuncia remoção de aliases de ícones depreciados.

Auditoria realizada contra o `lucide-react@1.16.0` instalado:

- **`apps/web`:** 30 ícones distintos importados (`AlertTriangle`, `CheckCircle`,
  `Loader2`, `MoreVertical`, `CalendarDaysIcon`, etc.). **Todos existem no 1.16.0.**
  Os nomes "antigos" continuam exportados como aliases de compatibilidade
  (ex.: `CircleCheckBig as CheckCircle`, `TriangleAlert as AlertTriangle`,
  `LoaderCircle as Loader2`, `EllipsisVertical as MoreVertical`). Não foram
  removidos no 1.16.
- **`packages/ui`:** usa nomes com sufixo `Icon` (`CheckIcon`, `ChevronDownIcon`,
  `Loader2Icon`, `PanelLeftIcon`, `SearchIcon`, `XIcon`, etc.) — todos presentes.

**Conclusão:** a subida para 1.x não exige nenhuma mudança de código de ícone.

## Mudanças

1. `package.json` (raiz) — catalog: `"lucide-react": "^0.546.0"` → `"^1.16.0"`.
2. `packages/ui/package.json` — `"lucide-react": "^1.6.0"` → `"catalog:"`.
3. `apps/web/package.json` — já é `catalog:`, herda 1.16.0 sem mudança.
4. `bun install` — reescreve `bun.lock`, removendo a entrada duplicada 0.546.0.
5. `docs/tech-debt.md` — marcar item #3 como resolvido.

## Verificação

- `bun run check-types` — sem erros de tipo (cobre imports de ícone ausentes).
- `bun run build` — build completo do monorepo.
- `bun run test` — suíte Vitest verde.

Critério de sucesso: `bun.lock` contém apenas `lucide-react@1.16.0`; build e testes
passam; `apps/web` e `packages/ui` renderizam a mesma versão.

## Fora de escopo

- Atualizar `lucide-react` para versões posteriores a 1.16.0.
- Migrar imports para nomes canônicos do v1.0 (os aliases seguem válidos).
- Outros itens de `docs/tech-debt.md`.
