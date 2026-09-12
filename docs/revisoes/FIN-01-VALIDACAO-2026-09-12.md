# FIN-01 — aprovação comercial nos indicadores administrativos

Correção local sem commit, SQL, edge functions, instalação ou atualização de registros.

## Schema conferido antes da alteração

- `scratch/remote-audit/prd-schema-before.sql:955`: `public.proposals.status` é `text NOT NULL DEFAULT 'draft'`; a definição da tabela e seus `ALTER TABLE ... ADD CONSTRAINT` não incluem enum ou CHECK de status.
- `supabase/migrations/20260307013826_35da92f9-ab80-4913-9356-a9477f9bdda5.sql:43`: coluna text sem CHECK; o comentário histórico cita `accepted`. A busca na cadeia de migrations não encontrou restrição posterior de valores dessa coluna.
- `supabase/functions/approve-proposal/index.ts:94`: o produtor atual grava `approved`.
- Esta confirmação usa o snapshot de PRD e a cadeia local, sem nova consulta ao banco ou afirmação de que há registros `accepted` no banco atual. A leitura tolera registros legados caso existam.

## Alterações

`src/lib/proposalStatus.ts` centraliza `isApprovedProposalStatus` e `APPROVED_PROPOSAL_STATUSES`: somente `approved` e `accepted` significam aprovação comercial. A constante também é usada nos filtros `.in()` do Supabase.

Consumidores do FIN-01 atualizados:

- `src/pages/admin/finance/financeCalcs.ts`: seleção por período/segmento, itens vinculados e evolução mensal; atende Dashboard Financeiro e Lucro & Margem.
- `AdminFinanceReceitas.tsx`: propostas aprovadas disponíveis para vínculo/geração de recebíveis.
- `AdminFinanceReports.tsx` e `AdminReports.tsx`: totais comerciais, rankings e conversão.
- `AdminDashboardB2B.tsx` e `AdminDashboardB2C.tsx`: KPIs, evolução, fontes, vendedores, recorrência e sazonalidade.
- `AdminGoals.tsx`: consulta dos totais aprovados; chave de cache atualizada.
- `AdminCalendar.tsx`: ambas as consultas de roteiros e rótulo de status.

Outros leitores administrativos encontrados na busca também foram corrigidos: funil do `AdminDashboard.tsx`, histórico do `ProspectDetailDialog.tsx` e alertas do `AdminProposals.tsx`. `closed` deixa de ser tratado como aprovação no funil geral: não é um status de aprovação do fluxo atual. O status `accepted` de reuniões não foi alterado.

Rótulos principais dos painéis e histórico passam a identificar **valor aprovado**. Dashboard Financeiro e Lucro & Margem esclarecem que aprovação não comprova recebimento. Não houve alteração de status de pagamento, geração automática de recebíveis ou alteração dos filtros `paid` do caixa. O nome interno `FilteredData.accepted` foi mantido para compatibilidade, mas contém ambos os status de aprovação.

## Validação

- `npx tsc -p tsconfig.app.json --noEmit`: aprovado.
- `npm test`: **238 testes em 32 arquivos aprovados** (inclui os testes do lote anterior de precisão/edição em massa).
- `src/lib/proposalStatus.test.ts`: positivos para status atual e legado; negativos para rascunho, enviado, negociação, rejeição, expiração, cancelamento, fechamento, pagamento, assinatura, valores desconhecidos e ausentes.
- `src/pages/admin/finance/financeCalcs.test.ts`: KPIs e evolução mensal incluem `approved` e `accepted`, mantêm filtros de data/segmento e itens vinculados. Proposta aprovada com pagamento pendente entra no indicador comercial; rascunho com pagamento marcado como pago não entra. Caixa inclui apenas transações `paid`, excluindo `pending`, `approved` e `accepted`.
- Busca final nos consumidores administrativos: nenhum filtro de propostas permanece exclusivo de `accepted`.
- `git diff --check`: aprovado após remoção de espaço final na linha alterada.

Aprovação real pela interface e conferência dos KPIs no portal permanecem com o responsável pela QA visual. Não foi acionado o fluxo de aprovação nem enviado contrato ou mensagem real nesta correção.
