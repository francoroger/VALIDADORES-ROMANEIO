// netlify/functions/db.js
//
// Endpoint serverless que executa SQL read-only no Postgres Aiven
// e devolve o resultado no MESMO formato de texto que o MCP
// `mcp__postgres-aiven__pg_consultar` retorna — pra o parseResult
// dos artefatos continuar funcionando sem mudancas.
//
// Seguranca:
//   - Exige header Authorization: Bearer <API_TOKEN>
//   - Aceita apenas queries que comecam com SELECT ou WITH
//   - Rejeita ; no meio (sem multi-statement)
//   - Aplica statement_timeout de 10s (limite do Netlify Free)
//
// Env vars necessarias no Netlify:
//   PG_HOST, PG_PORT, PG_DB, PG_USER, PG_PASS, API_TOKEN

import { Client } from 'pg';

const ALLOWED_PREFIX = /^\s*(SELECT|WITH|EXPLAIN|SHOW|TABLE|VALUES)\b/i;
const MAX_ROWS = 500;

function badRequest(message) {
  return {
    statusCode: 400,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    body: 'Erro: ' + message,
  };
}

function unauthorized() {
  return {
    statusCode: 401,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    body: 'Erro: nao autorizado',
  };
}

// Formata resultado pg.Result no formato do MCP:
//   col1 | col2 | col3
//   -----+------+-----
//   v1   | v2   | v3
//   v4   | v5   | v6
//
//   Total: N registro(s)
function formatAsMcp(result) {
  const cols = result.fields.map(f => f.name);
  const rows = result.rows;

  // Calcula largura de cada coluna (max entre header e valores)
  const widths = cols.map((c, i) => {
    let max = c.length;
    for (const row of rows) {
      const v = row[c];
      const s = v === null || v === undefined ? 'NULL' : String(v);
      if (s.length > max) max = s.length;
    }
    return max;
  });

  const fmtRow = (vals) =>
    vals.map((v, i) => (v ?? '').toString().padEnd(widths[i])).join(' | ');

  const headerLine = fmtRow(cols);
  const sepLine = widths.map(w => '-'.repeat(w)).join('-+-');

  const lines = [headerLine, sepLine];
  for (const row of rows) {
    const vals = cols.map(c => {
      const v = row[c];
      return v === null || v === undefined ? 'NULL' : String(v);
    });
    lines.push(fmtRow(vals));
  }
  lines.push('');
  lines.push(`Total: ${rows.length} registro(s)`);

  return lines.join('\n');
}

export async function handler(event) {
  // CORS — mesma origem, mas ok adicionar pra debug local
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method not allowed' };
  }

  // Auth
  const auth = event.headers.authorization || event.headers.Authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token || token !== process.env.API_TOKEN) {
    return { ...unauthorized(), headers: { ...corsHeaders, ...unauthorized().headers } };
  }

  // Parse body
  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return { ...badRequest('body invalido'), headers: { ...corsHeaders } }; }

  let { sql, params } = body;
  // Compatibilidade: o callDB envia { params: { sql, limit } } como o MCP espera
  if (params && typeof params === 'object' && params.sql) {
    sql = params.sql;
  }
  if (!sql || typeof sql !== 'string') {
    return { ...badRequest('sql ausente'), headers: { ...corsHeaders } };
  }

  // Validacao: so leitura
  if (!ALLOWED_PREFIX.test(sql)) {
    return { ...badRequest('apenas SELECT/WITH/EXPLAIN/SHOW/TABLE/VALUES sao aceitos'), headers: { ...corsHeaders } };
  }
  // Sem multi-statement (mas permite ; no fim)
  const trimmed = sql.trim().replace(/;\s*$/, '');
  if (trimmed.includes(';')) {
    return { ...badRequest('multiplas declaracoes nao sao permitidas'), headers: { ...corsHeaders } };
  }

  // Conecta no Postgres
  const client = new Client({
    host: process.env.PG_HOST,
    port: parseInt(process.env.PG_PORT || '5432', 10),
    database: process.env.PG_DB,
    user: process.env.PG_USER,
    password: process.env.PG_PASS,
    ssl: { rejectUnauthorized: false }, // Aiven exige SSL
    statement_timeout: 9000, // 9s — antes do hard limit de 10s do Netlify
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    // Forca read-only na sessao
    await client.query('SET TRANSACTION READ ONLY');
    const result = await client.query(trimmed);

    // Trunca em MAX_ROWS pra alinhar com o MCP
    if (result.rows.length > MAX_ROWS) {
      result.rows = result.rows.slice(0, MAX_ROWS);
    }

    const txt = formatAsMcp(result);
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ result: txt }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
      body: 'Erro: ' + (err.message || String(err)),
    };
  } finally {
    try { await client.end(); } catch (_) {}
  }
}
