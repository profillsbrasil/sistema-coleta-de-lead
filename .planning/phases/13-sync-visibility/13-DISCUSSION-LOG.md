# Phase 13: Sync Visibility - Discussion Log

**Session:** 2026-03-30
**Mode:** discuss (interactive)

---

## Areas Selected

All 4 areas selected: Estado compartilhado, Placement & forma visual, Set de estados, Erros & retry.

---

## Area 1: Estado compartilhado

**Q: Como expor o status do engine para os componentes?**
Options: React Context via SyncInitializer / Module-level observable / Extend ConnectivityDetector
**Selected:** React Context via SyncInitializer

**Q: Quais campos o SyncStatusProvider deve rastrear?**
Options: 5 campos completos / 3 campos mínimos
**Selected:** 5 campos completos (isOnline, isSyncing, pendingCount, lastSync, lastError)

---

## Area 2: Placement & forma visual

**Q: Onde o indicador de sync deve ficar?**
Options: AppTopbar lado direito / Sidebar footer / Ambos
**Selected:** Sidebar footer (perto do user menu)

**Q: Qual forma visual no sidebar footer?**
Options: Ícone colorido + texto curto / Ícone animado somente
**Selected:** Ícone animado somente (tooltip para detalhe)

**Q: Integrado no sidebar-user-menu ou componente separado?**
Options: Integrado no sidebar-user-menu / Componente separado acima
**Selected:** Integrado no sidebar-user-menu

---

## Area 3: Set de estados

**Q: Precedência quando múltiplos estados coexistem?**
Options: Offline > Syncing > Error > Pending > Synced / Offline > Pending > Syncing > Error > Synced
**Selected:** Offline > Syncing > Error > Pending > Synced

**Q: Distinguir synced vs stale?**
Options: Não distinguir stale — synced é synced / Distinguir: verde (<5min) vs cinza (stale)
**Selected:** Não distinguir stale

---

## Area 4: Erros & retry

**Q: Quando mostrar estado de erro?**
Options: Após todas as 5 tentativas / Após a 1ª falha
**Selected:** Após todas as 5 tentativas falharem

**Q: Como resetar o estado de erro?**
Options: Automático no próximo sync bem-sucedido / Automático + botão manual de retry
**Selected:** Automático no próximo sync bem-sucedido (ENH-10 permanece no backlog)

---

*Discussion completed: 2026-03-30*
