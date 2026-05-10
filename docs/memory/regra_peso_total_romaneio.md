---
name: Regra peso total em romaneios e triagens
description: Itens que NÃO entram no peso total quando somamos serviços de um romaneio/triagem da Franco Folheados/Galvânica
type: feedback
originSessionId: 66180a77-4118-4d6f-820f-76c6905d22a8
---
Quando se calcula o "peso total" de um romaneio (`servico` + `itemservico`) ou de uma triagem (`triagem` + `itemtriagem`), **NÃO somar** os itens dos seguintes tipos de serviço:

- **Verniz Alemão Ultraprotect**
- **Verniz Cataforético**
- **Aplique Ródio (caneta)** — também referido como "caneta de ródio"
- **Acessórios** (Adicional Acessórios, ex.: descrição "Adicional Acessórios" no `material`)

Apenas os **banhos principais** (Dourado, Prateado, Níveo, etc. — banhos de metal nobre) entram no peso total da peça. Os outros são adicionais cobrados (têm valor) mas não somam ao peso porque são coberturas/finalizações sobre as peças que já entraram pelos banhos principais.

**Why:** o peso real das peças do cliente é a soma dos banhos principais. Os adicionais (vernizes, ródio, acessórios) são serviços aplicados sobre as mesmas peças — somar de novo seria duplicar o peso. Roger confirmou esta regra em sessões anteriores.

**How to apply:**
- Em queries que somam `peso` para reportar quantidade de material: filtrar `tiposervico.descricao` ou `material.descricao` excluindo Verniz, Acessórios, Ródio caneta.
- Em comparações entre passagens (`passagem_pecas`) e romaneios (`servico` + `itemservico`): aplicar o mesmo filtro nos dois lados.
- Quando apresentar "peso total" pro Roger: já mostrar separado em "peso de banho" vs "adicionais (vernizes/acessórios/ródio)".
- A coluna `idtiposervico` aponta pra `tiposervico.descricao`. Tipos identificados que **NÃO entram**: "Verniz", "Acessórios". O "Banho" entra. Conferir se há outros (ex.: ródio pode estar como subtipo).
