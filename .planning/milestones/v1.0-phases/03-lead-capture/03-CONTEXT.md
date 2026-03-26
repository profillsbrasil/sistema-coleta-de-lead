# Phase 3: Lead Capture - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Vendedor consegue criar um lead em menos de 3 toques, com suporte a QR code do WhatsApp e foto do cartao de visita, tudo funcionando offline. Dados salvos no Dexie primeiro, sync automatico quando online (via Phase 2 infra).

</domain>

<decisions>
## Implementation Decisions

### Formulario rapido
- **D-01:** Pagina dedicada `/leads/new`. FAB (floating action button) no dashboard leva para esta pagina.
- **D-02:** 3 toques = FAB + preencher campos + Salvar. Tag tem default 'morno', campos opcionais colapsados.
- **D-03:** Campos visiveis no form: nome (obrigatorio), telefone/email (pelo menos um — D-02 Phase 2), tag de interesse (default morno). Botao Salvar proeminente.
- **D-04:** Campos opcionais (empresa, cargo, segmento, notas) colapsados atras de "Mais detalhes". Link/botao expande a secao.
- **D-05:** Lead salvo direto no Dexie (offline-first). Sync engine da Phase 2 envia para servidor quando online.

### QR scan WhatsApp
- **D-06:** Scan via JS library (html5-qrcode ou similar) com camera inline. Funciona offline (scan e local, sem request de rede).
- **D-07:** Botao de QR dentro do form, ao lado do campo telefone. Icone de QR. Toca > abre camera > detecta > parseia wa.me URL > preenche telefone automaticamente.
- **D-08:** Parse de URL wa.me: extrair numero do path (wa.me/5511999999999 ou wa.me/+5511999999999). Normalizar para formato com DDI.

### Foto de cartao
- **D-09:** Camera via `<input type="file" accept="image/*" capture="environment">`. Abre camera nativa do celular. Compativel Safari/Chrome.
- **D-10:** Uma foto por lead. Sem galeria multipla.
- **D-11:** Compressao via canvas: max 1280px lado maior, JPEG quality 0.7 (CAPT-05). Resultado salvo no Dexie como base64.
- **D-12:** Preview da foto no form apos captura. Botao para remover/trocar.
- **D-13:** Foto sincronizada para Supabase Storage quando online (CAPT-06). URL do Storage salva no lead no servidor.

### Tag de interesse
- **D-14:** 3 botoes toggle lado a lado com cor: Quente (vermelho/laranja), Morno (amarelo), Frio (azul).
- **D-15:** Default: morno (pre-selecionado ao abrir form). Vendedor pode trocar com um toque.
- **D-16:** Tag obrigatoria — sempre tem valor (default garante isso).

### Claude's Discretion
- Biblioteca de QR scan — html5-qrcode vs jsQR vs outra. Claude escolhe baseado em bundle size, compatibilidade mobile, e facilidade de uso.
- Compressao de imagem — implementacao do canvas resize (createImageBitmap vs Image + canvas). Claude escolhe a abordagem mais performatica.
- FAB design — posicao, tamanho, icone. Claude segue padrao material design / shadcn.
- Form validation UX — como mostrar erros (inline, toast, shake). Claude decide.
- Supabase Storage upload — como integrar no sync engine existente (adicionar step de upload apos pushChanges, ou procedure separada).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project requirements
- `.planning/REQUIREMENTS.md` — CAPT-01 through CAPT-08 define os requisitos de lead capture
- `.planning/ROADMAP.md` §Phase 3 — Goal, success criteria e depends on

### Prior phase artifacts (offline infra)
- `apps/web/src/lib/db/index.ts` — Dexie database instance (leads + syncQueue tables)
- `apps/web/src/lib/db/types.ts` — Lead e SyncQueueItem interfaces
- `apps/web/src/lib/sync/engine.ts` — Sync engine singleton (push-then-pull)
- `apps/web/src/lib/sync/connectivity.ts` — Connectivity detector
- `packages/api/src/routers/sync.ts` — tRPC pushChanges/pullChanges procedures
- `packages/db/src/schema/leads.ts` — Drizzle leads schema (source of truth para campos)

### Auth (from Phase 1)
- `apps/web/src/lib/supabase/client.ts` — Supabase browser client (para Storage upload)

### UI Design System
- `.planning/phases/01-auth-migration/01-UI-SPEC.md` — Design tokens, spacing, typography (shadcn base-nova)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/ui/components/button.tsx`: Button com variants — usar para Salvar, FAB, toggle tags
- `packages/ui/components/card.tsx`: Card component — possivel container para o form
- `packages/ui/components/input.tsx`: Input component — campos de texto
- `packages/ui/components/label.tsx`: Label component — labels dos campos
- `apps/web/src/lib/db/index.ts`: Dexie DB ja configurado com leads table — salvar lead direto
- `apps/web/src/lib/sync/engine.ts`: requestSync() disponivel para trigger manual apos salvar

### Established Patterns
- Dexie para escrita offline-first: `db.leads.add(lead)` + `db.syncQueue.add(op)`
- Sync automatico via connectivity detector — nao precisa de acao do vendedor
- tRPC protectedProcedure para operacoes autenticadas
- Sonner para toasts (usar para feedback de "Lead salvo!")
- shadcn base-nova com tokens de spacing/typography da UI-SPEC

### Integration Points
- `apps/web/src/app/leads/new/page.tsx` — nova pagina do formulario
- `apps/web/src/components/` — novos componentes (LeadForm, QRScanner, PhotoCapture, TagSelector)
- `apps/web/src/lib/db/index.ts` — operacoes de escrita no Dexie
- Dashboard (futuro Phase 5) — FAB para `/leads/new`

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-lead-capture*
*Context gathered: 2026-03-25*
