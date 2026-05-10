# Franco Galvânica · Artefatos de Conciliação

Conjunto de ferramentas web (artefatos vivos do Cowork/Claude) para validação e conciliação de romaneios da Franco Galvânica/Folheados — empresa de banho ouro/prata.

## Artefatos

| Arquivo | Descrição |
|---|---|
| **franco_validador_romaneio.html** | Validador detalhado por romaneio individual: 7 documentos, conciliação por bucket, fórmula triádica, alertas |
| **monitor_romaneios.html** | Monitor diário de romaneios saindo, com KPIs e variação Pass→Rom |
| **franco_rp_fixed.html** | Comparativo Romaneio×Passagem com 2 abas (Por Serviço, Diário) |
| **extrato_cliente.html** | Conciliação por bucket em 4 modos (Conciliação, Diário, Por Romaneio, Resumo Cliente) |

Os 4 chamam o MCP `mcp__postgres-aiven__pg_consultar` (banco PostgreSQL na Aiven, espelho do banco local de produção).

## Documentação

A pasta `docs/memory/` contém o conhecimento construído pelo Claude ao longo das sessões:

- **regras_negocio_franco.md** — fórmula triádica, fluxo de 7 documentos, idiossincrasias
- **regra_peso_total_romaneio.md** — vernizes/acessórios/ródio caneta NÃO somam no peso
- **topologia_kanban_franco.md** — FKs e heurísticas Recebimento↔Separação↔Triagem↔OS↔Romaneio↔Passagens
- **anchor_separacao_romaneio.md** — lógica correta de ligar romaneio à separação (case #24855 provou)
- **bug_parseresult_observacao_quebralinha.md** — sanitizar CHR(13)/CHR(10) em observações
- **duplicatas_passagem_pecas.md** — sistema às vezes faz POST duplo, inflando variação (case #24874)
- **processo_aplicar_correcao_ui.md** — checklist obrigatório pra UI fixes não regredirem
- **preferencias_estilo_roger.md** — convenções de UI consolidadas
- **versionamento_artefatos.md** — todo artefato deve ter VERSIONS array + log clicável
- **arquitetura_bancos_mcps.md** — 3 Postgres + 2 Firebird, qual MCP quando
- **artefatos_e_arquivos_referencia.md** — paths e referências
- **projeto_franco_modernizacao.md** — escopo e stack (Laravel 11 + React Vite + Tailwind/shadcn)
- **MEMORY.md** — índice

## Estado atual (2026-05-10)

⚠ Os 4 arquivos HTML neste commit estão **truncados** no fim do JS — bug do ambiente de edição em sessões longas. O próximo commit reescreve tudo do zero.

Histórico de bugs corrigidos antes da regressão:
- v2.0 anchor SEPARAÇÃO via janela de expedição (não ±2d) — caso #24855 NP SOARES
- v2.1 fallback estimado quando banho_ini é NULL — caso #24871 ULIANE
- v2.2 query concorrentes com LEAST/GREATEST (não tstzrange) — protege contra dados invertidos
- v2.3 cores variação: positivo verde, negativo vermelho
- v2.4 (planejado) tolerância +24h banho_fim limitada por próxima sep + detector duplicatas — casos #24863 LAYLA, #24874 LETÍCIA

## Setup local

```bash
# Abrir um artefato no navegador para inspeção (estático — não chama MCP)
open franco_validador_romaneio.html
```

## Próximos passos

1. Reescrever os 4 artefatos com fim íntegro
2. Adicionar testes automatizados de sintaxe HTML/JS (parser headless)
3. Migrar para o projeto novo (Laravel 11 API + React Vite TS) — strangler fig
