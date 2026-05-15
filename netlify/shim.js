// netlify/shim.js
// Injetado no topo de cada artefato. Detecta se esta rodando no Cowork ou
// em browser comum (Netlify). Se for browser, instala um proxy em
// window.cowork.callMcpTool que faz fetch pra /.netlify/functions/db
// usando user+password salvos no localStorage. Se nao tiver credenciais,
// redireciona pro _auth.html.

(function () {
  if (typeof window !== 'undefined' && window.cowork && typeof window.cowork.callMcpTool === 'function') {
    return;
  }

  const STORAGE_USER = 'franco_user';
  const STORAGE_PASS = 'franco_pass';
  const user = (typeof localStorage !== 'undefined') ? localStorage.getItem(STORAGE_USER) : null;
  const pass = (typeof localStorage !== 'undefined') ? localStorage.getItem(STORAGE_PASS) : null;

  if (!user || !pass) {
    if (typeof window !== 'undefined' && window.location && !window.location.pathname.endsWith('/_auth.html')) {
      window.location.href = '/_auth.html';
    }
    return;
  }

  const basic = btoa(user + ':' + pass);

  window.cowork = window.cowork || {};
  window.cowork.callMcpTool = async function (toolName, args) {
    const sql = (args && args.params && args.params.sql) || (args && args.sql) || '';
    if (!sql) throw new Error('SQL ausente');

    const resp = await fetch('/.netlify/functions/db', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + basic,
      },
      body: JSON.stringify({ sql }),
    });

    if (resp.status === 401) {
      // Credenciais invalidas: limpa e manda pro login
      try {
        localStorage.removeItem(STORAGE_USER);
        localStorage.removeItem(STORAGE_PASS);
      } catch (_) {}
      window.location.href = '/_auth.html';
      throw new Error('Usuario ou senha invalidos');
    }
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error('Erro do backend: ' + txt.slice(0, 200));
    }
    return await resp.json();
  };

  window.cowork.askClaude = window.cowork.askClaude || (async () => {
    throw new Error('askClaude nao disponivel fora do Cowork');
  });
  window.cowork.runScheduledTask = window.cowork.runScheduledTask || (async () => {
    throw new Error('runScheduledTask nao disponivel fora do Cowork');
  });
})();
