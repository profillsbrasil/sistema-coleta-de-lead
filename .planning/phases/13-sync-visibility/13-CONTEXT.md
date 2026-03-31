# Phase 13: Sync Visibility - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 13 torna o estado offline-first observável no shell autenticado sem bloquear a captura de leads. A entrega é um indicador de status de sync integrado ao sidebar footer que diferencia os estados reais de runtime do engine. Novas capacidades — retry manual, push notifications, background sync — são fases/backlog separados.

</domain>

<decisions>
## Implementation Decisions

### Estado compartilhado (State Management)
- **D-01:** `SyncInitializer` em `providers.tsx` é promovido a `SyncStatusProvider` — vira um React Context Provider que rastreia o status do engine e injeta via Context.
- **D-02:** O Context expõe 5 campos: `isOnline: boolean`, `isSyncing: boolean`, `pendingCount: number`, `lastSync: string | null`, `lastError: string | null`.
- **D-03:** `pendingCount` é derivado via `useLiveQuery(() => db.syncQueue.count())` diretamente no Provider — leitura reativa do Dexie sem polling.
- **D-04:** O engine expõe callbacks/setters para que o Provider atualize `isSyncing`, `lastSync` e `lastError` durante o ciclo de sync. O `isOnline` continua derivado do `ConnectivityDetector`.

### Placement & Forma Visual
- **D-05:** O indicador fica no `sidebar-user-menu.tsx` (sidebar footer), integrado ao componente existente — não cria fragmentação no footer.
- **D-06:** Forma visual: ícone animado somente (sem texto). Estados visuais:
  - Offline → ícone vermelho/desconectado
  - Syncing → ícone girando (spin animation)
  - Error → ícone de aviso/warning
  - Pending → ícone neutro com badge de contagem (pendingCount)
  - Synced → ícone verde/check
- **D-07:** Tooltip no ícone expõe o detalhe (ex: "Offline", "Sincronizando...", "3 pendentes", "Erro no último sync", "Atualizado há 2min"). Tooltip é o único lugar onde texto aparece.

### Set de Estados e Precedência
- **D-08:** Precedência quando múltiplos estados coexistem: `Offline > Syncing > Error > Pending > Synced`.
- **D-09:** Estado "stale" não é distinguido — synced é synced independente de quando foi. Stale implícito só aparece quando há pendentes ou erro (estados separados).
- **D-10:** `lastSync` é preservado no `localStorage` (já existe `lastSyncTimestamp`) para sobreviver a page reloads.

### Erros & Retry
- **D-11:** Estado de erro (`lastError`) é definido apenas após todas as 5 tentativas (`maxRetries`) falharem — erros transitórios não aparecem no indicador.
- **D-12:** `lastError` é zerado automaticamente quando o próximo ciclo de sync completar sem erro. Sem botão de retry manual (ENH-10 permanece no backlog).
- **D-13:** O indicador não dispara toasts. Toasts de conflito/update que já existem no engine (`toast.info(...)` em `pullChanges`) permanecem, mas nenhum novo toast de status é adicionado.

### Claude's Discretion
- Ícone específico para cada estado (Lucide icons já instalados — escolha do agente)
- Duração e easing da animação de spin no estado syncing
- Tamanho do badge de pendingCount e threshold para mostrar (ex: só se > 0)
- Exato posicionamento do ícone dentro do sidebar-user-menu (antes/depois do avatar)

</decisions>

<specifics>
## Specific Ideas

- O indicador não deve competir visualmente com o nome/avatar do usuário no footer — ícone discreto, fora do foco principal.
- O tooltip é o mecanismo de detalhe — o ícone sozinho deve ser compreensível mesmo sem hover (campo com luz solar, sem hover em mobile).
- No mobile a sidebar fecha após navegação (Phase 09) — o indicador fica visível enquanto a sidebar está aberta, o que é suficiente.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Escopo e requisitos da fase
- `.planning/ROADMAP.md` — Phase 13 goal, success criteria, plan breakdown (13-01 e 13-02)
- `.planning/REQUIREMENTS.md` — `ENH-02` e `ENH-08` — requisitos de conectividade e sync status
- `.planning/PROJECT.md` — constraint offline-first, key decisions de layout (D-01 sidebar), lista de tech debt ativo

### Sync engine (leitura obrigatória antes de tocar no engine)
- `apps/web/src/lib/sync/engine.ts` — sync cycle, retry logic, isSyncing flag, startSync() return
- `apps/web/src/lib/sync/connectivity.ts` — ConnectivityDetector interface e subscribe pattern
- `apps/web/src/lib/sync/constants.ts` — SYNC_CONFIG.maxRetries e pollIntervalMs

### Shell e componentes afetados
- `apps/web/src/components/providers.tsx` — SyncInitializer atual (ponto de transformação para SyncStatusProvider)
- `apps/web/src/components/sidebar-user-menu.tsx` — destino do indicador no footer
- `apps/web/src/app/(app)/layout.tsx` — Server Component que renderiza o shell autenticado

### Componente de staleness existente (referência)
- `apps/web/src/components/staleness-indicator.tsx` — componente legado que pode ser substituído ou reutilizado

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/web/src/lib/sync/connectivity.ts`: `ConnectivityDetector` com `isOnline` e `subscribe()` — reutilizar para isOnline no Provider
- `apps/web/src/components/staleness-indicator.tsx`: exibe `lastSync` com `relativeTime()` — pode ser incorporado ao tooltip do novo indicador
- `apps/web/src/lib/lead/relative-time.ts`: helper `relativeTime()` para exibição de tempo relativo no tooltip
- Dexie `db.syncQueue`: tabela observável via `useLiveQuery` para `pendingCount`

### Established Patterns
- `SyncInitializer` como componente React dentro de `Providers` — ponto natural para virar Provider
- `useLiveQuery` já em uso no projeto (Dexie react-hooks instalado) para queries reativas
- Lucide icons já instalados e usados em toda a UI — não instalar nova lib de ícones
- Tooltip do shadcn já disponível em `packages/ui` — usar para o detalhe textual do indicador
- `localStorage.lastSyncTimestamp` já existe como persistência de lastSync entre sessões

### Integration Points
- `engine.ts`: precisa exportar callbacks (ou retornar status da `startSync()`) para o Provider atualizar `isSyncing`, `lastSync` e `lastError`
- `providers.tsx`: `SyncInitializer` → `SyncStatusProvider` com `SyncStatusContext`
- `sidebar-user-menu.tsx`: consumir `useSyncStatus()` hook para renderizar o ícone de status
- `(app)/layout.tsx`: nenhuma mudança esperada — Provider já está em `providers.tsx` que é usado acima

</code_context>

<deferred>
## Deferred Ideas

- **ENH-10 (backlog):** Botão de retry manual — foi considerado mas mantido no backlog. Phase 13 usa apenas reset automático por sync bem-sucedido.
- **Stale/aging timeout:** Distinguir "synced recente" vs "synced há muito tempo" com cor — decidido não fazer em Phase 13 (adicionaria complexidade sem valor claro no cenário de evento).
- **AppTopbar placement:** Colocar o indicador no topbar em vez do sidebar footer foi considerado e descartado — sidebar footer é mais discreto e não fragmenta o topbar.

</deferred>

---

*Phase: 13-sync-visibility*
*Context gathered: 2026-03-30*
