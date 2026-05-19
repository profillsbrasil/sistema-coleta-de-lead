# Padronizar versão do TypeScript no monorepo via catalog

- **Issue:** #25
- **Origem:** `docs/tech-debt.md` item #7
- **Severidade:** alta
- **Data:** 2026-05-19

## Problema

A raiz declara `typescript@^6.0.3` enquanto os packages declaram `^5` (e
`packages/ui` declara `^5.9.3`). Bun pode resolver versões diferentes em
workspaces distintos, criando divergência de compilação não detectável sem CI.

Estado atual:

| Local | Versão TS declarada |
|---|---|
| `package.json` (raiz, `devDependencies`) | `^6.0.3` |
| `apps/web` | `^5` |
| `packages/api` | `^5` |
| `packages/auth` | `^5` |
| `packages/db` | `^5` |
| `packages/env` | `^5` |
| `packages/ui` | `^5.9.3` |

## Decisão

Padronizar todo o monorepo em **TypeScript 6.x**, alinhando os packages com a
versão já declarada na raiz. A versão única fica registrada no `catalog` do
`package.json` raiz, que já é o mecanismo usado para outras dependências
compartilhadas (`next`, `react`, `zod`, etc).

## Mudanças

### 1. Adicionar `typescript` ao catalog

`package.json` raiz, bloco `workspaces.catalog`:

```json
"typescript": "^6.0.3"
```

Mantém o range `^` consistente com as demais entradas do catalog.

### 2. Referenciar `catalog:` em todos os workspaces

Trocar a versão literal de `typescript` por `catalog:` em 7 arquivos:

- `package.json` (raiz, `devDependencies`): `^6.0.3` → `catalog:`
- `apps/web/package.json`: `^5` → `catalog:`
- `packages/api/package.json`: `^5` → `catalog:`
- `packages/auth/package.json`: `^5` → `catalog:`
- `packages/db/package.json`: `^5` → `catalog:`
- `packages/env/package.json`: `^5` → `catalog:`
- `packages/ui/package.json`: `^5.9.3` → `catalog:`

### 3. Re-resolver o lockfile

Rodar `bun install` para re-resolver `bun.lock` com a versão unificada.

### 4. Atualizar a dívida técnica

Remover o item #7 de `docs/tech-debt.md` (dívida resolvida).

## Fora de escopo

- Ajustes de `tsconfig` ou adoção de flags novas do TS 6 — só se o
  `check-types` acusar quebra.

## Verificação

- `bun install` conclui sem erro de resolução.
- `bun run check-types` passa nos 6 packages que estavam em `^5`. Este é o
  ponto de risco real do upgrade; quebras de compilação introduzidas pela
  subida para TS 6 devem ser tratadas antes de fechar o trabalho.
