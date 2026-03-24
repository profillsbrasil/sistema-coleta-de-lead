---
name: block-eval-new-function-js
enabled: true
event: file
action: block
conditions:
  - field: file_path
    operator: regex_match
    pattern: \.(ts|tsx|js|jsx)$
  - field: new_text
    operator: regex_match
    pattern: \beval\(|\bnew Function\(
---

**BLOQUEADO: Execucao dinamica de codigo detectada!**

`eval()` e `new Function()` abrem superficie desnecessaria para injecao e comportamento imprevisivel.

**Alternativas:**
- mapeie comportamentos por objeto/tabela de dispatch
- use parser/interpretador dedicado se o problema for DSL
- serialize dados, nao codigo
