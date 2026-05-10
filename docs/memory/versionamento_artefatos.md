---
name: Versionamento e timestamp em todos os artefatos
description: Todo artefato (HTML/dashboard/ferramenta) que eu criar para o Roger deve ter número de versão, data/hora da última edição visível no topo, e um log de mudanças acessível via clique
type: feedback
originSessionId: 46ce5cfc-e2ef-4920-b0fb-90008bbe4fb5
---
TODA ferramenta/artefato/dashboard que eu criar ou editar para o Roger DEVE incluir:

1. **Indicador de versão e timestamp visível no topo do artefato** (compacto, ao lado do título): `v1.X · editado dd/mm/aaaa HH:MM`
2. **Log de versões clicável** (link "histórico" ou ícone) que abre uma janela/modal com:
   - Lista de versões em ordem reversa (mais recente em cima)
   - Cada entrada: número, data/hora, descrição das mudanças daquela versão
3. **Array `VERSIONS` no JS** com toda a história — não apagar versões antigas, sempre adicionar nova entrada no topo
4. **Header dos artefatos compacto** — uma linha só, no estilo do `extrato_cliente`/`monitor_romaneios`. NÃO usar header gigante com brand+logo+subtitulo+status em múltiplas linhas como o `franco-romaneio-passagem` originalmente tinha.

**Why:** Roger precisa rastrear o que mudou em cada artefato sem ter que perguntar. Versões antigas servem como referência caso uma mudança recente quebre algo. Header pequeno deixa mais espaço pra os dados.

**How to apply:**
- Ao criar artefato novo: começar em `v1.0` com primeira entrada no log
- Ao editar artefato existente: incrementar (v1.0 → v1.1 → v1.2 → ...) e adicionar entrada com descrição clara da mudança
- Ao chamar `update_artifact`, o `update_summary` deve corresponder à entrada do log
- Quando criar artefato novo, mencionar no chat que está versionado e como acessar o log
- Aplicar isso em TODOS os artefatos do Roger: franco-romaneio-passagem, franco-monitor-romaneios, franco-extrato-cliente, e qualquer novo

**Estilo do indicador no topo (CSS):**
```
.version-info{font-size:11px;color:var(--text-3);}
.version-info a{color:var(--primary);cursor:pointer;text-decoration:none}
.version-info a:hover{text-decoration:underline}
.version-modal{position:fixed;top:60px;right:20px;width:420px;max-height:70vh;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px;box-shadow:0 8px 24px rgba(0,0,0,.15);z-index:100;display:none;overflow-y:auto}
.version-modal.open{display:block}
.version-entry{padding:8px 0;border-bottom:1px solid var(--border)}
```
