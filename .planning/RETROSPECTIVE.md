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

## Milestone: v1.1 — UI Refactor & Mobile UX

**Shipped:** 2026-03-27
**Phases:** 4 | **Plans:** 11 | **Tasks:** ~19

### What Was Built

- Route groups `(public)/(app)` com auth guard centralizado em `(app)/layout.tsx` — zero rendering condicional no root
- AppSidebar unificada (shadcn Sidebar) com drawer mobile auto-close, nav por role (vendedor/admin collapsible), user menu (Gravatar + ModeToggle + logout)
- Tabelas admin responsivas via CSS visibility switching: `md:hidden`/`hidden md:block` — card layout mobile com DropdownMenu 44px
- Lead form convertido para CSS grid responsivo (1-col mobile / 2-col md+) + FAB com visualViewport keyboard detection
- Dashboard totalmente responsivo: stat grid 1→2→4 colunas, ChartConfig theme-aware (dark mode via CSS vars), chart key reset apos sidebar toggle
- AppTopbar com SidebarTrigger mobile-only e breadcrumb dinamico via `usePathname()`
- Polish final: space-y→flex/gap, dark mode consistente em todos os componentes, sem padding/max-width duplicados

### What Worked

- **Impeccable skills para polish** — arrange, adapt, polish, typeset guiaram o processo de polish visual de forma sistematica
- **Route groups pattern** — `(public)/(app)` resolveu o problema de layout sem nenhuma logica condicional; solucao mais limpa que a alternativa com state no root layout
- **CSS visibility switching** — `md:hidden`/`hidden md:block` para tabelas responsivas evitou hydration mismatch que teria acontecido com renderizacao condicional JS
- **`100svh` no Sheet mobile** — preveniu o gap inferior no iOS Safari (bug com `100dvh` em Safari 26)
- **audit-milestone antes de complete-milestone** — encontrou SUMMARY frontmatters incompletos, skeleton max-w residual, e commits em branch orphan — todos itens de tech debt documentados

### What Was Inefficient

- **Commits em branch orphan (Phase 11-02)** — executor paralelo criou worktree e os commits ficaram em `worktree-agent-aba73162`; foram recuperados via cherry-pick mas indicam processo frágil no executor paralelo com worktrees
- **SUMMARY frontmatters incompletos** — fases 10 e 11 tinham `requirements_completed` vazios em varios planos; o extrator de accomplishments da CLI falhou por isso; tivemos que corrigir MILESTONES.md manualmente
- **11 itens de human verification pendentes** — especialmente mobile (iOS visualViewport, dark mode visual) que nao podem ser verificados automaticamente e ficaram para verificacao humana posterior
- **Progress table do ROADMAP.md stale** — phases 8 e 9 mostravam "Not started / 0/3" mesmo completas; desatualizado durante execucao

### Patterns Established

- **ChartConfig theme pattern** — usar `theme: { light: "...", dark: "..." }` em vez de `color:` para dark mode correto em shadcn Charts. CSS variables injetadas pelo ChartContainer via `--color-{key}`
- **Chart key reset** — `key={`chart-${String(open)}`}` forca remount do Recharts canvas apos sidebar toggle (ResizeObserver nao detecta sidebar toggle automaticamente)
- **FAB visualViewport** — `window.visualViewport.addEventListener("resize", ...)` para detectar teclado virtual no iOS; fallback graceful se API indisponivel
- **AppTopbar como leaf use-client** — importada por Server Component (layout.tsx); mantem layout como SC sem propagar use-client para o root

### Key Lessons

1. **Worktrees + commits** — ao usar executor paralelo com worktrees, verificar se todos os commits chegaram no branch correto antes de marcar plan como completo
2. **SUMMARY frontmatter e critico** — `requirements_completed` vazio quebra o extrator de accomplishments da CLI. Verificar sempre antes de marcar plan completo
3. **Human verification e um plano proprio** — Phase 09-02 dedicada a verificacao humana funcionou bem; fases 10/11 sem fase de verificacao ficaram com 11 itens pendentes
4. **Audit encontra debt nao-critico valioso** — o skeleton max-w residual e os SUMMARY incompletos nao eram bloqueadores, mas audit os documentou — sem audit, ficaria invisivel

### Cost Observations

- 2 dias de desenvolvimento (2026-03-26 → 2026-03-27)
- 79 arquivos modificados em v1.1
- ~14.5k LOC TypeScript/TSX (vs 13.9k em v1.0)

---

## Cross-Milestone Trends

| Metric | v1.0 | v1.1 |
|--------|------|------|
| Phases | 7 | 4 |
| Plans | 23 | 11 |
| Tests | 74 | 74 (sem novos em v1.1 — UI only) |
| Bugs em audit | 2 criticos + 2 medium | 0 criticos, tech debt nao-critico |
| Timeline | 3 dias | 2 dias |
| LOC TypeScript/TSX | ~13.9k | ~14.5k |
| Human verification pendente | — | 11 itens |
