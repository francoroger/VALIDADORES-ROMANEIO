# Bugs encontrados e lições aprendidas

Catálogo de problemas encontrados durante o desenvolvimento dos artefatos e como evitar regressão.

---

## Bugs no schema/dados da Franco

### Duplicatas em `passagem_pecas` (POST duplo na API)

**Sintoma:** variação Pass→Rom negativa anormal (>20%).

**Causa raiz:** o app de pesagem (Delphi+Laravel) às vezes faz POST duplo (operador apertou 2x, rede engasgou, retry sem idempotency key). Resultado: 2+ registros idênticos com mesmo `created_at` até o segundo.

**Detecção SQL:**
```sql
SELECT data_servico::text, material_id, milesimos, peso, COUNT(*)
FROM passagem_pecas
WHERE deleted_at IS NULL
GROUP BY 1,2,3,4
HAVING COUNT(*) > 1;
```

**Caso histórico:** #24874 LETÍCIA — 4 IDs duplicados em `2026-05-05 07:59:52`. Variação -26.6% (falsa); real +1.3%.

**Tratamento nos artefatos:** detectar com `state.passDuplicatas` e ALERTAR (não deduplicar auto — pode haver caso legítimo de ganchos com peças idênticas).

---

### `data_inicio_banho` NULL com `data_fim_banho` preenchido

**Sintoma:** romaneio cai no fallback "60 dias" e pega passagens de lotes anteriores → variação muito negativa.

**Causa:** operador esqueceu de marcar início do banho mas marcou fim.

**Tratamento:** estimar `banho_ini = max(banho_fim_sep_anterior, banho_fim - 4d)`. Aplicado nos 4 artefatos.

**Caso histórico:** #24871 ULIANE sep 14942.

---

### `data_inicio_banho > data_fim_banho` (dados invertidos)

**Sintoma:** query com `tstzrange(banho_ini, banho_fim)` quebra: `range lower bound must be less than or equal to range upper bound`.

**Causa:** ~10 separações antigas (2021-2025) têm os campos invertidos.

**Tratamento:** substituir `tstzrange()` por `LEAST/GREATEST`:
```sql
LEAST(s.data_inicio_banho, s.data_fim_banho) <= banhoFim + INTERVAL '1 day'
AND GREATEST(s.data_inicio_banho, s.data_fim_banho) >= banhoIni - INTERVAL '1 day'
```

---

### `\r\n` em colunas de observação

**Sintoma:** query retorna rows que somem silenciosamente quando processadas no JS.

**Causa:** o JSON-as-text retornado pelo MCP tem o conteúdo de `observacao` com `\r\n` literais. O `parseResult` JS faz `split('\n')` e quebra no meio da row, dropando ela.

**Tratamento:** TODAS queries que retornam observação/observacoes/obs devem sanitizar:
```sql
REPLACE(REPLACE(COALESCE(observacao, ''), CHR(13), ' '), CHR(10), ' ') AS observacao
```

**Caso histórico:** #24870 KARINA — OS 12960 invisível por causa disso.

---

### Verniz cataforético sem passagem

**Sintoma:** romaneio mostra "Verniz Cataforético" com peso mas não há passagem correspondente.

**Causa:** regra do negócio — verniz cataforético é processo INTERNO ("CATAFORÉTICO NA FRANCO"), operador não escaneia.

**Tratamento:** não é erro, apenas alerta informativo no validador. Não soma no peso de banho (é adicional).

---

## Bugs nos artefatos (foram corrigidos)

### MCP limit cap 500

**Sintoma:** "SEM PASS." em massa. Erro alternativo quando passa limit>500: `1 validation error for pg_consultarArguments`.

**Causa:** MCP `pg_consultar` tem `Field(le=500)` Pydantic.

**Tratamento:** função `callDBAll` que pagina via `LIMIT 500 OFFSET N`:

```js
async function callDBAll(sqlBase, label){
  const PAGE = 500;
  let core = sqlBase.replace(/\s*LIMIT\s+\d+(\s+OFFSET\s+\d+)?\s*$/i, '').trim();
  let orderBy = '';
  const orderMatch = core.match(/(\s+ORDER BY [\s\S]+)$/i);
  if (orderMatch){ orderBy = orderMatch[1]; core = core.slice(0, orderMatch.index).trim(); }
  let all = [], offset = 0;
  while (offset < 100000) {
    const sql = `${core}${orderBy} LIMIT ${PAGE} OFFSET ${offset}`;
    const rows = await callDB(sql, label);
    all = all.concat(rows);
    if (rows.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}
```

**⚠ ARMADILHA:** a primeira versão não tratava queries que JÁ tinham `LIMIT` (ex: `LIMIT 200` no `loadRecent`). Resultado: query final virava `LIMIT 200 LIMIT 500 OFFSET 0` → syntax error. Versão correta acima REMOVE LIMIT/OFFSET existentes antes.

---

### Anchor sep "±2 dias" muito rígido

**Sintoma:** romaneios sem separação encontrada, caindo no fallback 60d e vazando passagens.

**Causa:** lógica antiga `|exp_ini − data_rom| ≤ 2d` falhava quando o romaneio era >2d depois do início da expedição (que é normal — expedição dura ~1 semana).

**Tratamento:** anchor semanticamente correto:
```sql
WHERE s.data_inicio_expedicao::date - INTERVAL '1 day' <= romaneio.datavenda::date
  AND romaneio.datavenda::date <= COALESCE(s.data_fim_expedicao, s.data_inicio_expedicao + INTERVAL '14 days')::date + INTERVAL '2 days'
```

**Caso histórico:** #24855 NP SOARES — exp_ini=2026-04-30, romaneio=2026-05-04 (4 dias). Fix mudou variação artificial -95.3% → real +2.0%.

---

### Janela de banho rígida sem tolerância pós-banho_fim

**Sintoma:** romaneios com variação alta positiva fictícia.

**Causa:** operador escaneia última peça do lote depois de bater "fim banho" — às vezes no dia seguinte. Sem tolerância, essa peça ficava de fora.

**Tratamento:** tolerância +24h LIMITADA pelo `banho_ini` da próxima sep:
```js
const tolMax = new Date(bFim.getTime() + 24*3600000);
const proxSep = ...próxima sep do cliente...;
const bFimTol = proxSep && proxSep.banho_ini < tolMax ? proxSep.banho_ini-1min : tolMax;
```

**Caso histórico:** #24863 LAYLA — peça 68672 escaneada 1m42s após banho_fim. Variação +53.9% (falsa) → -1.9% real.

---

### Cores da variação por módulo (ignorando sinal)

**Sintoma:** variação +20% e -20% apareciam ambas em vermelho.

**Causa:** função `colorVar(v)` usava `Math.abs(v)` para decidir cor.

**Tratamento:** positivo verde, negativo vermelho, |v|<0.5% neutro. Aplicado nos 4 artefatos.

---

### Alerta "Variação total alta" comparando banho vs (banho+adicional)

**Sintoma:** validador mostrava variação alta indevida em romaneios com verniz.

**Causa:** soma de passagens não filtrava `!isAdicional` (mas soma de items do romaneio sim) — assimetria. Pass total inflado pelo verniz, comparado com Rom só banho.

**Tratamento:** adicionar mesmo filtro `!isAdicional` na soma de passagens.

**Caso histórico:** #24857 GOIANILDE — variação real +1.8%, alerta dizia -27.3%.

---

### Tags `</script></body></html>` duplicadas após `cat >>`

**Sintoma:** JS aparece como texto bruto no fim da página renderizada.

**Causa:** quando uso `cat >> arquivo.html << EOF` pra restaurar arquivo truncado, posso acabar com 2 fins de documento. O navegador fecha o `<script>` no primeiro `</script>` e o resto vira texto.

**Detecção:**
```bash
grep -cE "</script>" arquivo.html
# Esperado: validador=2, monitor=2, RP=4 (chart.js + gridjs), extrato=3 (chart.js)
```

**Prevenção:** verificar contagem antes de fazer `cat >>`. Melhor usar Write tool com conteúdo completo.

---

## Bugs no fluxo de trabalho

### Edit tool truncando arquivos grandes

**Sintoma:** após Edit, o arquivo no disco fica menor que o esperado, terminando no meio do JS.

**Causa não confirmada:** comportamento esporádico do harness em sessões longas.

**Workaround:** trabalhar em `/tmp/VALIDADORES-CLONE2/` (clone fresh do GitHub), aplicar fixes via Python no bash, copiar pra outputs com `cp`. **Não usar Edit em sequência longa.**

**Detecção:** sempre verificar com `wc -l arquivo.html` e `tail -3 arquivo.html` após qualquer mudança.

---

## Memória do Claude

Documentos canônicos com as regras consolidadas estão em `docs/memory/`:

| Arquivo | Tópico |
|---|---|
| `anchor_separacao_romaneio.md` | Anchor sep correto |
| `bug_parseresult_observacao_quebralinha.md` | Sanitizar CHR(13)/(10) |
| `bug_script_duplicado_html.md` | `cat >>` armadilha |
| `duplicatas_passagem_pecas.md` | POST duplo na API |
| `mcp_pg_consultar_limit_500.md` | Cap MCP + paginação callDBAll |
| `preferencias_estilo_roger.md` | UI: tabelas, cores, sem ícones decorativos |
| `processo_aplicar_correcao_ui.md` | Checklist obrigatório de UI fixes |
| `regra_peso_total_romaneio.md` | Vernizes/adicionais não somam |
| `regras_negocio_franco.md` | Fórmula triádica, 7 docs |
| `topologia_kanban_franco.md` | FKs e heurísticas |
| `versionamento_artefatos.md` | VERSIONS + log clicável |
