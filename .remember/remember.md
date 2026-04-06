# Handoff

## State
Branch `ajustes-ui-1`. Sprint 2 completa: todas as 6 tasks entregues (P1-8, P1-9, P1-10, P1-13, P1-11, P1-12). Último commit `763d8a2`. 205 testes passando, zero regressões. Dexie agora na v8 com tabelas `photoUploadMeta` e `syncMeta`. `startSync` retorna `{ stop, retry }` (breaking change já migrada nos testes).

## Next
1. Abrir PR de `ajustes-ui-1` → `main` com os 9 commits da Sprint 2.
2. Iniciar Sprint 3 (quando definida) — sem backlog pendente da Sprint 2.

## Context
`SyncErrorBanner` criado em `apps/web/src/components/sync-error-banner.tsx` mas ainda não montado em nenhuma página — precisa ser adicionado ao layout do app. `deriveSyncState` usa `!= null` (loose) para `retryAttempt` pois testes legados passam objetos sem o campo.
