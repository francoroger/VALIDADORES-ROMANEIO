---
name: MCP pg_consultar tem cap de limit=500 (Pydantic)
description: O MCP postgres-aiven (e provavelmente todos os MCPs Postgres do Roger) rejeita limit > 500 com erro de validação. SEMPRE testar/paginar.
type: project
originSessionId: 46ce5cfc-e2ef-4920-b0fb-90008bbe4fb5
---
## Regra dura

**TODOS** os artefatos que chamam `mcp__postgres-aiven__pg_consultar` (ou similar) **NÃO** podem passar `limit > 500`. O servidor MCP tem validação Pydantic com `Field(le=500)`:

```
Error executing tool pg_consultar: 1 validation error for pg_consultarArguments
params.limit
  Input should be less than or equal to 500 [type=less_than_equal, input_value=5000, input_type=int]
```

Sem `limit` explícito, o default cai pra 100 (o que também trunca).

## Sempre fazer

Antes de subir qualquer artefato que use `pg_consultar`:

1. **Definir limit = 500** explicitamente em todas as chamadas:
   ```js
   await window.cowork.callMcpTool('mcp__postgres-aiven__pg_consultar', { params: { sql, limit: 500 } });
   ```

2. **Para queries que podem retornar > 500 rows** (ex: passagens de período mensal — caso real teve 1453 em abril), usar `callDBAll` que pagina:

   ```js
   // Trata queries com LIMIT/OFFSET preexistentes (loadRecent tinha LIMIT 200)
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

⚠ **ARMADILHA**: a primeira versão da função fazia `sqlBase.replace(/\s*ORDER BY.../, '... LIMIT N OFFSET N')` — mas isso quebrava se a query JÁ tinha `LIMIT` no fim (ex: `loadRecent` no validador tinha `LIMIT 200`). Resultado: query final virava `... LIMIT 200 LIMIT 500 OFFSET 0` → "syntax error at or near LIMIT". A versão correta acima REMOVE LIMIT/OFFSET existentes antes de adicionar.

3. **Testar antes de publicar.** Rodar uma query de teste com volume grande (ex: passagens de 6 meses) e verificar que está retornando o esperado, não cap de 500.

## Sintomas que indicam o bug

- Romaneios marcados "SEM PASS." em massa quando deveriam ter passagens
- Variações artificialmente baixas/altas (perdeu pedaço dos dados)
- Erro visível: `1 validation error for pg_consultarArguments` (quando user tenta passar limit > 500)
- Queries que retornam EXA