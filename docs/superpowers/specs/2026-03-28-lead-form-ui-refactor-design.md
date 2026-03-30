# Lead Form UI Refactor — Design Spec

## Context

O formulario de novo lead (`/leads/new`) usa um Collapsible "Mais detalhes" que esconde campos opcionais (Empresa, Cargo, Segmento, Notas). O TagSelector (Quente/Morno/Frio) nao tem icones, dificultando a identificacao visual rapida. O objetivo e tornar o formulario mais direto — todos os campos visiveis sem collapsible — e adicionar icones de termometro ao seletor de temperatura.

## Decisoes de Design

### 1. Icones no TagSelector

Icones Lucide para cada nivel de interesse:
- **Quente**: `ThermometerSun` (termometro com sol)
- **Morno**: `Thermometer` (termometro simples)
- **Frio**: `ThermometerSnowflake` (termometro com floco de neve)

Cada botao mostra `[icone] Label` (ex: `ThermometerSun Quente`). Icone `size-3.5` (14px), gap de 1.5 (6px) entre icone e texto.

### 2. Remocao do Collapsible

O componente `Collapsible` + `CollapsibleTrigger` + `CollapsibleContent` e removido. Os campos Empresa, Cargo, Segmento e Notas ficam diretamente no grid do formulario, sem nenhum wrapper de disclosure.

### 3. Nova Ordem dos Campos

**Mobile (1 coluna):**

| # | Campo |
|---|-------|
| 1 | Nome * |
| 2 | Interesse * (TagSelector com icones) |
| 3 | Telefone + botao QR |
| 4 | Email |
| 5 | Empresa |
| 6 | Cargo |
| 7 | Segmento |
| 8 | Foto do cartao |
| 9 | Notas (textarea) |
| 10 | Salvar Lead (button) |
| 11 | Excluir Lead (edit mode only) |

**Desktop (2 colunas — md:grid-cols-2):**

| Linha | Coluna 1 | Coluna 2 |
|-------|----------|----------|
| 1 | Nome * | Interesse * |
| 2 | Telefone + QR | Email |
| 3 | Empresa | Cargo |
| 4 | Segmento | Foto do cartao |
| 5 | Notas (col-span-2) | |
| 6 | Salvar Lead (col-span-2) | |
| 7 | Excluir Lead (col-span-2, edit mode) | |

### 4. Estado `showDetails` Removido

O state `showDetails` e `hasDetails` nao sao mais necessarios. A logica de auto-expand no edit mode tambem e removida.

## Arquivos Afetados

1. **`apps/web/src/components/tag-selector.tsx`** — Adicionar icones Lucide ao `TAG_CONFIG` e renderizar dentro de cada botao
2. **`apps/web/src/components/lead-form.tsx`** — Remover Collapsible, reorganizar campos, remover state `showDetails`

## Fora de Escopo

- Mudancas em validacao/schema (Zod permanece igual)
- Mudancas em tRPC/API
- Mudancas em estilos do TagSelector (cores OKLCH permanecem)
- Novos campos
