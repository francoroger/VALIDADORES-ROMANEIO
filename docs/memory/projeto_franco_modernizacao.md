---
name: Projeto Modernização Franco Galvânica/Folheados
description: Contexto, escopo e decisão de stack para o projeto de modernização do ERP Franco
type: project
originSessionId: 66180a77-4118-4d6f-820f-76c6905d22a8
---
A Franco Galvânica/Folheados é uma empresa de folheação a ouro/prata e galvanização. Roger é dono e único responsável técnico hoje (sem dev contratado). O sistema atual é **híbrido**:

- **Delphi (~90 units, ZeosLib)** — sistema operacional principal, MDI desktop. Tem TUDO de catalogação/triagem, tabela de preços, pagamentos, tanques, processos, ordens de serviço, recebimento, separação, entregas, relatórios.
- **Laravel 5.8 (PHP 7.1, Vue 2, jQuery, Bootstrap 4)** — sistema web complementar. 34 controllers, 32 models, 85+ views Blade. Cobre painel kanban, retrabalho, reforço, alguns relatórios. **Não cobre o financeiro.**

Ambos rodam em produção contra o **mesmo PostgreSQL** (folheados, 77 tabelas, 1,1M itens de triagem, 13,4k triagens, 2,6k clientes).

**Decisão de stack** para o sistema novo (validada com Roger): Laravel 11 (PHP 8.3) como API REST + React + Vite + TypeScript + Tailwind + shadcn/ui. Backup: PostgreSQL mantém-se. Mono-repo recomendado.

**Estratégia:** strangler fig. Sistema novo construído ao lado, com banco compartilhado. Migra módulo a módulo. Sem big bang.

**Why:** Roger quer modernizar mas trabalha sozinho hoje (talvez consiga dev futuro). Stack precisava balancear: aproveita parte do Laravel existente, atrai dev futuro, dá UX moderna. React + Laravel API foi o meio termo entre Filament (mais rápido mas mais nicho) e Node puro (abandonaria Laravel).

**How to apply:** quando tópico for "novo sistema", "modernização", "scaffolding", referenciar Laravel 11 + React. Para regras de negócio do banco, consultar o arquivo [PLANO_MODERNIZACAO.md](../../../../local_53ed8571-864b-424d-b9c5-edafc2189671/outputs/PLANO_MODERNIZACAO.md) ou o equivalente em `C:\Users\roger\OneDrive\Documents\Claude\Projects\ONLINE FRANCO\PLANO_MODERNIZACAO.md`.
