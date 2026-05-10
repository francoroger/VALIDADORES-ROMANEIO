---
name: Como ancorar um romaneio na sua separação correta
description: Lógica certa para casar um romaneio com a separação que produziu seus banhos — usar janela de expedição, NÃO ±N dias do exp_ini
type: project
originSessionId: 46ce5cfc-e2ef-4920-b0fb-90008bbe4fb5
---
Quando precisar ligar romaneio (servico) à separação que o produziu (pra pegar a janela exata de banho_ini→banho_fim e evitar vazar passagens de outros lotes), use SEMPRE este critério:

## Critério correto

```
data_romaneio CAI DENTRO da janela de expedição da separação:
  exp_ini - 1d ≤ data_romaneio ≤ COALESCE(exp_fim, exp_ini + 14d) + 2d
```

Em SQL:
```sql
WHERE s.cliente_id = ${cli}
  AND s.data_inicio_expedicao IS NOT NULL
  AND s.data_inicio_expedicao::date - INTERVAL '1 day' <= '${data_rom}'::date
  AND '${data_rom}'::date <= COALESCE(s.data_fim_expedicao, s.data_inicio_expedicao + INTERVAL '14 days')::date + INTERVAL '2 days'
ORDER BY ABS(EXTRACT(EPOCH FROM (s.data_inicio_expedicao - '${data_rom}'::date))) ASC
LIMIT 1
```

Em JS:
```js
const cands = seps.filter(s => {
  if (s.cliente_id !== rom.cliente_id || !s.exp_ini) return false;
  const eIni = new Date(s.exp_ini);
  const eFim = s.exp_fim ? new Date(s.exp_fim) : new Date(eIni.getTime() + 14*86400000);
  const tolFim = new Date(eFim.getTime() + 2*86400000);
  const tolIni = new Date(eIni.getTime() - 86400000);
  return dRom >= tolIni && dRom <= tolFim;
}).sort((a,b) => Math.abs(new Date(a.exp_ini)-dRom) - Math.abs(new Date(b.exp_ini)-dRom));
```

## NÃO usar (bug histórico)

```js
// ❌ ERRADO: ±2 dias do exp_ini
const cands = seps.filter(s => Math.abs(new Date(s.exp_ini) - dRom)/86400000 <= 2);
```

**Por que é errado:** uma separação pode ter expedição de 04-30 a 05-07 (1 semana). O romaneio cai num dia qualquer dessa semana. Se o romaneio for em 05-04 (4 dias depois do exp_ini), o ±2d não casa, e o sistema cai pro fallback de 60 dias, **vazando passagens de lotes anteriores**.

## Caso histórico que provou o bug

Romaneio #24855 NP SOARES, datado 2026-05-04:
- Separação 14887: exp_ini=2026-04-30, exp_fim=2026-05-07
- ±2d falhou (diff = 4d)
- Fallback 60d pegou passagens antigas: Prateado 70 milésimos = 4180g
- Romaneio real = 196g → variação artificial -95.3%
- Com fix novo: pegou sep 14887, banho_ini→banho_fim = 200g real → variação +2.0% ✓

## Carregamento das separações em listagens

Quando carregar separações pra ancorar uma faixa de romaneios, a janela SQL de carga precisa cobrir exp_ini desde **dFrom - 20 dias** (não -5d), porque uma separação pode começar a expedir no fim do mês anterior e o romaneio sair no começo do mês atual.

```sql
WHERE (s.data_inicio_expedicao::date BETWEEN '${dFrom}'::date - INTERVAL '20 days' AND '${dTo}'::date + INTERVAL '5 days'
   OR s.data_fim_expedicao::date BETWEEN '${dFrom}'::date - INTERVAL '5 days' AND '${dTo}'::date + INTERVAL '5 days'
   OR s.data_fim_separacao::date BETWEEN '${dFrom}'::date - INTERVAL '5 days' AND '${dTo}'::date + INTERVAL '5 days')
```

E SEMPRE selecionar `data_fim_expedicao` (não só `data_inicio_expedicao`) porque a lógica de anchor usa ambos.

## Onde está aplicado (a partir de 09/05/2026)

- franco_validador_romaneio.html v2.0+
- monitor_romaneios.html v1.8+
- franco_rp_fixed.html v2.6+
- extrato_cliente.html v2.4+

Validado em 5 casos previamente corretos (#24856, #24870, #24876, #24878, #24884) + #24855 que era o bug.
