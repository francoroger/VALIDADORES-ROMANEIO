---
name: Bug recorrente — duplicatas em passagem_pecas inflam variação
description: Sistema às vezes insere a mesma passagem 2x no mesmo segundo (POST duplo). Causa variação artificial alta no validador. Como detectar e tratar.
type: project
originSessionId: 46ce5cfc-e2ef-4920-b0fb-90008bbe4fb5
---
## Sintoma

Romaneio mostra variação Pass→Rom muito negativa (>20% perda) quando deveria estar próximo de zero. Olhar lista de passagens revela 2+ registros idênticos no mesmo timestamp.

## Caso histórico (2026-05-10)

**Romaneio #24874** (LETÍCIA FERREIRA SANCHEZ, 07/05/2026):
- Aparente: Pass 1.766g vs Rom 1.296g → -26.6%
- Real (sem duplicata): Pass 1.280g vs Rom 1.296g → +1.3% ✓

Duplicatas detectadas (4 registros idênticos):
- IDs 68860 e 68861: Prateado 50 milésimos, 486g, mesmo timestamp 2026-05-05 08:02:38, mesmo created_at 07:59:52
- IDs 68862 e 68863: Verniz Alemão Ultraprotect, 486g, mesmo timestamp e created_at

## SQL para detectar duplicatas (pra qualquer cliente/período)

```sql
SELECT data_servico::text AS ts, cliente_id, material_id, milesimos, peso, COUNT(*) AS n_lancamentos, ARRAY_AGG(id ORDER BY id) AS ids
FROM passagem_pecas
WHERE deleted_at IS NULL
  AND data_servico::date BETWEEN '${dFrom}' AND '${dTo}'
GROUP BY 1, 2, 3, 4, 5
HAVING COUNT(*) > 1
ORDER BY ts;
```

Critérios de "duplicata muito provável":
- Mesmo `cliente_id` + `material_id` + `milesimos` + `peso` + `tiposervico_id`
- Mesmo `data_servico` (segundo a segundo)
- Mesmo `created_at` (segundo a segundo) → quase certeza de POST duplo na API

## Tratamento sugerido nos artefatos

NÃO deduplicar automaticamente — pode haver casos legítimos (ex: 2 ganchos com peças idênticas processados juntos). Em vez disso:

1. **Detectar** durante o cálculo de buckets
2. **Mostrar alerta visual** na seção ⑤ (validador) ou inline (monitor): "⚠ Detectadas N passagens duplicadas (IDs X, Y) — possível POST duplo na API"
3. **Mostrar 2 totais**: "Pass total: 1.234g · Pass sem dups: 748g"
4. Deixar Roger decidir se considera duplicata ou não

## Causa raiz suspeita

Sistema da Franco (Delphi → API → Postgres) pode estar fazendo retry de POST sem idempotência key. Worth alertar a Bia/equipe pra investigar no código do app de leitura de peças.
