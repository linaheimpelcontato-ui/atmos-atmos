# Rastreabilidade dos lançamentos manuais

## Entrega

Receitas e Despesas permitem criar, carregar, editar, limpar, visualizar na listagem e exportar em XLSX os vínculos e dados do documento. O vínculo usa `financial_transactions.proposal_id`; a seleção identifica a proposta por código e título (grupo). Saídas também selecionam `supplier_id`, inclusive fornecedores inativos para preservar acesso aos registros históricos. Comissões de vendedores podem permanecer sem fornecedor. NF é texto, preservando zeros à esquerda; competência é data independente de vencimento e pagamento. Nenhum valor é inferido.

A exportação existente ocorre pela seleção de linhas e inclui IDs e nomes dos vínculos, NF e competência. Campos vazios continuam vazios. O vínculo de um fornecedor indisponível não é silenciosamente removido ao abrir/editar.

## Dependência de implantação

Aplicar, após revisão e no ambiente escolhido pelo coordenador, `supabase/migrations/20260911223000_financial_transaction_traceability.sql` ANTES de disponibilizar o frontend. Esta tarefa NÃO aplicou a migração em nenhum banco. Sem ela, salvar retorna erro de coluna inexistente; o formulário permanece aberto e informa o erro. A consulta de dados também informa falhas, em vez de substituir os registros por uma lista vazia.

A migração acrescenta apenas `supplier_id` (FK), `invoice_number` (text) e `competence_date` (date), todos nullable, e índices de fornecedor/competência. Mantém o RLS administrativo existente. A FK de fornecedor usa ON DELETE RESTRICT para impedir a perda silenciosa do vínculo; desativar o fornecedor preserva seu histórico. Não altera a FK já existente de propostas (ON DELETE SET NULL).

## Dados e definições ainda necessários

- Não existe entidade independente de grupo nas migrações inspecionadas: o centro de referência nesta entrega é a proposta. Um grupo com múltiplas propostas requer modelo e vínculo próprios em outra frente.
- Registros antigos precisam de associação manual à proposta/fornecedor e preenchimento de NF/competência a partir de documentos reais. Não houve backfill.
- A equipe deve informar a competência correta. Não há regra que a derive do vencimento, pagamento, assinatura ou data da viagem.
- Não há validação fiscal, emissão de NF, DRE ou conciliação nesta entrega. A NF não tem unicidade global: documentos de emissores distintos e parcelas podem compartilhar número.
- A migração não foi executada localmente ou em produção. Testes cobrem hidratação/payload, edição/limpeza e ida/volta XLSX em memória; ainda é necessário smoke test de CRUD contra banco de homologação com a migração aplicada.

## Backlog — aceite e lançamentos duplicados

Evidência da base desta worktree, antes das alterações da frente de privacidade:

1. `supabase/functions/approve-proposal/index.ts` lê status e atualiza por ID em operações separadas. Duas requisições simultâneas podem ler `sent`, ambas atualizar para `approved` e inserir duas interações de aprovação. Uma falha ao inserir interação é ignorada. Coordenar com a frente responsável por approve-proposal: transição condicional atômica, idempotência e registro do evento na mesma transação. Testar duas chamadas simultâneas e repetição após timeout. Não afirmar que já duplica cobranças: a função inspecionada não gera recebíveis diretamente.
2. `AdminFinanceReceitas.tsx` calcula propostas sem lançamento apenas a partir dos recebíveis visíveis no filtro atual (datas/status). Um recebível existente fora do filtro deixa a proposta aparecer novamente como disponível para lançar. `handleGenerateFromProposal` faz insert sem chave de idempotência; cliques/requisições concorrentes também podem duplicar. Não usar UNIQUE(proposal_id), pois parcelas e receitas extras legítimas compartilham proposta. Definir origem/tipo/parcela ou chave de operação e proteção transacional; conferir existência independentemente do filtro visual.
3. O aceite usa `approved`, enquanto a sugestão de receita procura `accepted`. Confirmar a máquina de estados e o marco operacional correto; não promover status nem gerar cobranças automaticamente nesta entrega.

Esses itens foram documentados, não implementados. A frente de privacidade está responsável por approve-proposal.
