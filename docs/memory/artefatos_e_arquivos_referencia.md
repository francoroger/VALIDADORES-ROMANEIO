---
name: Artefatos e arquivos de referência do projeto Franco
description: Onde estão os artefatos persistidos e os arquivos importantes do workspace
type: reference
originSessionId: 66180a77-4118-4d6f-820f-76c6905d22a8
---
## Artefatos do Cowork (sidebar)

| ID | Função | Quando usar |
|---|---|---|
| `franco-romaneio-passagem` | Dashboard ao vivo: cruza romaneios × passagens × OSs por categoria, com variação % | Dia a dia, conferir um romaneio específico ou ver período inteiro |
| `romaneio-24749-validacao` | **DEPRECATED** (substituído por `franco-validador-romaneio` em 2026-05-09). Era validação visual hardcoded do romaneio 24749 da Layla. | Não usar. |
| `franco-validador-romaneio` | Validador genérico de qualquer romaneio. Recebe nº via URL (`?rom=NNN` ou `#NNN`). Mostra: 7 documentos, conciliação por bucket, fórmula triádica, itens detalhados, alertas. | Para validar/inspecionar 1 romaneio em detalhe |
| `franco-extrato-cliente` | Extrato de cliente (criado em outra sessão) | Visão por cliente |
| `franco_galvanica_inventory` | Inventário do Laravel 5.8 atual (criado por subagent) | Referência sobre o que existe no Laravel hoje |

Todos persistidos em `C:\Users\roger\OneDrive\Documents\Claude\Artifacts\<id>\index.html`. Abrem na sidebar do Cowork em qualquer conversa.

## Arquivos no workspace ONLINE FRANCO

`C:\Users\roger\OneDrive\Documents\Claude\Projects\ONLINE FRANCO\`

- **`PLANO_MODERNIZACAO.md`** — documento mestre com estado atual, stack proposta, mapa de módulos, fases, riscos, regras de negócio e perguntas pendentes. Versão 1.0.
- **`backup_e_sync_online.bat`** — script Windows que faz dump do local + restore no Aiven. Já roda em produção. Edita variáveis no topo se mudar credenciais.
- **`francogalvanica-francofolheados/`** — fontes Delphi descompactados (.pas, .dfm, .dpr).
- **`francogalvanica-francogalvanica/`** — fontes Laravel 5.8 descompactados.
- **`francogalvanica-francogalvanica-e616f31e62ec.zip`** — backup do zip Laravel original.

## Arquivos no workspace BANCO DE DADOS POSTGRES

`C:\Users\roger\OneDrive\Documents\Claude\Projects\BANCO DE DADOS  POSTGRES\` (atenção: 2 espaços entre "DADOS" e "POSTGRES")

- **`mcp-postgres-aiven/`** — MCP custom para Aiven que criei (server.py com SSL, configure_claude, etc.)
- `mcp-postgres-novo/` — MCP atual do galvanica local (referência usada como template para o aiven)
- `mcp-postgres-folheados-online/` — MCP atual do DigitalOcean folheados
- `mcp-postgres-galvanica/` — versão antiga (legada, ainda existe)
- `exportacao_20260413/` — CSVs exportados de várias tabelas

## Arquivos no workspace FIREBIRD PRATICX

`C:\Users\roger\OneDrive\Documents\Claude\Projects\FIREBIRD PRATICX\` (mencionado em sessões anteriores)

- `BASEFRANCO\sync-incremental\` — rotina de replicação Firebird → Postgres com fingerprint, delta_data, delta_pk_max
- Outros artefatos de NF/Praticx

**How to apply:** quando Roger mencionar algum desses, eu já sei onde procurar. Para cruzar dados de NF, usar firebird-base/firebird-basefranco MCPs.
