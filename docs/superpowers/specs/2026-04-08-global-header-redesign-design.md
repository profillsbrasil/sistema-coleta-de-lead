# Global Header Redesign

## Contexto

O `PersonalStatsBar` atual so aparece no dashboard. O breadcrumb (`AppTopbar`) nao agrega valor significativo. O footer da sidebar duplica informacao de identidade. Este redesign unifica identidade, stats e countdown em um header global, simplifica a sidebar e remove redundancias.

## Decisoes de Design

| Decisao | Escolha |
|---|---|
| Escopo do header | Global — todas as paginas autenticadas |
| Conteudo | Stats (esquerda), countdown (centro), identidade + avatar dropdown (direita) |
| Cargo do usuario | Nao exibir |
| Mobile | Header sticky de 1 linha (44px) |
| Desktop | Header unificado de 52px (sidebar header alinhado na mesma faixa) |
| Acoes do usuario | Dropdown no avatar (conta, tema, sair) |
| Sidebar footer antigo | Removido — substituido por sync status indicator |
| Admin pages | Header adaptativo — stats globais em vez de pessoais |

## Layout Desktop

```
┌─────────────────┬──────────────────────────────────────────────┐
│  Leads Profills  │  47 leads  12 hoje  ·  2d 14h 32m  ·  Nome #3 (OQ)  │  ← 52px, faixa unica
├─────────────────┼──────────────────────────────────────────────┤
│  Ranking        │                                              │
│  Meus Leads     │           Conteudo da pagina                 │
│  Novo Lead      │                                              │
│                 │                                              │
│  ─────────────  │                                              │
│  • Sincronizado │                                              │
└─────────────────┴──────────────────────────────────────────────┘
```

- Header e uma faixa full-width de 52px
- Porcao esquerda (largura da sidebar = `--sidebar-width`): logo "Leads Profills"
- Porcao direita (resto): stats | countdown | identity
- Sidebar perde o `SidebarHeader` atual e comeca direto com nav items
- Sidebar footer: sync status indicator (dot + texto), sem user menu

## Layout Mobile

```
┌──────────────────────────────────┐
│ 47 leads  12 hoje · 2d14h · (OQ)│  ← 44px sticky
├──────────────────────────────────┤
│                                  │
│       Conteudo da pagina         │
│                                  │
├──────────────────────────────────┤
│  Ranking    (+)    Leads         │  ← BottomNav (inalterado)
└──────────────────────────────────┘
```

- 1 linha: stats (esquerda), countdown (centro), avatar (direita)
- Nome do usuario omitido no mobile (so avatar com iniciais)
- Sem evento ativo: countdown some, header fica so stats + avatar
- BottomNav permanece inalterado

## Header Adaptativo (Admin)

Quando o usuario esta em rotas `/admin/*`:
- **Stats esquerda**: mudam para dados globais (total leads global, numero de vendedores)
- **Countdown**: permanece igual
- **Identidade**: permanece igual

Dados admin vem de `adminStatsRouter.getGlobalStats` (tRPC) ou de um cache local.

## Componentes a Criar/Modificar

### Novo: `GlobalHeader` (`apps/web/src/components/global-header.tsx`)

Substitui `AppTopbar` e `PersonalStatsBar`. Client component.

Props: nenhuma — consome dados via hooks:
- `useRequiredAppAuth()` → nome, gravatar, role
- `useLiveQuery(() => getPersonalStats(userId))` → total, hoje
- `useLiveQuery(() => db.leaderboardCache...)` → rank
- `usePathname()` → detectar contexto admin

Secoes internas:
- `HeaderStats` — numeros de leads (pessoal ou admin)
- `EventCountdown` — reuso do componente existente, com estilo ajustado
- `HeaderIdentity` — avatar + nome + rank + dropdown

### Modificar: `AuthenticatedAppShell` (`apps/web/src/components/authenticated-app-shell.tsx`)

- Desktop: remover `AppTopbar` do `SidebarInset`, colocar `GlobalHeader` ACIMA do `SidebarProvider` (faixa full-width)
- Mobile: adicionar `GlobalHeader` sticky acima do conteudo

Nova estrutura desktop:
```
<GlobalHeader />
<div className="flex flex-1">
  <SidebarProvider>
    <AppSidebar />        ← sem SidebarHeader
    <SidebarInset>
      {children}          ← sem AppTopbar
    </SidebarInset>
  </SidebarProvider>
</div>
```

Nova estrutura mobile:
```
<GlobalHeader />
<div className="flex-1 pb-24">{children}</div>
<BottomNav />
```

### Modificar: `AppSidebar` (`apps/web/src/components/app-sidebar.tsx`)

- Remover `SidebarHeader` (logo vai pro `GlobalHeader`)
- Remover `SidebarFooter` com `SidebarUserMenu`
- Adicionar footer simples com sync status indicator
- Sidebar fica: nav items + sync footer

### Remover: `SidebarUserMenu` (`apps/web/src/components/sidebar-user-menu.tsx`)

- Dropdown de usuario migra para dentro de `HeaderIdentity` no `GlobalHeader`
- Arquivo pode ser deletado

### Remover: `AppTopbar` (`apps/web/src/components/app-topbar.tsx`)

- Substituido pelo `GlobalHeader`
- Arquivo pode ser deletado

### Modificar: `PersonalStatsBar` (`apps/web/src/components/personal-stats-bar.tsx`)

- Nao sera mais renderizado no dashboard (dados moveram pro header global)
- Pode ser deletado ou mantido temporariamente se o dashboard precisar de algo extra

### Manter inalterado:
- `EventCountdown` — reutilizado com ajuste de estilo (cor amber, font-size 13px)
- `BottomNav` — sem mudancas
- `FAB` — sem mudancas
- Auth flow, sync engine, Dexie queries — sem mudancas

## Estilo Visual

- Header background: praticamente flush com conteudo (ex: `bg-card` ou `bg-background` com border sutil)
- Stats: numeros `font-semibold text-[15px]`, labels `text-muted-foreground text-[10px]`
- Countdown: `text-amber-500 font-mono text-[13px] font-medium` com dot pulsante
- Avatar: `bg-muted text-muted-foreground border border-border`, sem gradiente
- Nome (desktop): `text-sm font-medium`, rank `text-xs text-indigo-400`
- Mobile: nome omitido, so avatar 28px

## Fonte de Dados

| Dado | Fonte | Disponivel no layout? |
|---|---|---|
| userName, gravatarUrl, userId, userRole | `AppAuthSnapshot` (localStorage) | Sim |
| leads total, leads hoje | `getPersonalStats(userId)` via Dexie `useLiveQuery` | Precisa query no header |
| rank | `db.leaderboardCache` via Dexie `useLiveQuery` | Precisa query no header |
| countdown | `NEXT_PUBLIC_EVENT_END` env var | Sim |
| admin global stats | `adminStatsRouter.getGlobalStats` (tRPC) | Precisa fetch condicional |

O `GlobalHeader` vai rodar as mesmas queries Dexie que o dashboard roda hoje. Como Dexie e local e as queries sao leves (filtro por userId), nao ha impacto de performance.

## Verificacao

1. Rodar `bun run dev:web` e navegar entre todas as paginas — header deve estar presente e consistente
2. Verificar mobile (DevTools responsive) — header 1 linha, 44px
3. Verificar desktop — header alinhado com sidebar, 52px
4. Clicar no avatar — dropdown com conta/tema/sair
5. Adicionar lead — stats atualizam em tempo real no header
6. Testar sem `NEXT_PUBLIC_EVENT_END` — countdown some
7. Navegar para `/admin/*` como admin — stats mudam para globais
8. Testar offline — header deve continuar funcional (dados Dexie)
9. Rodar `bun run check-types` — sem erros de tipo
10. Rodar `bun run check` — sem erros de lint
