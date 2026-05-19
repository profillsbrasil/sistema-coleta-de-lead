# Padronizar TypeScript via catalog — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unificar a versão do TypeScript em todo o monorepo numa única entrada do catalog do Bun, eliminando a divergência major (raiz `^6.0.3` vs packages `^5`).

**Architecture:** O `package.json` raiz ganha uma entrada `typescript` no bloco `workspaces.catalog`. Os 7 `package.json` (raiz + 6 packages) passam a referenciar `catalog:` em vez de versões literais. `bun install` re-resolve o lockfile para uma única versão TS 6.x.

**Tech Stack:** Bun workspaces (catalog), TypeScript 6.x, Turborepo.

---

### Task 1: Adicionar `typescript` ao catalog e referenciar em todos os workspaces

**Files:**
- Modify: `package.json` (raiz) — bloco `workspaces.catalog` e `devDependencies`
- Modify: `apps/web/package.json` — `devDependencies.typescript`
- Modify: `packages/api/package.json` — `devDependencies.typescript`
- Modify: `packages/auth/package.json` — `devDependencies.typescript`
- Modify: `packages/db/package.json` — `devDependencies.typescript`
- Modify: `packages/env/package.json` — `devDependencies.typescript`
- Modify: `packages/ui/package.json` — `devDependencies.typescript`

- [ ] **Step 1: Adicionar `typescript` ao catalog**

No `package.json` raiz, dentro do bloco `workspaces.catalog`, adicionar a entrada (após `@types/pg`, mantendo JSON válido):

```json
"@types/pg": "^8.16.0",
"typescript": "^6.0.3"
```

- [ ] **Step 2: Trocar a versão literal por `catalog:` na raiz**

No `package.json` raiz, em `devDependencies`, trocar:

```json
"typescript": "^6.0.3",
```

por:

```json
"typescript": "catalog:",
```

- [ ] **Step 3: Trocar a versão literal por `catalog:` nos 6 packages**

Em cada um destes arquivos, na seção `devDependencies`, trocar a linha do `typescript` por `"typescript": "catalog:",` (atenção à vírgula final conforme a posição na seção):

- `apps/web/package.json` — era `"typescript": "^5"`
- `packages/api/package.json` — era `"typescript": "^5"`
- `packages/auth/package.json` — era `"typescript": "^5"`
- `packages/db/package.json` — era `"typescript": "^5"`
- `packages/env/package.json` — era `"typescript": "^5"`
- `packages/ui/package.json` — era `"typescript": "^5.9.3"`

- [ ] **Step 4: Verificar que não restou versão literal**

Run: `grep -rn '"typescript"' --include=package.json . | grep -v node_modules`
Expected: 8 linhas — 7 com `"typescript": "catalog:"` (raiz + 6 packages) e 1 com `"typescript": "^6.0.3"` (a entrada do catalog).

- [ ] **Step 5: Re-resolver o lockfile**

Run: `bun install`
Expected: conclui sem erro de resolução; `bun.lock` atualizado.

- [ ] **Step 6: Verificar a compilação**

Run: `bun run check-types`
Expected: PASS em todos os workspaces. Se a subida de `^5` para `^6` acusar quebras de compilação, tratá-las antes de prosseguir (corrigir o código ofensor; ajuste de `tsconfig`/flags só se necessário).

- [ ] **Step 7: Commit**

```bash
git add package.json apps/web/package.json packages/*/package.json bun.lock
git commit -m "chore: padronizar typescript via catalog (issue #25)"
```

---

### Task 2: Atualizar a dívida técnica

**Files:**
- Modify: `docs/tech-debt.md` — remover o item #7

- [ ] **Step 1: Remover o item #7**

No `docs/tech-debt.md`, remover o bloco completo do item "### 7. TypeScript em major divergente entre raiz e packages" (do cabeçalho até a linha `- **Issue:** #25`, inclusive).

- [ ] **Step 2: Renumerar os itens seguintes**

Se os itens forem numerados sequencialmente, renumerar o item #8 em diante (decrementar 1). Se houver referências cruzadas a esses números no arquivo, ajustá-las também.

- [ ] **Step 3: Verificar**

Run: `grep -n 'TypeScript em major divergente' docs/tech-debt.md`
Expected: nenhuma saída (item removido).

- [ ] **Step 4: Commit**

```bash
git add docs/tech-debt.md
git commit -m "docs: remover divida tecnica #7 (typescript resolvido)"
```

---

## Verificação final

- `grep` não encontra nenhuma versão literal de `typescript` fora do catalog.
- `bun install` re-resolveu o lockfile sem conflito.
- `bun run check-types` passa em todo o monorepo.
- Issue #25 pode ser fechada referenciando o commit da Task 1.
