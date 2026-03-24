# Phase 1: Auth Migration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-24
**Phase:** 01-auth-migration
**Areas discussed:** Login flow UX

---

## Area Selection

| Area | Description | Selected |
|------|-------------|----------|
| Role storage | Onde armazenar o role (admin/vendedor)? Supabase user metadata vs tabela profiles | |
| Login flow UX | Tela de login: OAuth only vs email/password fallback, layout dos botoes | ✓ |
| Route protection | Como proteger rotas de admin? Middleware vs RSC vs tRPC middleware | |
| Package structure | O que acontece com packages/auth? Manter vs remover package | |

**User's choice:** Login flow UX only. Other areas deferred to Claude's Discretion.

---

## Login flow UX

### Authentication method

| Option | Description | Selected |
|--------|-------------|----------|
| OAuth only | Apenas botoes de Google, Facebook e LinkedIn. Sem formulario de email/password. | ✓ |
| OAuth + email/password | Botoes OAuth como primario, com opcao de email/password abaixo como fallback. | |
| OAuth + magic link | Botoes OAuth + login por email sem senha (Supabase envia link). | |

**User's choice:** OAuth only
**Notes:** Mais simples para vendedores em campo — um toque e logou.

### Login layout

| Option | Description | Selected |
|--------|-------------|----------|
| Card centralizado | Card no centro da tela com logo/titulo em cima, 3 botoes empilhados. Mobile-friendly. | ✓ |
| Split screen | Metade branding/imagem, metade botoes de login. | |
| Fullscreen minimal | Fundo com gradiente, logo grande, botoes flutuando. | |

**User's choice:** Card centralizado
**Notes:** Visual limpo e mobile-friendly.

### Provider priority

| Option | Description | Selected |
|--------|-------------|----------|
| Google > LinkedIn > Facebook | Google primeiro (mais universal), LinkedIn segundo (congressos), Facebook por ultimo. | ✓ |
| LinkedIn > Google > Facebook | LinkedIn primeiro (contexto profissional). | |
| Todos iguais | Sem hierarquia visual. | |

**User's choice:** Google > LinkedIn > Facebook
**Notes:** None.

### Fallback for users without provider accounts

| Option | Description | Selected |
|--------|-------------|----------|
| Nao entra | Se nao tem Google/LinkedIn/Facebook, nao acessa. Equipe de 10 — todos tem pelo menos um. | ✓ |
| Email fallback | Login por email como ultimo recurso. | |
| Admin cria conta | Admin registra vendedor manualmente. | |

**User's choice:** Nao entra
**Notes:** Equipe de 10 vendedores — todos tem pelo menos um provider.

---

## Claude's Discretion

- Role storage strategy (user metadata vs profiles table)
- Route protection approach (middleware vs RSC vs tRPC)
- Package structure migration (keep vs remove packages/auth)
- Env vars migration (BETTER_AUTH_* → SUPABASE_*)
- Schema migration (Better-Auth tables → Supabase Auth managed)

## Deferred Ideas

None.
