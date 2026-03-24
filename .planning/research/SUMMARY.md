# Project Research Summary

**Project:** Sistema Coleta de Lead — Dashboard Leads Profills
**Domain:** Offline-first lead capture PWA para eventos e feiras (mercado brasileiro)
**Researched:** 2026-03-24
**Confidence:** MEDIUM-HIGH

## Executive Summary

Este produto é um sistema de captura de leads para equipes de vendas em conferências e feiras de negócios, com foco no mercado brasileiro onde WhatsApp é o canal de contato primário. A abordagem recomendada pela pesquisa é offline-first obrigatório: toda escrita vai diretamente para IndexedDB via Dexie, e o servidor (Supabase PostgreSQL via tRPC/Drizzle) é apenas o destino de sincronização. Essa decisão é não-negociável dado que venues de eventos têm WiFi não-confiável e perda de dados é inaceitável para a proposta de valor do produto.

A stack de sincronização é definida por constraint existente: o monorepo já usa Drizzle + `pg` direto contra Supabase, sem `supabase-js` instalado. Isso elimina soluções como DexieCloud, PowerSync e Supabase Realtime como transporte primário. O padrão adotado é timestamp-based pull/push via tRPC: a fila de mutações (`syncQueue` no Dexie) é drenada em batch a cada reconexão, com server-wins para conflitos. Dexie 4.3.0 e dexie-react-hooks 4.2.0 já estão instalados mas não configurados — o trabalho começa pela definição de schema, não por instalação.

Os riscos mais críticos são interdependentes: soft-delete obrigatório e timestamps (`updated_at`, `created_at`) devem estar no schema do lead desde o início — qualquer atalho aqui invalida toda a lógica de sync. O segundo cluster de risco é iOS Safari: evicção de IndexedDB após 7 dias de inatividade, requisito de user gesture para câmera, e vazamento de camera track ao remontar componentes. Todos têm mitigações claras mas requerem atenção explícita em fases separadas.

---

## Key Findings

### Recommended Stack

O stack central de sync não exige instalações novas na maior parte: Dexie + tRPC + Drizzle já cobrem o transporte. Três adições são necessárias: `@yudiel/react-qr-scanner@2.5.1` (único scanner React com peer dep React 19 explícita), `@supabase/supabase-js@2.100.0` (necessário apenas para Supabase Storage de fotos e, opcionalmente, Realtime), e `browser-image-compression@2.0.x` (compressão client-side obrigatória antes de persistir foto no IndexedDB). Para leitura de câmera em foto de lead, nenhuma lib é necessária — `<input type="file" capture="environment">` é suficiente e superior ao MediaDevices API manual.

**Core technologies:**
- `dexie@4.3.0` + `dexie-react-hooks@4.2.0`: store offline local e queries reativas — já instalados, precisam de configuração de schema
- `@yudiel/react-qr-scanner@2.5.1`: scan de QR WhatsApp (`wa.me/55XXXXXXXXXXX`) — único com React 19 peer dep verificado
- `tRPC 11` + `TanStack Query`: transporte de sync e polling de leaderboard (30s `refetchInterval`) — já presente
- `@supabase/supabase-js@2.100.0`: Storage upload de fotos (browser → Supabase Storage) e Realtime opcional para leaderboard — nova instalação
- `browser-image-compression@2.0.x`: compressão obrigatória antes de salvar blob em IndexedDB — nova instalação
- `Better-Auth 1.5`: sessões existentes; sync deve ser `protectedProcedure`; renovação proativa necessária

**Env vars novas a adicionar:**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
Validação em `packages/env/src/web.ts` via T3 Env (client-side, `NEXT_PUBLIC_`).

### Expected Features

**Must have (table stakes — P1):**
- Formulário de entrada manual de lead (nome + telefone obrigatórios; segmento + notas opcionais) — baseline sem alternativa
- Offline-first com Dexie: toda escrita local-first, sem bloqueio de rede — constraint absoluto do domínio
- Auto-sync Dexie → Supabase na reconexão — dados devem persistir sem ação manual do vendedor
- Tags de qualificação quente/morno/frio — linguagem universal de vendas de campo
- Lista de leads próprios com CRUD — vendedor precisa gerenciar seus próprios dados
- QR scan de formato WhatsApp (`wa.me`) — diferencial crítico para mercado brasileiro
- Indicador de conectividade — vendedor deve saber se está offline para confiar no app
- Dashboard pessoal (count + breakdown por tag) — motivação durante o evento
- Leaderboard da equipe (count + weighted score) — competição saudável aumenta volume
- Leaderboard offline com timestamp de staleness — não pode quebrar offline

**Should have (competitive — P2):**
- Foto de cartão de visita (captura nativa + compressão + upload no sync) — contexto extra sem atrasar conversa
- Filtro por segmento na lista de leads — útil pós-evento
- Export CSV — handoff de dados pós-evento

**Defer (v2+):**
- Suporte multi-evento (muda schema fundamentalmente)
- Integração CRM (ROI zero para equipe de 10 pessoas em evento único)
- Push notifications (Safari iOS ainda imatura)
- OCR de cartão de visita com AI (latência, custo, precisão em português)

### Architecture Approach

A arquitetura é organizada em três camadas: UI (Next.js App Router, Client Components com `"use client"` obrigatório para Dexie), Infraestrutura Local (Dexie como fonte de verdade offline, syncQueue como log de mutações, leaderboardSnapshot como cache de leitura), e Backend (tRPC routers em `packages/api`, Drizzle schema em `packages/db`, Postgres no Supabase). A regra central: UI lê sempre do Dexie via `useLiveQuery`; nunca chama tRPC diretamente para reads. O Sync Engine corre fora da árvore React, usa `createTRPCClient` vanilla (não hooks), e é acionado por eventos de conectividade + polling de 30s.

**Major components:**
1. `apps/web/src/lib/db/` — Dexie singleton, schema (leads, syncQueue, leaderboardSnapshot), queries tipadas
2. `apps/web/src/lib/sync/` — Sync Engine (flush queue em batch, server-wins), detector de online/offline, React Context de status
3. `apps/web/src/features/leads/` — hooks (useLeads via useLiveQuery, useCreateLead com escrita + enqueue), components (form, list, capture)
4. `packages/api/src/routers/leads.ts` — procedures: `sync` (batch upsert), `list`, `leaderboard`
5. `packages/db/src/schema/leads.ts` — fonte de verdade do schema com soft-delete, UUID client-generated, timestamps

**Build order mandatório (cada item depende do anterior):**
1. Drizzle leads schema → 2. tRPC leads router básico → 3. Dexie schema + singleton → 4. Sync Engine → 5. hooks de leads → 6. UI de captura → 7. Dashboard + leaderboard

### Critical Pitfalls

1. **Sync sem soft-delete** — leads deletados offline voltam a aparecer indefinidamente após sync; usar `deleted_at TIMESTAMPTZ` obrigatório desde o schema inicial, nunca `DELETE` físico durante sync
2. **Schema sem timestamps (`updated_at`)** — força full-table sync a cada ciclo; com 500 leads causa timeout em WiFi de evento; `created_at` + `updated_at` obrigatórios em Drizzle e Dexie antes de qualquer sync
3. **Camera Safari iOS: falta de user gesture** — `getUserMedia()` deve ser chamado diretamente no handler de `onClick`, sem nenhum `await` antes; nunca iniciar câmera no mount de componente
4. **Blobs de foto sem compressão** — foto de câmera mobile tem 3-8MB; com 50 leads resulta em 150-400MB no IndexedDB; `QuotaExceededError` em campo é catastrófico; comprimir com Canvas API (max 1280px, JPEG 0.7) antes de qualquer persistência
5. **Sessão Better-Auth expira durante evento offline** — sync falha com 401 sem aviso; interceptor de 401 deve preservar dados no Dexie e redirecionar para re-auth sem descartar leads pendentes
6. **Hydration mismatch Dexie + Next.js SSR** — `useLiveQuery` causa crash em Server Components; todos os componentes com Dexie precisam de `"use client"` e loading state explícito para o estado inicial `undefined`

---

## Implications for Roadmap

Based on research, a ordem de fases é determinada por dependências técnicas rígidas, não por prioridade de features. Schema vem primeiro porque sync, captura e leaderboard dependem de soft-delete e timestamps corretos. Dexie e Sync Engine vêm antes da UI porque a UI nunca deve bypassar o Dexie.

### Phase 1: Foundation — Schema, Dexie e Sync Engine

**Rationale:** Pitfalls 1 e 10 (soft-delete e timestamps) devem ser resolvidos antes de qualquer lógica de sync. A arquitetura de build order exige schema → Dexie → Sync Engine como sequência mandatória. Qualquer atalho aqui quebra todas as fases seguintes.

**Delivers:** Schema Drizzle com `deleted_at`, `created_at`, `updated_at`, UUID client-generated; Dexie schema espelhando o servidor (leads, syncQueue, leaderboardSnapshot); tRPC `leads.sync` procedure com batch upsert e server-wins; Sync Engine com detector de online/offline e flush de syncQueue; React Context de status de sync; indicador visual de conectividade.

**Addresses:** Offline-first com Dexie, auto-sync Dexie → Supabase, indicador de conectividade

**Avoids:** Pitfall 1 (hard-delete), Pitfall 10 (sem timestamps), Pitfall 9 (hydration mismatch — estabelecer padrão correto de client boundary aqui)

### Phase 2: Lead Capture — Formulário, CRUD e Dashboard Pessoal

**Rationale:** Com a infraestrutura de sync pronta, a UI de captura pode ser construída sobre Dexie sem preocupações de transporte. Essa fase entrega o core loop de valor: capturar um lead em < 3 taps.

**Delivers:** Formulário de entrada manual (nome + telefone obrigatórios, segmento + notas opcionais); tags quente/morno/frio; lista de leads próprios com edit e delete (soft-delete via syncQueue); dashboard pessoal (count + breakdown por tag); feedback visual pós-save (toast via sonner).

**Uses:** `dexie-react-hooks` (`useLiveQuery`), hooks `useCreateLead` + `useLeads`, `sonner` para toasts

**Implements:** Pattern 1 (Dexie como write target primário), Pattern 2 (syncQueue como log de mutações)

**Avoids:** Pitfall 2 (UUID gerado no cliente desde a criação), anti-pattern de leitura direta via tRPC

### Phase 3: QR Scan e Captura de Foto

**Rationale:** Features de captura avançada que dependem da câmera do dispositivo e têm pitfalls iOS-específicos que exigem atenção isolada. QR scan é diferencial crítico para o mercado brasileiro. Foto de cartão é P2 mas usa a mesma infraestrutura de câmera — faz sentido implementar na mesma fase.

**Delivers:** Scanner QR com `@yudiel/react-qr-scanner` (parse de `wa.me/55XXXXXXXXXXX` → telefone pre-preenchido); captura de foto com `<input capture="environment">`; compressão via `browser-image-compression` (max 800px, 0.5MB) antes de persistir no Dexie; upload de foto para Supabase Storage no ciclo de sync; env vars `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` adicionadas ao T3 Env.

**Uses:** `@yudiel/react-qr-scanner@2.5.1`, `browser-image-compression@2.0.x`, `@supabase/supabase-js@2.100.0`

**Avoids:** Pitfall 4 (câmera sem user gesture no Safari), Pitfall 5 (track da câmera não parada — cleanup obrigatório), Pitfall 6 (blobs sem compressão)

### Phase 4: Leaderboard e Auth Resilience

**Rationale:** Leaderboard requer sync funcionando (Phase 1) e múltiplos usuários com dados — só faz sentido depois das fases de captura. Auth resilience (sessão expirada offline) é um edge case crítico que deve ser endereçado antes de qualquer teste de campo real.

**Delivers:** tRPC `leads.leaderboard` com `GROUP BY user_id` em query única; cache de leaderboard no Dexie (`leaderboardSnapshot`) atualizado após cada sync; UI de leaderboard com ranking por count e weighted score (quente=3, morno=2, frio=1); staleness indicator ("atualizado X min atrás"); interceptor de 401 no Sync Engine (preserva dados no Dexie, redireciona para re-auth); renovação proativa de sessão ao abrir app com conexão.

**Avoids:** Pitfall 7 (sessão expirada sem recuperação), Pitfall 8 (leaderboard com counter separado — usar `COUNT(*) GROUP BY` direto)

### Phase 5: PWA e Hardening iOS

**Rationale:** A última fase endereça os edge cases de deployment real: PWA homescreen install (mitiga evicção de 7 dias no Safari), testes em dispositivo físico iOS, e validação do checklist "looks done but isn't" do PITFALLS.md.

**Delivers:** Manifest PWA configurado; instruções de onboarding "adicionar à tela inicial"; detecção de banco vazio no boot com sync imediato; testes em iPhone físico (câmera, offline, QR, múltiplas aberturas de câmera); validação completa do checklist de pitfalls.

**Avoids:** Pitfall 3 (Safari iOS 7-day eviction)

### Phase Ordering Rationale

- Schema antes de tudo porque soft-delete e timestamps são impossíveis de adicionar retroativamente sem migration e reescrita do sync
- Sync Engine antes da UI porque a UI não pode ter lógica de rede embutida — a separação é arquitetural
- QR e foto juntos porque compartilham infraestrutura de câmera e os pitfalls iOS são interdependentes
- Leaderboard depois da captura porque depende de dados reais de múltiplos usuários para ser testável
- PWA hardening por último porque valida o sistema inteiro em condições de produção real

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (Sync Engine):** padrão derivado da arquitetura, não copiado de referência existente com tRPC + Dexie 4; merece research-phase para validar detalhes de batch sync e conflict resolution
- **Phase 3 (Camera + iOS):** comportamento do Safari iOS é documentado mas com nuances de versão; testar em dispositivo físico é obrigatório — não usar simulador

Phases with standard patterns (skip research-phase):
- **Phase 2 (Lead Capture):** CRUD com Dexie + tRPC é padrão bem documentado; sem surpresas esperadas
- **Phase 4 (Leaderboard query):** `COUNT(*) GROUP BY` é SQL padrão; a lógica de cache no Dexie segue o Pattern 4 documentado na arquitetura
- **Phase 5 (PWA):** configuração de manifest e onboarding são bem documentados para Next.js

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Versões verificadas via GitHub e npm; constraints do monorepo verificados via grep em package.json; React 19 compat de `@yudiel/react-qr-scanner` confirmada |
| Features | HIGH | Padrões de indústria bem estabelecidos; múltiplas fontes primárias (Captello, Leady, Bizzabo, iCapture); pesquisa de mercado brasileiro confirma WhatsApp como canal primário |
| Architecture | HIGH | Stack definido; padrões offline-first documentados em múltiplas fontes de 2025-2026; build order derivado de dependências técnicas verificáveis |
| Pitfalls | MEDIUM-HIGH | Pitfalls críticos verificados em fontes oficiais (WebKit blog, MDN, Next.js docs, Better-Auth docs); alguns detalhes de implementação são MEDIUM confidence (community sources) |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Sync Engine com tRPC vanilla client fora de React:** padrão é arquiteturalmente sólido, mas o detalhe de como inicializar `createTRPCClient` no contexto do Next.js App Router (sem acesso ao provider) precisa ser validado durante Phase 1. Alternativa: usar um singleton de client tRPC no módulo `lib/sync/engine.ts`.
- **Supabase Storage com anon key:** o upload de fotos usa a anon key do Supabase com RLS habilitado. As policies de RLS para `lead-photos` bucket precisam ser configuradas (permitir upload apenas do usuário autenticado via `auth.uid()`). Isso é um passo de configuração no Supabase dashboard, não de código, mas deve ser documentado no plano de Phase 3.
- **Polling de leaderboard vs Supabase Realtime:** a decisão foi polling 30s (zero nova infra), com Realtime como enhancement opcional. Se durante os testes o polling introduzir latência perceptível para o leaderboard, adicionar Supabase Realtime requer apenas uma subscrição a `postgres_changes` como trigger de invalidação do TanStack Query — não é uma refatoração de arquitetura.

---

## Sources

### Primary (HIGH confidence)
- GitHub `yudielcurbelo/react-qr-scanner` — versão 2.5.1, peer dep React 19 confirmada
- GitHub `supabase/supabase-js` — v2.100.0 latest (2026-03-23)
- WebKit Blog — [Storage Policy Updates](https://webkit.org/blog/14403/updates-to-storage-policy/) (7-day eviction)
- MDN — [Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- Next.js docs — [React hydration error](https://nextjs.org/docs/messages/react-hydration-error)
- Better-Auth docs — [Session management](https://better-auth.com/docs/concepts/session-management)
- Supabase Storage docs — blob upload pattern confirmado em `supabase.com/docs/reference/javascript/storage-from-upload`
- Dexie.js docs — [useLiveQuery()](https://dexie.org/docs/dexie-react-hooks/useLiveQuery())
- `bun.lock` + `package.json` monorepo — dexie@4.3.0, dexie-react-hooks@4.2.0 confirmados

### Secondary (MEDIUM confidence)
- LogRocket Blog — [Offline-first frontend apps 2025](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/)
- sachith.co.uk — [Offline sync conflict resolution patterns (Feb 2026)](https://www.sachith.co.uk/offline-sync-conflict-resolution-patterns-architecture-trade%E2%80%91offs-practical-guide-feb-19-2026/)
- DEV Community — [Building offline-first app with sync engine](https://dev.to/daliskafroyan/builing-an-offline-first-app-with-build-from-scratch-sync-engine-4a5e)
- Event Tech Live — [Event Lead Capture Landscape 2026](https://eventtechlive.com/the-event-lead-capture-landscape-in-2026-navigating-diy-tools-platform-consolidation-and-the-data-advantage/)
- Captello, Leady, Bizzabo, Popl — análise de features de competidores
- PowerSync blog — [Bringing Offline-First to Supabase](https://www.powersync.com/blog/bringing-offline-first-to-supabase)
- webrtcHacks — [Guide to Safari WebRTC](https://webrtchacks.com/guide-to-safari-webrtc/)
- RxDB — [IndexedDB Max Storage Limit](https://rxdb.info/articles/indexeddb-max-storage-limit.html)

---
*Research completed: 2026-03-24*
*Ready for roadmap: yes*
