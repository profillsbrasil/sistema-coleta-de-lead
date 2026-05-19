# Reescrita da documentação de agente + backlog de dívida técnica

> Spec de design — 2026-05-19
> Status: aprovado para implementação após revisão do usuário

## Contexto

O monorepo `sistema-coleta-de-lead` (Turborepo + Bun, app offline-first de coleta de
leads) acumulou documentação de agente divergente. Três documentos descrevem a mesma
arquitetura em paralelo — `CLAUDE.md`, `AGENTS.md`, `README.md` — e a migração
Supabase Auth → Better Auth (commit `4061361`, abril/2026) atualizou apenas o
`CLAUDE.md`. `AGENTS.md` e `README.md` congelaram no estado pré-migração, e o próprio
`CLAUDE.md` ficou com contradições internas.

Três agentes de exploração read-only auditaram o repositório em 2026-05-19. As
divergências e problemas confirmados estão registrados neste spec.

### Causa raiz

Documentação duplicada sem fonte única de verdade. Cada migração futura voltará a
divergir enquanto houver mais de um documento descrevendo a arquitetura.

## Decisões de design

| Decisão | Escolha | Motivo |
|---|---|---|
| Fonte canônica | `CLAUDE.md` (raiz) é a única fonte; o resto aponta | Elimina duplicação por construção |
| `AGENTS.md` | Ponteiro fino para `./CLAUDE.md` | Codex/agentes OpenAI-style leem este arquivo |
| `.claude/CLAUDE.md` | **Deletar** | Não está na hierarquia de memória do Claude Code (verificado nas docs oficiais: raiz, pais, subdirs on-demand, `~/.claude/`). Ponteiro num caminho não carregado é dívida nova |
| Granularidade | Raiz + 3 CLAUDE.md por workspace | `apps/web`, `packages/db`, `packages/ui` têm convenções próprias que agentes erram; `auth`/`api`/`env`/`config` ficam cobertos pela raiz |
| Backlog | `docs/tech-debt.md` + issues GitHub | Doc consolidado como referência; issues só para itens de severidade alta |

## Escopo

**Dentro do escopo:** reescrever a documentação de agente e humana; criar 3 CLAUDE.md
por workspace; consolidar o backlog num doc; abrir issues para os itens de severidade
alta; recomendar automações Claude Code.

**Fora do escopo:** corrigir os problemas de código levantados (RLS, CI, divergências
de versão, refactors). Este trabalho **documenta e rastreia** esses problemas — não os
resolve. `DESIGN.md` permanece intocado (design system, não é doc de agente e está
atual, datado 2026-04-28).

---

## Deliverable A — Documentação de agente e humana

### A1. `CLAUDE.md` (raiz) — reescrever do zero

Fonte canônica única. Mantém a estrutura temática atual (produto, stack, estrutura,
auth, offline, service worker, áreas funcionais, banco, env, comandos, convenções,
guardrails), mas corrige todos os erros verificados e remove contradições internas.

**Correções obrigatórias (verificadas no código em 2026-05-19):**

| Afirmação atual (errada) | Correção verificada |
|---|---|
| "schema local Dexie na versão 5" | Versão **8** (`apps/web/src/lib/db/index.ts` define até `db.version(8)`) |
| "leaderboard consulta `auth.users`" / "depende de `auth.users` no Supabase" | Consulta `public."user"` (tabela Better Auth) em `packages/api/src/routers/leaderboard.ts:31`. Nenhuma referência a `auth.users` no código |
| "Tabelas centrais: `leads` e `user_roles`" | Schema Drizzle ativo (`packages/db/src/schema/index.ts`) exporta `leads` e `todo`. `user_roles` + enum `app_role` + `todo` são artefatos da migration `0000_smart_blockbuster.sql`, não usados em nenhum código — descrever como legado, não como tabela central |
| "Hurdles: `packages/auth` não é a integração principal do runtime atual" | Falso e contraditório. `packages/auth` **é** a integração ativa (importado em `context.ts`, `route.ts`, `admin/layout.tsx`, `admin/users.ts`). Remover a linha |
| Lista de env incompleta | Adicionar `SIGNUP_INVITE_CODE` (server, optional) e `NEXT_PUBLIC_EVENT_END` (client, optional). Sinalizar `SUPABASE_SERVICE_ROLE_KEY` e `RESEND_API_KEY` como presentes no `.env` mas **não validados** por `packages/env` (item de backlog) |

**Fatos verificados como corretos** (manter): stack Turborepo + Bun; Next.js 16,
React 19 + React Compiler, Tailwind 4, tRPC 11, Drizzle + Postgres, Better Auth
(drizzleAdapter pg + plugin admin), Supabase Storage bucket `lead-photos`, Dexie 4,
Vitest, Ultracite/Biome; estrutura de 7 workspaces; namespace
`@dashboard-leads-profills/*`; superfície de auth (`index.ts`, `client.ts`,
`schema.ts` com `user`/`session`/`account`/`verification` IDs uuid, handler,
middleware `getSessionCookie`, context tRPC, guard admin, role direto em
`public.user.role` default `vendedor`, `auth-snapshot.ts`); fluxo offline
(`syncQueue`, `engine.ts` com `create`/`update`/`delete`, ciclo push → upload fotos →
push → pull → leaderboard, server-wins no pull, `sync-status-provider.tsx`,
connectivity via `/api/health` HEAD); service worker (registrar, `public/sw.js`,
`generate-sw-manifest.ts` gerando `sw-manifest.json` + `sw-build.js` via `postbuild`).

**Versões reais** (incluir para referência): Next 16.2, React 19.2, Tailwind 4.1,
tRPC 11.13, Drizzle 0.45, Better Auth 1.3, Dexie 4.4 (catalog), Vitest 4.1, Biome
2.4, Ultracite 7.7, Turbo 2.9, Bun 1.3.11.

### A2. `AGENTS.md` (raiz) — reescrever como ponteiro fino

Conteúdo mínimo: declara que `./CLAUDE.md` é a fonte canônica de produto, arquitetura
e convenções, e que o código vence em caso de divergência. Sem repetir arquitetura.
Remove as afirmações legadas ("auth via Supabase", "não adote `packages/auth`").

### A3. `.claude/CLAUDE.md` — deletar

Não é carregado automaticamente pelo Claude Code. O `CLAUDE.md` da raiz já é a memória
de projeto. Remover o arquivo (e o diretório `.claude/` permanece para `skills/`).

### A4. `README.md` (raiz) — reescrever

Doc humana de onboarding. Hoje lista "Supabase Auth", env vars erradas
(`SUPABASE_SERVICE_ROLE_KEY` como obrigatória, sem nenhuma `BETTER_AUTH_*`) e descreve
`packages/auth` como legado. Reescrever com: stack atual, estrutura, env vars reais
(as mesmas validadas em `packages/env`), comandos. Manter conciso — não duplicar a
profundidade do `CLAUDE.md`.

### A5. CLAUDE.md por workspace (3 arquivos novos)

Curtos (~20–40 linhas), apenas convenções locais, **sem repetir arquitetura da raiz**:

- **`apps/web/CLAUDE.md`** — runtime offline-first: fronteiras Dexie (browser-only),
  fluxo `syncQueue` → push/pull, fronteiras SSR/client, workaround de rota tipada do
  Next 16 (`as unknown as "/"`), service worker não é PWA completa.
- **`packages/db/CLAUDE.md`** — comandos `db:*` rodam da raiz; `drizzle.config.ts` lê
  env de `apps/web/.env`; schema em `src/schema`; tabelas legadas (`todo`,
  `user_roles`, enum `app_role`) não são usadas — não construir em cima delas.
- **`packages/ui/CLAUDE.md`** — imports path-based
  (`@dashboard-leads-profills/ui/components/*`); sem barrel files novos; `cn()` de
  `.../lib/utils`; fluxo de adicionar componente shadcn; `DESIGN.md` da raiz é a
  referência de design system.

---

## Deliverable B — Backlog de dívida técnica

### B1. `docs/tech-debt.md`

Doc consolidado, agrupado por severidade, cada item com: arquivo afetado, causa raiz e
ação sugerida. Serve também de referência de boas práticas. Itens confirmados pela
auditoria de 2026-05-19:

**Severidade alta**

| # | Item | Arquivo |
|---|---|---|
| 1 | Sem CI — nenhum pipeline valida types/lint/test/build | `.github/workflows` inexistente |
| 2 | Sem RLS no Postgres — isolamento entre usuários depende só de `eq(leads.userId, ...)` | `packages/db/src/migrations/*` |
| 3 | `lucide-react` 1.x (`packages/ui`) vs 0.5x (catalog) — breaking divergente | `packages/ui/package.json` |
| 4 | `dexie`/`dexie-react-hooks` duplicados: raiz 4.4.x vs `apps/web` 4.3.x; Dexie é dep de produção na raiz sem uso | `package.json`, `apps/web/package.json` |
| 5 | `packages/auth` lê `process.env` cru, sem validação Zod do pacote `env` | `packages/auth/src/index.ts` |
| 6 | `SUPABASE_SERVICE_ROLE_KEY` e `RESEND_API_KEY` no `.env` mas fora do schema `env`; service role bypassa RLS | `packages/env/src/server.ts` |
| 7 | TypeScript: raiz `^6.0.3`, packages `^5` — divergência de compilação | `package.json` raiz |
| 8 | `pullChanges` no servidor não filtra `isNull(leads.deletedAt)` — tombstones vazam para o cliente | `packages/api/src/routers/sync.ts:157` |
| 9 | Rate limit de `/api/signup-invite` é `Map` in-memory — não persiste em serverless | `apps/web/src/app/api/signup-invite/route.ts:11` |

**Severidade média**

| # | Item | Arquivo |
|---|---|---|
| 10 | `apps/web/tsconfig.json` não herda do base — strict flags mais fracas | `apps/web/tsconfig.json` |
| 11 | `packages/api` e `packages/db` sem script `check-types` — `turbo check-types` os pula | `packages/{api,db}/package.json` |
| 12 | `apps/web` sem script `check-types` — erros de tipo só no `next build` | `apps/web/package.json` |
| 13 | `getInitials` duplicada em 5 arquivos | `account/page.tsx`, `voce/page.tsx`, `app-sidebar.tsx`, `podium.tsx`, `ranking-list.tsx` |
| 14 | `mapServerLeadToLocal` reimplementada com casts | `sync/engine.ts:127`, `admin-lead-edit.tsx:25` |
| 15 | 18 ocorrências de `href as unknown as "/"` silenciam checagem de rota tipada | vários componentes de navegação |
| 16 | `lead-form.tsx` — 487 linhas, `biome-ignore` de complexidade cognitiva | `apps/web/src/components/lead-form.tsx` |
| 17 | `storage/client.ts` usa `process.env!` force-cast sem validação | `apps/web/src/lib/storage/client.ts:16` |
| 18 | `pushChanges` servidor: loop sequencial fail-fast pode reprocessar batch | `packages/api/src/routers/sync.ts:55` |
| 19 | Exceções silenciadas sem log: leaderboard e upload de foto | `sync/engine.ts:226,242` |
| 20 | `minPasswordLength: 6` abaixo do recomendado (NIST ≥ 8) | `packages/auth/src/index.ts:25` |
| 21 | `middleware.test.ts` quase vazio — não testa comportamento real | `apps/web/src/middleware.test.ts` |
| 22 | `turbo.json` declara `SUPABASE_ACCESS_TOKEN`/`RESEND_API_KEY` no env do build, fora do schema `env` | `turbo.json:25` |

**Severidade baixa**

| # | Item | Arquivo |
|---|---|---|
| 23 | `syncStatus: "conflict"` no union type, nunca escrito | `apps/web/src/lib/db/types.ts:16` |
| 24 | Tabela `todo`, `user_roles`, enum `app_role` — código/schema morto | `packages/db/src/schema`, migration `0000` |
| 25 | Conflito com timestamps iguais → server-wins implícito sem aviso | `sync/engine.ts:182` |
| 26 | `window.dispatchEvent("lead-saved")` — coupling via evento global sem contrato | `lib/lead/save-lead.ts:99` |
| 27 | `vitest.config.ts` de `apps/web` inclui só `*.test.ts`, não `.tsx` | `apps/web/vitest.config.ts:8` |
| 28 | Race condition latente: detector de conectividade subscrito antes de `start()` | `sync-status-provider.tsx:79` |
| 29 | Histórico de 8 versões de schema Dexie acumula lógica de upgrade morta no bundle | `apps/web/src/lib/db/index.ts` |
| 30 | 22 symlinks quebrados em `.claude/skills/` apontando para skills não instaladas | `.claude/skills/` |
| 31 | `docs/claude/` vazio (só `.gitkeep`) — specs/plans reais vivem em `docs/superpowers/` | `docs/claude/` |
| 32 | Zero testes de integração para rotas admin de `packages/api` (banco mockado) | `packages/api/src/__tests__/` |

### B2. Issues GitHub

Os 9 itens de severidade alta (#1–#9) viram issues via skill `to-issues`. Itens média
e baixa permanecem só no `docs/tech-debt.md`. **A criação de issues é confirmada com o
usuário antes de executar** (ação outward-facing).

---

## Deliverable C — Recomendações de automação Claude Code

Seção dedicada no `docs/tech-debt.md`:

- **`.claude/settings.json` do projeto** (não existe): allowlist de permissões para
  `bun run *` e comandos git read-only (`status`, `diff`, `log`) — reduz prompts.
- **Hook opcional `PostToolUse`** em Edit/Write: `bunx ultracite fix` no arquivo
  alterado, mantendo formatação consistente.
- **Limpeza dos 22 symlinks quebrados** em `.claude/skills/` (item #30 do backlog).
- **CI** (GitHub Actions: `check-types` + `test` + `build`) — registrado como issue
  alta #1; é o maior gap de automação do repositório.

---

## Arquivos afetados

**Reescritos:** `CLAUDE.md`, `AGENTS.md`, `README.md`
**Deletado:** `.claude/CLAUDE.md`
**Novos:** `apps/web/CLAUDE.md`, `packages/db/CLAUDE.md`, `packages/ui/CLAUDE.md`,
`docs/tech-debt.md`
**Issues GitHub:** 9 itens de severidade alta

## Plano de verificação

- Toda afirmação dos documentos reescritos foi cruzada com o código (auditoria de
  2026-05-19 registrada neste spec); a implementação não re-investiga, apenas redige.
- O ponteiro `AGENTS.md → ./CLAUDE.md` usa caminho relativo que resolve.
- `bun run check` e `bun run test` continuam passando após a limpeza de symlinks.
- Nenhum arquivo de código de produção é alterado — só documentação e symlinks.

## Riscos e mitigação

- **Risco:** o backlog vira lista morta. **Mitigação:** itens de severidade alta
  viram issues rastreáveis; o doc referencia os números das issues.
- **Risco:** os 3 CLAUDE.md por workspace divergem da raiz com o tempo.
  **Mitigação:** eles contêm só convenções locais, nunca arquitetura — nada para
  divergir da fonte canônica.
