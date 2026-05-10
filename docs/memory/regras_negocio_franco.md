---
name: Regras de negócio chave do Franco Galvânica
description: Fórmula triádica de preço, fluxo de documentos, idiossincrasias do schema do banco
type: project
originSessionId: 66180a77-4118-4d6f-820f-76c6905d22a8
---
## Fórmula triádica de preço (uDM_Zeos.CalculaCusto no Delphi)

Para cada item de banho:
```
valor = (vlr_serv_kg × peso/1000) + (vlr_adic_ml_kg × (milesimos - mil_ini) × peso/1000) + (cotacao × milesimos × peso/1000)
```

- `vlr_serv_kg` pode ser **fixo** ou **variável** (`fator × cotacao_atual`)
- Lookup dinâmico: busca primeiro `tabprecocliente` (cliente específico), fallback `tabpreco` (geral)
- Auditoria: todo INSERT/UPDATE em tabpreco gera log em tabpreco_log (idem para cliente/guia)

Validei a fórmula com dados reais do romaneio 24749 da Layla Nakamura — bate centavo por centavo.

## Regra crítica de peso (já em outro arquivo de memória, mas cabível repetir)

Quando soma "peso total" de romaneio/triagem, **NÃO somam** os adicionais:
- Verniz Alemão Ultraprotect
- Verniz Cataforético
- Aplique Ródio (caneta)
- Acessórios

Apenas banhos principais (Dourado, Prateado, Níveo, etc.) entram. Adicionais são serviços sobre as MESMAS peças já pesadas no banho — somar duplicaria.

## Fluxo dos 7 documentos (caso Layla romaneio 24749)

1. **Recebimento** (`recebimento_pecas`) — peso bruto, fornecedor = loja parceira da cliente
2. **OS / Ordem de serviço** (`ordemservico` + `itemordem`) — orçamento prévio. Liga à catalogação via texto livre `observacao` "CAT: 13404"
3. **Catalogação / Triagem** (`triagem` + `itemtriagem`) — detalhamento com fotos
4. **Separação** (`separacoes`) — controle de fluxo. FK explícita para `catalogacao_id`
5. **Banho na linha** — registra em `passagem_pecas`
6. **Romaneio** (`servico` + `itemservico`) — faturamento final
7. **Expedição** — registra em `entregas_motoboy`

## Idiossincrasias do schema (a corrigir no novo sistema)

- **Sem FK formal** entre `passagem_pecas` ↔ `servico`. O linkup só existe via cliente_id + datas próximas. Adicionar `servico_id`/`separacao_id` em passagens no novo schema.
- **Vínculo OS ↔ Catalogação em texto livre** ("CAT: 13404" no `ordemservico.observacao`). Virar `catalogacao_id` formal.
- **Status pendente desatualizado**: `idstatuspag = 3 (Pendente)` mesmo quando `saldopag = 0`. Derivar status do saldo no novo sistema.
- **Inconsistência de nomes de coluna**: `passagem_pecas.cliente_id`, `servico.idcliente`, `entregas_motoboy.idcliente`, `itemservico.idservico`. Padronizar para snake_case com sufixo `_id`.
- **Verniz Cataforético é interno ("CATAFORÉTICO NA FRANCO")** mas não tem registro de passagem. Roger acredita que o operador às vezes não lança — investigar.
- **`ordemservico.numero`** é o número impresso na etiqueta/cliente; `ordemservico.id` é interno do banco. Diferentes.
- **`recebimento_pecas.idfornec`** referencia loja parceira da cliente (não fornecedor de matéria-prima). Renomear para `origem_pecas_id` ou similar.

## Status workflow da triagem
A (Aberta) → F (Finalizada) → G (em Galvanização) → P (Pronto) → C (Cancelada) / L (Lavagem)

Transições proibidas devem ser bloqueadas. Ao finalizar (F), gera registro em `separacoes` automaticamente.

**Why:** essas regras são patrimônio do negócio. Sem elas o novo sistema não bate com o velho e gera erro de cálculo financeiro. Validei a fórmula triádica nos dados de produção. As idiossincrasias são "como o Delphi cresceu organicamente" — não devem ser replicadas no novo sistema.

**How to apply:** sempre que for tocar em código de cálculo de preço, aplicar a fórmula triádica. Ao desenhar tabelas no novo sistema, corrigir as idiossincrasias listadas. Ao questionar "por que tabela X tem coluna Y assim?" consultar este arquivo.
