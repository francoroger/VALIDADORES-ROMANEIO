# Arquitetura

## Visão geral

```
┌─────────────────────────────────────────────────────────────┐
│  Cowork (Claude desktop) — 4 artefatos HTML/JS              │
│  ┌────────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Validador  │ │ Monitor │ │ RP × Pass│ │ Extrato  │       │
│  └─────┬──────┘ └────┬────┘ └─────┬────┘ └────┬─────┘       │
│        └─────────────┴──────┬─────┴───────────┘             │
│                             │ window.cowork.callMcpTool      │
└─────────────────────────────┼───────────────────────────────┘
                              │
                              ▼
         ┌─────────────────────────────────────┐
         │ MCP server: postgres-aiven          │
         │ Tool: pg_consultar (cap limit=500)  │
         │ Modo SOMENTE LEITURA                │
         └────────────────┬────────────────────┘
                          │
                          ▼
         ┌─────────────────────────────────────┐
         │ PostgreSQL 17 · Aiven cloud         │
         │ 164.92.100.77:24135 (SSL: require)  │
         │ Banco: defaultdb                    │
         │ Espelho do banco local da Franco    │
         └────────────────┬────────────────────┘
                          │ ~30min lag (backup)
                          ▼
         ┌─────────────────────────────────────┐
         │ PostgreSQL local LAN                │
         │ 192.168.0.250:5432 (produção)       │
         │ Recebe writes do app Delphi+Laravel │
         └─────────────────────────────────────┘
```

## Bancos disponíveis

| MCP | Host | Função | Quando usar |
|---|---|---|---|
| **postgres-aiven** | 164.92.100.77 | Espelho cloud do banco galvânica | **Padrão** para os 4 artefatos (acessível de qualquer lugar) |
| postgres-galvanica | 192.168.0.250 (LAN) | Banco de produção local | Análises pontuais via Claude Code (LAN only) |
| postgres-folheados-online | 45.55.253.122 | Banco Folheados (outro produto) | Análises do Folheados |
| postgres-onlinefranco | 45.55.253.122 | Banco Galvânica online (DigitalOcean) | Backup secundário |
| firebird-base | Local | Legado Delphi (sistema antigo) | Migração de dados históricos |
| firebird-basefranco | Local | Legado Delphi (sistema antigo) | Migração |

## Schema (tabelas principais)

```
cliente (id, nome, ...)
  │
  ├─ recebimento_pecas (id, idfornec/cliente, data_receb, pesototal, obs, ...)
  │     │
  │     └─ separacoes_recebimentos (N:N link)
  │           │
  │           ▼
  ├─ separacoes (id, cliente_id, catalogacao_id → triagem.id,
  │              data_inicio_recebimento, data_fim_recebimento,
  │              data_inicio_catalogacao, data_fim_catalogacao,
  │              data_inicio_preparacao, data_fim_preparacao,
  │              data_inicio_banho, data_fim_banho,
  │              data_inicio_revisao, data_fim_revisao,
  │              data_inicio_expedicao, data_fim_expedicao,
  │              data_fim_separacao, status, retrabalho_id)
  │     │
  │     └──→ triagem (id, idcliente, valor_total, valor_cotacao, observacoes [pode ter "O.S:NNNN"])
  │           │
  │           └──→ ordemservico (id, numero AS os_numero, idcliente, datavenda, observacao [pode ter "CAT: NNNN"])
  │                 │
  │                 └──→ itemordem (id, idordem, idmaterial, idcor, idtiposervico, milesimos, peso, valor)
  │
  ├─ passagem_pecas (id, cliente_id, material_id, cor_id, tiposervico_id, milesimos, peso,
  │                   data_servico, created_at, deleted_at, ...)
  │
  ├─ servico AS romaneio (id, idcliente, datavenda, valor_com_desconto, ...)
  │     │
  │     └──→ itemservico (id, idservico, idmaterial, idcor, idtiposervico, milesimos, peso, valor,
  │                        vlr_serv_kg, vlr_adic_ml_kg, material_valorg, mil_ini, fator, tipo_valor)
  │
  ├─ servico_entrega (idservico, identrega)
  │     │
  │     └──→ entregas_motoboy (id, data_entrega, hora_entrega, valor, observacoes)
  │
  └─ tabelas auxiliares: material, cores, tiposervico
```

## Fluxo de matching no validador

Dado um romaneio (`servico.id`), o validador encontra os 7 documentos relacionados:

```
1. ROMANEIO        = servico.id (entrada)
2. SEPARAÇÃO       = separacao onde exp_ini ≤ romaneio.datavenda ≤ COALESCE(exp_fim, exp_ini+14d) + 2d
3. TRIAGEM         = separacao.catalogacao_id (FK direta)
4. OS              = 4 níveis de fallback:
                     a) parse "O.S:NNNN" da triagem.observacoes
                     b) CAT:<triagem_id> na ordemservico.observacao
                     c) OS do cliente entre min(recebimento) e fim_separacao
                     d) OS mais recente do cliente
5. RECEBIMENTOS    = separacoes_recebimentos (N:N — pode ter vários)
6. PASSAGENS       = passagem_pecas onde data_servico BETWEEN banho_ini e MIN(banho_fim+24h, próxima_sep.banho_ini)
7. EXPEDIÇÃO       = servico_entrega → entregas_motoboy
```

## Constraint do MCP

`pg_consultar` tem **`Field(le=500)`** Pydantic. Sempre paginar com `callDBAll` quando esperamos > 500 rows. Ver [BUGS_E_LICOES.md](BUGS_E_LICOES.md#mcp-limit-cap-500).
