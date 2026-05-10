---
name: Preferências de estilo e UX do Roger
description: Padrões visuais e de apresentação que o Roger validou ou pediu correção em artefatos/relatórios
type: feedback
originSessionId: 66180a77-4118-4d6f-820f-76c6905d22a8
---
Em artefatos e telas para uso operacional do Roger:

- **Tabelas em vez de cards** quando lista de itens. Card consome muito espaço de folha (decisão dele em sessão anterior, validada ao revisar OS produção).
- **Ícones decorativos PODEM ser usados** em tabs (🏭🧾📋👤⚙📊), headers de seção (🏭 Passagens, 🧾 Itens faturados), botões de modo (🔍 Conciliação), match indicators de linha (🟢 forte / 🟡 parcial / ⚠ fraco quando linkando passagem específica) — facilitam scanning visual.
- **EXCEÇÃO IMPORTANTE — não criar contadores agregados de qualidade de match**: aquela coluna 'Status' que mostrava '🟢 2/2' / '🟡 1/2' / '⚪ 1/2' (resumindo quantos itens do romaneio bateram com passagens) é confusa em qualquer formato (icone OU texto 'conferido'/'1 sem pass'). Roger não quer ESSE tipo de indicador resumindo o romaneio inteiro — preferível NÃO ter coluna nenhuma de status agregado no header do romaneio. A informação de match deve aparecer só na tabela detalhada, item por item.
- **Colunas centralizadas** quando são valores numéricos comparáveis (ex: OS / Passagens / Romaneio). Right-aligned vira "right" demais visualmente.
- **Ordem das colunas comparativas:** Passagens **antes** de Romaneio (sequência temporal natural: passagem acontece antes do faturamento).
- **Datas pré-preenchidas:** primeiro dia do mês corrente até hoje. Não pré-encher com "60 dias atrás" que é arbitrário.
- **Não juntar passagens e romaneios na mesma data** num lado-a-lado — passagem nunca cai no mesmo dia do romaneio (acontece dias antes, no banho). Side-by-side por data confunde.
- **Agrupar por categoria** (material + cor + ‰) na visão de comparação, não por item — agregar vários itens de "Madrid ‰3" antes de mostrar o número, evita o problema do match item-a-item dar Δ% bizarro.
- **Comparar OS × Passagens × Romaneio** como tripla obrigatória quando exibe romaneio.
- **Não abreviar 'Passagem' e 'Romaneio'** em cabeçalhos, labels ou textos visíveis. Use sempre o nome completo: "Passagem" não "Pass.", "Romaneio" não "Rom." nem "Roman.". A ÚNICA abreviação aceita é **"OS"** (Ordem de Serviço) que ele já usa naturalmente. Exemplos: cabeçalho deve ser "Variação % (Romaneio vs Passagem)" não "Var. % (rom vs pass)"; "Δ Passagem→Romaneio" não "Δ rom×pass"; coluna "Passagem" não "Pass."
- **Nunca usar o símbolo ‰ (per mille)** — não existe na nomenclatura do Roger. Sempre escrever **"milésimos"** por extenso. Exemplos: "5 milésimos" (não "‰5"), "50 milésimos" (não "‰50"), tag em label "Dourado · Madrid · 5 milésimos" (não "Dourado · Madrid · ‰5"). Em tabelas com coluna "Milesimos", a célula pode ter só o número (ex: "5") já que a coluna identifica.

**Why:** Roger usa as telas no chão de fábrica e na gestão. Muito visual virou ruído. Ele prefere números limpos e tabelas densas.

**How to apply:** ao criar/atualizar qualquer artefato de operação Franco, aplicar essas regras desde o primeiro draft. Evita rounds de "ta confuso" e refazer.
