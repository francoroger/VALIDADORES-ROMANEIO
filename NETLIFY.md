# Hospedagem no Netlify

Os artefatos foram preparados para rodar **tanto dentro do Cowork quanto em browser comum** via Netlify. Esta página descreve o setup inicial e a rotina de uso.

## Como funciona

```
                  +---------------------------+
                  |     Navegador qualquer    |
                  |  (notebook, celular, web) |
                  +-----------+---------------+
                              | fetch /api/db (POST)
                              v
                  +---------------------------+
                  |     Netlify Function      |
                  |   netlify/functions/db.js |
                  |   - valida token          |
                  |   - SQL read-only         |
                  |   - timeout 9s            |
                  +-----------+---------------+
                              | pg (SSL)
                              v
                  +---------------------------+
                  |     PostgreSQL Aiven      |
                  |     164.92.100.77:24135   |
                  +---------------------------+
```

Dentro do Cowork, o shim em `netlify/shim.js` detecta que `window.cowork` existe e não faz nada — o artefato chama o MCP nativo como sempre. Em browser comum, o shim cria um `window.cowork.callMcpTool` que faz `fetch` para a Function do Netlify, autenticado com um token guardado no `localStorage`.

## Setup inicial (uma vez)

### 1. Conectar o repo no Netlify

1. Login em https://app.netlify.com
2. **Add new site** → **Import an existing project** → **Deploy with GitHub**
3. Escolha o repositório `francoroger/VALIDADORES-ROMANEIO`, branch `main`
4. Build settings: deixe os padrões (o `netlify.toml` já configura tudo)
5. **Deploy site** — leva uns 30-60 segundos

### 2. Configurar variáveis de ambiente

Em **Site configuration → Environment variables → Add a variable**, criar:

| Nome | Valor |
|---|---|
| `PG_HOST` | `164.92.100.77` (ou o endpoint Aiven) |
| `PG_PORT` | `24135` |
| `PG_DB` | nome do banco |
| `PG_USER` | usuário read-only |
| `PG_PASS` | senha |
| `API_TOKEN` | gerar uma string secreta (ex: `openssl rand -hex 24`) |

Depois de adicionar, **Trigger deploy → Clear cache and deploy site** pra Function pegar as vars.

### 3. Compartilhar com o time

Mande para os funcionários:
- URL: `https://seu-site.netlify.app/_auth.html`
- Token: o valor de `API_TOKEN`

Eles abrem a URL, colam o token uma vez e salva no navegador. A partir daí podem acessar os 4 artefatos como links normais.

## Rotina pós-setup

Toda vez que mudar um artefato, o fluxo é o mesmo de sempre:

1. Edita o HTML
2. Roda `aplicar-fixes.bat` na pasta SISTEMA FRANCO
3. Netlify faz deploy automático em ~30s

Não precisa fazer nada manual no Netlify após o setup inicial.

## Trocar o token (rotação)

Quando alguém sai da equipe:

1. **Site configuration → Environment variables → API_TOKEN → Options → Edit** — coloca um valor novo
2. **Deploys → Trigger deploy → Clear cache and deploy** — pra Function pegar o token novo
3. Manda o token novo no chat do time

Quem tinha o token antigo será redirecionado pra tela de login na próxima requisição.

## Segurança

- **Function só aceita** SQL que começa com `SELECT`, `WITH`, `EXPLAIN`, `SHOW`, `TABLE` ou `VALUES`. Rejeita `;` no meio (sem multi-statement).
- **Conexão é read-only** (`SET TRANSACTION READ ONLY`). Mesmo se um bug deixasse passar um INSERT, o Postgres recusaria.
- **Token via Authorization header**, não exposto em query string ou URL.
- **HTTPS automático** pelo Netlify.

## Custos esperados (Free tier)

| Recurso | Limite | Uso esperado | Folga |
|---|---|---|---|
| Function invocations | 125k/mês | ~25-40k | ~70% |
| Function runtime | 100h/mês | ~10-15h | ~85% |
| Bandwidth | 100 GB/mês | ~3-5 GB | ~95% |
| Build minutes | 300/mês | ~50-100 | ~70% |

Estimativa para time de 5-10 pessoas × ~20 validações/dia × 22 dias úteis.

## Limites técnicos

- **Cold start:** primeira requisição depois de ~5 min sem uso leva 1-2s extra (Lambda dorme).
- **Timeout duro de 10s** por requisição (Free tier). A Function aplica `statement_timeout=9s` no Postgres antes pra erro virar 500 amigável.
- **Body máximo de 6 MB** (Lambda). Não é problema — queries devolvem pouco texto.

## Troubleshooting

**"Token inválido" no login**
→ Confere o valor de `API_TOKEN` no painel do Netlify. Se mudou, dispare um redeploy com Clear cache.

**Function retorna "Erro: timeout"**
→ Query passou de 9s. Use o EXPLAIN ANALYZE no Postgres pra identificar e otimizar.

**Function não responde / 502**
→ Logs em **Site → Functions → db → View logs**. Costuma ser env var faltando ou senha errada.

**Deploys não rodam após push**
→ **Site → Build & deploy → Continuous deployment** — confere se a branch `main` está conectada.

## Como subir manualmente (sem GitHub)

Se quiser fazer um deploy manual:

```bash
cd VALIDADORES-ROMANEIO
npx netlify-cli deploy --prod
```

Mas o caminho normal é via `aplicar-fixes.bat` → push GitHub → Netlify pega automático.
