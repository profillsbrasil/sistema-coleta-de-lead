# Alinhar `lucide-react` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar a divergência major de `lucide-react` no monorepo, alinhando `packages/ui` e o catalog na versão 1.16.0.

**Architecture:** Subir a entrada do catalog em `package.json` para `^1.16.0` e fazer `packages/ui` consumir `catalog:`. `apps/web` já usa `catalog:` e herda a versão. Um único `bun install` reescreve o `bun.lock`, removendo a entrada duplicada 0.546.0. Nenhuma mudança de código de ícone — a auditoria do spec confirmou que os 30 ícones de `apps/web` e todos de `packages/ui` existem no 1.16.0.

**Tech Stack:** Bun workspaces, Turborepo, `bun.lock` catalog, `lucide-react`.

**Spec:** `docs/superpowers/specs/2026-05-19-alinhar-lucide-react-design.md`

---

### Task 1: Alinhar versões e reinstalar dependências

**Files:**
- Modify: `package.json` (bloco `workspaces.catalog`, linha da entrada `lucide-react`)
- Modify: `packages/ui/package.json` (linha 24, `dependencies.lucide-react`)
- Modify: `bun.lock` (regenerado pelo `bun install`)

- [ ] **Step 1: Atualizar a versão no catalog**

Em `package.json`, no bloco `catalog`, trocar a linha:

```json
      "lucide-react": "^0.546.0",
```

por:

```json
      "lucide-react": "^1.16.0",
```

- [ ] **Step 2: Apontar `packages/ui` para o catalog**

Em `packages/ui/package.json`, dentro de `dependencies`, trocar a linha:

```json
    "lucide-react": "^1.6.0",
```

por:

```json
    "lucide-react": "catalog:",
```

- [ ] **Step 3: Reinstalar dependências**

Run: `bun install`
Expected: instalação conclui sem erro; `bun.lock` é atualizado.

- [ ] **Step 4: Verificar que só resta uma versão no lockfile**

Run: `grep -c 'lucide-react@' bun.lock`
Expected: a saída lista apenas ocorrências de `lucide-react@1.16.0` — nenhuma `lucide-react@0.546.0`.

Confirmação extra: `grep 'lucide-react@0.546' bun.lock` não deve retornar nada.

- [ ] **Step 5: Verificar tipos**

Run: `bun run check-types`
Expected: PASS — sem erros. Cobre qualquer import de ícone que não exista no 1.16.0.

- [ ] **Step 6: Rodar a suíte de testes**

Run: `bun run test`
Expected: PASS — suíte Vitest verde (regressão).

- [ ] **Step 7: Build completo**

Run: `bun run build`
Expected: PASS — build do monorepo conclui, incluindo `apps/web` renderizando ícones do 1.16.0.

- [ ] **Step 8: Commit**

```bash
git add package.json packages/ui/package.json bun.lock
git commit -m "fix: alinhar lucide-react em 1.16.0 via catalog"
```

---

### Task 2: Marcar dívida técnica como resolvida

**Files:**
- Modify: `docs/tech-debt.md` (item #3, `### 3. lucide-react em versões major divergentes`)

- [ ] **Step 1: Adicionar a linha de status**

Em `docs/tech-debt.md`, no item #3, logo após a linha `- **Issue:** #21`, adicionar:

```markdown
- **Status:** resolvido em 2026-05-19 — `lucide-react` alinhado em 1.16.0 via catalog; `packages/ui` passou a usar `catalog:`.
```

- [ ] **Step 2: Commit**

```bash
git add docs/tech-debt.md
git commit -m "docs: marcar item #3 do tech-debt como resolvido"
```

---

## Self-Review

**Spec coverage:**
- Mudança 1 (catalog → `^1.16.0`) → Task 1, Step 1. ✓
- Mudança 2 (`packages/ui` → `catalog:`) → Task 1, Step 2. ✓
- Mudança 3 (`apps/web` herda) → automático, validado no build (Task 1, Step 7). ✓
- Mudança 4 (`bun install` reescreve lock) → Task 1, Steps 3-4. ✓
- Mudança 5 (`tech-debt.md` item #3) → Task 2. ✓
- Verificação (check-types, build, test) → Task 1, Steps 5-7. ✓

**Placeholder scan:** sem TBD/TODO; todos os passos têm conteúdo concreto e comandos exatos.

**Type consistency:** não há tipos novos introduzidos; mudança é puramente de versão de dependência.
