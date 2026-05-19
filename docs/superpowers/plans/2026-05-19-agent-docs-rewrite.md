# Reescrita da Documentação de Agente + Backlog — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a documentação de agente divergente do monorepo por uma fonte canônica única (`CLAUDE.md`) com ponteiros e CLAUDE.md por workspace, e registrar a dívida técnica num backlog rastreável.

**Architecture:** `CLAUDE.md` na raiz é a única fonte de verdade. `AGENTS.md` vira ponteiro fino; `.claude/CLAUDE.md` é deletado (não está na hierarquia de memória do Claude Code). Três CLAUDE.md por workspace cobrem só convenções locais. Um doc `docs/tech-debt.md` consolida os 32 problemas auditados; os 9 de severidade alta viram issues GitHub. Nenhum código de produção é alterado.

**Tech Stack:** Markdown. Bash (`gh` para issues, `find` para symlinks). Spec de referência: `docs/superpowers/specs/2026-05-19-agent-docs-rewrite-design.md`.

**Nota sobre commits:** regra do projeto — commits exigem aprovação explícita do usuário. Sob subagent-driven-development, o orquestrador solicita aprovação antes de cada commit.

---

## Estrutura de Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `CLAUDE.md` (raiz) | Fonte canônica: produto, stack, arquitetura, auth, offline, env, convenções, guardrails |
| `AGENTS.md` (raiz) | Ponteiro fino para `./CLAUDE.md` |
| `.claude/CLAUDE.md` | **Deletado** |
| `README.md` (raiz) | Onboarding humano: stack, estrutura, env, comandos |
| `apps/web/CLAUDE.md` | Convenções locais do app: offline-first, SSR, rota tipada, SW |
| `packages/db/CLAUDE.md` | Convenções locais: comandos `db:*`, schema, tabelas legadas |
| `packages/ui/CLAUDE.md` | Convenções locais: imports path-based, shadcn, `DESIGN.md` |
| `docs/tech-debt.md` | Backlog dos 32 problemas + recomendações de automação |

---

## Task 1: Reescrever `CLAUDE.md` (raiz)

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Substituir o conteúdo inteiro de `CLAUDE.md` pelo texto abaixo**

````markdown
# Sistema Coleta de Lead

## Fonte de Verdade

- Este arquivo é a referência canônica de produto, arquitetura e convenções do projeto.
- Em caso de conflito entre documentação e código, o código-fonte vence.
- `AGENTS.md` aponta para este arquivo. Os CLAUDE.md por workspace (`apps/web`, `packages/db`, `packages/ui`) cobrem apenas convenções locais — nunca duplicam arquitetura.

## Objetivo do Produto

- Coleta rápida de leads em eventos e congressos, com operação offline-first.
- O foco principal é não perder dados quando a rede falha.
- O app não deve derivar para um CRM completo. Funis, automações complexas e fluxos de follow-up não são o centro do produto.

## Stack

- Monorepo: Turborepo + Bun workspaces
- Frontend: Next.js 16, React 19 (React Compiler ativo), Tailwind CSS 4
- UI compartilhada: `packages/ui` com primitives shadcn/ui path-based
- API: tRPC 11 em route handler Next.js
- Banco: PostgreSQL + Drizzle ORM
- Auth: Better Auth (Drizzle adapter pg + plugin admin) em `packages/auth`
- Storage (fotos de leads): Supabase Storage bucket `lead-photos` via `@supabase/supabase-js` em `apps/web/src/lib/storage/client.ts` — somente Storage, sem Supabase Auth
- Offline local: Dexie 4 + `dexie-react-hooks`
- Testes: Vitest
- Lint/format: Ultracite / Biome

## Estrutura do Monorepo

```text
apps/web        App Next.js na porta 3001
packages/api    Routers tRPC, contexto auth e regras de negócio
packages/db     Schema Drizzle, migrations e acesso ao Postgres
packages/env    Validação de env para server e client
packages/ui     Componentes e utilitários de UI compartilhados
packages/auth   Instância Better Auth (server, client React, schema Drizzle)
packages/config Base compartilhada de TypeScript
```

Namespace de workspace: `@dashboard-leads-profills/*`

## Auth

- Better Auth em `packages/auth/src/index.ts` (Drizzle adapter `pg`, plugin `admin`). `packages/auth` é a integração de auth ativa e central do runtime.
- Client React em `packages/auth/src/client.ts` — expõe `authClient`, `useSession`, `signIn`, `signUp`, `signOut` + plugin `adminClient()`.
- Schema Drizzle em `packages/auth/src/schema.ts` — tabelas `user` / `session` / `account` / `verification` com IDs `uuid defaultRandom`.
- Handler Next.js em `apps/web/src/app/api/auth/[...all]/route.ts` via `toNextJsHandler`.
- Middleware em `apps/web/src/middleware.ts` usa `getSessionCookie` (Edge-safe, sem hit DB).
- Contexto tRPC em `packages/api/src/context.ts` chama `auth.api.getSession({ headers })` e expõe `{ user, userRole, session, headers }`.
- Guard admin em `apps/web/src/app/(app)/admin/layout.tsx` via `session.user.role === "admin"`.
- Admin API usa `auth.api.listUsers/banUser/unbanUser/setRole` em `packages/api/src/routers/admin/users.ts`.
- Providers: email/senha (auto-verificado, sem confirmação por email) + Google OAuth (callback `/api/auth/callback/google`).
- Role é campo direto em `public.user.role` (default `vendedor`). Não há tabela de roles separada em uso.
- Snapshot offline em `apps/web/src/lib/auth/auth-snapshot.ts`, construído a partir de `session.user`.

## Arquitetura Offline-First

- Lead CRUD grava primeiro no IndexedDB via Dexie em `apps/web/src/lib/db/index.ts`. Schema local Dexie na versão 8.
- A fila de sincronização local fica em `syncQueue`.
- O sync engine está em `apps/web/src/lib/sync/engine.ts` e trabalha com `create`, `update` e `delete`.
- Ciclo de sync: push → upload de fotos → push (se houve fotos) → pull → refresh do leaderboard.
- Em conflitos, a regra é server-wins para dados do servidor durante o pull.
- O status de sync exposto na UI vem de `apps/web/src/components/sync-status-provider.tsx`.
- A detecção de conectividade usa eventos do browser e polling em `/api/health` por `HEAD`, em `apps/web/src/lib/sync/connectivity.ts`.

## Service Worker

- Mantém navegação autenticada utilizável offline no App Router. Não é PWA completa: sem manifest de instalação, install prompt ou background sync.
- Registro em `apps/web/src/components/service-worker-registrar.tsx`; worker em `apps/web/public/sw.js`.
- O build gera `sw-manifest.json` e `sw-build.js` via `apps/web/scripts/generate-sw-manifest.ts` (passo `postbuild`).
- O SW faz pré-cache de rotas autenticadas, assets estáticos e payloads RSC, com fallback para `/offline`.

## Áreas Funcionais

- Dashboard: `apps/web/src/app/(app)/dashboard`
- Leads: `apps/web/src/app/(app)/leads`
- Admin: `apps/web/src/app/(app)/admin`
- Sync API: `packages/api/src/routers/sync.ts`
- Leaderboard API: `packages/api/src/routers/leaderboard.ts`
- Admin API: `packages/api/src/routers/admin/*`

## Banco e Dados

- Schema Drizzle em `packages/db/src/schema`. Tabela ativa: `leads`.
- As tabelas `todo` e `user_roles` (com o enum `app_role`) existem no banco como artefatos da migration `0000_smart_blockbuster.sql`, mas não estão no schema Drizzle ativo nem são usadas em nenhum código. São legado — não construa em cima delas.
- O leaderboard usa SQL direto e faz JOIN de `leads` com `public."user"` (tabela Better Auth) para obter o nome do vendedor. Não consulta `auth.users`.
- `drizzle.config.ts` carrega env de `../../apps/web/.env`; comandos `db:*` rodam a partir da raiz do repo.

## Variáveis de Ambiente

Arquivo esperado no desenvolvimento: `apps/web/.env`. Validações em `packages/env/src/server.ts` e `packages/env/src/web.ts`.

Server: `DATABASE_URL`, `BETTER_AUTH_SECRET` (min 32 chars), `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NODE_ENV`, `SIGNUP_INVITE_CODE` (opcional).

Client: `NEXT_PUBLIC_BETTER_AUTH_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_EVENT_END` (opcional).

`SUPABASE_SERVICE_ROLE_KEY` e `RESEND_API_KEY` aparecem no `.env` / `turbo.json` mas não são validados por `packages/env` — ver `docs/tech-debt.md`.

## Comandos do Workspace

```bash
bun run dev          # turbo dev
bun run dev:web      # next dev --port 3001 apenas para o app web
bun run build        # turbo build
bun run check-types  # turbo check-types
bun run test         # turbo test
bun run check        # ultracite check
bun run fix          # ultracite fix
bun run db:push      # drizzle-kit push no pacote db
bun run db:generate  # drizzle-kit generate no pacote db
bun run db:migrate   # drizzle-kit migrate no pacote db
bun run db:studio    # drizzle-kit studio no pacote db
```

## Convenções de Código

- Imports path-based para `packages/ui`: `@dashboard-leads-profills/ui/components/button`.
- Evite barrel files novos para UI ou módulos internos.
- `cn()` vem de `@dashboard-leads-profills/ui/lib/utils`.
- Mantenha `type: "module"` e TypeScript estrito.
- Não introduza `any` sem justificativa; prefira `unknown`.
- Não deixe `console.log` em produção.
- Dexie é browser-only; respeite fronteiras de runtime em código sensível a SSR.

## Guardrails para Agentes

- Verifique o código antes de descrever arquitetura.
- Use as superfícies de auth Better Auth (`packages/auth`); o app não usa Supabase Auth.
- O health check de conectividade é `/api/health`, não `/api/trpc/healthCheck`.
- O service worker não é PWA completa.
- Ao tocar offline/sync, preserve a prioridade do dado local e o comportamento resiliente sem rede.
- Dívida técnica conhecida está catalogada em `docs/tech-debt.md` — consulte antes de propor mudanças amplas.
````

- [ ] **Step 2: Verificar que todo caminho de arquivo citado existe**

Run:
```bash
for p in packages/auth/src/index.ts packages/auth/src/client.ts packages/auth/src/schema.ts \
  "apps/web/src/app/api/auth/[...all]/route.ts" apps/web/src/middleware.ts \
  packages/api/src/context.ts "apps/web/src/app/(app)/admin/layout.tsx" \
  packages/api/src/routers/admin/users.ts apps/web/src/lib/auth/auth-snapshot.ts \
  apps/web/src/lib/db/index.ts apps/web/src/lib/sync/engine.ts \
  apps/web/src/components/sync-status-provider.tsx apps/web/src/lib/sync/connectivity.ts \
  apps/web/src/components/service-worker-registrar.tsx apps/web/public/sw.js \
  apps/web/scripts/generate-sw-manifest.ts packages/api/src/routers/sync.ts \
  packages/api/src/routers/leaderboard.ts packages/env/src/server.ts packages/env/src/web.ts; do
  [ -e "$p" ] && echo "OK  $p" || echo "FALTA $p"
done
```
Expected: todas as linhas começam com `OK`. Se alguma der `FALTA`, parar e investigar.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: reescrever CLAUDE.md como fonte canonica"
```

---

## Task 2: `AGENTS.md` como ponteiro + deletar `.claude/CLAUDE.md`

**Files:**
- Modify: `AGENTS.md`
- Delete: `.claude/CLAUDE.md`

- [ ] **Step 1: Substituir o conteúdo inteiro de `AGENTS.md` pelo texto abaixo**

```markdown
# AGENTS.md

`CLAUDE.md` na raiz deste repositório é a fonte canônica de produto, arquitetura e
convenções. Leia-o antes de assumir qualquer coisa sobre o sistema.

Em caso de divergência entre documentação e código, o código-fonte vence.

Este arquivo existe apenas para apontar agentes (Codex e outros) para o `CLAUDE.md`.
Não mantenha uma segunda descrição da arquitetura aqui — ela divergiria.
```

- [ ] **Step 2: Deletar `.claude/CLAUDE.md`**

Run: `git rm .claude/CLAUDE.md`
Expected: `rm '.claude/CLAUDE.md'`. O diretório `.claude/` permanece (contém `skills/`).

- [ ] **Step 3: Verificar que nada mais referencia o arquivo deletado**

Run: `grep -rn "profills/sistema-coleta" --include="*.md" . 2>/dev/null | grep -v node_modules || echo "sem referencias ao caminho legado"`
Expected: `sem referencias ao caminho legado` (o caminho incorreto `/Work/profills/...` não deve sobrar em lugar nenhum).

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md .claude/CLAUDE.md
git commit -m "docs: AGENTS.md vira ponteiro e remover .claude/CLAUDE.md"
```

---

## Task 3: Reescrever `README.md`

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Substituir o conteúdo inteiro de `README.md` pelo texto abaixo**

````markdown
# Sistema Coleta de Lead

Aplicação offline-first para captação rápida de leads em eventos e congressos. O foco é
não perder dados quando a rede falha.

> Contexto completo de arquitetura e convenções: ver `CLAUDE.md` na raiz.

## Stack

- Turborepo + Bun workspaces
- Next.js 16 + React 19 (React Compiler)
- tRPC 11
- Better Auth (auth) — Drizzle adapter pg + plugin admin
- PostgreSQL + Drizzle ORM
- Dexie + `dexie-react-hooks` (persistência local offline-first)
- Supabase Storage (apenas fotos de leads, bucket `lead-photos`)
- shadcn/ui em `packages/ui`
- Vitest, Ultracite / Biome

## Estrutura

```text
apps/web        App Next.js (porta 3001)
packages/api    Routers tRPC e regras de negócio
packages/db     Schema Drizzle e migrations
packages/env    Validação de env
packages/ui     Componentes compartilhados
packages/auth   Instância Better Auth
packages/config Base compartilhada de TypeScript
```

## Ambiente

Crie `apps/web/.env`. Variáveis validadas em `packages/env`:

```bash
DATABASE_URL=
BETTER_AUTH_SECRET=          # mínimo 32 caracteres
BETTER_AUTH_URL=             # ex: http://localhost:3001
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXT_PUBLIC_BETTER_AUTH_URL=
NEXT_PUBLIC_SUPABASE_URL=    # apenas Storage
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NODE_ENV=
SIGNUP_INVITE_CODE=          # opcional
NEXT_PUBLIC_EVENT_END=       # opcional
```

## Comandos

```bash
bun install
bun run dev          # todos os apps
bun run dev:web      # apenas o app web (porta 3001)
bun run build
bun run check-types
bun run test
bun run check        # lint
bun run fix          # lint + format
bun run db:push
bun run db:generate
bun run db:migrate
bun run db:studio
```

O app web roda em `http://localhost:3001`.
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: atualizar README para a stack atual (Better Auth)"
```

---

## Task 4: Criar os 3 CLAUDE.md por workspace

**Files:**
- Create: `apps/web/CLAUDE.md`
- Create: `packages/db/CLAUDE.md`
- Create: `packages/ui/CLAUDE.md`

- [ ] **Step 1: Criar `apps/web/CLAUDE.md` com o conteúdo abaixo**

```markdown
# apps/web — Convenções locais

Arquitetura, produto e stack: ver `../../CLAUDE.md`. Este arquivo cobre só o que é
específico do app web.

## Runtime offline-first

- Dexie é browser-only. Nunca importe `src/lib/db` em código que roda no servidor
  (Server Components, route handlers).
- Todo CRUD de lead grava primeiro no IndexedDB e enfileira em `syncQueue`; o servidor
  é sincronizado depois pelo engine em `src/lib/sync/engine.ts`.
- Conectividade: `src/lib/sync/connectivity.ts` faz polling em `/api/health` por HEAD.
  Não troque por `/api/trpc/healthCheck`.

## Fronteiras SSR/client

- Componentes que tocam Dexie, `window` ou o service worker precisam de `"use client"`.

## Rotas tipadas (Next 16)

- O projeto usa o workaround `href as unknown as "/"` para rotas dinâmicas por causa da
  checagem de rota tipada do Next 16. É dívida conhecida (ver `docs/tech-debt.md`) — não
  propague para código novo sem necessidade.

## Service worker

- `public/sw.js` faz cache de navegação offline. Não é PWA completa: sem manifest de
  instalação, sem install prompt, sem background sync.
```

- [ ] **Step 2: Criar `packages/db/CLAUDE.md` com o conteúdo abaixo**

```markdown
# packages/db — Convenções locais

Arquitetura e stack: ver `../../CLAUDE.md`.

## Comandos

- Os comandos `db:*` (`db:push`, `db:generate`, `db:migrate`, `db:studio`) rodam a
  partir da raiz do repositório.
- `drizzle.config.ts` carrega env de `../../apps/web/.env`.

## Schema

- Schema Drizzle em `src/schema`. Tabela ativa: `leads`.
- `todo`, `user_roles` e o enum `app_role` são artefatos da migration
  `0000_smart_blockbuster.sql` (scaffolding Better-T-Stack e auth legada). Não são
  usados em nenhum código. Não construa em cima deles — ver item de backlog em
  `docs/tech-debt.md`.
```

- [ ] **Step 3: Criar `packages/ui/CLAUDE.md` com o conteúdo abaixo**

```markdown
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
```

- [ ] **Step 4: Verificar que os 3 arquivos foram criados**

Run: `ls apps/web/CLAUDE.md packages/db/CLAUDE.md packages/ui/CLAUDE.md`
Expected: as 3 linhas listadas sem erro.

- [ ] **Step 5: Commit**

```bash
git add apps/web/CLAUDE.md packages/db/CLAUDE.md packages/ui/CLAUDE.md
git commit -m "docs: adicionar CLAUDE.md por workspace (web, db, ui)"
```

---

## Task 5: Criar `docs/tech-debt.md`

**Files:**
- Create: `docs/tech-debt.md`

O conteúdo dos 32 itens está na tabela do spec
`docs/superpowers/specs/2026-05-19-agent-docs-rewrite-design.md`, seção "Deliverable B".

- [ ] **Step 1: Criar `docs/tech-debt.md` com a estrutura abaixo**

O arquivo tem 5 partes: introdução, três seções de severidade (Alta, Média, Baixa) e
uma seção de automação. Cada item segue este formato (exemplos reais — itens #1 e #13):

````markdown
# Backlog de Dívida Técnica

> Levantado pela auditoria de 2026-05-19. Itens de severidade alta também estão
> rastreados como issues no GitHub. Spec de origem:
> `docs/superpowers/specs/2026-05-19-agent-docs-rewrite-design.md`.

## Severidade Alta

### 1. Ausência de CI

- **Arquivo:** `.github/workflows` (inexistente)
- **Causa raiz:** nenhum pipeline valida `check-types`, `test`, `lint` ou `build` em
  pull requests. O desenvolvimento ativo não tem guardrail automatizado.
- **Ação sugerida:** adicionar GitHub Actions rodando `bun run check-types`,
  `bun run test` e `bun run build` em PRs e na branch principal.

### ... (itens 2 a 9, ver tabela do spec)

## Severidade Média

### 13. `getInitials` duplicada em 5 arquivos

- **Arquivo:** `account/page.tsx`, `voce/page.tsx`, `app-sidebar.tsx`, `podium.tsx`,
  `ranking-list.tsx`
- **Causa raiz:** a mesma função de iniciais foi copiada em 5 componentes; mudanças
  precisam ser propagadas à mão.
- **Ação sugerida:** extrair para um utilitário compartilhado e remover as cópias.

### ... (demais itens médios, ver tabela do spec)

## Severidade Baixa

### ... (itens 23 a 32, ver tabela do spec)

## Recomendações de Automação Claude Code

- **`.claude/settings.json` do projeto:** criar com allowlist de permissões para
  `bun run *` e comandos git read-only (`status`, `diff`, `log`) — reduz prompts.
- **Hook `PostToolUse`:** opcional, rodar `bunx ultracite fix` no arquivo alterado
  após Edit/Write para manter formatação consistente.
- **Symlinks quebrados:** ver item #30 — limpar `.claude/skills/`.
- **CI:** ver item #1 — é o maior gap de automação do repositório.
````

Expandir TODOS os 32 itens da tabela do spec neste mesmo formato (título com número e
nome, `Arquivo`, `Causa raiz`, `Ação sugerida`), agrupados nas três seções de
severidade conforme a classificação do spec.

- [ ] **Step 2: Verificar que os 32 itens estão presentes**

Run: `grep -c '^### [0-9]' docs/tech-debt.md`
Expected: `32`

- [ ] **Step 3: Commit**

```bash
git add docs/tech-debt.md
git commit -m "docs: adicionar backlog de divida tecnica"
```

---

## Task 6: Limpar symlinks quebrados em `.claude/skills/`

**Files:**
- Delete: symlinks quebrados em `.claude/skills/`

- [ ] **Step 1: Listar os symlinks quebrados (antes de remover)**

Run: `find .claude/skills/ -xtype l`
Expected: ~22 symlinks listados (skills não instaladas: sub-skills do `impeccable`,
`frontend-design`, `better-auth-best-practices` etc.). Conferir que são de fato
symlinks quebrados, não arquivos reais.

- [ ] **Step 2: Remover os symlinks quebrados**

Run: `find .claude/skills/ -xtype l -delete`
Expected: sem saída (sucesso).

- [ ] **Step 3: Verificar que só sobraram symlinks válidos**

Run: `find .claude/skills/ -xtype l | wc -l`
Expected: `0`

- [ ] **Step 4: Rodar lint para confirmar que nada quebrou**

Run: `bun run check`
Expected: passa sem erros novos (a limpeza de symlinks não afeta código).

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/
git commit -m "chore: remover symlinks quebrados em .claude/skills"
```

---

## Task 7: Abrir issues GitHub para os 9 itens de severidade alta

**Files:** nenhum (cria issues no GitHub via `gh`).

> **Confirmar com o usuário antes de executar** — criar issues é ação outward-facing.

- [ ] **Step 1: Confirmar acesso ao GitHub**

Run: `gh repo view --json nameWithOwner -q .nameWithOwner`
Expected: o `owner/repo` do projeto. Se falhar, pedir ao usuário para rodar
`! gh auth login` e parar.

- [ ] **Step 2: Criar uma issue para cada item de severidade alta (#1 a #9 do spec)**

Para cada um dos 9 itens da seção "Severidade Alta" do spec, criar uma issue com título
e corpo derivados do item (causa raiz + ação sugerida + arquivo). Exemplo do item #1:

```bash
gh issue create \
  --title "Adicionar CI (GitHub Actions: check-types, test, build)" \
  --body "Severidade: alta. Origem: docs/tech-debt.md item #1.

Causa raiz: nenhum pipeline valida check-types/test/lint/build em PRs.

Ação sugerida: GitHub Actions rodando bun run check-types, test e build em PRs e na branch principal." \
  --label "tech-debt"
```

Repetir para os itens #2 a #9. Se a label `tech-debt` não existir, criar antes com
`gh label create tech-debt --color BFD4F2` ou omitir `--label`.

- [ ] **Step 3: Verificar as issues criadas**

Run: `gh issue list --label tech-debt --limit 20`
Expected: 9 issues listadas.

- [ ] **Step 4: Atualizar `docs/tech-debt.md` com os números das issues**

Em cada item da seção "Severidade Alta", adicionar uma linha
`- **Issue:** #N` com o número retornado pelo `gh issue create`.

- [ ] **Step 5: Commit**

```bash
git add docs/tech-debt.md
git commit -m "docs: vincular itens de divida alta as issues GitHub"
```

---

## Self-Review (preenchido pelo autor do plano)

**Spec coverage:** Deliverable A1 → Task 1; A2 → Task 2; A3 → Task 2 (delete); A4 →
Task 3; A5 → Task 4; B1 → Task 5; B2 → Task 7; C → Task 5 (seção de automação) +
Task 6 (symlinks). Todos os deliverables do spec têm task correspondente.

**Placeholder scan:** o conteúdo completo está embutido para CLAUDE.md, AGENTS.md,
README.md e os 3 CLAUDE.md por workspace. Para `docs/tech-debt.md`, os 32 itens estão
enumerados na tabela do spec (referenciada explicitamente) e o formato é mostrado com 2
itens reais expandidos — não é placeholder, é conteúdo derivável diretamente do spec.

**Type consistency:** N/A (sem código). Nomes de arquivo e caminhos conferidos contra
a auditoria de 2026-05-19.
