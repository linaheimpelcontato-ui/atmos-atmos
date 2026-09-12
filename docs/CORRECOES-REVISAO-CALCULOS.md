# Correções do parecer 0553fe5

## Implementação

1. Comissão de hospedagem é snapshot `room.commission_percent`; zero é preservado. Os três formatos JSON antigos são normalizados preservando esse campo. Novas modalidades copiam o percentual do catálogo ao serem incluídas. Registros antigos sem snapshot ficam sem percentual; não há reconstrução pelo catálogo atual. O editor exige confirmação explícita por modalidade (inclusive zero) antes de salvar hospedagem selecionada. O financeiro calcula apenas comissões documentadas e retorna `missingAccommodationCommissions` para indicar lacunas; os dashboards existentes ainda não exibem esse indicador e não devem ser tratados como resultado histórico completo enquanto houver lacunas.
2. Custo registrado zero tem prioridade sobre catálogo; somente null/undefined permite fallback. O checklist de hospedagem também preserva custo efetivo zero.
3. O editor exibe a média com hospedagem por pagante. R$2.000/18 é apresentado com rateio exato: 16 × R$111,11 + 2 × R$111,12, antes de impostos. Não atribui essas parcelas a pessoas específicas. Com cortesias e múltiplas modalidades, preço individual por modalidade é explicitamente pendente de definição; nenhum critério de subsídio cruzado é inventado.
4. Resumo, financeiro e payload do recebível usam `accommodationAmounts`: custos e receitas por linha monetária, comissão somada sem arredondamento intermediário e arredondada uma vez por hospedagem. Duas linhas de R$0,05 a 10% resultam em R$0,01.
5. `save_proposal_bundle` grava proposta, itens, custos, dias, hospedagens, sincronização de comissões e atualizações relacionadas em uma transação. Não ignora falhas; uma exceção reverte a operação inteira. Itens/custos/hospedagens preservam IDs; dias preservam ID por número do dia. Campos fora do formulário, como observação pública, horários, contrato e toggle de detalhamento, não são sobrescritos. A whitelist não depende de `show_price_breakdown` existir.

## Recebíveis e limites explícitos

- `financial_transactions.source_key` identifica a origem da comissão pela hospedagem. Índice único por proposta/origem impede duplicação. Salvar mantém IDs e dados de liquidação existentes.
- Pendentes/vencidos podem atualizar valor/data; removidos ficam cancelados, preservando histórico. Recebíveis pagos não são recriados. Alterar o valor ou remover uma origem liquidada bloqueia a gravação inteira, exigindo ajuste financeiro explícito.
- Recebíveis legados identificados apenas por texto não têm origem segura. A RPC os mantém intactos e suspende a sincronização automática de comissões daquela proposta, retornando aviso de necessidade de mapeamento manual. Não associa por nome nem duplica cobranças. A proposta pode ser salva; o financeiro precisa reconciliar esses lançamentos antes de considerar o saldo sincronizado.
- IDs das entidades removidas explicitamente pelo editor são removidos das tabelas de composição; registros mantidos recebem upsert, não delete/reinsert. Não existe nova exclusão de lançamento financeiro.
- A transação serializa gravações por proposta, mas não implementa controle de versão otimista contra duas telas antigas sobrescrevendo campos comuns. Esse caso permanece no backlog.

## Migração e validação

Aplicar `supabase/migrations/20260911224000_atomic_proposal_bundle.sql` antes do frontend. Ela adiciona `source_key`, índice único e RPC administrativa SECURITY INVOKER, mantendo RLS. Não foi aplicada em produção.

**MIGRAÇÃO E TESTES SQL NÃO EXECUTADOS.** O banco local não ficou disponível: falta de espaço e falha de I/O no pull Docker, reportadas pelo coordenador. Nenhum outro banco foi iniciado. A entrega depende de revisão estática e validação posterior em PostgreSQL local/homologação.

`supabase/tests/atomic_proposal_bundle.sql` contém fixtures em BEGIN/ROLLBACK para custo zero, alteração posterior de catálogo, snapshot, comissão de centavos, retry sem duplicação, recebível pago, rollback após erro de item/alteração de liquidado, preservação de IDs/horários/observação/toggle público e rejeição de usuário não administrador. Executar com `psql -v ON_ERROR_STOP=1 -f ...` apenas em banco descartável com baseline e migrações aplicados.

Os testes Vitest cobrem os três formatos, ida/volta do JSON, zero e ausência, mudança de catálogo, resumo/financeiro/recebível e distribuição exata dos centavos. Não substituem a execução SQL nem teste de interface contra o banco.
