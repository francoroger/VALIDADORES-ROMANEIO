# CHANGELOG

Histórico consolidado das versões dos 4 artefatos. Cada artefato também mantém seu próprio array `VERSIONS` em JS (clicável no header).

## 2026-05-13

### Validador v3.13 → v3.16: timeout MCP, UX voltar à listagem, janela de passagens

**Validador v3.16** · **Monitor v2.9**

- 🐛 **Validador v3.16** — BUGFIX home: variação Rom×Pass na lista divergia do detalhe. Janela de passagens da home agora respeita o `banho_ini` da PRÓXIMA separação do cliente (mesma proteção que o detalhe já tinha desde v1.7). Caso #24878 ANA BEATRIZ: lista mostrava -44.7% por catar passagens da sep concorrente 14939; detalhe mostrava +2.4%. Agora ambos batem em +2.4%.
- 🎨 **Validador v3.15** — UX: botão `← Voltar à listagem` no header do romaneio aberto. Esconde detalhe, mostra lista, limpa hash da URL.
- 🐛 **Validador v3.14** — BUGFIX timeout: query LATERAL JOIN da home sem filtro de data fazia scan no histórico inteiro. Aplica filtro padrão de últimos 30 dias quando `dFrom/dTo` vazios (label da seção já prometia isso). Usuário pode limpar pra desfazer.
- 🐛 **Validador v3.13** — BUGFIX REAL: filtro `datavenda IS NOT NULL` e `idcliente IS NOT NULL` agora realmente aplicado no SQL home. Em v3.12 o changelog prometeu o fix mas o `where` array continuou como `['1=1']`. Causava MCP timeout pelos 327 registros lixo (datavenda NULL) no topo do `ORDER BY DESC`.
- 🐛 **Monitor v2.9** — BUGFIX timeout: existem 327 romaneios com `datavenda=NULL` e `idcliente=NULL` no banco. Por padrão Postgres ordena NULLs primeiro em `DESC` → primeira página do monitor pegava só NULLs e fazia timeout. Fix: `WHERE s.datavenda IS NOT NULL AND s.idcliente IS NOT NULL`.

## 2026-05-11

### Validador v3.0 → v3.12: refactor home, conciliação em 2 tabelas, anchor relaxado

**Validador v3.12** · **Monitor v2.8** · **RP v3.3**

- 🎨 **Validador v3.0** — scroll infinito + filtros no SQL (cliente/data) na home.
- 🎨 **Validador v3.2** — coluna Catalogação (triagem) antes da OS, hierarquia por material+ml.
- 🎨 **Validador v3.5–v3.6** — Etapa 6 (Romaneio) com expand/retrair detalhamento completo. Conciliação em 2 tabelas separadas (bucket com cor / por material+milésimos com Catalogação).
- 🐛 **Validador v3.3 / Monitor v2.6 / RP v3.3** — anchor sep relaxada: aceita romaneio até 30d antes do `exp_ini` (operador às vezes fatura antes do motoboy sair). Caso #24713 FLÁVIA.
- 🐛 **Validador v3.8** — fix Catalogação Ródio: `itemtriagem.milesimos=0` vs `itemservico.milesimos=NULL`. Normalização `normMil` resolve.
- 🐛 **Todos** — filtro `flag_orcamento IS NULL` nas queries de OS (Pré-Orçamentos não devem entrar).

## 2026-05-10 (noite)

### Refactor validador + descontinuado Extrato Cliente

**Validador v2.8** · descontinuado: **Extrato Cliente** (removido do projeto e do Cowork)

- 🗑 **Removido Extrato Cliente** do projeto. Funções consolidadas no Validador (1 romaneio) e Monitor (visão diária).
- 🎨 **Validador v2.8** — refactor UI: timeline ordenada cronologicamente, filtros cliente/data na lista 30d, loader visível durante carregamento, fórmula triádica retrátil, header do romaneio redesenhado (sem peso adicionais, sem status pagamento, cor mais sutil).

## 2026-05-10

### Tarde — Sessão 2 (paginação MCP, fix variação total, recuperação de truncamento)

**Validador v2.7** · **Monitor v2.4** · **RP v3.1** · **Extrato v2.9**

- 🐛 **BUGFIX paginação MCP** (todos os 4): MCP `pg_consultar` tem cap Pydantic de `limit ≤ 500`. Implementada função `callDBAll` que pagina com `LIMIT 500 OFFSET N` até esvaziar. Resolve "SEM PASS." em massa quando passagens > 500 (caso real: 1.453 passagens em abril).
- 🐛 **BUGFIX alerta variação total** (validador): a soma de passagens estava incluindo adicionais (verniz) e comparando com peso de banho do romaneio. Caso #24857 GOIANILDE mostrava -27.3% indevido; agora mostra +1.8% correto.
- 🛠 **HOTFIX truncamento HTML**: validador (v2.4) e RP (v2.9) tinham `</script></body></html>` duplicados, fazendo o JS aparecer como texto na tela.

### Manhã/início tarde — Sessão 1 (anchor sep, banho_ini NULL, duplicatas, tolerância 24h)

- 🐛 **Validador v2.0 / Monitor v1.8 / RP v2.6 / Extrato v2.4** — anchor de separação semanticamente correto: `data_romaneio DENTRO de exp_inicio..exp_fim+2d` (antes era `±2d do exp_ini`, falhava quando romaneio era >2d depois do início da expedição). Caso #24855 NP SOARES: variação artificial -95.3% → real +2.0%.
- 🛠 **Validador v2.1 / Monitor v1.9 / RP v2.7 / Extrato v2.5** — fallback inteligente quando `data_inicio_banho` é NULL (operador esqueceu): estima como `max(banho_fim_sep_anterior, banho_fim - 4d)`. Caso #24871 ULIANE.
- 🐛 **Validador v2.2** — query de detecção de separações concorrentes usava `tstzrange()` que quebrava quando `banho_ini > banho_fim` em separações antigas. Substituído por `LEAST/GREATEST` tolerante.
- 🎨 **Todos v2.3/v2.0/v2.8/v2.6** — cor da variação corrigida: positivo (rom > pass) = verde, negativo = vermelho, |v|<0.5% = neutro. Antes era por módulo, ignorando o sinal.
- 🛠 **Validador v2.4 / Monitor v2.1 / RP v2.9 / Extrato v2.7** — tolerância +24h no `banho_fim` LIMITADA pelo `banho_ini` da próxima sep do cliente. Caso #24863 LAYLA: peça escaneada 1m42s após `banho_fim` ficava de fora — agora entra.
- 🛠 **Validador v2.4 / Monitor v2.2** — detector de duplicatas de passagem com alerta visual. Agrupa por `material+cor+milesimos+tiposerv+peso+data+created_at`. Caso #24874 LETÍCIA: 4 IDs no mesmo segundo (POST duplo na API), inflavam variação.

## 2026-05-09

### Sessão pesada (anchor inicial, ‰→milésimos, parseResult bug)

- 🐛 **Bug crítico parseResult** (todos): queries com `\r\n` em colunas de observação quebravam o split silenciosamente, dropando rows. Fix: `REPLACE(REPLACE(observacao, CHR(13), ' '), CHR(10), ' '))` em todas queries que retornam observação. Caso #24870 KARINA.
- 🎨 **Símbolo ‰ removido**: substituído por "milésimos" por extenso em todos os lugares (headers, cells, labels, fórmulas).
- 🛠 **Topologia kanban mapeada**: FKs reais validadas com #24884 e #24876. Anchor inicial via separação.
- 🐛 **RP v2.4** — `matchOsServico` reescrita com 4 níveis de fallback: (a) parse de "O.S:NNNN" da triagem da separação, (b) CAT na obs da OS, (c) OS do cliente até fim da separação, (d) OS mais recente. Caso #24856 GABRIELY.
- 🛠 **Versionamento** — todo artefato passou a ter array `VERSIONS` + log clicável no header compacto.

## 2026-05-08

- 🆕 **Conceito de conciliação por bucket** (material+cor+milesimos): cria a tripla OS×Pass×Rom em vez de comparar totais agregados.
- 🆕 **Monitor de Romaneios** criado.
- 🆕 **Extrato Cliente** com 4 modos.

## Anteriores

- Análises pontuais via PostgreSQL para validar planilha "Banho vs Anos" (março/abril/2026)
- Construção de dashboards estáticos
- Migração do banco local para Aiven (online)

---

**Convenção de versão:**
- Major (X.0): mudança estrutural ou conceito novo
- Minor (X.Y): feature ou refactor significativo
- Patch (X.Y.Z): bugfix simples (não usado — vai pro próximo minor)

Cada artefato versiona independente. Não há sincronização forçada de versão entre eles.
