# Phase 15: Offline Navigation (SW Cache) - Discussion Log

**Date:** 2026-03-31
**Workflow:** discuss-phase

---

## Gray Areas Presented

1. Escopo das rotas pre-cacheadas
2. Estratégia de cache para RSC payloads
3. Fallback offline page
4. SW framework

All 4 areas selected by user for discussion.

---

## Q&A Log

### Area: Escopo das rotas

**Q:** Quais rotas autenticadas devem ser pre-cacheadas no install do Service Worker?

| Option | Description |
|--------|-------------|
| Todas as autenticadas ✓ | Pre-cacheia /dashboard, /leads, /leads/capture e /admin/* |
| Só rotas de vendedor | Exclui admin |
| Só rota crítica | Apenas /leads/capture |

**Selected:** Todas as autenticadas (Recomendado)

---

### Area: Estratégia RSC payload

**Q:** Como o SW deve responder quando o Next.js busca RSC payloads para navegação entre rotas?

| Option | Description |
|--------|-------------|
| Network-first ✓ | Tenta servidor, usa cache se offline |
| Stale-while-revalidate | Serve cache imediatamente + atualiza em background |
| Cache-first | Só vai ao servidor se não há cache |

**Selected:** Network-first (Recomendado)

---

### Area: Fallback offline

**Q:** O que acontece quando o usuário está offline e navega para uma rota que não foi cacheada?

| Option | Description |
|--------|-------------|
| Página /offline simples ✓ | Mensagem amigável com rotas disponíveis |
| Erro padrão do browser | Sem fallback, mais simples |

**Selected:** Página /offline simples (Recomendado)

---

### Area: SW Framework

**Q:** Como o Service Worker deve ser implementado?

| Option | Description |
|--------|-------------|
| Workbox standalone ✓ | Sem next-pwa, sem serwist, configuração manual |
| serwist | Fork de next-pwa sem manifest forçado |
| Hand-written SW | Zero deps, controle total, mais código |

**Selected:** Workbox standalone (Recomendado)

---

*Discussion completed: 2026-03-31*
