# Phase 15: Offline Navigation (SW Cache) - Research

**Researched:** 2026-03-31
**Domain:** Service Workers, Workbox v7, Next.js App Router RSC caching
**Confidence:** HIGH (verified against npm registry, Google CDN, Chrome Developers docs, and Next.js discussions)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** SW pre-cacheia TODAS as rotas autenticadas no install: `/dashboard`, `/leads`, `/leads/new`, `/leads/[id]`, `/admin/*`. Garante acesso offline completo independente de quais paginas foram visitadas antes.
- **D-02:** Rotas publicas (`/auth`, `/login`, callback OAuth) e rotas de API (`/api/trpc/*`) ficam FORA do cache. O SW nao deve interferir com o fluxo de autenticacao Supabase.
- **D-03:** RSC payloads usam estrategia **network-first**: tenta servidor primeiro; se falhar, usa snapshot cacheado.
- **D-04:** Assets estaticos (`_next/static/**`, fonts, imagens) usam **cache-first**: imutaveis por versao.
- **D-05:** Implementar com **Workbox standalone** — sem `next-pwa`, sem `serwist`. Registro via `workbox-window` no client, estrategias via `workbox-strategies` no `sw.js` em `/public/sw.js`.
- **D-06:** SW file em `apps/web/public/sw.js`. Registro via `useEffect` em Client Component dedicado (`ServiceWorkerRegistrar`) incluido no `Providers` ou root layout.
- **D-07:** Quando usuario offline navega para rota NAO cacheada, SW serve `/offline` com mensagem "Sem conexao" e link para rotas disponíveis.
- **D-08:** Pagina de fallback `/offline` e rota Next.js minima (`app/(public)/offline/page.tsx`) pre-cacheada no install do SW.
- **D-09:** SW usa `skipWaiting` + `clientsClaim` para novas versoes serem ativadas imediatamente.

### Claude's Discretion

- Versao/nome do cache bucket (ex: `leads-cache-v1`)
- Timeout de network-first antes de fallback para cache (ex: 3s)
- Limite de tamanho do cache (via `ExpirationPlugin`)
- Posicionamento exato do `ServiceWorkerRegistrar` no tree de componentes
- Lucide icon e copia exata da pagina `/offline`

### Deferred Ideas (OUT OF SCOPE)

- Install prompt de PWA — fora do escopo (REQUIREMENTS.md Out of Scope)
- Background sync via SW — sync engine ja usa polling via ConnectivityDetector
- Push notifications — fora do escopo
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SW-01 | Usuario autenticado que carregou o app online pode navegar entre todas as rotas autenticadas offline sem erro de RSC payload | D-01 (pre-cache), D-03 (network-first para RSC), setCatchHandler pattern |
| SW-02 | Service Worker cacheia app shell e RSC payloads sem manifest, sem install prompt, sem funcionalidade PWA | D-05 (Workbox standalone sem next-pwa), D-06 (sw.js minimo em /public), ausencia de manifest entries |
</phase_requirements>

---

## Summary

O Service Worker desta fase tem uma responsabilidade unica: garantir que navegacao client-side entre rotas autenticadas nao quebra offline. O problema e especifico do Next.js App Router — cada navegacao client-side dispara um fetch para o RSC payload (`text/x-component`), e sem internet esse fetch falha com "Failed to fetch RSC payload".

A solucao e um `sw.js` mínimo em `/public` usando **Workbox v7.4.0 via CDN** (importScripts) com tres camadas: (1) pre-cache das rotas autenticadas no `install` event, (2) `NetworkFirst` para RSC payloads com timeout de 3s, (3) `CacheFirst` para `_next/static/**`. O SW nao gera manifest, nao ativa install prompt, nao usa `next-pwa` — e exclusivamente uma camada de cache de navegacao.

Uma complicacao critica do App Router e documentada: o query param `?_rsc=<random>` muda a cada request de navegacao. Isso significa que cache por URL exata nao funciona para RSC payloads. A estrategia correta e interceptar pela presenca do HEADER `RSC: 1` (ou `Rsc: 1`) ou pelo sufixo de pathname, ignorando o query param randomico, e armazenar com a URL normalizada (sem o `?_rsc=` param).

**Recomendacao principal:** Usar `workbox-sw` via CDN `https://storage.googleapis.com/workbox-cdn/releases/7.4.0/workbox-sw.js` dentro de `public/sw.js` sem bundler. Registrar via `workbox-window` (npm, importado no Client Component). Adicionar header `Service-Worker-Allowed: /` em `next.config.ts` para garantir scope root.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| workbox-window | 7.4.0 | Registro do SW no browser (Client Component) | Unica lib oficial para registro com lifecycle events |
| workbox-sw (CDN) | 7.4.0 | Loader de modulos Workbox dentro do sw.js | Sem bundler necessario; self-contained em /public |
| workbox-strategies | 7.4.0 | NetworkFirst + CacheFirst strategies | APIs de cache testadas e mantidas pelo Google |
| workbox-precaching | 7.4.0 | precacheAndRoute() para app shell | Gerencia revisoes e URL manipulation automaticamente |
| workbox-routing | 7.4.0 | registerRoute() + setCatchHandler() | Roteamento de fetch events com match functions |
| workbox-expiration | 7.4.0 | ExpirationPlugin para limitar tamanho de cache | Evita cache infinito de RSC payloads obsoletos |
| workbox-core | 7.4.0 | clientsClaim() para ativacao imediata | Unica dependencia para clientsClaim |

### Sem alternativas necessarias

Todos os pacotes sao da mesma suite Workbox v7.4.0 — versoes identicas, nenhuma divergencia de peer deps.

**Installation (somente no app web):**
```bash
bun add workbox-window --filter web
```

Os demais pacotes (`workbox-sw`, `workbox-strategies`, etc.) sao carregados via CDN dentro de `public/sw.js` — nao sao dependencias npm do projeto.

**Version verification (confirmado 2026-03-31):**
```
workbox-window@7.4.0     — latest
workbox-strategies@7.4.0 — latest
workbox-precaching@7.4.0 — latest
workbox-core@7.4.0       — latest
workbox-expiration@7.4.0 — latest
workbox-routing@7.4.0    — latest
workbox-sw@7.4.0         — latest
```

CDN URL confirmado acessível: `https://storage.googleapis.com/workbox-cdn/releases/7.4.0/workbox-sw.js`

---

## Architecture Patterns

### Recommended Project Structure

```
apps/web/
├── public/
│   └── sw.js                   # Service Worker (NOVO) — carrega Workbox via CDN
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   └── offline/
│   │   │       └── page.tsx    # Fallback offline (NOVO) — pagina minima
│   │   └── layout.tsx          # root layout — sem alteracoes
│   └── components/
│       ├── providers.tsx       # adicionar <ServiceWorkerRegistrar /> (EDIT)
│       └── service-worker-registrar.tsx  # Client Component (NOVO)
```

### Pattern 1: sw.js com workbox-sw CDN (sem bundler)

**O que e:** O `sw.js` e um arquivo estatico servido de `/public`. Ele usa `importScripts()` para carregar o loader `workbox-sw.js` do CDN do Google, que por sua vez disponibiliza todos os modulos Workbox via namespace global `workbox.*`.

**Quando usar:** Sempre que o SW file nao pode ser bundlado (Next.js nao processa `/public/sw.js` com webpack/turbopack).

**Exemplo:**
```javascript
// public/sw.js
// Source: https://developer.chrome.com/docs/workbox/modules/workbox-sw

importScripts(
  "https://storage.googleapis.com/workbox-cdn/releases/7.4.0/workbox-sw.js"
);

const { registerRoute, setCatchHandler, NavigationRoute } = workbox.routing;
const { NetworkFirst, CacheFirst, StaleWhileRevalidate } = workbox.strategies;
const { precacheAndRoute } = workbox.precaching;
const { ExpirationPlugin } = workbox.expiration;
const { clientsClaim } = workbox.core;

// D-09: skipWaiting + clientsClaim
// skipWaiting() foi DEPRECIADO no workbox-core v7.
// Usar self.skipWaiting() diretamente (equivalente, sem wrapper).
self.skipWaiting();
clientsClaim();
```

### Pattern 2: Pre-cache de rotas autenticadas (D-01)

**O que e:** No `install` event, o SW pre-fetcha e cacheia as rotas autenticadas para que estejam disponíveis offline sem visita previa.

**Problema critico: `?_rsc=<random>`**

O Next.js App Router adiciona um query param randomico `?_rsc=abc123` em cada request de navegacao client-side. Esse param muda a cada request — portanto cache por URL exata nao funciona para RSC payloads.

**Solucao:** Pre-cachear as rotas como URLs sem query param (HTML navigation response), nao como RSC payloads. O SW intercepta pelo HEADER `RSC: 1` para aplicar NetworkFirst em runtime, e usa a URL sem `?_rsc=` como cache key.

```javascript
// public/sw.js — continuacao

// Pre-cache do app shell: rotas autenticadas
// revision: null porque as URLs sao as proprias cache keys
precacheAndRoute([
  { url: "/dashboard", revision: "v1" },
  { url: "/leads", revision: "v1" },
  { url: "/leads/new", revision: "v1" },
  { url: "/admin/leads", revision: "v1" },
  { url: "/admin/users", revision: "v1" },
  { url: "/offline", revision: "v1" },
]);
// NOTA: revision deve ser atualizada quando o app shell mudar.
// Claude's Discretion: nome do cache bucket e versao.
```

**AVISO:** `precacheAndRoute` com URLs dinamicas (como `/leads/[id]`) nao e possivel para todas as entradas. Pre-cache cobre apenas as rotas conhecidas em build time.

### Pattern 3: NetworkFirst para RSC payloads (D-03)

**O que e:** Detectar requests de navegacao RSC pelo header `RSC: 1` e aplicar NetworkFirst com timeout de 3s (Claude's Discretion).

**Deteccao de RSC payload request:**
- Header `RSC: 1` (ou `Rsc: 1`) — presente em toda navegacao client-side do App Router
- Alternativa/complemento: `request.headers.get("Accept") === "text/x-component"`
- Query param `?_rsc=` — presente mas RANDOMICO, NAO usar como cache key

```javascript
// public/sw.js — continuacao

const RSC_CACHE = "rsc-payloads-v1";

// RSC navigation requests: NetworkFirst
registerRoute(
  ({ request }) => {
    return (
      request.headers.get("RSC") === "1" ||
      request.headers.get("Rsc") === "1"
    );
  },
  new NetworkFirst({
    cacheName: RSC_CACHE,
    networkTimeoutSeconds: 3,  // Claude's Discretion
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,         // Claude's Discretion
        maxAgeSeconds: 60 * 60, // 1 hora
      }),
    ],
  })
);
```

**Problema de cache key com `?_rsc=`:** O Workbox usa a Request URL como cache key por padrao. Com `?_rsc=random`, cada navegacao seria uma entrada diferente no cache. A solucao e criar um plugin customizado que normalize a URL removendo o `?_rsc` param antes de armazenar/buscar no cache.

```javascript
// Plugin para normalizar URL antes de usar como cache key
const rscUrlNormalizerPlugin = {
  cacheKeyWillBeUsed: async ({ request }) => {
    const url = new URL(request.url);
    url.searchParams.delete("_rsc");
    return url.toString();
  },
};

// Adicionar ao NetworkFirst strategy acima:
new NetworkFirst({
  cacheName: RSC_CACHE,
  networkTimeoutSeconds: 3,
  plugins: [
    rscUrlNormalizerPlugin,
    new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 }),
  ],
})
```

### Pattern 4: CacheFirst para assets estaticos (D-04)

```javascript
// public/sw.js — continuacao

const STATIC_CACHE = "static-assets-v1";

// Assets estaticos Next.js: CacheFirst (imutaveis por hash no nome)
registerRoute(
  ({ url }) => url.pathname.startsWith("/_next/static/"),
  new CacheFirst({
    cacheName: STATIC_CACHE,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 ano
      }),
    ],
  })
);

// Fontes Google (carregadas por next/font)
registerRoute(
  ({ url }) =>
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com",
  new CacheFirst({
    cacheName: "google-fonts-v1",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 365 * 24 * 60 * 60,
      }),
    ],
  })
);
```

### Pattern 5: Fallback offline para rotas nao cacheadas (D-07, D-08)

```javascript
// public/sw.js — continuacao
// Source: https://developer.chrome.com/docs/workbox/modules/workbox-routing

// Catch handler: serve /offline para qualquer navegacao que falhe
setCatchHandler(({ event }) => {
  if (event.request.destination === "document") {
    return caches.match("/offline");
  }
  if (
    event.request.headers.get("RSC") === "1" ||
    event.request.headers.get("Rsc") === "1"
  ) {
    // RSC payload falhou e nao esta em cache: retornar body vazio
    // O React Router vai renderizar o estado atual sem atualizar
    return new Response("", {
      status: 503,
      headers: { "Content-Type": "text/x-component" },
    });
  }
  return Response.error();
});
```

### Pattern 6: ServiceWorkerRegistrar Client Component (D-06)

```typescript
// apps/web/src/components/service-worker-registrar.tsx
"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Dynamic import: workbox-window so disponivel no browser
    import("workbox-window").then(({ Workbox }) => {
      const wb = new Workbox("/sw.js");

      // D-09: skipWaiting + clientsClaim ja configurados no sw.js
      // workbox-window detecta quando novo SW esta waiting e pode
      // notificar o usuario — mas nesta fase ativamos imediatamente
      wb.addEventListener("waiting", () => {
        wb.messageSkipWaiting();
      });

      wb.register();
    });
  }, []);

  return null;
}
```

**Posicionamento:** Adicionar `<ServiceWorkerRegistrar />` dentro de `Providers` em `apps/web/src/components/providers.tsx` (Claude's Discretion — junto com SyncStatusProvider).

### Pattern 7: next.config.ts headers para SW scope (OBRIGATORIO)

O `sw.js` esta em `/public/sw.js` — isso significa que sem header customizado, o scope padrao seria `/` (correto, pois `/public` e o root do static server). **Entretanto**, ao registrar com `scope: "/"` explicitamente no client, o browser exige que o servidor envie `Service-Worker-Allowed: /`. Sem esse header, o registro falha.

```typescript
// apps/web/next.config.ts
import "@dashboard-leads-profills/env/web";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

**Por que `Cache-Control: no-cache` no sw.js?** O browser tem seu proprio mecanismo de atualizacao de SW (verifica novo sw.js a cada 24h ou em cada navegacao). Se o sw.js for cacheado pelo browser/CDN por muito tempo, atualizacoes ficam presas. `no-cache` garante que o browser sempre valida o sw.js antes de usar.

### Anti-Patterns to Avoid

- **Cache por URL completa com `?_rsc=`:** Cada navegacao cria uma entrada diferente. Usar `cacheKeyWillBeUsed` plugin para strip do param.
- **`workbox.core.skipWaiting()`:** DEPRECIADO no v7. Usar `self.skipWaiting()` diretamente no install event ou no top-level do sw.js.
- **Interceptar `/api/trpc/*` no SW (D-02):** Romperia autenticacao e sync engine. Nunca adicionar tRPC ao cache.
- **Interceptar `/auth` ou `/login` (D-02):** Romperia fluxo OAuth Supabase.
- **Usar `next-pwa` ou `serwist` (D-05):** Decisao locked — Workbox standalone only.
- **Bundlar sw.js com webpack/turbopack:** Next.js nao processa `/public`. sw.js deve ser plain JS com `importScripts`.
- **Caching de respostas com `Cache-Control: no-store`:** Workbox NetworkFirst respeita este header e NAO cacheia. Rotas autenticadas do Next.js enviam `Cache-Control: private` — o Workbox armazena no Cache Storage (nao no HTTP cache) então isso nao e problema.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cache key normalization | Custom fetch interceptor | `cacheKeyWillBeUsed` plugin de Workbox | Edge cases de URL comparison e canonicalization |
| SW lifecycle management | navigator.serviceWorker.register() direto | `workbox-window` Workbox class | Gerencia waiting, installing, activated events corretamente |
| Cache expiration | Manual timestamp checking | `ExpirationPlugin` | Race conditions em parallel requests, IDB locking |
| Offline fallback routing | `onfetch` if/else manual | `setCatchHandler` + `NavigationRoute` | Ordem de precedencia de rotas e error propagation |
| Static asset version management | Versionar manualmente | `precacheAndRoute` com revision | Invalidacao atomica e cleanup de versoes antigas |

**Key insight:** Service worker fetch event handling tem timing constraints rigorosos — `respondWith()` deve ser chamado de forma sincrona. O Workbox garante esse timing corretamente; implementacoes manuais frequentemente falham em edge cases de timing.

---

## Common Pitfalls

### Pitfall 1: `?_rsc=<random>` Cache Pollution

**O que vai errado:** Se o SW cacheia RSC payloads pela URL completa (incluindo `?_rsc=abc123`), cada navegacao gera uma entrada separada no cache. O cache crescera indefinidamente e nunca sera aproveitado em offline (porque o `_rsc` valor nao se repete).

**Por que acontece:** O `_rsc` e um identifier randomico gerado pelo Next.js App Router para cada request de navegacao. Nao e previsivel.

**Como evitar:** Usar o plugin `cacheKeyWillBeUsed` para deletar o `_rsc` query param antes de usar a URL como cache key. Validado via Next.js discussions (#55011).

**Warning signs:** Cache Storage no DevTools mostrando dezenas de entradas para o mesmo pathname com `?_rsc=` diferente.

### Pitfall 2: skipWaiting Depreciado no v7

**O que vai errado:** Chamar `workbox.core.skipWaiting()` no sw.js — esse metodo foi REMOVIDO no v7. O sw.js vai falhar silenciosamente ou lancar erro.

**Por que acontece:** Documentacao antiga (v5/v6) e frequentemente citada. O wrapper foi depreciado no v6 e removido no v7.

**Como evitar:** Usar `self.skipWaiting()` diretamente. Confirmado na documentacao oficial workbox-core v7.

**Warning signs:** SW fica em estado "waiting" indefinidamente; usuarios precisam fechar e reabrir tabs para ver atualizacoes.

### Pitfall 3: Scope do SW sem Service-Worker-Allowed Header

**O que vai errado:** O registro do SW falha com `DOMException: Failed to register a ServiceWorker: The path of the provided scope ('/') is not under the max scope allowed ('/sw.js')`.

**Por que acontece:** O sw.js esta em `/public/sw.js` que e servido como `/sw.js`. O scope padrao de um SW e o diretorio do arquivo. Registrar com `scope: "/"` requer que o servidor confirme com o header `Service-Worker-Allowed: /`.

**Como evitar:** Adicionar `headers()` em `next.config.ts` para `/sw.js` com `Service-Worker-Allowed: /`. Ja documentado na MDN e verificado em Next.js issues (#545).

**Warning signs:** Console error durante registro no primeiro carregamento; SW nunca aparece em Application > Service Workers no DevTools.

### Pitfall 4: Conflito com Middleware Supabase Auth

**O que vai errado:** O SW intercepta requests para `/dashboard`, `/leads`, etc. e serve versoes cacheadas sem autenticacao. Usuario deslogado ve paginas autenticadas do cache.

**Por que acontece:** O middleware `updateSession` roda no servidor — o SW pode bypassar isso servindo do cache.

**Como evitar:** O SW NAO deve interceptar requests de navegacao HTML puras (destination === "document") com CacheFirst. NetworkFirst para RSC payloads significa que quando online, o servidor valida a sessao normalmente. O pre-cache e para fallback offline — nao substitui autenticacao. Para rotas nao-autenticadas (`/login`, `/auth/*`), nunca pre-cachear (D-02).

**Warning signs:** Usuario deslogado consegue ver conteudo autenticado offline; session refresh falha.

### Pitfall 5: importScripts fora do escopo síncrono

**O que vai errado:** `importScripts()` chamado dentro de event handlers (ex: dentro de `self.addEventListener('fetch', ...)`) falha com TypeError.

**Por que acontece:** A especificacao de SW so permite `importScripts()` no escopo sincrono de execucao inicial do script, ou dentro do handler do evento `install`.

**Como evitar:** Chamar `importScripts()` sempre no topo do sw.js, fora de qualquer event handler. Confirmado na documentacao do workbox-sw.

### Pitfall 6: Playwright `context.setOffline()` nao afeta SW

**O que vai errado:** Testes E2E usam `context.setOffline(true)` mas o SW continua fazendo fetch ao servidor.

**Por que acontece:** `setOffline()` do Playwright nao intercepta requests feitos dentro do service worker. Issue aberta e fechada sem resolucao completa (#2311).

**Como evitar:** Usar workaround experimental com `PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS=1` + route handler especifico para SW requests. Ou testar via DevTools manualmente para validacao humana.

### Pitfall 7: Cache-Control: no-store bloqueia NetworkFirst

**O que vai errado:** NetworkFirst strategy nao cacheia RSC payloads porque Next.js envia respostas com `Cache-Control: private, no-store` em rotas autenticadas dinamicas.

**Por que acontece:** `no-store` impede que o browser cache HTTP armazene a resposta. Workbox usa Cache Storage API (nao HTTP cache), por isso NAO e afetado por `Cache-Control: private`. Mas se a resposta incluir `Cache-Control: no-store`, o Workbox NetworkFirst por padrao respeita o header e nao armazena.

**Como evitar:** Verificar o comportamento real durante implementacao. Se necessario, adicionar `plugins: [new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [200] })]` para forcar armazenamento de respostas 200 independente de Cache-Control.

---

## Code Examples

### sw.js completo (template verificado)

```javascript
// apps/web/public/sw.js
// Source: https://developer.chrome.com/docs/workbox/modules/workbox-sw
//         https://developer.chrome.com/docs/workbox/modules/workbox-strategies
//         https://developer.chrome.com/docs/workbox/modules/workbox-precaching
//         https://developer.chrome.com/docs/workbox/modules/workbox-routing
//         https://developer.chrome.com/docs/workbox/modules/workbox-expiration
//         https://developer.chrome.com/docs/workbox/modules/workbox-core

importScripts(
  "https://storage.googleapis.com/workbox-cdn/releases/7.4.0/workbox-sw.js"
);

// Ativar imediatamente (D-09)
// self.skipWaiting() — depreciado via workbox.core no v7, usar diretamente
self.addEventListener("install", () => self.skipWaiting());
workbox.core.clientsClaim();

// Cache name prefix (Claude's Discretion)
workbox.core.setCacheNameDetails({ prefix: "leads-profills" });

// Plugin: normalizar URL removendo ?_rsc= antes de usar como cache key
const rscNormalizer = {
  cacheKeyWillBeUsed: async ({ request }) => {
    const url = new URL(request.url);
    url.searchParams.delete("_rsc");
    return url.toString();
  },
};

// 1. Pre-cache do app shell (rotas autenticadas + offline fallback)
workbox.precaching.precacheAndRoute([
  { url: "/dashboard", revision: "v1" },
  { url: "/leads", revision: "v1" },
  { url: "/leads/new", revision: "v1" },
  { url: "/admin/leads", revision: "v1" },
  { url: "/admin/users", revision: "v1" },
  { url: "/offline", revision: "v1" },
]);

// 2. NetworkFirst para RSC payloads (D-03)
workbox.routing.registerRoute(
  ({ request }) =>
    request.headers.get("RSC") === "1" || request.headers.get("Rsc") === "1",
  new workbox.strategies.NetworkFirst({
    cacheName: "rsc-payloads-v1",
    networkTimeoutSeconds: 3,
    plugins: [
      rscNormalizer,
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60,
      }),
    ],
  })
);

// 3. CacheFirst para assets estaticos Next.js (D-04)
workbox.routing.registerRoute(
  ({ url }) => url.pathname.startsWith("/_next/static/"),
  new workbox.strategies.CacheFirst({
    cacheName: "static-assets-v1",
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 365 * 24 * 60 * 60,
      }),
    ],
  })
);

// 4. CacheFirst para fontes (carregadas por next/font)
workbox.routing.registerRoute(
  ({ url }) =>
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com",
  new workbox.strategies.CacheFirst({
    cacheName: "google-fonts-v1",
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 365 * 24 * 60 * 60,
      }),
    ],
  })
);

// 5. Fallback offline: serve /offline para navegacoes que falham (D-07)
workbox.routing.setCatchHandler(({ event }) => {
  const isRsc =
    event.request.headers.get("RSC") === "1" ||
    event.request.headers.get("Rsc") === "1";

  if (isRsc) {
    return new Response("", {
      status: 503,
      headers: { "Content-Type": "text/x-component" },
    });
  }

  if (event.request.destination === "document") {
    return caches.match("/offline");
  }

  return Response.error();
});
```

### ServiceWorkerRegistrar Client Component

```typescript
// apps/web/src/components/service-worker-registrar.tsx
// Source: https://developer.chrome.com/docs/workbox/modules/workbox-window
"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    import("workbox-window").then(({ Workbox }) => {
      const wb = new Workbox("/sw.js", { scope: "/" });

      // Ativar novo SW imediatamente quando em waiting (D-09)
      wb.addEventListener("waiting", () => {
        wb.messageSkipWaiting();
      });

      wb.register();
    });
  }, []);

  return null;
}
```

### Adicionar ao Providers

```typescript
// apps/web/src/components/providers.tsx (trecho)
import { ServiceWorkerRegistrar } from "./service-worker-registrar";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider ...>
      <QueryClientProvider client={queryClient}>
        <SyncStatusProvider>{children}</SyncStatusProvider>
        <ServiceWorkerRegistrar />
        <ReactQueryDevtools />
      </QueryClientProvider>
      <Toaster richColors />
    </ThemeProvider>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `workbox.core.skipWaiting()` | `self.skipWaiting()` direto | Workbox v6 depreciado, v7 removido | sw.js quebra silenciosamente se usar o wrapper |
| PWA manifest + SW juntos | SW independente de manifest | 2023+ (App Router era) | Possivel usar SW sem PWA features |
| next-pwa como padrao | Workbox standalone ou serwist | 2023 (serwist fork) | next-pwa tem manutencao esporadica; serwist e o fork ativo |
| URL completa como cache key | URL normalizada (strip `?_rsc=`) | App Router (2023) | Necessario para evitar cache pollution com param randomico |

**Deprecated/outdated:**

- `workbox.core.skipWaiting()`: Removido no v7. Usar `self.skipWaiting()`.
- `workbox-sw` CDN v6: O URL de v6 ainda funciona mas v7 esta disponivel.
- `next-pwa`: Manutencao irregular. `serwist` e o fork ativo mas **nao e a escolha desta fase** (D-05 locked).

---

## Open Questions

1. **Cacheamento de `Cache-Control: no-store` pelo Workbox**
   - O que sabemos: Next.js envia `Cache-Control: private` em rotas autenticadas dinamicas. NetworkFirst do Workbox usa Cache Storage (nao HTTP cache).
   - O que esta unclear: Se o Workbox NetworkFirst respeita o `no-store` para recusar armazenamento em Cache Storage tambem.
   - Recomendacao: Verificar no browser DevTools durante Wave 0 se RSC payloads estao sendo armazenados. Se nao, adicionar `CacheableResponsePlugin({ statuses: [200] })`.

2. **Safari iOS: header `RSC: 1` disponivel em fetch event?**
   - O que sabemos: Safari iOS 16.4+ suporta SW. O Next.js envia o header `RSC: 1` para todos os clientes.
   - O que esta unclear: Se Safari iOS expoe todos os request headers dentro do SW fetch event (alguns headers sao filtrados em safari).
   - Recomendacao: Testar em Safari iOS durante validacao (15-02). Fallback: detectar pelo query param `_rsc` como alternativa ao header.

3. **Pre-cache de `/leads/[id]` (rotas dinamicas)**
   - O que sabemos: D-01 menciona `/leads/capture` mas o projeto tem `/leads/new` (rota de criacao). Nao existe `/leads/capture` — o correto e `/leads/new`.
   - O que esta unclear: Se leads individuais (`/leads/[id]`) devem ser pre-cacheados (impossivel sem conhecer os IDs).
   - Recomendacao: Pre-cachear apenas `/leads` e `/leads/new`. Leads individuais sao cacheados via NetworkFirst quando visitados online.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | bun scripts, next build | ✓ | 25.7.0 | — |
| Chromium | Validacao manual offline | ✓ | sistema | — |
| Playwright | Testes E2E offline (opcional) | ✗ | — | Validacao manual no DevTools |
| workbox-window npm | ServiceWorkerRegistrar | — | 7.4.0 (a instalar) | — |
| Google CDN (workbox-sw) | sw.js runtime | Precisa verificar CI | 7.4.0 | Copiar workbox-sw.js para /public |

**Missing dependencies com fallback:**
- **Playwright:** Nao instalado globalmente. Para CI, testes de SW offline serao manuais (DevTools Network throttling). Alternativa: instalar `@playwright/test` como devDep no app web se E2E for necessario.
- **Google CDN em CI/producao:** Se o ambiente de CI nao tiver acesso a `storage.googleapis.com`, o sw.js falhara ao carregar. Fallback: copiar `workbox-sw.js` e seus modulos para `/public/workbox/` e usar `modulePathPrefix` local.

---

## Validation Architecture

> `workflow.nyquist_validation: true` em .planning/config.json — secao incluida.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2 (jsdom environment) |
| Config file | `apps/web/vitest.config.ts` |
| Quick run command | `bun run test --filter web` |
| Full suite command | `bun run test` |

### Limitation critica de SW em Vitest/jsdom

Service Workers NAO sao suportados no ambiente `jsdom` do Vitest. O `navigator.serviceWorker` nao existe em jsdom. Portanto, testes unitarios automatizados do sw.js em si nao sao possiveis via Vitest.

**O que PODE ser testado automaticamente:**

- Logica de deteccao de RSC (funcoes puras extraidas do sw.js)
- `ServiceWorkerRegistrar` component: renderiza sem errar, nao registra em ambiente sem SW
- Pagina `/offline`: renderiza corretamente com elementos esperados

**O que requer validacao manual:**

- SW registra e ativa no browser real
- NetworkFirst serve do cache quando offline
- CacheFirst serve assets estaticos offline
- Fallback `/offline` aparece para rotas nao cacheadas

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SW-01 | Usuario navega entre rotas offline sem RSC error | manual (browser) | — (sem suporte jsdom) | ✗ — Wave 0: validacao manual |
| SW-01 | RSC URL normalizer strip `?_rsc=` param | unit | `bun run test --filter web` | ✗ Wave 0 |
| SW-01 | ServiceWorkerRegistrar nao crasha em SSR/jsdom | unit | `bun run test --filter web` | ✗ Wave 0 |
| SW-02 | Pagina /offline renderiza sem manifest link | unit | `bun run test --filter web` | ✗ Wave 0 |
| SW-02 | sw.js nao contem nenhuma referencia a manifest | smoke (grep) | `grep -r "manifest" apps/web/public/sw.js` | ✗ Wave 0 |

### Sampling Rate

- **Per task commit:** `bun run test --filter web` (unit tests de funcoes puras)
- **Per wave merge:** `bun run test` (full suite) + validacao manual no Chromium com DevTools offline
- **Phase gate:** Full suite green + validacao manual offline antes de `/gsd:verify-work`

### Validacao Manual Protocol (para SW-01)

O plano 15-02 deve incluir este checklist de validacao manual:

1. Abrir o app online no Chromium (`localhost:3001`)
2. Navegar para `/dashboard`, `/leads`, `/leads/new` (para popular o cache)
3. DevTools > Application > Service Workers — confirmar SW ativo e controlando
4. DevTools > Application > Cache Storage — confirmar entradas para cada rota
5. DevTools > Network > Throttling: Offline
6. Navegar entre `/dashboard` e `/leads` — sem "Failed to fetch RSC payload"
7. Navegar para rota nao visitada — confirmar pagina `/offline` aparece
8. Voltar online — confirmar NetworkFirst volta a buscar dados frescos
9. Repetir em Safari iOS (via BrowserStack ou dispositivo fisico)

### Wave 0 Gaps

- [ ] `apps/web/src/lib/sw/__tests__/rsc-normalizer.test.ts` — testa `cacheKeyWillBeUsed` plugin logic
- [ ] `apps/web/src/components/__tests__/service-worker-registrar.test.tsx` — testa render sem crash em jsdom
- [ ] `apps/web/src/app/(public)/offline/__tests__/page.test.tsx` — testa elementos basicos da pagina offline

---

## Project Constraints (from CLAUDE.md)

Diretivas obrigatorias que o planner DEVE verificar na implementacao:

| Directiva | Impacto na fase |
|-----------|----------------|
| `No any — usar unknown` | sw.js usa JS puro (sem TypeScript) — sem impacto direto. Componentes TS devem usar unknown |
| `No console.log em producao` | sw.js NAO deve ter console.log. Usar `workbox.setConfig({ debug: false })` |
| `Indentacao: tabs (Biome)` | sw.js e JS puro fora do Biome. Componentes TS devem usar tabs |
| `Quotes: double quotes (Biome)` | Aplicavel nos componentes TS |
| `Imports: path-based, nao barrel` | `import("workbox-window")` e path direto — ok |
| `CSS classes: cn() nunca string concat` | Pagina /offline deve usar cn() se tiver classes condicionais |
| `Commits: Conventional Commits em Portugues` | `feat: adicionar service worker para navegacao offline` |
| `NAO e PWA` | sw.js sem manifest entries, sem install prompt, sem beforeinstallprompt handler |
| `Hydration + localStorage: nunca em useState initializer` | ServiceWorkerRegistrar usa apenas useEffect — ok |
| `Biome 2.4 Ultracite` | Rodar `bun run check` antes de commitar componentes TS |

---

## Sources

### Primary (HIGH confidence)

- `https://developer.chrome.com/docs/workbox/modules/workbox-window` — API completa do workbox-window, register(), messageSkipWaiting(), eventos
- `https://developer.chrome.com/docs/workbox/modules/workbox-strategies` — NetworkFirst (networkTimeoutSeconds), CacheFirst
- `https://developer.chrome.com/docs/workbox/modules/workbox-precaching` — precacheAndRoute(), formato do manifest, URL manipulation
- `https://developer.chrome.com/docs/workbox/modules/workbox-routing` — registerRoute(), setCatchHandler(), NavigationRoute
- `https://developer.chrome.com/docs/workbox/modules/workbox-expiration` — ExpirationPlugin (maxEntries, maxAgeSeconds)
- `https://developer.chrome.com/docs/workbox/modules/workbox-core` — clientsClaim(), skipWaiting deprecation
- `https://developer.chrome.com/docs/workbox/handling-service-worker-updates` — skipWaiting + clientsClaim risks
- `npm view workbox-*@latest version` — versoes verificadas em 2026-03-31: todas 7.4.0
- `https://storage.googleapis.com/workbox-cdn/releases/7.4.0/workbox-sw.js` — CDN v7.4.0 confirmado acessivel

### Secondary (MEDIUM confidence)

- `https://github.com/vercel/next.js/discussions/55011` — `?_rsc=` param e randomico, muda a cada navegacao
- `https://developer.chrome.com/docs/workbox/modules/workbox-sw` — importScripts pattern, modulos on-demand
- `https://github.com/microsoft/playwright/issues/2311` — `context.setOffline()` nao afeta SW; workaround com experimental flag
- MDN `Service-Worker-Allowed` header — necessario quando scope > diretorio do sw.js

### Tertiary (LOW confidence — verificar durante implementacao)

- WebSearch: RSC `Cache-Control: no-store` vs Cache Storage behavior — NAO verificado contra docs oficiais; checar em runtime
- WebSearch: Safari iOS header filtering no SW fetch event — flag para testar em 15-02

---

## Metadata

**Confidence breakdown:**

- Standard Stack: HIGH — versoes verificadas contra npm registry e CDN em 2026-03-31
- Architecture patterns: HIGH — baseados em Chrome Developers docs oficiais
- RSC detection logic: MEDIUM — confirmado por Next.js community discussions, nao por docs oficiais do Next.js
- `?_rsc=` param behavior: MEDIUM — confirmado por Next.js discussion #55011 (comunidade)
- Playwright offline testing: MEDIUM — issue #2311 fechada com workaround documentado
- Cache-Control interaction: LOW — comportamento especifico de `no-store` em Cache Storage API precisa verificacao em runtime

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (Workbox e estavel; Next.js App Router RSC protocol e estavel no v15/16)
