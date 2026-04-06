# Claude Entry Point

## Fonte Canonica

- Use `/home/othavio/Work/profills/sistema-coleta-de-lead/CLAUDE.md` como referencia principal de arquitetura, produto e convencoes.
- Este arquivo existe apenas para manter Claude alinhado ao contexto canonico do repo.
- Se houver conflito entre texto e implementacao, siga o codigo-fonte.

## Resumo Operacional

- Projeto: sistema offline-first de coleta de leads em eventos.
- Stack ativa: Next.js + tRPC + Supabase + Dexie + Drizzle.
- Auth real: Supabase.
- Endpoint de conectividade usado pelo app: `/api/health`.
- Service worker: cache para navegacao offline, nao PWA completa.
- `packages/auth` existe, mas nao e a superficie usada pelo app/API hoje.

## Regras de Trabalho

- Consulte primeiro o codigo relevante antes de afirmar comportamento do sistema.
- Ao mexer em offline/sync, preserve o fluxo Dexie -> syncQueue -> push/pull.
- Ao mexer em auth, use como referencia `apps/web/src/lib/supabase/*`, `apps/web/src/middleware.ts` e `packages/api/src/context.ts`.
- Ao mexer em UI, prefira componentes compartilhados em `packages/ui` com imports path-based.
