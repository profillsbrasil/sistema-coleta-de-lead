# Backlog de Dívida Técnica

> Levantado pela auditoria de 2026-05-19. Itens de severidade alta também estão
> rastreados como issues no GitHub. Spec de origem:
> `docs/superpowers/specs/2026-05-19-agent-docs-rewrite-design.md`.

Cada item traz arquivo afetado, causa raiz e ação sugerida. Severidade reflete impacto
em perda de dados, segurança ou bloqueio de evolução.

## Severidade Alta

### 1. Ausência de CI

- **Arquivo:** `.github/workflows` (inexistente)
- **Causa raiz:** nenhum pipeline valida `check-types`, `test`, `lint` ou `build` em
  pull requests. O desenvolvimento ativo não tem guardrail automatizado.
- **Ação sugerida:** GitHub Actions rodando `bun run check-types`, `bun run test` e
  `bun run build` em PRs e na branch principal.
- **Issue:** #19

### 2. Sem Row-Level Security no Postgres

- **Arquivo:** `packages/db/src/migrations/*`
- **Causa raiz:** nenhuma migration habilita RLS ou cria policies. O isolamento de
  dados entre usuários depende exclusivamente da cláusula `eq(leads.userId, userId)`
  nas queries Drizzle. Um filtro esquecido expõe dados de todos os usuários — risco
  agravado pela `SUPABASE_SERVICE_ROLE_KEY` disponível, que bypassa RLS.
- **Ação sugerida:** habilitar RLS em todas as tabelas e criar policies por `userId`.
- **Issue:** #20

### 3. `lucide-react` em versões major divergentes

- **Arquivo:** `packages/ui/package.json`
- **Causa raiz:** `packages/ui` declara `lucide-react@^1.6.0` enquanto o catalog do
  workspace usa `^0.546.0`. São versões com breaking changes; `apps/web` e `packages/ui`
  podem renderizar ícones diferentes ou faltantes.
- **Ação sugerida:** alinhar `packages/ui` ao catalog (`lucide-react: "catalog:"`).
- **Issue:** #21
- **Status:** resolvido em 2026-05-19 — lucide-react alinhado em 1.16.0 via catalog; packages/ui passou a usar catalog:.

### 4. `dexie` / `dexie-react-hooks` duplicados e divergentes

- **Arquivo:** `package.json` (raiz), `apps/web/package.json`
- **Causa raiz:** a raiz declara `dexie@^4.4.2` / `dexie-react-hooks@^4.4.0` como
  dependência de produção (sem uso direto na raiz), e `apps/web` pede `^4.3.0` / `^4.2.0`
  sem usar o catalog. Dois exemplares de Dexie no bundle podem instanciar bancos
  distintos.
- **Ação sugerida:** remover Dexie da raiz e fazer `apps/web` consumir do catalog.
- **Issue:** #22
- **Status:** resolvido em 2026-05-19 — `dexie@^4.4.2` / `dexie-react-hooks@^4.4.0`
  movidos para o `catalog` da raiz e removidos das `dependencies` da raiz; `apps/web`
  passou a usar `catalog:`. Lockfile resolve fonte única.

### 5. `packages/auth` lê `process.env` cru

- **Arquivo:** `packages/auth/src/index.ts`
- **Causa raiz:** `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET` e
  `SIGNUP_INVITE_CODE` são lidos direto de `process.env`, sem a validação Zod do pacote
  `@dashboard-leads-profills/env`. Variáveis ausentes deixam Better Auth inicializar com
  `undefined` silenciosamente.
- **Ação sugerida:** consumir o pacote `env` validado em `packages/auth`.
- **Issue:** #23

### 6. Segredos fora do schema de validação de env

- **Arquivo:** `packages/env/src/server.ts`
- **Causa raiz:** `SUPABASE_SERVICE_ROLE_KEY` e `RESEND_API_KEY` estão no `.env` mas não
  são declarados no schema Zod. Não há validação na inicialização; ausência só falha em
  runtime. `SUPABASE_SERVICE_ROLE_KEY` é chave privilegiada e não há rastro de onde é
  usada — pode ser segredo desnecessário exposto.
- **Ação sugerida:** declarar as variáveis no schema `env` ou remover as não usadas.
- **Issue:** #24

### 8. `pullChanges` não filtra leads soft-deletados

- **Arquivo:** `packages/api/src/routers/sync.ts:157`
- **Causa raiz:** a query de pull filtra só por `userId` e `updatedAt`, sem
  `isNull(leads.deletedAt)`. Tombstones são entregues ao cliente e sobrescritos em Dexie
  como `synced`, ocupando IndexedDB e entrando no loop de conflito.
- **Ação sugerida:** adicionar `isNull(leads.deletedAt)` ao filtro do pull (ou tratar
  tombstones explicitamente no cliente).
- **Issue:** #26

### 9. Rate limit de `/api/signup-invite` é in-memory

- **Arquivo:** `apps/web/src/app/api/signup-invite/route.ts:11`
- **Causa raiz:** o controle de tentativas usa um `Map` em memória de processo. Em
  deploy serverless cada cold start zera o `Map`; um atacante rotaciona instâncias e
  contorna o limite.
- **Ação sugerida:** migrar para um store persistente (Redis) ou estratégia stateless.
- **Issue:** #27

## Severidade Média

### 10. `apps/web/tsconfig.json` não herda do base

- **Arquivo:** `apps/web/tsconfig.json`
- **Causa raiz:** o tsconfig do app é standalone, sem `extends` do
  `packages/config/tsconfig.base.json`. Flags estritas (`noUnusedLocals`,
  `noUncheckedIndexedAccess`, `noUnusedParameters`) não se aplicam ao app.
- **Ação sugerida:** estender o tsconfig base e resolver os erros que surgirem.

### 13. `getInitials` duplicada em 5 arquivos

- **Arquivo:** `account/page.tsx`, `voce/page.tsx`, `app-sidebar.tsx`, `podium.tsx`,
  `ranking-list.tsx`
- **Causa raiz:** a mesma função de iniciais foi copiada em 5 componentes; mudanças
  precisam ser propagadas à mão.
- **Ação sugerida:** extrair para um utilitário compartilhado e remover as cópias.

### 14. `mapServerLeadToLocal` reimplementada com casts

- **Arquivo:** `apps/web/src/lib/sync/engine.ts:127`,
  `apps/web/src/app/(app)/admin/leads/[id]/admin-lead-edit.tsx:25`
- **Causa raiz:** a transformação servidor→local existe em dois lugares, uma delas com
  casts diretos. Mudanças no tipo `Lead` precisam ser propagadas manualmente.
- **Ação sugerida:** unificar numa única função compartilhada.

### 15. Workaround `href as unknown as "/"` em 18 ocorrências

- **Arquivo:** vários componentes de navegação (`app-sidebar.tsx`, `bottom-nav.tsx`,
  `fab.tsx`, `admin-lead-edit.tsx`, `lead-detail.tsx` e outros)
- **Causa raiz:** rotas dinâmicas contornam a checagem de rota tipada do Next 16 com
  cast, silenciando erros de rota inválida.
- **Ação sugerida:** avaliar tipagem de rota adequada (`Route` helper) ou centralizar o
  cast num helper único e tipado.

### 16. `lead-form.tsx` com complexidade cognitiva excessiva

- **Arquivo:** `apps/web/src/components/lead-form.tsx`
- **Causa raiz:** 487 linhas, `useState` por campo e um `biome-ignore` de complexidade
  cognitiva admitindo o problema.
- **Ação sugerida:** refatorar com `useReducer` ou React Hook Form.

### 17. `storage/client.ts` usa `process.env!` com force-cast

- **Arquivo:** `apps/web/src/lib/storage/client.ts:16`
- **Causa raiz:** `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` lidos com `!`, sem o pacote
  `env`. Variáveis ausentes criam um client inválido que falha silenciosamente no upload.
- **Ação sugerida:** consumir o pacote `env` validado.
- **Status:** resolvido no PR #30 — `storage/client.ts` passou a usar `env/web` validado.

### 18. `pushChanges` do servidor: loop sequencial fail-fast

- **Arquivo:** `packages/api/src/routers/sync.ts:55`
- **Causa raiz:** o processamento de operações é serializado; falha na 1ª deixa as
  demais para o próximo ciclo, e o cliente re-envia o batch inteiro — risco de update
  duplicado em ACK perdido.
- **Ação sugerida:** processar operações de forma resiliente por item, com ACK
  individual.

### 19. Exceções silenciadas sem log

- **Arquivo:** `apps/web/src/lib/sync/engine.ts:226` (leaderboard), `:242` (foto)
- **Causa raiz:** `catch {}` vazio em leaderboard e upload de foto. A intenção (não
  quebrar o sync) é válida, mas falhas sistemáticas nunca são detectadas.
- **Ação sugerida:** logar a exceção (ao menos quando `NODE_ENV !== "production"`).

### 20. `minPasswordLength: 6`

- **Arquivo:** `packages/auth/src/index.ts:25`
- **Causa raiz:** senha mínima de 6 caracteres, abaixo do recomendado pelo NIST (≥ 8).
  Sem 2FA, account takeover por força bruta fica simples.
- **Ação sugerida:** elevar para no mínimo 8 (idealmente 12+).

### 21. `middleware.test.ts` praticamente vazio

- **Arquivo:** `apps/web/src/middleware.test.ts`
- **Causa raiz:** o teste só verifica strings do regex do matcher; não cobre redirect
  sem cookie, acesso com cookie nem o bypass de `/api/`.
- **Ação sugerida:** expandir para cobrir o comportamento real do middleware.

### 22. `turbo.json` referencia segredos fora do schema de env

- **Arquivo:** `turbo.json:25`
- **Causa raiz:** `SUPABASE_ACCESS_TOKEN` e `RESEND_API_KEY` estão no `env` do task
  `build` (afetam o cache hash) mas não são validados por `packages/env`.
- **Ação sugerida:** validar essas variáveis no schema `env` ou removê-las se não forem
  necessárias ao build.

### 33. Baseline de lint quebrado

- **Arquivo:** árvore inteira (ex: `packages/ui/src/hooks/use-mobile.ts`)
- **Causa raiz:** `bun run check` (Ultracite / Biome) reporta 99 erros e 8 avisos na
  árvore atual. Sem CI (item #1), erros de lint se acumulam sem barreira. Detectado na
  auditoria de 2026-05-19.
- **Ação sugerida:** rodar `bun run fix` para o que é auto-corrigível, tratar o
  restante manualmente e incluir `check` no CI para travar regressões.
- **Status:** resolvido no PR #30 — `bun run check` agora sai em exit 0.

### 34. Baseline de testes quebrado

- **Arquivo:** `apps/web/src/lib/lead/validation.test.ts` (e mais um arquivo de teste)
- **Causa raiz:** `bun run test` falha com 8 testes em 2 arquivos na branch `main`. Ex:
  `leadFormSchema.parse` não aplica default de string vazia ao campo `company` (recebe
  `undefined`). Sem CI (item #1), regressões de teste passam sem barreira. Detectado na
  auditoria de 2026-05-19.
- **Ação sugerida:** investigar se o erro está no teste ou no `leadFormSchema`,
  corrigir os 8 testes e incluir `test` no CI.
- **Status:** resolvido no PR #31 — os 8 testes corrigidos, suíte verde.

## Severidade Baixa

### 23. `syncStatus: "conflict"` declarado mas nunca escrito

- **Arquivo:** `apps/web/src/lib/db/types.ts:16`
- **Causa raiz:** o valor `"conflict"` está no union type mas nenhum código de produção
  o atribui. Tipo morto que confunde a leitura.
- **Ação sugerida:** remover `"conflict"` do union ou implementar o estado de fato.

### 24. Tabelas/enum de scaffolding não usados

- **Arquivo:** `packages/db/src/schema`, migration `0000_smart_blockbuster.sql`
- **Causa raiz:** `todo`, `user_roles` e o enum `app_role` existem no banco e no schema
  (no caso de `todo`) mas não são referenciados em nenhum código.
- **Ação sugerida:** remover do schema e dropar via migration dedicada.

### 25. Conflito com timestamps iguais → server-wins implícito

- **Arquivo:** `apps/web/src/lib/sync/engine.ts:182`
- **Causa raiz:** o skip de sobrescrita usa `localLead.updatedAt > serverUpdatedAt`. Em
  empate de timestamp o servidor sobrescreve mesmo um lead `pending`, comportamento
  contra-intuitivo para edição offline recente.
- **Ação sugerida:** decidir explicitamente o desempate (ex: `>=` favorecendo o local
  `pending`) e documentar.

### 26. `window.dispatchEvent("lead-saved")` — coupling via evento global

- **Arquivo:** `apps/web/src/lib/lead/save-lead.ts:99`
- **Causa raiz:** evento global sem contrato de tipo, consumido em
  `sync-status-provider.tsx`. Difícil de rastrear e tipar.
- **Ação sugerida:** substituir por callback explícito ou store tipado.

### 27. `vitest.config.ts` de `apps/web` ignora arquivos `.test.tsx`

- **Arquivo:** `apps/web/vitest.config.ts:8`
- **Causa raiz:** o `include` cobre só `src/**/*.test.ts`. Testes de componente em
  `.test.tsx` seriam descartados silenciosamente.
- **Ação sugerida:** incluir `*.test.tsx` no glob.

### 28. Race condition latente no detector de conectividade

- **Arquivo:** `apps/web/src/components/sync-status-provider.tsx:79`
- **Causa raiz:** o detector é subscrito antes de `detector.start()` ser chamado
  (assíncrono, via `import()`). Eventos `online`/`offline` entre os dois pontos podem
  não ser capturados.
- **Ação sugerida:** garantir `start()` antes de qualquer janela de eventos perdidos.

### 29. Histórico de 8 versões de schema Dexie acumula upgrade morto

- **Arquivo:** `apps/web/src/lib/db/index.ts`
- **Causa raiz:** todas as funções de upgrade das versões 1–8 continuam no bundle,
  ainda que não rodem mais para usuários atuais.
- **Ação sugerida:** avaliar compactar versões antigas num baseline quando seguro.

### 30. Symlinks quebrados em `.claude/skills/`

- **Arquivo:** `.claude/skills/`
- **Causa raiz:** 22 symlinks apontavam para skills nunca instaladas (sub-skills do
  `impeccable`, `frontend-design`, `better-auth-best-practices`).
- **Status:** resolvido em 2026-05-19 junto com esta entrega de documentação.

### 31. `docs/claude/` vazio

- **Arquivo:** `docs/claude/`
- **Causa raiz:** diretório com apenas `.gitkeep`; specs e plans reais vivem em
  `docs/superpowers/`.
- **Ação sugerida:** remover `docs/claude/` ou consolidar a convenção de pastas de docs.

### 32. Sem testes de integração para as rotas admin de `packages/api`

- **Arquivo:** `packages/api/src/__tests__/`
- **Causa raiz:** os testes admin mocam o banco inteiro; queries com SQL raw
  (`leaderboard.ts`, `admin/leads.ts`) não são exercidas contra Postgres real.
- **Ação sugerida:** adicionar testes de integração com banco real (ex: container).

## Recomendações de Automação Claude Code

- **`.claude/settings.json` do projeto:** criar com allowlist de permissões para
  `bun run *` e comandos git read-only (`status`, `diff`, `log`), reduzindo prompts
  repetidos durante o desenvolvimento.
- **Hook `PostToolUse`:** opcional — rodar `bunx ultracite fix` no arquivo alterado após
  Edit/Write, mantendo formatação consistente sem passo manual.
- **Symlinks quebrados:** ver item #30, já resolvido.
- **CI:** ver item #1 — é o maior gap de automação do repositório e a maior alavanca de
  qualidade.
