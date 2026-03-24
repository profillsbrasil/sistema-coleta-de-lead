---
name: warn-todo-without-issue
enabled: true
event: file
action: warn
conditions:
  - field: new_text
    operator: regex_match
    pattern: \b(TODO|FIXME|HACK|XXX)\b(?!.*(?:#\d+|[A-Z]{2,}-\d+|\[[^\]]+\]))
---

**Aviso: TODO/FIXME sem referencia a issue!**

Voce esta adicionando um marcador de divida tecnica sem vincular a uma issue.
TODOs orfaos tendem a ser esquecidos e virar divida permanente.

**Formato recomendado:**
- `TODO(#123): descricao` — vinculado a issue do GitHub
- `TODO(PROJ-123): descricao` — vinculado ao tracker do projeto
- `FIXME [nome]: descricao` — com responsavel identificado

Crie uma issue primeiro, depois referencia aqui.
