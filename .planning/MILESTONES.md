# Milestones

## v1.0 MVP (Shipped: 2026-03-26)

**Phases completed:** 7 phases, 23 plans, 49 tasks

**Key accomplishments:**

- Supabase client utilities (browser + server), proxy.ts com getClaims, callback route PKCE, e env vars migradas de Better-Auth para Supabase
- tRPC context migrado para Supabase getClaims() com tres niveis de procedure (public, protected, admin) e schema Drizzle com user_roles + app_role enum
- LoginCard com 3 botoes OAuth (Google/LinkedIn/Facebook) via Supabase, user-menu migrado para Supabase Auth, forms email/password removidos
- Remocao completa de Better-Auth, build limpo verificado, e OAuth flow validado end-to-end pelo usuario
- Drizzle leads schema com soft-delete e indices + Dexie DB com leads/syncQueue EntityTables + Vitest para apps/web
- tRPC pushChanges/pullChanges com userId scoping e connectivity detector com navigator.onLine + polling HEAD 30s
- Push-then-pull sync engine with server-wins conflict resolution, exponential backoff retry, 401-safe error handling, and connectivity-triggered auto-sync via tRPC vanilla client
- 4 modulos utilitarios TDD (validation, wa-parser, compression, saveLead) com 25 testes passando, html5-qrcode e shadcn components instalados
- Formulario de captura de lead com TagSelector oklch, validacao Zod inline, campos colapsaveis e save offline-first via Dexie
- QR scanner overlay com html5-qrcode para auto-fill de telefone via wa.me, e captura de foto com compressao canvas + preview 80x80px integrados no LeadForm
- Upload pipeline de fotos do Dexie para Supabase Storage com integracao no sync engine e cleanup automatico de blobs locais
- TDD data layer for lead CRUD: updateLead, deleteLead, queryLeads with tag filter, and relativeTime Portuguese formatter -- 18 tests passing with fake-indexeddb
- LeadCard, TagFilter e AlertDialog criados; LeadForm adaptado para modo dual (create/edit) com photoChanged guard e updateLead
- Lead list page com infinite scroll e filtro por tag + pagina de detalhe/edicao com confirmacao de exclusao, tudo offline-first via Dexie
- Personal stats com score ponderado (quente=3/morno=2/frio=1), leaderboard tRPC com SQL aggregation e Dexie v2 para cache offline
- StatCard, LeaderboardEntry, StalenessIndicator + PersonalDashboard com Recharts e LeaderboardTab com cache offline Dexie
- Dashboard page com tabs (Meu Dashboard/Leaderboard), sync engine integrando fetch de leaderboard com cache Dexie offline
- 1. [Rule 2 - Missing] vi.mock() adicionado nos test scaffolds
- Admin layout with sidebar (3 nav items), server-side role guard, LeadForm refactored for admin callback mode, and Header with conditional Admin link
- Admin leads page with vendor selector, paginated table, delete confirmation, and lead edit wrapper via tRPC
- Paginated users table with search, inline role editing, and deactivate/reactivate via confirmation dialogs
- Next.js middleware movido para src/ com export default correto, admin ve stats reais via tRPC ao selecionar vendedor, e inconsistencias de auth pattern (getClaims, /leads/new guard) corrigidas

---
