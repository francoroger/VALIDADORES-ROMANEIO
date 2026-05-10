---
name: Topologia das tabelas kanban e ligações OS/Romaneio
description: Mapa das FKs formais e ligações heurísticas entre Recebimento, Separação, Triagem, OS, Romaneio e Passagens no banco do Franco
type: reference
originSessionId: 46ce5cfc-e2ef-4920-b0fb-90008bbe4fb5
---
## Kanban interno (com FKs formais)

```
recebimento_pecas (id, idcliente, data_receb, idfornec, pesototal)
   │ separacoes_recebimentos (separacao_id, recebimento_id)  -- N:N
   ▼
separacoes (id, cliente_id, catalogacao_id, retrabalho_id)
   │ Estados kanban com início/fim em colunas timestamp:
   │   data_inicio_recebimento  → data_fim_recebimento
   │   data_inicio_catalogacao  → data_fim_catalogacao
   │   data_inicio_preparacao   → data_fim_preparacao
   │   data_inicio_banho        → data_fim_banho
   │   data_inicio_revisao      → data_fim_revisao
   │   data_inicio_expedicao    → data_fim_expedicao
   │   data_fim_separacao
   │ catalogacao_id
   ▼
triagem (id, idcliente, datacad, datafim, valor_total, observacoes)
   │
   ├─ itemtriagem (idtriagem)
   │     └─ triagemservico (iditemtri)  -- 294k linhas, cálculo de preço por item
   │
   └─ triagemdist (idtriagem)
```

## Faturamento (sem FK formal com kanban — usar heurística)

```
ordemservico (id, idcliente, datavenda, numero, observacao)
  └─ itemordem (idordem)

servico (id, idcliente, datavenda, idtransporte, idstatuspag)
  ├─ itemservico (idservico)
  └─ servico_entrega (idservico) → entregas_motoboy

passagem_pecas (cliente_id, data_servico, material_id, milesimos)
  -- soltas, sem FK pra separação/triagem
```

## Ligações manuais (texto livre)

- `ordemservico.observacao` pode conter `CAT: NNNN` referenciando `triagem.id`
- `triagem.observacoes` pode conter `O.S:NNNN` referenciando `ordemservico.numero` (reverso)
- Nem sempre estão preenchidos. Exemplo OS 2909 (ARIANY) tem observacao NULL mesmo sendo válida.

## Estratégia de matching validada (com romaneio 24884 da Ariany Yoshioka)

### Dado um ROMANEIO, achar o resto:

1. **Separação** via cliente + `data_inicio_expedicao::date BETWEEN data_romaneio−2 AND data_romaneio+2`
   - É a âncora do kanban inteiro
2. **Recebimentos** via `separacoes_recebimentos` (tabela link N:N retorna TODOS)
3. **Triagem** via `separacao.catalogacao_id` (FK direta)
4. **OS** com fallback em 4 níveis:
   - a) parsear `O.S:NNNN` ou `OS:NNNN` de `triagem.observacoes`
   - b) buscar OS com `CAT:<triagem_id>\b` na `ordemservico.observacao`
   - c) OS do cliente com `datavenda::date BETWEEN sep.data_inicio_recebimento−3 AND sep.data_inicio_recebimento+3` (orçamento gerado no recebimento das peças)
   - d) fallback final: OS mais recente do cliente antes do romaneio
5. **Passagens** via cliente + `data_servico BETWEEN sep.data_inicio_banho AND sep.data_fim_banho` — **TIMESTAMP EXATO, sem tolerância de ±1 dia**. A tolerância causava vazamento de outras separações concorrentes do mesmo cliente em produção paralela (caso #24878 ANA BEATRIZ inflava variação para -44.7%). Sempre comparar `p.data_servico` (timestamp) com `sep.banho_ini`/`banho_fim` direto, sem `::date` nem `INTERVAL '1 day'`
6. **Expedição** via `servico_entrega` → `entregas_motoboy` (FK formal)

### Dado uma OS, achar o resto:

1. **Separação** via cliente + `data_inicio_recebimento::date ≈ datavenda da OS` (±3d)
2. resto igual à de cima

## Validação real (caso ARIANY id 2668, romaneio 24884 = 08/05/2026)

| Etapa | Dado | Confirmação |
|---|---|---|
| Recebimentos | 33180 (20/04) e 33178 (22/04) | 2 lotes via separacoes_recebimentos |
| Separação 14958 | rec_ini=20/04, rec_fim=22/04, cat_ini=29/04, cat_fim=30/04, banho_ini=05/05, banho_fim=06/05, exp_ini=08/05 | bate com cada estado |
| Triagem 13540 | datacad=29/04, datafim=04/05, obs="O.S:12914" | catalogacao_id da separação |
| OS 12914 | datavenda=20/04, obs="CAT: 13540" | bate com sep_rec_inicio (orçamento no 1º recebimento) |
| Passagens | 11 peças, todas em 06/05 | dentro de banho_ini→banho_fim |
| Romaneio | datavenda=08/05 | = sep_exp_inicio |

## Detecção de produção paralela (separações concorrentes)

Um mesmo cliente pode ter MAIS DE UMA separação ativa em datas próximas (lotes diferentes em produção simultânea). Sempre que filtrar passagens por banho window de uma separação, alertar se houver OUTRA separação do mesmo cliente cuja banho_ini/banho_fim sobreponha a janela atual (com tolerância ±1d só pra detecção do alerta, não pro filtro):

```sql
SELECT * FROM separacoes s
WHERE s.cliente_id = X
  AND s.id <> sep_atual.id
  AND s.data_inicio_banho IS NOT NULL
  AND s.data_fim_banho IS NOT NULL
  AND tstzrange(s.data_inicio_banho, s.data_fim_banho, '[]')
   && tstzrange(sep_atual.banho_ini::timestamp - INTERVAL '1 day',
                sep_atual.banho_fim::timestamp + INTERVAL '1 day', '[]')
```

Quando detectar, mostrar alerta amarelo com Sep ID, status, datas — ajuda o operador a entender por que pode haver pequenas variações ou peças "sumidas".

## Idiossincrasias importantes

- `recebimento_pecas.idfornec` referencia LOJA PARCEIRA da cliente (não fornecedor de matéria-prima)
- Inconsistência de nomes: `idcliente` (PT) em ordemservico/servico/recebimento_pecas/triagem; `cliente_id` (snake_case) em separacoes/passagem_pecas/retrabalhos
- `triagemservico` é o equivalente de `itemservico` mas pra triagem (orçamento prévio)
- 1 separação pode ter VÁRIOS recebimentos (lote único vs múltiplas remessas do cliente)
- OS criada normalmente NO MESMO DIA do 1º recebimento (orçamento prévio gerado ali)
