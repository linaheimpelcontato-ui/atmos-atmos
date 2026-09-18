# Retomada do módulo financeiro — 2026-09-17

## Correções implementadas nesta retomada

- DRE transacional com base explícita de competência, vencimento ou caixa. Competência nunca é inferida de vencimento, pagamento, assinatura ou viagem.
- A tela de Lucro & Margem foi explicitamente rotulada como rentabilidade das propostas; ela não se apresenta mais como DRE contábil e não é misturada ao relatório transacional.
- Fluxo de caixa efetivo baseado apenas em lançamentos pagos e `paid_date`.
- Agrupamento de entradas e saídas por proposta, com uma linha explícita para lançamentos sem proposta/grupo.
- Erros de leitura do financeiro visíveis na interface; falhas de RLS ou schema não aparecem mais como listas vazias.
- Conta financeira e forma de pagamento no cadastro/edição de Receitas e Despesas.
- Vínculo opcional de custos operacionais ao fornecedor no editor de propostas.
- Tela `financeiro/conciliacao` para importar CSV/XLSX, sugerir vínculos por valor/data/conta e salvar a evidência sem baixar automaticamente o lançamento.

## Migrations pendentes de revisão/aplicação

- `20260913000000_proposal_cost_supplier_traceability.sql`
- `20260913010000_bank_reconciliation_lines.sql`

Nenhuma dessas migrations foi aplicada por este trabalho. O PRD está atrasado em relação à sequência de setembro e a auditoria remota confirmou tabelas/migrations ausentes. Publicar apenas o frontend antes de revisar e aplicar a sequência correta faria as telas novas acusarem coluna ou tabela inexistente.

## Regras preservadas

- A cortesia altera a distribuição entre pagantes, não reduz o total do grupo.
- Comissão de fornecedor é calculada sobre custo do fornecedor.
- O relatório de competência exclui lançamentos sem competência e mostra alerta; não inventa uma data.
- A conciliação é evidência e vínculo; não marca uma transação como paga automaticamente.
- Históricos sem fornecedor, NF, competência ou grupo permanecem identificáveis para preenchimento manual; não houve backfill inventado.

## Ainda depende de validação externa

- Plano de contas e estrutura contábil oficial para transformar o DRE gerencial em DRE de fechamento.
- Regra de competência e momento de geração/liquidação da comissão de vendedor.
- Modelo de grupo independente de proposta, se um grupo puder ter múltiplas propostas.
- Regras fiscais da reforma de 2026 e alíquotas oficiais.
- Homologação com migrations aplicadas, usuário admin real, dados reais de propostas/custos e formato de extrato bancário usado pela cliente.
