# Artefatos

## Visão dos 4 artefatos

### 1. Validador de Romaneio · `franco_validador_romaneio.html`

**Objetivo:** análise profunda de UM romaneio específico.

**Seções:**

| # | Seção | O que mostra |
|---|---|---|
| ① | Fluxo dos 7 Documentos | Timeline de Recebimento → OS → Triagem → Separação → Banho → Romaneio → Expedição, com Δ tempo entre etapas |
| ② | Conciliação por Bucket | Tabela tripla OS×Pass×Rom agrupada por (material+cor+milésimos), com variação % |
| ③ | Fórmula Triádica | Recalcula `valor = (vlr_serv_kg × peso/1000) + (vlr_adic × (mil-mil_ini) × peso/1000) + (cotação × mil × peso/1000)` item a item e compara com o valor armazenado |
| ④ | Itens detalhados | Lista de todos itens com vlr_serv_kg, vlr_adic, cotação |
| ⑤ | Alertas automáticos | Variação alta, separações concorrentes, duplicatas, OS sem CAT, status pagamento, etc |

**Entrada:** número do romaneio (input manual ou via URL `?rom=NNN` / `#rom=NNN`).
**Lista pré-carregada:** últimos 30 dias clicáveis ao abrir.

### 2. Monitor de Romaneios · `monitor_romaneios.html`

**Objetivo:** visão diária/mensal de todos os romaneios com status automático.

**Colunas:** romaneio · data · cliente · qtd itens · banho · adicionais · valor · OS · Δ dias OS→Rom · passagens · Δ % · status.

**Status automático:**

| Status | Cor | Critério |
|---|---|---|
| Conciliado | verde | |variação| ≤ 5% |
| Var. média | amarelo | 5% < |variação| ≤ 15% |
| Var. alta | vermelho | |variação| > 15% |
| Sem pass | rosa | nenhuma passagem na janela |
| Sem OS | cinza | nenhuma OS antes |
| Estorno | roxo | Σ R$ = 0 com valores negativos |
| Pass. antiga | laranja | pass > 60 dias antes do romaneio |

**Expansão clicável** mostra: timeline OS→Pass→Rom, tabela por bucket, alerta de duplicatas (se houver).

**Filtros:** cliente, número, status. Default: mês corrente.

### 3. Romaneio × Passagem · `franco_rp_fixed.html`

**Objetivo:** comparativo Pass → Rom em 2 modos.

**Modo "Por Serviço":** lista cada romaneio com suas passagens linkadas (cliente+material+milésimos) lado a lado.

**Modo "Diário":** agrupa por dia mostrando total banho passagem vs total banho romaneio.

**Filtros:** período, cliente, número de serviço, tipo de serviço, material.

**Função-chave:** `matchOsServico` com 4 níveis de fallback (a/b/c/d) para encontrar a OS correta de cada romaneio.

### 4. Extrato Cliente · `extrato_cliente.html`

**Objetivo:** múltiplas visões de um cliente ou período.

**4 modos:**

| Modo | Pra quê |
|---|---|
| **Conciliação por Bucket** | Cliente+material+cor+milésimos com Pass vs Rom |
| **Diário Resumido** | Agrupado por dia |
| **Por Romaneio** | Cada romaneio com janela de passagens (banho exato + 24h) |
| **Resumo Cliente** | Total agregado por cliente no período |

**Filtros:** período, cliente, material, cor, milésimos, romaneio (número).

## Convenções comuns aos 4

- **Versionamento:** array `VERSIONS` em JS no topo, log clicável no header compacto via modal
- **Cor da variação:** positivo (rom>pass) verde, negativo vermelho, |v|<0.5% neutro
- **Janela de passagens:** sempre `banho_inicio → MIN(banho_fim+24h, próxima_sep.banho_ini-1min)` quando há separação anchor
- **Paginação:** `callDBAll` para queries que podem trazer >500 rows (cap do MCP)
- **Sanitização:** `REPLACE(REPLACE(observacao, CHR(13), ' '), CHR(10), ' ')` em todas queries que retornam observação
- **Anchor de separação:** `data_romaneio DENTRO de exp_ini..exp_fim+2d` (não ±2d do exp_ini)
- **Peso de banho:** vernizes, acessórios e ródio caneta NÃO somam no peso (são adicionais)

## Como abrir

Os artefatos rodam DENTRO do Cowork. Para abrir:

1. Cowork desktop → painel **Live artifacts** (sidebar)
2. Selecionar o artefato (ex: Franco Monitor Romaneios)
3. Aguardar carregamento (status no header)

Para uso de validador via URL específica de romaneio, abrir o artefato e digitar o número no input — ou compartilhar URL com `#rom=NNN`.
