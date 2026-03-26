# Phase 5: Dashboard & Leaderboard - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-03-25
**Phase:** 05-dashboard-leaderboard
**Areas discussed:** Dashboard pessoal, Leaderboard, Dados offline/staleness, Navegacao

---

## Dashboard pessoal

| Option | Description | Selected |
|--------|-------------|----------|
| Cards com numeros | 3-4 stat cards + leads de hoje + score | |
| Cards + grafico de barras | Mesmo + grafico barras por tag | ✓ |
| Layout minimalista | Numeros grandes sem cards | |

**User's choice:** Cards + grafico de barras

---

## Leaderboard

| Option | Description | Selected |
|--------|-------------|----------|
| Lista rankeada com cards | Posicao, nome, leads, score. Vendedor logado destacado. | ✓ |
| Tabela simples | Colunas: posicao, nome, leads, score | |
| Podio + lista | Top 3 visual + resto em lista | |

**User's choice:** Lista rankeada com cards

---

## Dados offline / staleness

| Option | Description | Selected |
|--------|-------------|----------|
| Dexie table dedicada | leaderboardCache no Dexie. Staleness timestamp. | ✓ |
| localStorage simples | JSON no localStorage | |
| React Query cache | staleTime longo | |

**User's choice:** Dexie table dedicada

---

## Navegacao

| Option | Description | Selected |
|--------|-------------|----------|
| Pagina unica com tabs | /dashboard com tabs Meu Dashboard e Leaderboard | ✓ |
| Paginas separadas | /dashboard e /leaderboard | |
| Dashboard com leaderboard embutido | Tudo numa pagina, scroll vertical | |

**User's choice:** Pagina unica com tabs

---

## Claude's Discretion

- Biblioteca de graficos
- Dexie schema update
- tRPC leaderboard procedure
- Tabs implementation
- Stat card design

## Deferred Ideas

None
