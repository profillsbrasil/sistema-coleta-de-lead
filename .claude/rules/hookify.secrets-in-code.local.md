---
name: block-secrets-in-code
enabled: true
event: file
action: block
conditions:
  - field: new_text
    operator: regex_match
    pattern: '(API_KEY|SECRET_KEY|PASSWORD|PRIVATE_KEY|ACCESS_TOKEN|AUTH_TOKEN)\s*[=:](?!\s*(os\.environ|process\.env|ENV\[|getenv))|(sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |EC |OPENSSH |)?PRIVATE KEY-----|Bearer\s+[A-Za-z0-9._-]{20,}|https?://[^/\s:@]+:[^/\s:@]+@)'
---

**BLOQUEADO: Secret hardcoded detectado!**

Voce esta inserindo uma chave, senha ou token diretamente no codigo. Isso e um risco critico de seguranca.

**Por que isso e perigoso:**
- Secrets no codigo vao parar no git history — mesmo apagando depois, ficam acessiveis
- Qualquer pessoa com acesso ao repositorio ve as credenciais
- Bots automaticos escaneiam repos publicos por secrets expostos

**Alternativas:**
- Use variaveis de ambiente: `os.environ["API_KEY"]` (Python) ou `process.env.API_KEY` (JS)
- Armazene em `.env` (que DEVE estar no `.gitignore`)
- Use um secret manager (AWS Secrets Manager, Vault, etc.)
