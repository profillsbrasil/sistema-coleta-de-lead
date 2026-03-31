---
phase: 15-offline-navigation-sw-cache
plan: "01"
subsystem: offline
tags: [service-worker, workbox, cache, offline, navigation, rsc]
dependency_graph:
  requires: []
  provides: [SW-01, SW-02]
  affects: [providers.tsx, next.config.ts]
tech_stack:
  added:
    - workbox-window@7.4.0 (registro do SW via workbox-window)
    - Workbox v7.4.0 CDN (runtime no sw.js via importScripts)
  patterns:
    - TDD RED→GREEN para logica pura extraida (normalizeRscUrl)
    - dynamic import de workbox-window dentro de useEffect (lazy load)
    - Named export para Client Components (ServiceWorkerRegistrar)
key_files:
  created:
    - apps/web/public/sw.js
    - apps/web/src/components/service-worker-registrar.tsx
    - apps/web/src/lib/sw/rsc-url-normalizer.ts
    - apps/web/src/app/(public)/offline/page.tsx
    - apps/web/src/lib/sw/__tests__/rsc-url-normalizer.test.ts
    - apps/web/src/components/__tests__/service-worker-registrar.test.ts
    - apps/web/src/app/(public)/offline/__tests__/page.test.ts
  modified:
    - apps/web/next.config.ts
    - apps/web/src/components/providers.tsx
    - apps/web/package.json
decisions:
  - "Cache buckets: rsc-payloads-v1, static-assets-v1, google-fonts-v1"
  - "NetworkFirst timeout de 3s para RSC payloads (balanco entre freshness e UX offline)"
  - "maxEntries: 50 RSC, 200 static, 20 fonts — baseado em escopo de rotas do projeto"
  - "maxAgeSeconds: 1h RSC, 1 ano static/fonts — imutabilidade por hash em _next/static"
  - "ServiceWorkerRegistrar posicionado como sibling do Toaster, fora do QueryClientProvider"
metrics:
  duration_seconds: 345
  completed_date: "2026-03-31"
  tasks_completed: 4
  files_created: 9
  files_modified: 3
---

# Phase 15 Plan 01: Service Worker Offline Navigation Summary

Service Worker minimo com Workbox v7.4.0 via CDN que cacheia RSC payloads e assets estaticos para navegacao offline sem "Failed to fetch RSC payload" no Next.js App Router.

## Arquivos Criados/Modificados

| Arquivo | O que faz |
|---------|-----------|
| `apps/web/public/sw.js` | Service Worker plain JS com Workbox CDN: precache de 7 rotas autenticadas, NetworkFirst para RSC payloads (3s timeout), CacheFirst para _next/static e fonts, setCatchHandler servindo /offline para navegacoes sem cache |
| `apps/web/src/components/service-worker-registrar.tsx` | Client Component (named export) que registra o SW via workbox-window no useEffect, com listener para ativar nova versao imediatamente (skipWaiting) |
| `apps/web/src/lib/sw/rsc-url-normalizer.ts` | Funcao pura `normalizeRscUrl(urlString: string): string` que remove `?_rsc=` da URL para uso como cache key normalizada |
| `apps/web/src/app/(public)/offline/page.tsx` | Server Component de fallback offline pre-cacheado no install do SW, com mensagem "Sem conexao" e link para /dashboard |
| `apps/web/src/lib/sw/__tests__/rsc-url-normalizer.test.ts` | 5 testes unitarios da funcao normalizeRscUrl cobrindo remocao de _rsc, preservacao de outros params, idempotencia e URL sem _rsc |
| `apps/web/src/components/__tests__/service-worker-registrar.test.ts` | 2 testes verificando named export e ausencia de default export |
| `apps/web/src/app/(public)/offline/__tests__/page.test.ts` | 3 testes verificando default export e ausencia de propriedade manifest |
| `apps/web/next.config.ts` | Adicionado `async headers()` com `Service-Worker-Allowed: /` e `Cache-Control: no-store` para /sw.js |
| `apps/web/src/components/providers.tsx` | Integrado `<ServiceWorkerRegistrar />` como sibling do `<Toaster />` dentro do ThemeProvider |
| `apps/web/package.json` | Adicionado `workbox-window@7.4.0` como dependencia |

## Decisoes Tomadas

**Cache buckets:**
- `rsc-payloads-v1` — RSC payloads (network-first, 50 entradas, 1 hora)
- `static-assets-v1` — `_next/static/**` (cache-first, 200 entradas, 1 ano)
- `google-fonts-v1` — fonts Google (cache-first, 20 entradas, 1 ano)

**networkTimeoutSeconds: 3** — timeout de 3 segundos antes de fallback ao cache; suficiente para conexoes lentas de congresso (3G) sem travar a UX.

**Deteccao de RSC requests:** via `request.headers.get("RSC") === "1"` (header enviado pelo App Router em toda navegacao client-side) em vez de `?_rsc=` no pathname — mais robusto porque o header e sempre presente, o query param pode variar.

**ServiceWorkerRegistrar fora do QueryClientProvider:** o componente nao precisa de query context, por isso e sibling do Toaster dentro do ThemeProvider — evita re-render desnecessario se o QueryClient for substituido.

**self.skipWaiting() em vez de workbox.core.skipWaiting():** API `workbox.core.skipWaiting()` foi removida no Workbox v7; usar `self.skipWaiting()` diretamente (Web API padrao).

## Desvios do Plano

### Auto-fixed Issues

**1. [Rule 3 - Blocking] workbox-window instalado antecipadamente no Task 2**
- **Encontrado em:** Task 2 (RED/GREEN de ServiceWorkerRegistrar)
- **Problema:** Vitest nao conseguia resolver `import("workbox-window")` durante teste — modulo nao instalado ate o Task 4
- **Correcao:** Instalado `workbox-window@7.4.0` como parte do Task 2 (em vez de esperar o Task 4)
- **Efeito colateral detectado:** `bun add --filter web` instalou no workspace root em vez do `apps/web`; corrigido com `bun remove` + `bun add --cwd apps/web`
- **Arquivos:** `apps/web/package.json`, root `package.json` (revertido)

**2. [Rule 1 - Bug] Biome issues corrigidos em service-worker-registrar.tsx e offline/page.tsx**
- **Encontrado em:** Task 4 (verificacao pos-edicao)
- **Problemas:**
  - `service-worker-registrar.tsx`: early return sem bloco (`lint/style/useBlockStatements`)
  - `offline/page.tsx`: CSS classes fora de ordem (`lint/nursery/useSortedClasses`)
- **Correcao:** Expandido `if` para bloco com chaves em linhas separadas; reordenadas classes Tailwind
- **Arquivos:** `apps/web/src/components/service-worker-registrar.tsx`, `apps/web/src/app/(public)/offline/page.tsx`

## Estado dos Testes

```
Test Files  21 passed (21)
     Tests  159 passed (159)
```

- 5 novos testes: `rsc-url-normalizer.test.ts`
- 2 novos testes: `service-worker-registrar.test.ts`
- 3 novos testes: `offline/__tests__/page.test.ts`
- Total de novos testes: 10

## Known Stubs

Nenhum. Todos os arquivos criados sao implementacoes funcionais ou testes completos.

## Proximos Passos

Executar `15-02-PLAN.md` para validacao manual cross-browser:
- Testar no Chrome DevTools (offline mode) navegacao entre /dashboard, /leads, /leads/new
- Confirmar ausencia de "Failed to fetch RSC payload" ao navegar offline
- Testar fallback para /offline quando rota nao esta cacheada
- Validar comportamento no Safari iOS (limite de 7 dias de persistencia do SW)

## Commits

| Hash | Descricao |
|------|-----------|
| `01a38f6` | `test(15-01): adicionar testes TDD para normalizeRscUrl (RED→GREEN)` |
| `649fd7b` | `feat(15-01): adicionar ServiceWorkerRegistrar e instalar workbox-window@7.4.0` |
| `a63cb3a` | `chore(15-01): mover workbox-window para apps/web (remover do root)` |
| `ccbfae2` | `feat(15-01): criar pagina /offline de fallback para navegacao sem conexao` |
| `1261d5d` | `feat(15-01): integracao completa do Service Worker offline` |

## Self-Check: PASSED

Todos os 9 arquivos verificados como presentes. Todos os 5 commits verificados como existentes.
