# Portal guia — contrato e validação

Base: codex/atmos-stabilization, 74c9190. Integração depende da migration
`20260912010000_guide_portal.sql`, incremental e NÃO aplicada.
Fixture `supabase/tests/guide_portal.sql`: SQL NÃO EXECUTADO. Sem banco, build ou pull.

- A autorização deriva exclusivamente de `guides.user_id = auth.uid()`. Nenhum vínculo por e-mail ou role `guide`. Vínculos múltiplos falham com pedido de reconciliação; ausência não autoriza acesso aos roteiros.
- RPCs de contexto e roteiros são SECURITY DEFINER, autenticadas, com projeção explícita. Não abrem SELECT de guides/proposals. Admin sem vínculo precisa selecionar UUID real no controle de prévia; usuário comum não pode usar o parâmetro de prévia.
- Atribuição é `proposals.guide_id`. Linhas de catálogo com nome de guia não criam atribuição. Estados disponibilizados: approved, accepted, negotiating e sent (os três estados existentes da agenda mais accepted do schema). Draft/rejected não entram. Status mostrado é da proposta, nunca confirmação do guia.
- Projeção inclui apenas identificador/código, status, datas, número de pessoas e nome/categoria/horários dos itens por dia. Sem título de proposta, cliente, notas, descrição livre, valores, custos, margens ou comissão. Nomes dos itens continuam sendo textos operacionais cadastrados: equipe deve evitar inserir informação pessoal nesses nomes.
- Dashboard conta datas encerradas, em andamento/futuras e indefinidas; não presume execução, pagamento ou remuneração. Foram retiradas as métricas que convertiam custos internos da proposta em receita do guia.
- Aceite, recusa e bloqueio de datas desabilitados com mensagem honesta. Faltam contrato de resposta por guia/proposta, transições, cancelamento e política de disponibilidade; nenhum envio externo ocorre.
- Custos pessoais permanecem na tabela existente, separados da projeção. Políticas usam helper autenticado que valida conta E atribuição, sem abrir guides. Guide não pode mover custo para proposta alheia; admin mantém suas permissões existentes. Prévia administrativa não carrega nem altera custos pessoais.
- Após reatribuição de proposta, o guia anterior perde acesso aos custos daquele roteiro; os registros permanecem, acessíveis ao admin. Histórico pessoal entre reatribuições requer contrato separado.
- Perfil e tabela de preços já dependiam de RLS exclusiva para admin. Autoatendimento dessas áreas permanece indisponível, agora com mensagem explícita, em vez de falha silenciosa; nenhuma política ampla foi adicionada. Admin vinculado pode continuar usando permissões existentes fora da prévia. Liberação de edição própria requer definição de campos permitidos e RPC específica em outro lote.

Validação executada: Vitest direcionado aos helpers e guard (26 testes): ponto/vírgula decimal, formato BR com milhares, rejeição de ambiguidade/zero/negativos/inválidos, datas sem conversão UTC, roteiro em andamento, autenticação por RPC, logout, falha fechada, admin sem ID fictício e bloqueio de preview inválido antes do SQL. Renderização da agenda verifica ações desabilitadas, horários reais e ausência de consulta de custos na prévia.

Fixture a executar em banco descartável com migrations: usuário authenticated guia A/B, conta sem vínculo, admin com/sem prévia explícita, role anon real, projeção mínima com itinerário/horários, ausência de SELECT guides, isolamento de custos, preservação 123.45 e tentativa de reatribuição. Transação termina em ROLLBACK. Testes unitários não comprovam instalação, sintaxe nem RLS em PostgreSQL; revisão estática e execução local seguem pendentes.

Worktree esparsa exclui public/ e src/assets por falta de disco; node_modules é link para checkout principal. Nenhum arquivo do usuário ou volume Docker foi removido.
