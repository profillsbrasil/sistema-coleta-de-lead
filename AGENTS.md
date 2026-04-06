# Agent Entry Point

## Regra Principal

- Leia [CLAUDE.md](/home/othavio/Work/profills/sistema-coleta-de-lead/CLAUDE.md) antes de assumir stack, arquitetura ou fluxos do produto.
- `CLAUDE.md` na raiz e a fonte canonica deste repositório.
- Em caso de divergencia entre documentacao e codigo, o codigo-fonte vence.

## O Que Este Projeto E

- Sistema offline-first para coleta de leads em eventos.
- Frontend em Next.js, backend via tRPC e auth via Supabase.
- Dexie e parte central do runtime local; nao e detalhe de implementacao opcional.

## Guardrails Rapidos

- Use Supabase como referencia para auth no app e na API.
- Nao use `/api/trpc/healthCheck` como endpoint de conectividade do app; o fluxo atual usa `/api/health`.
- Nao trate o service worker como PWA completa.
- Nao adote `packages/auth` como dependencia oficial do runtime sem uma refatoracao explicita.
- Para UI compartilhada, prefira imports path-based de `@dashboard-leads-profills/ui/components/*`.

## Superficies de Agente

- `.claude/CLAUDE.md` deve permanecer alinhado a este mesmo contexto.
- `.codex` e `.opencode` guardam configuracoes de ferramenta, nao a definicao da arquitetura do sistema.
- Skills em `.agents/skills` e `.claude/skills` sao genericos, salvo quando houver customizacao explicita do projeto.
