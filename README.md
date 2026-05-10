# VALIDADORES-ROMANEIO

> Conjunto de **artefatos web vivos** para validação e conciliação de romaneios da **Franco Galvânica/Folheados** — empresa de banho ouro/prata.

Os 4 artefatos rodam dentro do **Cowork** (Claude desktop) e fazem queries diretas ao PostgreSQL na Aiven (espelho do banco local de produção).

## Estado atual

| Artefato | Versão | Linhas | Função |
|---|---:|---:|---|
| **Validador de Romaneio** | v2.7 | ~940 | Análise detalhada de 1 romaneio (5 seções: 7 documentos, conciliação por bucket, fórmula triádica, itens, alertas) |
| **Monitor de Romaneios** | v2.4 | ~720 | Lista todos romaneios de um período com KPIs e variação Pass→Rom |
| **Romaneio × Passagem** | v3.1 | ~1.180 | Comparativo Por Serviço / Diário com filtros |
| **Extrato Cliente** | v2.9 | ~830 | 4 modos: Conciliação por Bucket, Diário, Por Romaneio, Resumo Cliente |

## Conteúdo

| Documento | Para quê |
|---|---|
| [README.md](README.md) | (Este arquivo) Visão geral e quick start |
| [CHANGELOG.md](CHANGELOG.md) | Histórico de versões dos 4 artefatos |
| [ARQUITETURA.md](ARQUITETURA.md) | Sistema, bancos, MCPs, fluxo de dados |
| [ARTEFATOS.md](ARTEFATOS.md) | Descrição detalhada de cada um dos 4 artefatos |
| [REGRAS_NEGOCIO.md](REGRAS_NEGOCIO.md) | Fórmula triádica, fluxo de 7 documentos, idiossincrasias |
| [BUGS_E_LICOES.md](BUGS_E_LICOES.md) | Bugs encontrados e como evitar regressão |
| [DEPLOY.md](DEPLOY.md) | Como atualizar artefatos no Cowork e fazer push GitHub |
| [docs/memory/](docs/memory/) | Memória persistente do Claude — referência canônica |

## Quick start

### Abrir um artefato

Os artefatos são HTMLs autocontidos. Para abrir localmente (apenas inspeção visual, sem dados):

```bash
# Windows
start franco_validador_romaneio.html

# macOS
open franco_validador_romaneio.html
```

Para usar com **dados reais**, eles precisam estar publicados no Cowork e abertos pelo painel **Live artifacts**. Ver [DEPLOY.md](DEPLOY.md).

### Acessar via URL no validador

O validador suporta URL direta para um romaneio específico:

```
https://...artifact-url.../?rom=24855
# ou
https://...artifact-url.../#rom=24855
```

## Fluxo de processo Franco (resumo)

```
Recebimento → Catalogação (Triagem) → Separação (Preparação)
    → Banho → Revisão → Romaneio (Faturamento) → Expedição (Motoboy)
```

7 documentos no total. O validador casa esses documentos por cliente e datas, com detecção de:
- Separações concorrentes (mesmo cliente, banho sobreposto)
- Duplicatas de passagem (POST duplo na API)
- Banho com `data_inicio_banho` NULL (operador esqueceu de marcar)
- OS ligada via texto "CAT: NNNN" na observação

## Stack

- **Frontend dos artefatos:** HTML/CSS/JS puro (sem build step), com Chart.js / Grid.js opcionais via CDN
- **Banco:** PostgreSQL 17 na Aiven (`164.92.100.77:24135`)
- **MCP:** `mcp__postgres-aiven__pg_consultar` (cap de `limit=500` por chamada — usa paginação `callDBAll`)
- **Backup local:** PostgreSQL local Galvânica (192.168.0.250) + 2 Firebird (legado Delphi)

## Contato

- Owner: **Roger Franco** ([@francoroger](https://github.com/francoroger))
- Empresa: Franco Galvânica/Folheados
