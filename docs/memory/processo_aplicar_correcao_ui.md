---
name: Processo para aplicar correção de UI/preferência em todos artefatos
description: Checklist obrigatório quando Roger pede uma correção de estilo/nomenclatura, pra garantir cobertura 100% sem precisar repetir
type: feedback
originSessionId: 46ce5cfc-e2ef-4920-b0fb-90008bbe4fb5
---
Toda vez que o Roger sinalizar uma preferência de UI (nomenclatura, abreviação, símbolo, formato), aplicar esta rotina ANTES de dizer "pronto":

## 1. Grep exaustivo em todos os arquivos vivos

Os 4 artefatos atuais ficam em `/sessions/beautiful-gifted-keller/mnt/outputs/`:
- `franco_validador_romaneio.html`
- `franco_monitor_romaneios.html` (`monitor_romaneios.html`)
- `franco_rp_fixed.html`
- `extrato_cliente.html`

Buscar TODAS as variações possíveis do padrão. Exemplo pra ‰/milésimos:

```bash
grep -rn "‰" /sessions/.../outputs/             # símbolo (UI ativa + changelog — checar contexto)
grep -rnE ">Mil\.|>Mil <|>Mil$" .../outputs/    # abreviações em headers inline
grep -rnE "tag-mil[^>]*>\\\$" .../outputs/      # cells dinâmicas em template
grep -rnE "milesimos?\b" .../outputs/           # variações da palavra
grep -rnE "lbl-mil|tag-mil" .../outputs/        # CSS classes (ver renderização real)
grep -rnE "html \+= '[^']*‰" .../outputs/       # ★ HEADERS CONCATENADOS em strings JS!
grep -rnE "‰\\\$\{" .../outputs/                # ★ templates "‰${var}" tipo "‰50"
```

**LIÇÃO 2026-05-09 (caso #24871):** o grep simples "‰" passou batido porque eu estava olhando só ocorrências em changelog e ignorei UI ativa que estava DENTRO de strings JS concatenadas (`html += '<table>...‰...'`) e templates literais (`<span>‰${b.mil}</span>` produzindo "‰50"). Não basta procurar ‰ em headers HTML inline. Precisa cobrir:
- Strings JS que constroem HTML com `html += '...'` (renderização runtime)
- Template literals com `${...}` que produzem o símbolo concatenado
- Renders de tabelas dentro de funções `renderXxx()` (não só topo do arquivo)

**Sempre fazer:** Antes de declarar "pronto", abrir o artefato no navegador (ou rodar grep no contexto +-3 linhas) pra ver se a UI **renderizada** mostra o padrão. Cobertura por linha não significa cobertura visual.

## 2. Categorizar resultados

- **UI ativa** (HTML inline, headers, cells, labels) → CORRIGIR
- **Strings de SQL** → NÃO mexer (são nomes de coluna do banco)
- **Comentários de código** → CORRIGIR (clareza)
- **Changelog/VERSIONS array** → NÃO mexer (registro histórico)

## 3. Aplicar fix em todos os arquivos UI ativos de uma vez

Não fazer 1 arquivo por vez e dizer "pronto". Fazer todos, depois testar/republicar todos juntos.

## 4. Atualizar o arquivo de preferências na memória com a regra

Memorizar a regra em `preferencias_estilo_roger.md` com:
- O que NÃO fazer (com exemplos do erro)
- O que fazer (com exemplos certos)
- Variações que costumam escapar (Mil. / mil / ‰ / etc)

## 5. Verificação final OBRIGATÓRIA

Rodar grep novamente confirmando ZERO ocorrências em UI ativa. Só então responder "pronto" ao Roger.

## Padrões de UI já consolidados (não regredir)

- ✅ "Passagem" e "Romaneio" sempre por extenso (nunca abreviar)
- ✅ "OS" pode ficar abreviado (uso natural do Roger)
- ✅ "milésimos" sempre por extenso, NUNCA usar ‰. Quando aparece em coluna de tabela, header é "Milésimos" (não "Mil." nem "Mil")
- ✅ Centralizar valores numéricos comparáveis (OS / Passagens / Romaneio)
- ✅ Tabelas, não cards
- ✅ Sem ícones decorativos como contadores (ex: "🟢 2/2")
- ✅ Cores podem ser usadas em tags/textos (verde/laranja/vermelho na variação) — sutilmente
- ✅ Header dos artefatos compacto (1 linha) com versão + log clicável
- ✅ Datas pré-preenchidas: 1º dia do mês até hoje
