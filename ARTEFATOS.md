# Artefatos

## Visão dos 4 artefatos

### 1. Validador de Romaneio · `franco_validador_romaneio.html` · **v3.16**

**Objetivo:** análise profunda de UM romaneio específico, com home de listagem por filtros.

**Home (lista da entrada):** scroll infinito dos romaneios dos últimos 30 dias (padrão), com filtros cliente/data. Cada linha mostra # romaneio · data · cliente · itens · banho · valor · status (variação Pass→Rom). Clicar na linha abre o detalhe; botão `← Voltar à listagem` retorna pra home.

**Seções (no detalhe):**

| # | Seção | O que mostra |
|---|---|---|
| ① | Fluxo dos 7 Documentos | Timeline de Recebimento → OS → Triagem → Separação → Banho → Passagens → Romaneio → Expedição, com Δ tempo entre etapas |
| ② | Conciliação por Bucket | **Tabela 1**: tripla OS×Pass×Rom por (material+cor+milésimos), variação Rom×Pass. **Tabela 2**: por material+milésimos com Catalogação, variação Rom×Catalogação |
| ③ | Fórmula Triádica (retrátil) | Recalcula `valor = (vlr_serv_kg × peso/1000) + (vlr_adic × (mil-mil_ini) × peso/1000) + (cotação × mil × peso/1000)` item a item e compara com o valor armazenado |
| ④ | Itens detalhados (retrátil) | Lista de todos itens com vlr_serv_kg, vlr_adic, cotação |
| ⑤ | Alertas automáticos | Variação alta, separações concorrentes, duplicatas, OS sem CAT, etc |
| ⑥ | Romaneio (retrátil) | Detalhamento completo no formato do PDF Delphi: cabeçalho, serviços, adicionais, descontos, externos, transporte e totais |

**Entrada:** número do romaneio (input manual ou via URL `?rom=NNN` / `#rom=NNN`), ou clicar em uma linha da home.

### 2. Monitor de Romaneios · `monitor_romaneios.html` · **v2.9**

**Objetivo:** visão diária/mensal de todos os romaneios com status automático. Scroll infinito quando sem filtro de data.

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

### 3. Romaneio × Passagem · `franco_rp_fixed.html` · **v3.3**

**Objetivo:** comparativo Pass → Rom em 2 modos.

**Modo "Por Serviço":** lista cada romaneio com suas passagens linkadas (cliente+material+milésimos) lado a lado.

**Modo "Diário":** agrupa por dia mostrando total banho passagem vs total banho romaneio.

**Filtros:** período, cliente, número de serviço, tipo de serviço, material.

**Função-chave:** `matchOsServico` com 4 níveis de fallback (a/b/c/d) para encontrar a OS correta de cada romaneio.

### 4. Monitor de Demanda · `franco_demanda.html` · **v1.0**

**Objetivo:** monitorar o fluxo de **recebimentos** (entrada na operação) — o lado oposto ao que os 3 artefatos acima cobrem (saída/faturamento). É a **Fase 1** do plano de demanda/capacidade/prazo: depois vêm capacidade por setor (Fase 2) e previsão de prazo (Fase 3).

**Filtros:** período (default mês corrente), cliente, fornecedor, threshold de estagnado (30/60/90/180/365 dias).

**KPIs no topo:**

| KPI | Conteúdo |
|---|---|
| Entrada no período | Qtd · peso total · lead médio recebimento→separação |
| Fila ativa | Recebimentos sem separação · peso aguardando |
| Já em produção | Recebimentos com separação iniciada · peso |
| Estagnado | Qtd acima do threshold (clique abre Seção ⑤) |

**Seções:**

| # | Seção | O que mostra |
|---|---|---|
| ① | Entrada por dia | Linha por dia útil do período (sab/dom em cinza). Cada linha clicável expande os recebimentos do dia |
| ② | Fila ativa | Toggle "Por recebimento" ↔ "Por cliente". Aging colorido (0-7d / 8-14d / 15-30d / >30d) |
| ③ | Agregações | Abas Dia / Semana (seg-início) / Mês / Ano com mesmas métricas |
| ④ | Rankings | Top 10 clientes (por peso, com % abertos), Top 10 fornecedores, Movimento por dia da semana |
| ⑤ | Estagnados | Collapsed por padrão. Lista completa dos abertos > threshold (lixo histórico desde 2018) |

**Estado por recebimento** (derivado de `separacoes` via `separacoes_recebimentos`):

| Estado | Critério |
|---|---|
| `fila` | Sem separação |
| `em_separacao` | Tem `data_inicio_recebimento` mas não tem `data_inicio_banho` |
| `em_banho` | Tem `data_inicio_banho` mas não tem `data_fim_separacao` |
| `finalizado` | Tem `data_fim_separacao` |
| `fechado_sem_sep` | Status `S` ou `data_fim`, mas sem separação (caso raro) |

**Notas técnicas:**
- Sanitização `REPLACE(CHR(13)/CHR(10))` em `obs`, `cliente_nome`, `nome_fornec` (V PINHEIRO Comércio LTDA tem `\n` no nome do cliente).
- Paginação `callDBAll` em todas as queries — estagnados retornam ~7k rows acima do threshold default.
- Não compara entrada vs saída (Fase 2/3 farão isso).


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
