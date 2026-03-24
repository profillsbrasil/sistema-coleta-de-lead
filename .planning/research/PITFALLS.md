# Pitfalls Research

**Domain:** Offline-first lead capture PWA (Next.js + Dexie + Supabase + Better-Auth)
**Researched:** 2026-03-24
**Confidence:** MEDIUM-HIGH (critical pitfalls verified against official docs and community reports; some implementation details are MEDIUM confidence from community sources)

---

## Critical Pitfalls

### Pitfall 1: Sync sem soft-delete — perdas silenciosas de deleção

**What goes wrong:**
Quando um vendedor deleta um lead offline e a conexão volta, o sync tenta fazer upsert dos dados locais. Se a deleção foi um `DELETE` real (não um campo `deleted = true`), o servidor nunca sabe que aquele lead foi deletado. Resultado: em dispositivos que já tinham o lead sincronizado, ele reaparece indefinidamente.

**Why it happens:**
O padrão mais óbvio com Dexie é deletar o registro local. Mas sync bidirecional pressupõe que ambos os lados possam reconstruir o estado de um período offline. Hard-delete quebra isso: um cliente offline que não viu a deleção vai re-upsert o registro quando sincronizar.

**How to avoid:**
Usar soft-delete obrigatório: campo `deleted_at TIMESTAMPTZ` (null = ativo) no schema Drizzle e na Dexie schema local. O sync nunca deleta — apenas marca `deleted_at`. A UI filtra `WHERE deleted_at IS NULL`. A purga física de registros deletados (se necessária) acontece num job separado e controlado.

**Warning signs:**
- Leads "deletados" voltam a aparecer após sync
- Contagem local e contagem do servidor divergem após período offline
- Testes de sync passam online mas falham depois de ciclo offline + reconexão

**Phase to address:**
Fase de implementação do schema Drizzle (leads) e da Dexie schema — antes de qualquer lógica de sync.

---

### Pitfall 2: UUID gerado no cliente com colisão silenciosa

**What goes wrong:**
Se o `id` do lead for gerado pelo servidor (auto-increment ou `gen_random_uuid()` via Supabase), leads criados offline não têm ID real até o primeiro sync. Isso força lógica complexa de "id temporário → id real" com risco de duplicatas. Alternativamente, se o UUID for gerado no cliente mas não verificado no servidor, dois clientes podem raramente colidir.

**Why it happens:**
Tendência de reaproveitar o schema de servidor (com serial/identity) no contexto offline. O problema só aparece quando dois registros chegam no servidor — um já existe, o outro conflita.

**How to avoid:**
Gerar UUID v4 no cliente (`crypto.randomUUID()`) como `id` primário desde a criação. Configurar a coluna Supabase como `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` mas aceitar o valor enviado pelo cliente no insert (`ON CONFLICT DO NOTHING` não é suficiente — usar `ON CONFLICT (id) DO UPDATE SET ...` com lógica de timestamp). O UUID v4 tem probabilidade de colisão negligível (1 em 2^61 para 10^9 registros).

**Warning signs:**
- Erro `duplicate key value violates unique constraint` no log de sync
- Leads aparecem duplicados após reconexão
- IDs com padrão numérico sequencial no schema local

**Phase to address:**
Fase de schema do lead — definir `id` como UUID gerado no cliente antes de implementar sync.

---

### Pitfall 3: Safari iOS evicta IndexedDB após 7 dias de inatividade

**What goes wrong:**
Safari no iOS tem uma política ITP (Intelligent Tracking Prevention) que apaga todo storage script-writable — incluindo IndexedDB — de origens não visitadas por 7 dias consecutivos. Num sistema de coleta de leads, vendedores podem instalar o PWA semanas antes do evento. Chegando no evento, o banco local está vazio e o sync precisa puxar tudo do servidor antes que o vendedor possa trabalhar offline.

**Why it happens:**
A política existe para proteger privacidade, não para prejudicar PWAs. Mas origens web (não homescreen PWA instalado) são afetadas. WebKit implementou exceção apenas para PWAs adicionados à tela inicial via "Adicionar à Tela de Início".

**How to avoid:**
1. Instruir vendedores a adicionar o PWA à tela inicial do iPhone (exceção oficial da política ITP).
2. Ao abrir o app, verificar se o banco local está vazio ou incompleto e acionar sync imediato se houver conexão.
3. Mostrar indicador claro de "baixando dados..." no primeiro acesso pós-evicção.
4. Nunca assumir que o banco local está completo — sempre validar `lastSyncedAt` antes de trabalhar offline.

**Warning signs:**
- Banco Dexie vazio em dispositivos iOS que não foram usados por dias
- Usuários reclamam que leads somem "sem motivo"
- `navigator.storage.estimate()` retorna `usage: 0` inesperadamente

**Phase to address:**
Fase de sync + onboarding do PWA — documentar o requisito de "adicionar à tela inicial" como parte do setup.

---

### Pitfall 4: Camera/QR bloqueada no Safari iOS por falta de user gesture

**What goes wrong:**
`getUserMedia()` no Safari iOS requer ser chamado diretamente dentro de um event handler de interação do usuário (click, touch). Se a câmera for iniciada num `useEffect`, `setTimeout`, ou qualquer código assíncrono que não rastreie o user gesture, o Safari silenciosamente falha ou lança `NotAllowedError`. Chrome mobile é mais permissivo, mas Safari não.

**Why it happens:**
WebKit requer que a chamada a `getUserMedia()` ocorra dentro do call stack original do evento do usuário. Um `await` antes da chamada quebra essa rastreabilidade no Safari, dependendo da versão.

**How to avoid:**
- O botão "Escanear QR" deve chamar `getUserMedia()` diretamente no handler do `onClick`, sem nenhum `await` antes da chamada inicial.
- Evitar `async onClick` com awaits antes de `getUserMedia()` — iniciar o stream primeiro, depois fazer operações assíncronas adicionais.
- Nunca iniciar câmera automaticamente no mount do componente.

**Warning signs:**
- QR funciona no Chrome mobile mas não no Safari iOS
- `NotAllowedError: The request is not allowed` no console
- Permissão de câmera nunca aparece no iOS

**Phase to address:**
Fase de implementação da feature de scan QR.

---

### Pitfall 5: Múltiplas chamadas `getUserMedia()` mutam a track anterior no iOS

**What goes wrong:**
Se o componente de QR for desmontado e remontado (ex: navegação, modal fechado/aberto), uma segunda chamada a `getUserMedia()` no iOS causa que a track da câmera anterior fique com `muted = true` de forma permanente. O feed da câmera fica preto. Não há forma programática de demutar.

**Why it happens:**
Bug/comportamento específico do WebKit: múltiplas requisições do mesmo tipo de media na mesma aba causam interferência com tracks anteriores.

**How to avoid:**
- Parar explicitamente todos os tracks ativos (`track.stop()`) antes de desmontar o componente de câmera.
- Manter referência ao MediaStream e ao VideoTrack no state/ref do componente.
- Usar cleanup no `useEffect` ou no `onUnmount` para chamar `stream.getTracks().forEach(t => t.stop())`.

**Warning signs:**
- Câmera funciona na primeira abertura mas tela fica preta nas subsequentes
- Log mostra `track.muted === true` inesperadamente
- Problema só ocorre em iOS, não em Android/Chrome

**Phase to address:**
Fase de implementação da feature de scan QR e de foto do lead.

---

### Pitfall 6: Blobs de fotos inflam o IndexedDB e causam QuotaExceededError

**What goes wrong:**
Armazenar fotos de cartões de visita como blobs brutos no IndexedDB (sem compressão ou resize) rapidamente esgota a quota disponível em dispositivos com pouco espaço. Uma foto de câmera mobile pode ter 3-8MB. Com 50 leads e 1 foto cada, são 150-400MB apenas de fotos, além dos dados textuais.

**Why it happens:**
IndexedDB aceita blobs nativamente, então a implementação mais simples é salvar o blob direto. O `QuotaExceededError` só aparece quando o storage está cheio — normalmente no pior momento (durante o evento).

**How to avoid:**
- Antes de salvar no IndexedDB, redimensionar e comprimir a imagem via Canvas API: max 1280px de largura, qualidade JPEG 0.7.
- Salvar como base64 string (mais compatível) ou blob comprimido.
- Implementar handler de `QuotaExceededError` que avisa o usuário e oferece opção de deletar fotos antigas.
- Limitar o tamanho máximo de foto aceita (ex: 2MB após compressão).

**Warning signs:**
- Formulário de lead falha silenciosamente ao salvar com foto
- Console mostra `QuotaExceededError` ou `DOMException`
- Usuários em dispositivos com pouco espaço livre (< 1GB) têm mais problemas

**Phase to address:**
Fase de implementação de foto do lead — adicionar compressão antes de salvar.

---

### Pitfall 7: Sessão Better-Auth expira durante evento offline

**What goes wrong:**
Better-Auth usa sessões com expiração (default: 7 dias). Se o vendedor estava offline por um período longo e a sessão expirou, ao tentar sincronizar o app recebe 401. Como o app é offline-first, o vendedor continuou coletando leads sem saber que a sessão expirou. Ao reconectar, o sync falha com auth error e os leads ficam presos no Dexie.

**Why it happens:**
A sessão é validada no servidor a cada request. Quando offline, o app não faz requests, então não percebe a expiração. No momento do sync, todos os leads tentam subir e todos recebem 401.

**How to avoid:**
- Ao abrir o app com conexão, renovar proativamente a sessão antes de tentar sync.
- Implementar interceptor no sync que detecta 401 e redireciona para re-autenticação, preservando os leads pendentes no Dexie (não descartar).
- Exibir aviso visual quando a sessão está próxima de expirar (`session.expiresAt - now < 24h`).
- Nunca limpar o Dexie local como parte de um logout ou re-auth — apenas invalidar a sessão local.

**Warning signs:**
- Sync falha com erro 401 após período offline longo
- Usuários perdem leads coletados porque "logaram novamente"
- Sessão expira durante evento de 2-3 dias

**Phase to address:**
Fase de sync + auth — implementar renovação proativa e interceptor de 401.

---

### Pitfall 8: Leaderboard com count derivado de query não-atômica

**What goes wrong:**
O leaderboard exibe "quantidade de leads por vendedor". Se o count for calculado com `COUNT(*)` em query separada do upsert de cada lead, duas sincronizações simultâneas de vendedores diferentes podem causar read-modify-write race condition no aggregate. Resultado: contagens incorretas no leaderboard.

**Why it happens:**
O padrão mais simples é `SELECT COUNT(*) FROM leads WHERE user_id = X`. Mas sob carga concurrent (10 vendedores sincronizando ao mesmo tempo ao chegar na área com wifi), as contagens ficam desatualizadas entre a leitura e a próxima query.

**How to avoid:**
- Calcular o leaderboard via `COUNT(*)` em query direta no momento da requisição (não manter counter separado). PostgreSQL lida bem com isso para 10 usuários e centenas de leads.
- Para o leaderboard offline, cachear o resultado do último sync com timestamp — não tentar manter um counter local que pode divergir.
- Usar `GROUP BY user_id` em uma única query para todos os vendedores em vez de N queries paralelas.

**Warning signs:**
- Leaderboard mostra contagens diferentes de vendedor para vendedor ao mesmo tempo
- Contagem no leaderboard não bate com contagem individual do vendedor
- Race condition só aparece quando vários vendedores sincronizam simultaneamente

**Phase to address:**
Fase de implementação do leaderboard — usar query agregada direta, nunca counter separado.

---

### Pitfall 9: Hidration mismatch entre server render e estado Dexie

**What goes wrong:**
Next.js renderiza os componentes no servidor sem acesso ao IndexedDB (browser-only API). Se um componente tenta ler do Dexie durante o render, causa erro imediato. Mas mesmo com `useEffect` correto, o componente renderiza primeiro com estado "vazio" (SSR), depois hidrata com dados do Dexie — causando flash de conteúdo ou erros de hidration se o HTML gerado não bater.

**Why it happens:**
Desenvolvedores esquecem que Next.js App Router faz SSR por padrão. Qualquer uso de `dexie-react-hooks` (`useLiveQuery`) em Server Components causa crash. Em Client Components, o estado inicial (antes do useEffect) deve ser explicitamente `undefined` ou um loading state para evitar mismatch.

**How to avoid:**
- Todos os componentes que usam Dexie devem ter `"use client"` declarado.
- Nunca inicializar o Dexie database fora de um module com `"use client"`.
- O estado inicial do `useLiveQuery` é `undefined` — tratar explicitamente com loading skeleton.
- Usar `dynamic(() => import('./ComponentComDexie'), { ssr: false })` para componentes que dependem exclusivamente de dados locais.

**Warning signs:**
- `ReferenceError: indexedDB is not defined` no build ou no server log
- Erro de hidration no console do browser
- Componente pisca entre "vazio" e "com dados"

**Phase to address:**
Fase de setup da Dexie + primeiros componentes de lead — estabelecer o padrão correto de client boundary.

---

### Pitfall 10: Sync sem `updated_at` causa re-upload desnecessário de tudo

**What goes wrong:**
Sem campo `updated_at` no schema local e no servidor, o sync não sabe quais registros mudaram desde o último sync. A única opção é subir tudo a cada sync — que para 500 leads se torna um bulk upsert custoso que pode travar o tráfego de rede no evento.

**Why it happens:**
O schema inicial não tem timestamps (como identificado no CONCERNS.md: "No timestamps on todos"). O padrão se repete ao criar o schema de leads.

**How to avoid:**
- Obrigatório: `created_at` e `updated_at` em todos os schemas — tanto Drizzle quanto Dexie.
- `updated_at` deve ser atualizado automaticamente (`defaultNow()` e trigger ou update manual em toda mutation).
- O sync deve usar `WHERE updated_at > lastSyncTimestamp` para puxar apenas o delta, não o dataset completo.
- Persistir `lastSyncedAt` no Dexie (tabela de meta) após cada sync bem-sucedido.

**Warning signs:**
- Sync demora desproporcionalmente com muitos registros
- Toda sincronização envia todos os dados, não apenas os novos
- Timeout de sync em redes lentas com volume crescente de leads

**Phase to address:**
Fase de schema do lead — adicionar timestamps antes de implementar qualquer lógica de sync.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Usar `any` no tipo do Dexie schema | Menos boilerplate | Perde type-safety no sync; bugs silenciosos | Never |
| Sync via full-table replace | Simples de implementar | Lento com dados crescentes; apaga soft-deletes | Never (use delta sync) |
| Armazenar foto sem compressão | Implementação trivial | QuotaExceededError em campo; UX quebrada | Never |
| Counter separado para leaderboard | Query mais rápida | Race condition + drift de contagem | Never para v1 com 10 usuários |
| Hard-delete no lugar de soft-delete | Schema mais simples | Deleções perdidas no sync offline | Never em sistemas offline-first |
| Iniciar câmera no mount | UX "mágica" | Falha silenciosa no Safari iOS | Never |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Dexie + tRPC | Chamar tRPC diretamente de hooks Dexie | Separar camada: Dexie para leitura local, tRPC apenas durante sync ativo |
| Dexie + Next.js App Router | Importar Dexie em Server Components | Toda interação Dexie em Client Components com `"use client"` |
| Better-Auth + offline | Assumir sessão válida se cookie presente | Verificar validade antes do sync; interceptar 401 sem descartar dados |
| Supabase + UUID do cliente | Confiar no `DEFAULT gen_random_uuid()` do servidor | Gerar UUID no cliente e enviar no insert; servidor aceita o valor do cliente |
| Camera + Safari iOS | `async function onClick` com await antes de getUserMedia | Chamar `getUserMedia()` diretamente no handler síncrono, sem await prévio |
| IndexedDB + blobs de foto | Salvar blob direto da câmera | Comprimir via Canvas API antes de salvar; max 1280px, JPEG 0.7 |
| Leaderboard + Supabase | Query por vendedor em loop | Single `GROUP BY user_id` query para todos os vendedores |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Full sync sem delta | Sync demora > 10s em redes lentas | Campo `updated_at` + sync apenas do delta | Com > 100 leads por vendedor |
| N+1 no leaderboard | Dashboard lento com mais vendedores | Single aggregation query com GROUP BY | Com > 3 vendedores |
| Fotos sem compressão | Quota excedida, formulário falha | Resize + JPEG compression antes do save | Com > 20-30 leads com foto |
| `useLiveQuery` sem suspense | Flash/blink de UI a cada mudança no Dexie | Loading states explícitos; skeleton components | Imediatamente visível |
| QR scan sem parar a track | Vazamento de câmera entre navegações | `track.stop()` no cleanup do useEffect | Imediatamente em iOS re-navigation |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Armazenar token de sessão no IndexedDB | Token exposto a XSS; não protegido como httpOnly cookie | Usar apenas cookies httpOnly via Better-Auth; nunca salvar token no Dexie |
| Dados de leads sem user_id no Dexie local | Vazamento: qualquer JS na página lê todos os leads | Sempre incluir `userId` no schema Dexie; filtrar por userId em todas as queries |
| Sync sem validação de user_id no servidor | Vendedor A pode subir leads em nome do vendedor B | tRPC protectedProcedure; extrair `userId` do contexto de sessão, nunca do request body |
| Foto salva com metadata EXIF | Expõe geolocalização do evento e dados do dispositivo | Strippear EXIF ao comprimir via Canvas (Canvas não preserva EXIF) |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Sem indicador de status de sync | Vendedor não sabe se lead foi salvo no servidor | Indicador sempre visível: "X leads pendentes de sync", timestamp do último sync |
| Sem fallback de câmera | Se câmera falha, sem forma de inserir telefone | Campo de texto de fallback sempre disponível quando câmera é negada |
| Formulário reset após salvar sem feedback | Vendedor não sabe se o salvamento funcionou | Toast de confirmação + lista dos últimos leads adicionados |
| Leaderboard sem atualização no retorno online | Dados do leaderboard desatualizados até próximo F5 | Acionar refresh do leaderboard automaticamente após sync bem-sucedido |
| QR scan trava sem timeout | Safari não solicita permissão e tela fica parada | Timeout de 5s para getUserMedia; fallback automático para input manual |
| Deleção de lead sem confirmação | Vendedor apaga lead por engano | Dialog de confirmação obrigatório antes de soft-delete |

---

## "Looks Done But Isn't" Checklist

- [ ] **Sync offline→online:** Verificar se leads criados offline (sem internet desde o início) sobem corretamente — testar com DevTools > Network > Offline
- [ ] **QR no Safari iOS real:** Testar em iPhone físico, não apenas simulador — simulador não tem câmera real
- [ ] **PWA instalado na homescreen:** Verificar se a evicção de 7 dias não afeta app instalado — testar com Safari > "Adicionar à Tela de Início"
- [ ] **Sessão expirada durante sync:** Simular expiração de sessão durante sync — o app deve pedir re-login sem perder dados locais
- [ ] **Leaderboard offline:** Verificar se o leaderboard mostra dados do último sync e não tenta fetch online
- [ ] **Soft-delete refletido após sync:** Deletar lead offline, sincronizar — verificar que desaparece em outros dispositivos
- [ ] **Foto grande:** Testar com foto de câmera real (3-8MB) — verificar que compressão é aplicada antes de salvar
- [ ] **Múltiplas aberturas de câmera:** Abrir scanner, fechar, abrir novamente — câmera deve funcionar na segunda abertura (iOS específico)
- [ ] **Build sem env vars de banco:** Verificar que build passa com env vars placeholder (já identificado no CONCERNS.md)

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Sync perdeu deleções (hard-delete) | HIGH | Recriar schema com soft-delete; escrever migration de dados; re-sincronizar todos os clientes |
| Fotos perdidas por QuotaExceededError | MEDIUM | Implementar compressão retroativa; adicionar cleanup de fotos antigas; comunicar perda ao usuário |
| Banco Dexie evictado no iOS | LOW | Acionar sync automático ao detectar banco vazio; mostrar loading claro |
| Sessão expirada com leads pendentes | LOW | Interceptor de 401 preserva dados no Dexie; re-auth e retry de sync |
| UUID colisão na inserção | LOW | `ON CONFLICT (id) DO UPDATE` com timestamp wins; log para auditoria |
| Câmera presa (track não parada) | LOW | Reload da página libera a câmera; fix no cleanup do componente |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Soft-delete obrigatório | Fase: Schema do lead | Testar ciclo offline → delete → sync → verificar em segundo dispositivo |
| UUID gerado no cliente | Fase: Schema do lead | Inserir 2 registros com mesmo UUID — verificar `ON CONFLICT` funciona |
| Safari 7-day eviction | Fase: PWA + sync setup | Verificar em iPhone físico com homescreen install |
| Camera user gesture iOS | Fase: QR scan feature | Testar em iPhone físico — não usar simulador |
| Camera track cleanup | Fase: QR scan feature | Abrir/fechar câmera 3x no iOS — verificar feed ativo |
| Blobs sem compressão | Fase: Foto do lead | Salvar foto de câmera real, verificar tamanho no IndexedDB |
| Sessão expirada offline | Fase: Sync + auth | Expirar sessão manualmente, coletar leads offline, reconectar — verificar sync |
| Leaderboard race condition | Fase: Leaderboard | Sync simultâneo de 2+ usuários — verificar contagens |
| Hidration mismatch | Fase: Setup Dexie inicial | Build + SSR sem erro; sem ReferenceError de indexedDB |
| Sync sem updated_at | Fase: Schema do lead | Verificar que apenas records modificados são enviados no segundo sync |

---

## Sources

- [Dexie.js official docs — Consistency in Dexie Cloud](https://dexie.org/docs/cloud/consistency) — MEDIUM confidence (applies to custom sync by extension)
- [WebKit Storage Policy Updates](https://webkit.org/blog/14403/updates-to-storage-policy/) — HIGH confidence (official WebKit blog)
- [MDN Storage Quotas and Eviction Criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) — HIGH confidence
- [WebKit Bug 215884 — getUserMedia recurring permissions in standalone](https://bugs.webkit.org/show_bug.cgi?id=215884) — HIGH confidence (official bug tracker)
- [Better-Auth Session Management docs](https://better-auth.com/docs/concepts/session-management) — HIGH confidence (official docs)
- [Better-Auth Issue #3462 — 401 random session failures](https://github.com/better-auth/better-auth/issues/3462) — MEDIUM confidence (community report)
- [PowerSync: Bringing Offline-First to Supabase](https://www.powersync.com/blog/bringing-offline-first-to-supabase) — MEDIUM confidence (vendor blog, verified against Supabase discussions)
- [Supabase Discussion #357 — Using Supabase offline](https://github.com/orgs/supabase/discussions/357) — MEDIUM confidence (community discussion)
- [RxDB IndexedDB Max Storage Limit](https://rxdb.info/articles/indexeddb-max-storage-limit.html) — MEDIUM confidence (vendor docs, consistent with MDN)
- [WebRTC Guide for Safari in the Wild — webrtcHacks](https://webrtchacks.com/guide-to-safari-webrtc/) — MEDIUM confidence (community expert, consistent with Apple dev forums)
- [Next.js Hydration Error docs](https://nextjs.org/docs/messages/react-hydration-error) — HIGH confidence (official Next.js docs)
- [Building Offline-First Next.js 15 App — vercel/next.js Discussion #82498](https://github.com/vercel/next.js/discussions/82498) — MEDIUM confidence

---

*Pitfalls research for: offline-first lead capture PWA (Dexie + Supabase + Better-Auth + Next.js)*
*Researched: 2026-03-24*
