# Phase 15: Offline Navigation (SW Cache) - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 15 adiciona um Service Worker mínimo ao app que cacheia app shell e RSC payloads para que a navegação entre rotas autenticadas funcione offline. A entrega é navegação sem "Failed to fetch RSC payload" mesmo sem internet. Sem manifest, sem install prompt, sem funcionalidade PWA — o SW é exclusivamente uma camada de cache de navegação.

</domain>

<decisions>
## Implementation Decisions

### Escopo das rotas pre-cacheadas
- **D-01:** O SW pre-cacheia **todas as rotas autenticadas** no install: `/dashboard`, `/leads`, `/leads/capture` e `/admin/*`. Garante que qualquer usuário — vendedor ou admin — tenha acesso offline completo independente de quais páginas visitou antes.
- **D-02:** Rotas públicas (`/auth`, `/login`, callback OAuth) e rotas de API (`/api/trpc/*`) ficam **fora do cache**. O SW não deve interferir com o fluxo de autenticação Supabase.

### Estratégia de cache para RSC payloads
- **D-03:** RSC payloads (requests de navegação com `Accept: text/x-component` ou `?_rsc=` query param) usam estratégia **network-first**: tenta o servidor primeiro; se falhar (offline ou timeout), usa o snapshot cacheado. Dados sempre frescos quando online.
- **D-04:** Assets estáticos (`_next/static/**`, fonts, imagens) usam **cache-first**: sem necessidade de ir ao servidor, esses assets são imutáveis por versão.

### SW Framework
- **D-05:** Implementar com **Workbox standalone** — sem `next-pwa`, sem `serwist`. Registro via `workbox-window` no client, estratégias via `workbox-strategies` no `sw.js` em `/public/sw.js`. Nenhum manifest gerado, nenhum install prompt ativado.
- **D-06:** O SW file fica em `apps/web/public/sw.js`. Registro via `useEffect` em um Client Component dedicado (`ServiceWorkerRegistrar`) que é incluído no `Providers` ou no root layout.

### Fallback offline
- **D-07:** Quando o usuário offline navega para uma rota **não cacheada**, o SW serve uma página `/offline` simples com mensagem de "Sem conexão" e link para as rotas disponíveis. Evita o erro padrão do browser.
- **D-08:** A página de fallback `/offline` é uma rota Next.js mínima (`app/(public)/offline/page.tsx`) pre-cacheada no install do SW.

### Cache update strategy
- **D-09:** O SW usa `skipWaiting` + `clientsClaim` para que novas versões do cache sejam ativadas imediatamente — sem aguardar nova aba ou reload manual. Alinhado com success criteria #4: "atualiza transparentemente sem intervenção do usuário".

### Claude's Discretion
- Versão/nome do cache bucket (ex: `leads-cache-v1`)
- Timeout de network-first antes de fallback para cache (ex: 3s)
- Limite de tamanho do cache (se necessário, remover entradas antigas via `expiration plugin`)
- Posicionamento exato do `ServiceWorkerRegistrar` no tree de componentes
- Lucide icon e cópia exata da página `/offline`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Escopo e requisitos da fase
- `.planning/ROADMAP.md` — Phase 15 goal, success criteria, plan breakdown (15-01 e 15-02)
- `.planning/REQUIREMENTS.md` — `SW-01` (navegação offline sem RSC error) e `SW-02` (SW sem PWA/manifest)
- `.planning/PROJECT.md` — constraint offline-first, Out of Scope: PWA/manifest/install prompt, nota em CLAUDE.md sobre SW apenas como cache

### App shell e estrutura de rotas (leitura obrigatória)
- `apps/web/src/app/layout.tsx` — root layout (ponto de registro do ServiceWorkerRegistrar)
- `apps/web/src/app/(app)/layout.tsx` — layout autenticado (rotas a serem pre-cacheadas)
- `apps/web/src/app/(app)/dashboard/` — rota autenticada
- `apps/web/src/app/(app)/leads/` — rota autenticada
- `apps/web/src/app/(app)/admin/` — rota autenticada
- `apps/web/src/middleware.ts` — matcher do middleware (garantir que SW scope não conflite com updateSession)

### Providers e contexto de sync
- `apps/web/src/components/providers.tsx` — SyncStatusProvider atual (ponto de integração do ServiceWorkerRegistrar)
- `apps/web/next.config.ts` — configuração Next.js (verificar se precisa de headers para SW scope)

### CLAUDE.md offline-first section
- `CLAUDE.md` (projeto) — seção "Offline-First Architecture", constraints de Service Worker, limitação do Next.js App Router e solução documentada

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/web/src/components/providers.tsx` — Client Component que wraps toda a árvore autenticada; bom lugar para incluir `ServiceWorkerRegistrar`
- `apps/web/src/components/sync-status-provider.tsx` — padrão de Client Component com `useEffect` para lifecycle do browser; mesmo padrão para registro do SW
- `apps/web/src/lib/sync/connectivity.ts` — ConnectivityDetector já detecta online/offline; SW complementa sem duplicar

### Established Patterns
- `useEffect` para operações client-only (Phase 13 pattern) — registro do SW segue o mesmo padrão
- Sem arquivos em `public/` atualmente — sw.js será o primeiro arquivo em `/public`
- `next.config.ts` mínimo — pode precisar adicionar `headers()` para `Service-Worker-Allowed` se necessário

### Integration Points
- Root layout `app/layout.tsx` → `Providers` → onde `ServiceWorkerRegistrar` será adicionado
- Middleware matcher exclui `_next/static|_next/image|icon.png` — o SW deve alinhar seu scope para não conflitar
- Rotas autenticadas em `(app)/` — escopo do pre-cache

</code_context>

<specifics>
## Specific Ideas

- O SW deve ser **mínimo**: pre-cache de rotas autenticadas + cache-first para assets estáticos + network-first para RSC payloads. Sem features extras.
- A página `/offline` é um edge case (usuário offline em rota não visitada) — deve ser simples: mensagem clara + link para `/dashboard` ou `/leads`.
- Safari iOS persiste SW por ~7 dias sem uso — aceitável para o cenário de evento (uso intensivo durante o evento).

</specifics>

<deferred>
## Deferred Ideas

- Install prompt de PWA — explicitamente fora do escopo (REQUIREMENTS.md Out of Scope)
- Background sync via SW — o sync engine já usa polling via ConnectivityDetector, não precisa de SW Background Sync API
- Push notifications — fora do escopo (Out of Scope)

</deferred>

---

*Phase: 15-offline-navigation-sw-cache*
*Context gathered: 2026-03-31*
