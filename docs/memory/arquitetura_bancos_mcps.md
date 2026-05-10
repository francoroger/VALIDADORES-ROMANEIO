---
name: Arquitetura de bancos e MCPs do Roger
description: Inventário dos servidores PostgreSQL/Firebird, MCPs configurados, e fluxo de backup/sync
type: reference
originSessionId: 66180a77-4118-4d6f-820f-76c6905d22a8
---
Roger tem **5 conexões MCP** ativas no Claude Desktop, mais 1 nova (Aiven) que ele instalou nesta sessão:

| MCP | Tipo | Host | Banco | User | Função |
|---|---|---|---|---|---|
| postgres-galvanica | PG 15.15 | 192.168.0.250 (LAN) | folheados | userfolheados | **PRODUÇÃO LOCAL** — onde Delphi grava |
| postgres-folheados-online | PG 16.13 | 45.55.253.122 (DigitalOcean) | folheados | franco | Mirror antigo no DO (read-only via MCP) |
| postgres-onlinefranco | PG 16.13 | 45.55.253.122 (DigitalOcean) | francogalvanica | franco | **Tentativa abandonada** de modernização em Node.js + Prisma (18 tabelas em inglês). NÃO mexer. |
| postgres-aiven | PG 17.9 | galvanica-galvanica.g.aivencloud.com:24135 | defaultdb | avnadmin | **Mirror oficial atual** — recebe backup diário do local. SSL=require. |
| firebird-base | FB 2.5.9 | 192.168.0.250:3050 | BASE.FDB | SYSDBA | Sistema PRATICX legado — tem dados de NF |
| firebird-basefranco | FB 2.5.9 | 192.168.0.250:3050 | BASEFRANCO.FDB | SYSDBA | Sistema PRATICX legado |

**Fluxo de backup diário:** script `backup_e_sync_online.bat` em `C:\Users\roger\OneDrive\Documents\Claude\Projects\ONLINE FRANCO\` faz `pg_dump` do local 192.168.0.250 → salva em Dropbox + Google Drive → `pg_restore --clean --single-transaction` no Aiven (com sslmode=require). Aiven é destinatário **destrutivo** (--clean apaga e recria), funciona porque é mirror puro de leitura.

**MCP Aiven custom criado nesta sessão:** pasta `C:\Users\roger\OneDrive\Documents\Claude\Projects\BANCO DE DADOS  POSTGRES\mcp-postgres-aiven\` espelha a estrutura do `mcp-postgres-folheados-online` mas adiciona suporte a SSL via env var `PG_SSLMODE=require`. Mesma assinatura de tools (`pg_testar_conexao`, `pg_listar_tabelas`, `pg_consultar`, etc.).

**Why:** Roger trabalha com 3 servidores PG distintos + 2 Firebird de outro sistema (PRATICX). Confundir os MCPs leva a queries em banco errado. O `postgres-onlinefranco` em particular é uma armadilha — parece ser o mesmo banco da Aiven mas é um experimento Prisma abandonado.

**How to apply:**
- Para consultar dados oficiais dos romaneios/triagens hoje: usar `postgres-aiven` (mais novo, igual ao local). Tem só leitura.
- Para gravar/escrever: tem que ser via Delphi (no local). MCPs são todos read-only.
- Para Praticx/NF: usar firebird-base ou firebird-basefranco.
- Cuidado: Aiven é serviço diferente da DigitalOcean. Roger às vezes confunde. Aiven hostname é `*.aivencloud.com`, DigitalOcean é IP fixo `45.55.253.122`.
