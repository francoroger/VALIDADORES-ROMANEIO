---
name: Bug script duplicado em HTML após cat >> em arquivo truncado
description: Quando uso bash cat >> pra restaurar arquivo HTML truncado, posso acabar duplicando </script></body></html> e gerar texto JS visível na tela
type: feedback
originSessionId: 46ce5cfc-e2ef-4920-b0fb-90008bbe4fb5
---
## Sintoma visual

O artefato carrega o header normal mas, no fim da página, aparece TEXTO JavaScript bruto tipo:
```
recentBox').style.display = 'none'; } }; document.getElementById('romInput').addEventListener('keydown', e => ...
```

## Causa

O HTML tem o `<script>` aberto fechado prematuramente em algum lugar. Tipicamente porque:
1. O arquivo foi truncado por um bug do harness (Edit/Write) — fica com `<script>`, código JS, fim cortado SEM `</script>`
2. Eu uso `cat >> arquivo.html << EOF` adicionando o sufixo correto: `</script></body></html>`
3. **MAS** o disco tinha resíduo da versão original — só que o `</script>` apareceu antes do esperado, criando 2 fins de documento

Resultado: HTML com 3+ tags `</script>` (deveria ter N onde N = scripts inline + scripts src=). O navegador fecha o script no PRIMEIRO `</script>` e renderiza o resto como texto.

## Detecção

```bash
# Conta as tags </script> e compara com o esperado
grep -cE "</script>" arquivo.html
# Esperado:
# - 1 (JSON metadata cowork-artifact-meta) +
# - N (scripts src= da CDN como chart.js, gridjs) +
# - 1 (JS principal inline)
```

| Arquivo | Esperado |
|---|---|
| Validador | 2 (JSON + JS) |
| Monitor | 2 (JSON + JS) |
| RP | 4 (JSON + chart.js + gridjs + JS) |
| Extrato | 3 (JSON + chart.js + JS) |

## Conserto

```bash
# Achar onde está o primeiro </script> "duplicado"
grep -nE "</script>" arquivo.html
# Olhar contexto do primeiro </script> que NÃO é o esperado
sed -n '935,945p' arquivo.html
# Cortar tudo a partir do primeiro </script> indevido (ou tudo após o último </html> correto)
head -n NUM_LINHA_CORRETA arquivo.html > /tmp/fixed.html && mv /tmp/fixed.html arquivo.html
```

## Prevenção

NÃO usar `cat >> arquivo.html` em arquivos truncados sem antes:
1. Verificar com `grep -cE "</script>"` se já tem fim
2. Se tem, REMOVER o que está depois do truncamento ANTES de adicionar
3. Sempre validar com sintaxe JS + contagem de `</script>` após qualquer manipulação

Melhor ainda: usar Write tool com conteúdo completo (não cat >>) ou editar via Python full read+modify+write.

## Caso histórico (2026-05-10)

- Validador (v2.4): tinha 3 `</script>` (linhas 13, 938, 969). Roger viu `recentBox')...` como texto na tela. Corrigi cortando linhas 941-971.
- RP (v2.9): tinha 5 `</script>` (linhas 13, 20, 21, 1171, 1177). Mesma causa. Corrigi cortando do 1174 em diante.
- Monitor e Extrato estavam OK por sorte (cat >> não foi usado neles após truncamento).
