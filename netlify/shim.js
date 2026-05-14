// netlify/shim.js
// Este script eh injetado no topo de cada artefato. Detecta se esta rodando
// no Cowork ou em browser comum (Netlify). Se for browser, instala um proxy
// em window.cowork.callMcpTool que faz fetch pra /.netlify/functions/db
// usando o token salvo no localStorage. Se nao tiver token, redireciona
// pro _auth.html. Quando esta no Cowork (window.cowork ja existe), nao faz nada.
//
// Como funciona: o callDB dos artefatos chama window.cowork.callMcpTool(...).
// No Cowork ele existe nativo. No Netlify, este shim cria um.

(function () {
  // Se ja existe (esta rodando dentro do Cowork), nao mexer
  if (typeof window !== 'undefined' && window.cowork && typeof window.cowork.callMcpTool === 'function') {
    return;
  }

  const STORAGE_KEY = 'franco_api_token';
  const token = (typeof localStorage !== 'undefined') ? localStorage.getItem(STORAGE_KEY) : null;

  // Sem token? Redireciona pra tela de login
  if (!token) {
    if (typeof window !== 'undefined' && window.location && !window.location.pathname.endsWith('/_auth.html')) {
      window.location.href = '/_auth.html';
    }
    return;
  }

  // Cria o proxy: emula a API window.cowork.callMcpTool
  window.cowork = window.cowork || {};
  window.cowork.callMcpTool = async function (toolName, args) {
    const sql = (args && args.params && args.params.sql) || (args && args.sql) || '';
    if (!sql) throw new Error('SQL ausente');

    const resp = await fetch('/.netlify/functions/db', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
      },
      body: JSON.stringify({ sql }),
    });

    if (resp.status === 401) {
      // Token invalido: limpa e manda pro login
      try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
      window.location.href = '/_auth.html';
      throw new Error('Token invalido');
    }
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error('Erro do backend: ' + txt.slice(0, 200));
    }
    // Backend devolve { result: "...formato MCP..." } igual o pg_consultar
    return await resp.json();
  };

  // Stub vazio pra outras APIs que o artefato pode chamar (askClaude, etc).
  // Se algum artefato chamar, vai falhar — mas hoje nenhum dos 4 usa.
  window.cowork.askClaude = window.cowork.askClaude || (async () => {
    throw new Error('askClaude nao disponivel fora do Cowork');
  });
  window.cowork.runScheduledTask = window.cowork.runScheduledTask || (async () => {
    throw new Error('runScheduledTask nao disponivel fora do Cowork');
  });
})();
