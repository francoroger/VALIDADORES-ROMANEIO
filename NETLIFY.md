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
| `PG_HOST` | **hostname** do Postgres — prefira o nome em vez do IP (veja seção abaixo) |
| `PG_PORT` | `24135` |
| `PG_DB` | nome do banco |
| `PG_USER` | usuário read-only |
| `PG_PASS` | senha |
| `USERS` | lista de usuários+senhas no formato `user1:senha1,user2:senha2,user3:senha3` |

### Como configurar `USERS`

Esta env var é a sua "base de dados de usuários". Cada par `usuario:senha` separado por vírgula. Exemplo:

```
roger:R0g3rFranco2026,bia:B14Senha456,flavia:Fl4v14Pass789,marcia:M4rc14Forte
```

Regras:
- Sem espaços antes ou depois dos `:` e `,`
- Senha pode ter qualquer caractere, exceto vírgula (`,`) ou dois-pontos (`:`)
- Pra **adicionar usuário**: edita a env var, adiciona `,novouser:novasenha` no final → Save → Trigger deploy
- Pra **remover usuário**: edita a env var, remove o pedaço dele → Save → Trigger deploy
- Pra **trocar senha de alguém**: edita a env var, muda só a senha daquele user → Save → Trigger deploy

Quando alguém faz login no site, o backend verifica se o `usuario:senha` digitado bate com algum par dessa lista.

### Onde achar o hostname Aiven

1. Entra em https://console.aiven.io
2. Clica no serviço PostgreSQL da Franco
3. Aba **Overview** — procura o card **Connection information**
4. Copia o valor de **Host** (não copia a porta junto). Vai ser algo como:
   ```
   pg-xxxxxxxx-franco-galvanica.aivencloud.com
   ```
5. Copia também o valor de **Port** (vai pra `PG_PORT`)
6. Em **Service URI** você tem a connection string completa, útil pra conferência: `postgres://avnadmin:SENHA@HOST:PORTA/defaultdb?sslmode=require`

**Por que isso é importante:** Aiven pode mover o serviço de host físico durante manutenção (sem aviso) e o IP muda — mas o hostname continua o mesmo. Se você usar IP, um dia vai parar de funcionar do nada. Com hostname você nunca tem esse problema.

Depois de adicionar, **Trigger deploy → Clear cache and deploy site** pra Function pegar as vars.

### 3. Compartilhar com o time

Cada pessoa recebe:
- URL: `https://seu-site.netlify.app/`
- Usuário próprio (ex: `bia`)
- Senha própria (ex: `B14Senha456`)

Ela abre a URL, digita usuário+senha uma vez, e salva no navegador. A partir daí acessa os 4 artefatos como links normais.

## Rotina pós-setup

Toda vez que mudar um artefato, o fluxo é o mesmo de sempre:

1. Edita o HTML
2. Roda `aplicar-fixes.bat` na pasta SISTEMA FRANCO
3. Netlify faz deploy automático em ~30s

Não precisa fazer nada manual no Netlify após o setup inicial.

## Gerenciar usuários

Tudo via env var `USERS`:

**Adicionar pessoa nova:**
1. **Site configuration → Environment variables → USERS → Options → Edit**
2. Adiciona `,novousuario:novasenha` no final
3. **Save**
4. **Deploys → Trigger deploy → Clear cache and deploy site**
5. Manda usuário+senha pra pessoa

**Remover pessoa (alguém saiu):**
1. Edita `USERS`, remove o pedaço daquela pessoa (com a vírgula)
2. Save + Trigger deploy
3. Quem foi removido será redirecionado pra tela de login na próxima requisição e não vai conseguir entrar

**Trocar senha:**
1. Edita `USERS`, muda só a senha daquele user
2. Save + Trigger deploy
3. Avisa a pessoa pra entrar com a nova

## Segurança

- **Function só aceita** SQL que começa com `SELECT`, `WITH`, `EXPLAIN`, `SHOW`, `TABLE` ou `VALUES`. Rejeita `;` no meio (sem multi-statement).
- **Conexão é read-only** (`SET TRANSACTION READ ONLY`). Mesmo se um bug deixasse passar um INSERT, o Postgres recusaria.
- **Token via Authorization header**, não exposto em query string ou URL.
- **HTTPS automático** pelo Netlify.
- **SSL pro Aiven:** está com `rejectUnauthorized: false` no `db.js` — funciona, mas não valida o certificado da cadeia. Pra hardening máximo, baixe o `ca.pem` da Aiven (botão **Show CA certificate** no painel) e adicione a env var `PG_CA_CERT` com o conteúdo do cert; o código pode ser ajustado depois pra usar `ssl: { ca: process.env.PG_CA_CERT }` com `rejectUnauthorized: true`. Pra MVP, o atual está OK.

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
