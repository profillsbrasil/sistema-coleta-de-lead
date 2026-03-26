# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

---

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-26
**Phases:** 7 | **Plans:** 23 | **Tasks:** 49

### What Was Built

- Auth migrada de Better-Auth para Supabase Auth com OAuth (Google/LinkedIn/Facebook) e roles via custom claims
- Offline-first infra completa: Dexie DB, sync engine push-then-pull, server-wins conflict resolution, connectivity detection com polling fallback para Safari
- Captura de leads em <3 toques: form, QR scanner WhatsApp, foto comprimida + upload para Supabase Storage
- Lead management CRUD completo com filtro por tag, offline via Dexie
- Dashboard pessoal com score ponderado + leaderboard com cache offline
- Admin panel completo: leads/usuarios/stats globais + vendor dashboard via tRPC (fix ADMN-07)
- Next.js middleware ativo para session refresh (fix AUTH-05)

### What Worked

- **GSD workflow** — discuss → plan → execute → verify funcionou bem. O checklist de audit encontrou bugs reais que teriam ido para producao.
- **Audit antes de complete-milestone** — identificou AUTH-05 (middleware nunca rodando) e ADMN-07 (admin via stats sempre zero) que eram bugs silenciosos
- **TDD para logica de negocio** — modulos de validation, wa-parser, compression, saveLead, stats e queries todos testados primeiro. 74 testes garantem regressoes detectadas
- **Context.md antes de planejar** — capturar as decisoes (especialmente ADMN-07: override stats vs componente separado) eliminou ambiguidade do planner
- **Fake-indexeddb para Dexie** — testes de data layer sem browser setup; rapidos e confiaveis

### What Was Inefficient

- **Audit gerou Phase 7** — AUTH-05 (proxy.ts no lugar errado) deveria ter sido pego na Phase 1. A convencao Next.js `middleware.ts` e bem documentada; teria sido pego com uma checklist de verificacao de arquivo apos criacao
- **Phase 6 sem VERIFICATION.md** — executor pulou a etapa de verificacao; audit encontrou isso como blocker. Precisamos de um gate mais rigido na execucao
- **ROADMAP.md desatualizado durante Phase 6** — mostrava "2/5 plans" quando estava completa; gsd-tools progress dava a informacao correta mas o arquivo ficou stale

### Patterns Established

- **getClaims() para roles** — unica fonte de verdade; `app_metadata`/`user_metadata` NAO sao confiaveis apos mudancas de custom claims. Usar sempre `supabase.auth.getClaims()` em server components
- **overrideStats pattern** — quando um componente cliente usa Dexie mas admin precisa de dados server-side, adicionar prop opcional `overrideStats` e passar via tRPC query condicional no parent
- **Auth guard server-side em TODOS os page.tsx** — `await supabase.auth.getUser()` + `redirect("/login")` no topo de cada page protegida. Verificar com grep antes de completar qualquer phase com UI
- **Middleware convencao Next.js** — arquivo DEVE ser `apps/web/src/middleware.ts` (dentro de `src/`), export DEVE ser `export default async function middleware`

### Key Lessons

1. **Auditoria pre-milestone vale o tempo** — encontrou 2 bugs criticos que teriam ido para producao. Fazer sempre antes de `complete-milestone`
2. **Verificacao de arquivo nao deve ser assumida** — criar checklist explicita nas plans para verificar que arquivos criticos existem no lugar certo apos execucao
3. **Phase 6 VERIFICATION.md era blocker** — executor precisa criar VERIFICATION.md sempre. Adicionar como gate obrigatorio no execute-phase ou no template de plan
4. **Dexie + React Query nao sao intercambiaveis** — dados offline-only ficam no Dexie/useLiveQuery; dados server-side ficam no tRPC/useQuery. Nao misturar os dois para o mesmo dado

### Cost Observations

- 3 dias de desenvolvimento (2026-03-24 → 2026-03-26)
- 153 commits no milestone
- ~13.9k LOC TypeScript/TSX

---

## Cross-Milestone Trends

| Metric | v1.0 | v1.1 |
|--------|------|------|
| Phases | 7 | — |
| Plans | 23 | — |
| Tests | 74 | — |
| Bugs em audit | 2 criticos + 2 medium | — |
| Timeline | 3 dias | — |
