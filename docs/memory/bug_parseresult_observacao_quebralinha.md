---
name: Bug crítico - parseResult quebra silenciosamente com \r\n em colunas TEXT
description: Lição aprendida sobre bug recorrente em queries pg_consultar que retornam colunas TEXT contendo CR/LF — descarta linhas silenciosamente
type: feedback
originSessionId: 46ce5cfc-e2ef-4920-b0fb-90008bbe4fb5
---
## O bug

Toda função `parseResult` dos artefatos do Franco que processa a resposta de `pg_consultar` faz:

```js
const lines = t.split('\n');
// ...
const values = line.split('|').map(v => v.trim());
if (values.length === headers.length){ /* parse */ }
```

Quando uma coluna TEXT contém `\r\n` (carriage return + line feed), o split('\n') quebra a linha de dados em múltiplos pedaços. Cada pedaço, ao fazer split('|'), retorna número de colunas DIFERENTE do header → a row inteira é DESCARTADA silenciosamente. Resultado: array vazio mesmo quando a query retorna dados válidos no banco.

## Onde atinge no schema do Franco

Colunas TEXT que costumam ter `\r\n` por costume do operador:
- `ordemservico.observacao` ← muitas vezes "CAT: NNNN\r\n- CATAFORÉTICO NA FRANCO.\r\n- APÓS RÓDIO...\r\n"
- `triagem.observacoes` ← às vezes
- `recebimento_pecas.obs`
- `entregas_motoboy.observacoes`
- `servico.descricao`
- `itemordem.observacoes`
- `itemtriagem.observacoes`

## Correção PADRÃO

Em TODA query que retorne uma dessas colunas, sanitizar no servidor:

```sql
REPLACE(REPLACE(COALESCE(coluna, ''), CHR(13), ' '), CHR(10), ' ') AS coluna_alias
```

CHR(13) = `\r`, CHR(10) = `\n`. Substituir por espaço.

Para `WHERE` clause com regex `~*`, manter a coluna original (`o.observacao ~* 'CAT:...'`) — o `~*` lida com `\r\n` normalmente sem flag `m`.

## Sintomas pra detectar

- Query confirmada no DB retorna registros mas state.X é null/empty no JS
- Status do artefato mostra "ok" mas seção fica vazia
- Debug mostra que SQL foi gerado correto mas resultado vazio
- Adicionar `LEFT(observacao, 50)` na query temporariamente confirma se observacao tem `\r\n`

## Como aplicar em artefatos

Sempre que criar/editar query SQL nos artefatos:
1. Listar colunas TEXT que vão retornar
2. Para CADA uma que possa ter `\r\n`, envolver com REPLACE(REPLACE(COALESCE(...), CHR(13), ' '), CHR(10), ' '))
3. Testar com um romaneio onde a OS tem observação multilinha (ex: 24870 da KARINA, OS 12960)

## Bug bônus relacionado

`loadRomaneio` (ou função similar) podia rodar DUPLICADO quando dispara via clique do botão E hashchange evento simultâneos, poluindo state acumulativo (debug arrays com SQLs duplicadas). Sempre adicionar guard:

```js
if (state.loading === romNum) return;
state.loading = romNum;
try { /* ... */ } finally { state.loading = null; }
```
