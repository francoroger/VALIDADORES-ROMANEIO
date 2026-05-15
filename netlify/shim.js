// netlify/shim.js — injetado no topo dos artefatos
(function () {
  if (typeof window !== 'undefined' && window.cowork && typeof window.cowork.callMcpTool === 'function') return;

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
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic ' + basic },
      body: JSON.stringify({ sql }),
    });
    if (resp.status === 401) {
      try { localStorage.removeItem(STORAGE_USER); localStorage.removeItem(STORAGE_PASS); } catch (_) {}
      window.location.href = '/_auth.html';
      throw new Error('Usuario ou senha invalidos');
    }
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error('Erro do backend: ' + txt.slice(0, 200));
    }
    return await resp.json();
  };
  window.cowork.askClaude = window.cowork.askClaude || (async () => { throw new Error('askClaude nao disponivel fora do Cowork'); });
  window.cowork.runScheduledTask = window.cowork.runScheduledTask || (async () => { throw new Error('runScheduledTask nao disponivel fora do Cowork'); });

  // Injeta botao Home flutuante no canto superior direito
  function injectHomeButton() {
    if (document.getElementById('franco-home-btn')) return;
    const style = document.createElement('style');
    style.textContent = `
      #franco-home-btn{position:fixed;top:14px;right:14px;z-index:9999;display:inline-flex;align-items:center;gap:6px;padding:7px 14px 7px 11px;background:rgba(255,255,255,.96);backdrop-filter:blur(8px);border:1px solid #e1e8ed;border-radius:20px;font:600 12px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a4d6e;text-decoration:none;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.06);transition:all .15s}
      #franco-home-btn:hover{background:#1a4d6e;color:#fff;border-color:#1a4d6e;box-shadow:0 4px 12px rgba(26,77,110,.25)}
      #franco-home-btn svg{width:14px;height:14px}
    `;
    document.head.appendChild(style);
    const a = document.createElement('a');
    a.id = 'franco-home-btn';
    a.href = '/';
    a.title = 'Voltar ao painel';
    a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12L12 3l9 9"/><path d="M5 10v10h14V10"/></svg><span>Home</span>';
    document.body.appendChild(a);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectHomeButton);
  } else {
    injectHomeButton();
  }
})();
