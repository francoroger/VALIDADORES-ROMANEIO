// netlify/functions/db.js
//
// Endpoint serverless que executa SQL read-only no Postgres Aiven
// e devolve o resultado no MESMO formato de texto que o MCP
// `mcp__postgres-aiven__pg_consultar` retorna — pra o parseResult
// dos artefatos continuar funcionando sem mudancas.
//
// Autenticacao:
//   - Authorization: Basic base64(user:password)
//   - Valida contra env var USERS no formato:
//       usuario1:senha1,usuario2:senha2,usuario3:senha3
//
// Env vars necessarias no Netlify:
//   PG_HOST, PG_PORT, PG_DB, PG_USER, PG_PASS, USERS

import { Client } from 'pg';

const ALLOWED_PREFIX = /^\s*(SELECT|WITH|EXPLAIN|SHOW|TABLE|VALUES)\b/i;
const MAX_ROWS = 500;

function plainErr(status, message) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    body: 'Erro: ' + message,
  };
}

function parseUsers(raw) {
  if (!raw) return {};
  const map = {};
  for (const pair of raw.split(',')) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf(':');
    if (idx < 1) continue;
    const user = trimmed.slice(0, idx).trim();
    const pass = trimmed.slice(idx + 1).trim();
    if (user && pass) map[user] = pass;
  }
  return map;
}

function decodeBasicAuth(header) {
  if (!header) return null;
  const m = header.match(/^Basic\s+(.+)$/i);
  if (!m) return null;
  try {
    const decoded = Buffer.from(m[1], 'base64').toString('utf8');
    const idx = decoded.indexOf(':');
    if (idx < 0) return null;
    return { user: decoded.slice(0, idx), pass: decoded.slice(idx + 1) };
  } catch (_) {
    return null;
  }
}

// Formata resultado pg.Result no formato do MCP:
//   col1 | col2 | col3
//   -----+------+-----
//   v1   | v2   | v3
//
//   Total: N registro(s)
function formatAsMcp(result) {
  const cols = result.fields.map(f => f.name);
  const rows = result.rows;
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
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { ...plainErr(405, 'Method not allowed'), headers: { ...plainErr(405, '').headers, ...corsHeaders } };
  }

  // Auth: Basic
  const auth = event.headers.authorization || event.headers.Authorization || '';
  const creds = decodeBasicAuth(auth);
  if (!creds) {
    return { ...plainErr(401, 'credenciais ausentes'), headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8', 'WWW-Authenticate': 'Basic realm="Franco"' } };
  }

  const users = parseUsers(process.env.USERS || '');
  if (!users[creds.user] || users[creds.user] !== creds.pass) {
    return { ...plainErr(401, 'usuario ou senha invalidos'), headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' } };
  }

  // Parse body
  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return { ...plainErr(400, 'body invalido'), headers: { ...corsHeaders } }; }

  let { sql, params } = body;
  if (params && typeof params === 'object' && params.sql) {
    sql = params.sql;
  }
  if (!sql || typeof sql !== 'string') {
    return { ...plainErr(400, 'sql ausente'), headers: { ...corsHeaders } };
  }
  if (!ALLOWED_PREFIX.test(sql)) {
    return { ...plainErr(400, 'apenas SELECT/WITH/EXPLAIN/SHOW/TABLE/VALUES'), headers: { ...corsHeaders } };
  }
  const trimmed = sql.trim().replace(/;\s*$/, '');
  if (trimmed.includes(';')) {
    return { ...plainErr(400, 'multiplas declaracoes nao sao permitidas'), headers: { ...corsHeaders } };
  }

  const client = new Client({
    host: process.env.PG_HOST,
    port: parseInt(process.env.PG_PORT || '5432', 10),
    database: process.env.PG_DB,
    user: process.env.PG_USER,
    password: process.env.PG_PASS,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 9000,
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    await client.query('SET TRANSACTION READ ONLY');
    const result = await client.query(trimmed);
    if (result.rows.length > MAX_ROWS) {
      result.rows = result.rows.slice(0, MAX_ROWS);
    }
    const txt = formatAsMcp(result);
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ result: txt, user: creds.user }),
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
