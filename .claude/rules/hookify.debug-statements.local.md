---
name: warn-debug-statements
enabled: true
event: file
action: warn
conditions:
  - field: file_path
    operator: regex_match
    pattern: \.(py|go|ts|tsx|js|jsx)$
  - field: file_path
    operator: not_contains
    pattern: test
  - field: file_path
    operator: not_contains
    pattern: spec
  - field: file_path
    operator: not_contains
    pattern: stories
  - field: file_path
    operator: not_contains
    pattern: script
  - field: file_path
    operator: not_contains
    pattern: migration
  - field: new_text
    operator: regex_match
    pattern: \bconsole\.log\(|\bconsole\.debug\(|\bprint\((?!.*file=)|\bdebugger\b|\bbreakpoint\(\)|\bfmt\.Print(?:ln|f)?\(
---

**Aviso: Debug statement detectado!**

Voce esta adicionando um statement de debug. Lembre-se:
- Debug logs nao devem ir para producao
- `console.log` e `fmt.Print*` podem expor dados sensiveis
- Use um logger adequado se precisa de logging em producao

Remova antes de commitar ou substitua por logging estruturado.
