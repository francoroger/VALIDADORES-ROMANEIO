# Regras de negócio · Franco Galvânica

## Fórmula triádica de preço (item de romaneio)

```
valor_item = componente_serviço + componente_adicional + componente_material
```

Onde:

| Componente | Fórmula | Significado |
|---|---|---|
| **Serviço** | `vlr_serv_kg × peso/1000` | Mão de obra fixa por kg (varia por cliente/contrato) |
| **Adicional** | `vlr_adic_ml_kg × (milesimos − mil_ini) × peso/1000` | Cobrança extra por milésimo acima do mínimo (`mil_ini`) |
| **Material** | `cotação × milesimos × peso/1000` | Custo de ouro/prata (cotação por grama no dia da triagem) |

**Valores armazenados em `itemservico`:** `vlr_serv_kg`, `vlr_adic_ml_kg`, `material_valorg` (cotação), `mil_ini`, `fator`, `tipo_valor` — todos são SNAPSHOT no momento do romaneio (não dependem da tabela mestre, que pode mudar).

**Validação no validador:** seção ③ recalcula a fórmula e compara com `isv.valor`. Diferença > R$ 0,01 vira alerta.

## Fluxo de 7 documentos

```
1. Recebimento       (recebimento_pecas)    — operador pesa material que chegou
2. OS                (ordemservico)         — orçamento aprovado pelo cliente
3. Catalogação       (triagem)              — define cotação, calcula valor previsto
4. Separação         (separacoes)           — kanban de produção (recebimento→banho→expedição)
5. Banho             (passagem_pecas)       — cada peça pesada na produção
6. Romaneio          (servico)              — faturamento final
7. Expedição         (entregas_motoboy)     — entrega física via motoboy
```

**Ligações entre documentos:**

| De | Para | Como |
|---|---|---|
| Separação | Triagem | `separacao.catalogacao_id` → `triagem.id` (FK formal) |
| Recebimento | Separação | `separacoes_recebimentos` (N:N) |
| Triagem | OS | parse de "O.S:NNNN" em `triagem.observacoes` (texto, não FK!) |
| OS | Triagem | parse de "CAT: NNNN" em `ordemservico.observacao` (texto) |
| Romaneio | Separação | heurística: `data_inicio_expedicao ≤ romaneio.datavenda ≤ data_fim_expedicao+2d` |
| Romaneio | Entrega | `servico_entrega.idservico = servico.id` (link table) |

**OS↔Triagem é o link mais frágil** — é só texto. O validador tem 4 níveis de fallback (a/b/c/d) pra resolver.

## Peso de banho vs adicionais

Em romaneios/passagens, **NEM TODO peso conta como "banho"**:

| Material/Tipo | Soma no peso de banho? | Por quê |
|---|---|---|
| Dourado, Prateado, Ródio | **Sim** | Banho principal — é o que cobramos por mil. |
| Verniz Alemão Ultraprotect | Não | Adicional de proteção |
| Verniz Cataforético | Não | Adicional interno ("CATAFORÉTICO NA FRANCO") |
| Adicional Acessórios | Não | Componentes que não banham |
| Ródio Caneta | Não | Acabamento decorativo |

Função no JS: `isAdicional(material, tiposerv)` — retorna `true` para os tipos acima. É filtro fundamental em todas as somas de peso.

**Bug histórico:** o alerta "Variação total alta" do validador estava somando passagens DE TODOS os tipos (incluindo verniz) e comparando com peso de banho do romaneio. Caso #24857 GOIANILDE: -27.3% indevido. Corrigido em v2.6.

## Janela de banho

Cada separação tem `data_inicio_banho` e `data_fim_banho`. **Passagens** pertencem a essa separação quando:

```
data_servico BETWEEN banho_ini AND MIN(banho_fim + 24h, próxima_sep.banho_ini - 1min)
```

**Por que +24h?** Operador costuma escanear última peça depois de bater "fim banho" (até no dia seguinte). Caso #24863 LAYLA: peça escaneada 1m42s depois.

**Por que limitado pela próxima sep?** Senão vazaria pra próximo lote do mesmo cliente. Caso #24878 ANA BEATRIZ tinha sep concorrente.

**Quando `banho_ini` é NULL** (operador esqueceu): estima como `max(banho_fim_da_sep_anterior, banho_fim - 4d)`. Caso #24871 ULIANE sep 14942.

## Anchor romaneio → separação

A relação não é FK formal. Heurística:

```sql
WHERE s.data_inicio_expedicao::date - INTERVAL '1 day' <= romaneio.datavenda::date
  AND romaneio.datavenda::date <= COALESCE(s.data_fim_expedicao, s.data_inicio_expedicao + INTERVAL '14 days')::date + INTERVAL '2 days'
ORDER BY ABS(EXTRACT(EPOCH FROM (s.data_inicio_expedicao - romaneio.datavenda::date))) ASC
LIMIT 1
```

**Não usar `±2d do exp_ini`** — falha quando romaneio é >2d depois do início da expedição. Caso #24855 NP SOARES (exp_ini=04-30, romaneio=05-04 = 4 dias depois).

## Idiossincrasias do schema

| Idiossincrasia | Detalhe |
|---|---|
| Tabela `servico` é o romaneio | Não confundir com "serviço". `servico` = romaneio/faturamento. `itemservico` = item do romaneio. |
| Passagens podem ter POST duplo | API às vezes insere 2 registros idênticos no mesmo `created_at` (segundo). Tratar como duplicata, NÃO deduplicar auto. |
| Algumas separações têm `banho_ini > banho_fim` | Dados ruins do sistema original. Queries com `tstzrange` quebram — usar `LEAST/GREATEST`. |
| `observacao` pode ter `\r\n` | Quebra split do parseResult JS — sempre `REPLACE(CHR(13), ' ')` + `REPLACE(CHR(10), ' ')` |
| Verniz cataforético NÃO tem passagem | Regra do negócio: "CATAFORÉTICO NA FRANCO" é processo interno, operador não escaneia. Não é erro. |

## Estorno

Romaneio com `Σ valor ≈ 0` e valores negativos pareando os positivos = cancelamento contábil. Detectado automaticamente:

```js
rom.isEstorno = vNeg < -10 && Math.abs(vPos + vNeg) < 1.0;
```

## Tolerâncias para variação Pass→Rom

| Tolerância | Faixa | Esperado |
|---|---|---|
| OK | \|v\| ≤ 5% | Embalagem/fios — esperado |
| Atenção | 5% < \|v\| ≤ 15% | Vale conferir |
| Investigar | \|v\| > 15% | Provável bug de pesagem ou passagem faltando |

Cor: positivo (rom>pass) verde, negativo vermelho.
