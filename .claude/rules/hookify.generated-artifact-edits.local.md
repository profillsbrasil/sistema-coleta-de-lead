---
name: block-generated-artifact-edits
enabled: true
event: file
action: block
conditions:
  - field: file_path
    operator: regex_match
    pattern: (^|/)(dist|build|coverage|node_modules|\.next|out|\.turbo)(/|$)
---

**BLOQUEADO: Artefato gerado detectado!**

Voce esta tentando editar um diretório tipicamente gerado por build, bundle ou instalacao de dependencias.

**Fluxo recomendado:**
- Edite o codigo-fonte de origem
- Rode o build/codegen apropriado
- Revise apenas o diff final gerado

Se esse diretório for realmente fonte do projeto, remova esta regra do repo local antes de prosseguir.
