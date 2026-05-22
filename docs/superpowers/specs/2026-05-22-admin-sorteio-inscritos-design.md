# Admin sorteio como painel de inscritos

## Contexto

O sistema deve continuar captando inscrições para o sorteio via WhatsApp, com
código individual, rastreabilidade, exportação e dados de contato. O sorteio em
si não será realizado no sistema; será feito por um terceiro. A equipe Profills
entrará em contato manualmente com a pessoa sorteada.

## Decisão

Transformar `/admin/sorteio` em um painel operacional de inscritos do sorteio.
O sistema deixa de escolher, registrar ou notificar vencedores, mas preserva a
base de participantes e os recursos necessários para operação externa.

## Escopo funcional

- Manter a rota `/admin/sorteio`.
- Renomear a tela para "Inscritos do sorteio".
- Manter stats de operação: total, inscritos completos, recusas e em andamento.
- Manter busca por nome, empresa, código e WhatsApp.
- Manter filtro por estado.
- Manter exportação CSV com dados úteis para o sorteio externo.
- Manter `raffle_code` por participante.
- Exibir WhatsApp do participante de forma acionável para contato manual.
- Remover qualquer ação de sortear, re-sortear, marcar vencedor ou notificar vencedor.

## UI

A tela deve ser densa e operacional, seguindo o registro de produto do projeto.
Sem cards de prêmio. Sem seção de vencedores. O foco visual fica em leitura,
filtragem, exportação e contato.

Estrutura:

- Header com título "Inscritos do sorteio" e subtítulo explicando que o sorteio
  será realizado externamente.
- Linha de métricas com quatro cards: Total, Completos, Recusas, Em andamento.
- Toolbar com busca, filtro por estado e botão "Exportar CSV".
- Tabela com colunas: Estado, Código, Nome, Empresa, WhatsApp, Inscrição,
  Termos, Ação.
- Ação por linha: abrir conversa no WhatsApp em nova aba usando `wa.me/<waId>`.

## API e dados

`packages/api/src/routers/whatsapp.ts` deve expor apenas:

- `list`
- `stats`
- `exportCsv`

O schema `whatsapp.participants` deve manter:

- `wa_id`
- `state`
- `name`
- `company`
- `raffle_code`
- `consent_at`
- `declined_at`
- `terms_version`
- `retry_count`
- timestamps

Devem sair do schema e das migrations atuais:

- `winner_of`
- `winner_at`
- `notified_at`
- índice/constraint de vencedor por prêmio

## Textos do bot

O bot pode continuar falando em inscrição/código do sorteio, porque o usuário
continua participando de um sorteio. O que deve sair são mensagens de vencedor
geradas pelo sistema. Textos que prometem "os vencedores serão notificados por
este WhatsApp" devem ser ajustados para contato pela equipe Profills quando
necessário, sem implicar automação de vencedor.

## Documentação

Atualizar documentação operacional para remover instruções de testar botão
"Sortear" e deixar claro que `/admin/sorteio` serve para acompanhar inscritos e
exportar/consultar contatos.

## Validação

- `bun run check-types`
- testes focados do pacote API se aplicável
- `git diff --check`
- busca por referências remanescentes a `drawRaffle`, `notifyWinner`,
  `unmarkWinner`, `winnerOf`, `winnerAt`, `notifiedAt`, `onlyWinners` no código
  de runtime
