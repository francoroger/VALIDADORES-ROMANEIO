# Deploy · Como publicar mudanças

Fluxo padrão para atualizar os 4 artefatos. Cada artefato é uma página HTML autocontida — não há build step.

## 1. Editar localmente

Os arquivos ficam em `C:\Users\roger\OneDrive\Documents\Claude\Projects\SISTEMA FRANCO\VALIDADORES-ROMANEIO\`:

```
franco_validador_romaneio.html
monitor_romaneios.html
franco_rp_fixed.html
extrato_cliente.html
```

Pode editar direto no VSCode, Sublime ou qualquer editor de texto.

## 2. Validar sintaxe (importante!)

Antes de publicar, valide a sintaxe JS:

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('franco_validador_romaneio.html','utf8');
const re=/<script\b([^>]*)>([\s\S]*?)<\/script>/g;
let m, idx=0, ok=true;
while((m=re.exec(html))){
  const a=m[1]||'';
  if(/type=[\"']application\/json[\"']/.test(a)) continue;
  if(/\bsrc=/.test(a)) continue;
  idx++;
  try { new Function(m[2]); } catch(e){ console.log('ERRO #'+idx+': '+e.message); ok=false; }
}
console.log(idx,'scripts JS',ok?'OK':'FALHA');
"
```

Esperado: `1 scripts JS OK` (ou 1 para validador/monitor, contando só o JS inline).

**Conferir tags `</script>`:**

```bash
grep -cE "</script>" arquivo.html
```

Esperado:
- Validador: **2** (JSON metadata + JS inline)
- Monitor: **2** (JSON metadata + JS inline)
- RP: **4** (JSON + chart.js + gridjs + JS inline)
- Extrato: **3** (JSON + chart.js + JS inline)

Se vier mais que isso, alguma tag está duplicada — corrigir antes de publicar.

## 3. Atualizar versão no array `VERSIONS`

Cada artefato tem no topo do JS:

```js
const VERSIONS = [
  { v: '2.7', date: '2026-05-10 22:45', changes: '...' },
  // ... versões anteriores ...
];
```

Adicione nova entrada NO TOPO com descrição clara da mudança. O header do artefato lê `VERSIONS[0]` automaticamente.

## 4. Publicar no Cowork

Os artefatos estão registrados no Cowork manifest. Para republicar após editar:

**Opção A — Via Claude (sessão de chat):**

Pedir pra publicar no chat:
> "Atualiza o artefato franco-validador-romaneio com o arquivo .html"

Claude usa o tool `mcp__cowork__update_artifact`.

**Opção B — Sair do Cowork e editar manualmente:**

Os artefatos publicados ficam em:
```
C:\Users\roger\OneDrive\Documents\Claude\Artifacts\
├── franco-validador-romaneio\index.html
├── franco-monitor-romaneios\index.html
├── franco-romaneio-passagem\index.html
└── franco-extrato-cliente\index.html
```

Pode copiar manualmente do repo pra esses paths. Depois recarregar o Cowork.

## 5. Commit + push no GitHub

```powershell
cd "C:\Users\roger\OneDrive\Documents\Claude\Projects\SISTEMA FRANCO\VALIDADORES-ROMANEIO"

git add -A
git commit -m "Descrição do que mudou"
git push origin main
```

Se nunca rodou push, ver os scripts `setup-git-validadores.bat` e `push-com-token.bat` na pasta `SISTEMA FRANCO/`.

## 6. Testar no Cowork (Ctrl+Shift+R)

Abrir o artefato no Cowork → painel "Live artifacts" → recarregar com **Ctrl+Shift+R** (força bypass do cache).

**Conferir:**
- Header mostra a nova versão (ex: "v2.7 · editado 2026-05-10 22:45")
- Click em "histórico" → modal mostra todas as versões
- Status muda de "Carregando..." para verde "OK"
- Dados aparecem

Se der erro, abre F12 → Console e ver o erro.

## Troubleshooting

### "Erro: 1 validation error for pg_consultarArguments"

Você passou `limit` > 500 numa chamada. O MCP tem cap de 500. Usar `callDBAll` para queries grandes (ver [BUGS_E_LICOES.md](BUGS_E_LICOES.md#mcp-limit-cap-500)).

### "syntax error at or near LIMIT"

Sua query base já tem `LIMIT X` mas `callDBAll` adicionou `LIMIT 500 OFFSET 0` no final. Versão correta de `callDBAll` remove LIMIT existente antes — copiar do [BUGS_E_LICOES.md](BUGS_E_LICOES.md#mcp-limit-cap-500).

### JS aparece como texto na página

Tag `</script>` duplicada no HTML. Conferir contagem com `grep -cE "</script>"` (esperado 2-4 dependendo do arquivo). Ver [BUGS_E_LICOES.md](BUGS_E_LICOES.md#tags-scriptbodyhtml-duplicadas-após-cat).

### Romaneios mostrando "SEM PASS." em massa

Paginação `callDBAll` não está sendo usada. Conferir que a query de passagens use `callDBAll(sqlP)` e não `callDB(sqlP)`. Em períodos com >500 passagens (ex: mês inteiro), o `limit=500` corta.

### Tela em branco / loading infinito

1. F12 → Console: ver erro
2. Conferir que o metadata `cowork-artifact-meta` está intacto no topo do HTML
3. Conferir conexão Aiven: rodar `SELECT 1` no chat com Claude

## Backup automático no GitHub

O repo https://github.com/francoroger/VALIDADORES-ROMANEIO é o backup canônico. SEMPRE fazer commit+push após mudanças importantes. Em caso de problemas no disk local, dá pra recuperar com `git clone`.
