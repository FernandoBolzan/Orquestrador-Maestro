# Baseline - Orquestrador Maestro

## Data
2026-09-02

## Commit SHA
c25ce190283f1b860a866f86f96230ad915f268a

## Versão
0.1.27 (package.json)

## Node.js
v22.17.0

## Sistema Operacional
Linux e7034c4345b6 6.17.0-23-generic #23-Ubuntu SMP PREEMPT_DYNAMIC Sat Apr 11 23:29:57 UTC 2026 x86_64 GNU/Linux

## CLI
orquestrador-maestro (bin/orquestrador-maestro.js)

## Arquivos Relevantes
- bin/orquestrador-maestro.js (CLI principal)
- orquestrador/rules.md (contrato global)
- orquestrador/maestro.md (protocolo)
- orquestrador/PERSISTENCE.md (contrato de persistência)
- orquestrador/hooks.md (roteamento de hooks)
- orquestrador/SKILLS_ROUTER.json (roteador de skills)
- orquestrador/SKILL_EXECUTION_PROFILES.json (perfis de execução)
- tests/ (testes automatizados)

## Configuração
- Telemetria: desabilitada por padrão
- Memória: não implementada (apenas DEV/ para contexto operacional)
- Hooks: preflight, token budget, verification, sync

## Condições do Benchmark
- Modelo: não especificado (usuário deve definir)
- Provider: não especificado (usuário deve definir)
- Ambiente: Linux, Node 22
- Branch: feat/context-memory-benchmark

## Estado Atual
- Sem memória episódica
- Sem benchmark engine
- Context brief implementado (orquestrador/bin/context-brief.js)
- DEV/ convencional para contexto operacional
- Skills roteamento por SKILLS_ROUTER.json
- Perfis de execução: fast, standard, deep, multiagent, phase-loop, saas, security

## Próximos Passos (Phase 0 - Discovery)
1. Analisar arquitetura claude-mem
2. Criar matriz de inspiração
3. Verificar licenças
4. Identificar divergências com o master prompt
5. Registrar decisões