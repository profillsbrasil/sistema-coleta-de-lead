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
- Handler Better Auth está em `src/app/api/auth/[...all]/route.ts` via `toNextJsHandler`. Middleware em `src/middleware.ts` usa `getSessionCookie` (Edge-safe, sem hit DB).

## Rotas tipadas (Next 16)

- O projeto usa o workaround `href as unknown as "/"` para rotas dinâmicas por causa da
  checagem de rota tipada do Next 16. É dívida conhecida (ver `docs/tech-debt.md`) — não
  propague para código novo sem necessidade.

## Service worker

- `public/sw.js` faz cache de navegação offline. Não é PWA completa: sem manifest de
  instalação, sem install prompt, sem background sync.
