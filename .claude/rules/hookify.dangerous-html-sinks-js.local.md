---
name: warn-dangerous-html-sinks-js
enabled: true
event: file
action: warn
conditions:
  - field: file_path
    operator: regex_match
    pattern: \.(ts|tsx|js|jsx)$
  - field: new_text
    operator: regex_match
    pattern: \binnerHTML\s*=|dangerouslySetInnerHTML
---

**Aviso: sink HTML perigoso detectado!**

Voce esta escrevendo HTML bruto direto no DOM ou no React.

**Checklist antes de seguir:**
- o conteudo foi sanitizado?
- ha alternativa por template/componentes?
- esse trecho merece review de seguranca?

Se continuar, explique a origem do HTML e como a sanitizacao esta garantida.
