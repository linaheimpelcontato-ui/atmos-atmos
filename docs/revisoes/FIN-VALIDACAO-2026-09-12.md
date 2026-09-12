# Validação financeira — 12/09/2026

## Parecer final

**Implementados e aprovados nos testes do escopo: precisão decimal dos helpers/etapas corrigidas, bloqueio financeiro da edição em massa, FIN-01, FIN-09 e FIN-12.** Não foi encontrada regressão bloqueadora nesses comportamentos. **Isso não significa paridade decimal de todo o editor, aprovação contábil ou homologação ponta a ponta em produção.** Há uma divergência residual reproduzida em consumidores antigos que multiplicam antes de chamar `money`, detalhada abaixo.

Revisão por leitura e reexecução dos testes, com comparação adicional contra um oráculo independente (`decimal.Decimal` do Python). O executor desta revisão é o mesmo autor do lote anterior; a independência aqui é do método de comparação, não um parecer de terceiro. HEAD observado: `a88180b`, com alterações não commitadas e trabalho simultâneo de outros agentes. O parecer refere-se aos arquivos examinados nesta rodada, não a um release imutável.

Único arquivo escrito no repositório nesta revisão: este documento. Não foram editados código, testes, `AdminFinanceReceitas`, editor, `ProposalPublic`, SQL ou funções edge. Não houve instalação, acesso a banco, envio real, commit ou deploy. FIN-03, FIN-21 e FIN-22 não fazem parte desta aprovação.

## Resultado por frente

| Frente | Resultado | Evidência e limites |
| --- | --- | --- |
| Precisão decimal | Aprovada no escopo corrigido | `proposalCalcs.ts` usa frações `BigInt` sobre a representação decimal dos números enviados em JSON, arredondando empates para longe de zero. `lineTotal`, `moneyProduct`, comissões, desconto e divisão do imposto mantêm os operandos separados até a fronteira monetária. Não há nova dependência. |
| Edição em massa financeira | Aprovada | `AdminProposals.tsx` não oferece desconto percentual/fixo ou imposto; o handler aplica allowlist antes de escrever. Testes exercitam chamadas diretas com campos proibidos, atualização permitida, seleção vazia e erro do banco. |
| FIN-01 | Implementado e validado | `proposalStatus.ts` centraliza somente `approved` e o legado `accepted`. Filtros de KPIs, evolução, relatórios, dashboards B2B/B2C, metas e calendário usam helper/constante. Aprovação comercial não equivale a pagamento. |
| FIN-09 | Implementado e validado | Ausência de comissão propaga `resultIncomplete` da proposta para totais, meses e ranking por guia. Os dois painéis mostram aviso e lucro parcial; as linhas de proposta/guia preservam a sinalização. Comissão zero é dado conhecido. |
| FIN-12 | Implementado e validado | `calcCashForecast` inclui somente obrigações `pending`/`overdue`; vencidos em qualquer período anterior entram uma vez na semana 1. Futuras, inclusive rotuladas `overdue`, permanecem na semana da data de vencimento. `paid`, cancelados e outros status são excluídos. |

## Precisão: comprovação e fronteira

Caso da revisão original:

- Subtotal **R$ 100,75**, desconto **10%**, sem extras/imposto.
- Desconto **R$ 10,08**, base e total **R$ 90,67**.
- O financeiro também usa o mesmo desconto e preserva esse resultado no cenário testado.

Reexecutados testes de empates positivos/negativos, subcentavos unitários, notação científica, desconto fixo combinado, comissões de fornecedor/vendedor, imposto por dentro, rejeição de valores inválidos e rateio. A suíte inclui varredura de **20.000 subtotais em centavos**, com referência inteira independente para desconto de 10%.

Verificação adicional desta rodada: **1.001 casos** comparados contra `Python decimal` com `ROUND_HALF_UP`, seed `20260912` (1.000 combinações determinísticas de subtotal, serviço, hospedagem, desconto e imposto, mais o caso de R$ 100,75). Comparadas todas as saídas: desconto, pós-desconto, base, total e imposto. **Zero divergências.** Esse oráculo verifica a aritmética decimal e a ordem comercial das etapas, sem reexecutar SQL. O resultado SQL de R$ 10,08/R$ 90,67 continua sustentado pela revisão anterior e pela leitura da função SQL, não por nova consulta ao banco nesta rodada.

### Pendência P2 — cálculos anteriores ao helper ainda podem divergir

Reprodução executada nesta revisão:

```text
0.145 * 3                  = 0.43499999999999994
money(0.145 * 3)           = 0.43
moneyProduct(0.145, 3)     = 0.44
```

Há consumidores com esse formato em `ProposalFormDialog.tsx:1409`, `ProposalAccommodationsSection.tsx:76` e `accommodationCalcs.ts:27`. As comissões agregadas de hospedagem também fazem operações binárias antes de `money` em `accommodationCalcs.ts:32`. O helper não consegue reconstruir o valor decimal original depois de receber um resultado binário já alterado. Esses consumidores estavam fora do escopo autorizado da correção anterior e não foram modificados nesta revisão somente leitura.

**Próxima ação:** migrar esses pontos para operações com operandos separados, preservando as fronteiras de arredondamento da regra existente, e acrescentar regressões específicas antes de afirmar paridade de toda a composição/editor com SQL. A correção do caso de desconto da revisão está concluída; a generalização para todos os consumidores permanece pendente.

## FIN-01: consumidores e semântica

Confirmados por inspeção:

- `financeCalcs.ts`: seleção das propostas/itens e evolução mensal, usados por Dashboard Financeiro e Lucro & Margem.
- `AdminFinanceReports.tsx`, `AdminReports.tsx`, `AdminDashboardB2B.tsx`, `AdminDashboardB2C.tsx`, `AdminGoals.tsx` e as duas consultas de roteiros de `AdminCalendar.tsx`.
- Funil de `AdminDashboard.tsx`, alertas de `AdminProposals.tsx` e histórico de `ProspectDetailDialog.tsx`.
- Em `AdminFinanceReceitas.tsx`, apenas a leitura do filtro de propostas não vinculadas foi conferida; usa o helper. **A frente FIN-03 em edição por Claude não foi revisada nem aprovada aqui.**

A busca não encontrou filtro administrativo de propostas ainda exclusivo de `accepted`. Chaves internas chamadas `accepted` continuam existindo por compatibilidade, mas contêm os dois status válidos. O status de reuniões não foi confundido com o de propostas.

Schema conferido no snapshot `scratch/remote-audit/prd-schema-before.sql:955`: `proposals.status` é `text NOT NULL DEFAULT 'draft'`, sem enum/CHECK de valores. A migration original também usa `text` e cita `accepted` em comentário. Não foi feita nova consulta ao banco nem afirmada a existência de registros legados atuais.

Os testes incluem proposta aprovada com pagamento pendente no indicador comercial, excluem rascunho mesmo com `payment_status=paid` e verificam que o caixa realizado inclui somente transações `paid`.

## FIN-09: comissões ausentes não ficam ocultas na agregação

Cobertura confirmada:

1. `undefined` e `null` marcam o resultado individual como incompleto.
2. `calcOverviewKPIs` acumula quantidade de propostas afetadas e comissões ausentes.
3. `calcMonthlyEvolution` leva a sinalização ao mês histórico, inclusive quando o mês contém uma proposta fora do intervalo exato dos KPIs. O painel considera também a série mensal para decidir se exibe aviso.
4. `calcGuideRanking` marca a linha do guia; dois itens do mesmo guia/proposta não duplicam a contagem da proposta incompleta.
5. Testes de UI conferem aviso consolidado em ambos os painéis e avisos nas linhas de proposta e guia.
6. Comissão explícita de zero não dispara aviso; hospedagem não selecionada, indisponível ou com zero unidades é ignorada.
7. A exportação consolidada fica desabilitada quando o resultado/histórico é incompleto: o exportador atual não transporta o aviso. Testes conferem bloqueio e liberação quando a comissão zero é registrada.

Os valores parciais continuam visíveis; ausência de aviso significa apenas ausência dessa lacuna específica, não lucro auditado, completude geral de custos ou prova de recebimento. Os testes de UI usam DOM/mocks; não constituem inspeção visual no portal. As séries mensais continuam calculadas por meses inteiros, comportamento anterior ao lote.

## FIN-12: previsão e vencidos

A previsão mantém quatro semanas de calendário iniciadas na segunda-feira. A primeira pode ser parcial. Entradas são `receivable`/`commission_in`; saídas são `payable`/`commission_out`. As somas usam `moneySum`.

A fixture monetária aprovada resulta em:

| Semana | Entradas | Saídas |
| --- | ---: | ---: |
| 1 | R$ 111,05 | R$ 27,05 |
| 2 | R$ 30,00 | R$ 3,00 |
| 3 | R$ 4,00 | R$ 0,00 |
| 4 | R$ 0,00 | R$ 6,00 |

Ela cobre atraso desde o ano anterior, `pending` vencido, `overdue`, vencimento hoje, domingo/segunda, comissões, centavos, data futura `overdue` e limite de quatro semanas. Há testes negativos para `paid`, `cancelled`, `canceled`, `approved`, `accepted`, status/tipo desconhecido e ausência de data. Teste adicional cobre virada de ano. Cada obrigação aparece em uma única semana.

Leitura do consumidor `AdminFinanceFluxoCaixa.tsx:31`: ele passa todas as transações para `calcCashForecast`, sem filtro anterior que elimine vencidas. **Limites de integração:** a memoização depende apenas de `transactions`; uma aba mantida aberta durante a mudança de dia/semana precisa de nova carga/atualização para recalcular. Os cartões separados de 30 dias continuam sendo métricas diferentes da previsão semanal e não foram alterados neste lote. Nenhuma regra de competência, tributação ou plano de contas foi introduzida.

## Execuções desta revisão

- `npx vitest run src/lib/proposalCalcs.test.ts src/lib/proposalStatus.test.ts src/pages/admin/finance/financeCalcs.test.ts src/pages/admin/AdminFinanceCompleteness.test.tsx src/pages/admin/AdminProposals.test.tsx`: **99 testes em 5 arquivos aprovados**.
- Distribuição: cálculos de proposta 46; status 19; cálculos financeiros/FIN-09/FIN-12 18; UI de incompletude 5; edição em massa 11.
- `npx tsc -p tsconfig.app.json --noEmit`: aprovado no estado observado do workspace.
- `git diff --check` nos arquivos do lote financeiro: aprovado.
- Oráculo decimal: 1.001 casos aprovados; exemplo residual confirmado.

Logs temporários da execução: `/tmp/atmos-fin-validation-tests.log`, `/tmp/atmos-fin-validation-types.log` e `/tmp/atmos-fin-decimal-oracle.json`. Os resultados relevantes estão registrados neste documento para não depender da retenção dos arquivos temporários. A suíte global não foi reexecutada nesta rodada, para manter a validação centrada na frente financeira enquanto outras frentes estão em edição.

## Pendências para integração

- Corrigir os consumidores que calculam em ponto flutuante antes de `money` se o objetivo for paridade decimal integral da proposta/hospedagem.
- QA visual no portal para os avisos, ranking/histórico, exportação bloqueada e previsão com vencidos reais de homologação; nenhuma ação real foi realizada nesta revisão.
- Revalidar após integração dos trabalhos paralelos; esta aprovação não cobre alterações posteriores no workspace.
- FIN-21/FIN-22: **aguardar conclusão de Claude antes de iniciar revisão**, conforme solicitação. Nenhum parecer sobre esses itens foi emitido aqui.

## Adendo de integração do Codex — precisão residual corrigida

A pendência P2 acima foi corrigida após esta revisão: serviço ATMOS e comissão do vendedor no formulário, linhas de hospedagem e suas comissões agora mantêm os operandos decimais separados. `moneySumProducts` soma produtos sem arredondamento intermediário; a comissão continua arredondada uma vez por hospedagem, preservando a regra histórica. Totais de linhas e agregados usam somas monetárias.

Validação adicional: 74 testes de cálculos/hospedagem/financeiro e TypeScript passaram. SQL real em `atmos_prd_rehearsal` confirmou 0,145 × 3 = 0,44 tanto para serviço quanto hospedagem. Pela interface, o formulário também exibiu 0,44 para o serviço com três pessoas; salvamento conferido no banco local. Não foi alterada regra comercial de imposto, desconto ou rateio de quartos.

## Adendo de revisão independente do Executor — precisão residual do root

Revisão somente leitura do código/testes, após o adendo de integração acima. Única edição desta rodada: este documento. Não foram alterados `proposalCalcs`, `accommodationCalcs`, seus testes, `ProposalAccommodationsSection`, `ProposalFormDialog` nem a frente roles/migration 24.

**Parecer: correções revisadas aprovadas; arredondamento único da comissão por hospedagem preservado. Há um residual adicional preexistente nos custos operacionais, descrito abaixo.** A afirmação de paridade não deve ser ampliada para todo cálculo monetário do formulário.

### Regras e fronteiras conferidas

- `moneySumProducts` mantém produtos e soma como frações decimais exatas e arredonda somente o resultado. Em `accommodationAmounts`, cada custo/receita de linha continua sendo arredondado em centavos primeiro; a comissão usa esse custo de linha como base, soma as parcelas sem arredondá-las e arredonda uma vez por hospedagem.
- Exemplo conferido: custo 1,45 a 30% mais custo 0,05 a 10% resulta em 0,435 + 0,005 = **0,44**. Arredondar cada comissão de quarto antes produziria 0,45; o código atual não faz isso. Ao agregar hospedagens, são somadas suas comissões já fechadas em centavos, preservando a fronteira por hospedagem.
- Foram mantidos: filtros de quartos disponíveis/unidades positivas, multiplicação por capacidade somente em `per_person`, seleção de hospedagens e divisão entre pagamento Atmos/direto à hospedagem. Comissão ausente continua identificada; zero explícito continua válido e não há consulta ao percentual atual do catálogo.
- Serviço continua calculado sobre o grupo completo × dias. Comissão do vendedor continua sobre `totalCharged`, usando o mesmo percentual. Desconto permanece nos itens, serviço/hospedagem Atmos são somados depois, imposto continua por dentro e cortesias continuam afetando o rateio. Nenhuma dessas regras comerciais foi alterada nos diffs revisados.
- Somas alteradas no formulário e nos agregados de hospedagem recebem valores já fechados em centavos. `moneySum` elimina erro binário sem introduzir uma nova fronteira de arredondamento nesses pontos.
- `step="any"` foi aplicado ao serviço por pessoa/dia e custo/venda unitários de hospedagem. Isso permite informar operandos fracionários como 0,145; total monetário permanece arredondado após multiplicar. A legenda do serviço passou a mostrar as casas informadas. Não altera percentuais, ocupação, tributação ou distribuição de quartos.

### Validação repetida nesta revisão

```sh
npx vitest run src/lib/proposalCalcs.test.ts src/lib/accommodationCalcs.test.ts src/pages/admin/finance/financeCalcs.test.ts
# 74 testes / 3 arquivos aprovados, 12/09/2026 às 17:40:38.
```

A cobertura inclui os dois modos de preço com 0,145 × 3, soma de comissões antes de arredondar, consistência de comissão entre resumo/financeiro, dados históricos ausentes/zero, desconto/imposto e rateio. O teste que chama a variável `receiptAmount` calcula via helper; não representa uma integração de recebível real.

Também executei os helpers reais transpilados em memória e SELECTs numéricos PostgreSQL no clone descartável `atmos_clicksign_test`, sem gravar dados: serviço 0,145 × 3 = **0,44**; comissão conjunta do exemplo = **0,44**. A evidência UI/salvamento em homologação mencionada pelo root no adendo anterior é atribuída ao root e não foi repetida nesta revisão. Não reexecutei TypeScript nesta rodada; o resultado anterior permanece atribuído à execução de integração.

### P2 adicional — multiplicação de custos operacionais (resolvido na revisão final abaixo)

Em `ProposalFormDialog.tsx:3076` e `:3080`, os handlers continuam montando `amount` com `dias * unit_amount`; `:1585` encaminha esse `amount` ao payload. As somas de custos internos/operacionais (`:1495`, `:1525`) também permanecem com `+`. Esses trechos são preexistentes, fora das mudanças residuais aprovadas.

Exemplo alcançável pelos inputs atuais (`dias` aceita 1,5 e valor/dia aceita 0,29):

- JS `1.5 * 0.29` produz `0.43499999999999994`.
- `moneySum` recebendo esse resultado produz **0,43**; não pode recuperar os operandos originais.
- `moneyProduct(1.5, 0.29)` e PostgreSQL `round(1.5::numeric * 0.29, 2)` produzem **0,44**.
- PostgreSQL arredondando o número já degradado recebido no JSON também produz **0,43**.

Isso mantém risco de centavo no custo/profit e no valor de custo encaminhado para salvar. Foi reproduzido por cálculo/SELECT e rastreamento do payload; não foi feito novo salvamento UI de custos. Correção futura deve definir/preservar a fronteira existente por custo, passar operandos separados e somar valores monetários exatos. Nenhuma correção foi aplicada nesta revisão, conforme escopo somente leitura.


## Encerramento do P2 operacional — revisão dos últimos deltas

**RESOLVIDO. Deltas aprovados para integração/commit pelo root.** Revisão somente leitura do código; nenhuma edição de implementação ou commit executado pelo Executor.

Conferidos em `ProposalFormDialog.tsx`: os dois handlers de custo agora usam `moneyProduct(d, unit_amount)` / `moneyProduct(days || 1, ua)`, fechando o custo em centavos após a multiplicação decimal exata. `totalCosts` usa `moneySum(...costItems.map(c => c.amount))`. O payload continua encaminhando `c.amount`, agora corretamente calculado nesses handlers. O caso reportado de 1,5 dia × 0,29 está corrigido.

Nos deltas de apresentação do formulário e da seção de hospedagem, os valores monetários antes exibidos com `toFixed(0)` passaram a `toFixed(2)`. Percentuais dos gráficos e margem conservaram suas casas anteriores; não foram alteradas taxas ou fórmulas. A regra de comissão arredondada uma vez por hospedagem permanece como aprovada na revisão anterior.

Verificação adicional com os helpers reais transpilados em memória: `moneyProduct(1.5, 0.29) = 0.44`, `moneyProduct(0.145, 3) = 0.44`, soma de custo 0,44 + 0,01 = 0,45, soma de lista vazia = 0. `git diff --check` dos dois arquivos passou. Os 74 testes da rodada anterior não foram repetidos nesta conferência limitada aos handlers e à formatação. O root informou teste UI real com serviço e custo salvos em 0,44; essa evidência é atribuída ao root, sem nova operação de UI/banco pelo Executor.

Este encerramento cobre o P2 reproduzido nos custos operacionais e os últimos deltas solicitados. A soma legada de `atmosService.internal_costs` não foi alterada nesse lote; não se estende o parecer a toda aritmética histórica do formulário nem se recalculam registros antigos.
