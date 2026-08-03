# Perfil de segurança

Este perfil descreve a esteira defensiva do Orquestrador para repositórios próprios ou explicitamente autorizados.

## Ferramentas

- Gitleaks: segredos no diretório e no histórico Git.
- Semgrep e CodeQL: análise estática do código.
- OSV-Scanner e Grype: vulnerabilidades em dependências e artefatos.
- Trivy: vulnerabilidades, segredos, imagens e configuração de infraestrutura.
- OWASP ZAP, Nuclei e Schemathesis: testes dinâmicos em staging/preview autorizado.
- Strix: pentest agentivo com análise white-box e validação dinâmica.

O projeto não copia esses repositórios para dentro do pacote. Os binários, imagens e ações devem ser instalados pelo projeto consumidor, com versões fixadas e revisão de licença.

## Regras operacionais

1. Scans locais são somente leitura.
2. Strix, ZAP e Nuclei só rodam com alvo explícito e autorização registrada.
3. Nunca usar credenciais de produção, dados reais ou tenants de terceiros.
4. Não habilitar brute force, credential stuffing, fuzzing destrutivo ou exploração que altere estado.
5. Não aplicar correções automáticas nem fazer commit automaticamente.
