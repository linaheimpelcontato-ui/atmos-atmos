# Revisão do portal de guias

## Decisão

**Aprovado por inspeção o commit cb906a680afeafd06f127366131ebc6846f6b68c, com dependência da entrega de privacidade e da validação SQL isolada.** Não identifiquei bloqueador novo no delta. Worktree /Users/gustavosextaro/Projects/atmos-guias limpa, esparsa, baseada no principal até 74c9190.

Conferidos os 12 arquivos do commit, policies legadas, consumidores de perfil/preços preservados, configuração de cache e troca de sessão. Não executei banco, build, migration nem testes. Os 26 testes aprovados são informação do Executor; examinei sua cobertura. git diff --check cb906a6^ cb906a6 passou. Nenhum código editado; somente este parecer foi gravado.

## Autorização e projeção

- get_guide_portal_context exige auth.uid e resolve guides.user_id. Remove a dependência do enum guide inexistente e não presume vínculo por email.
- Prévia exige admin e UUID existente. Admin sem vínculo mantém guide_id null até selecionar guia real; não há identidade fictícia consultada no banco.
- get_guide_portal_proposals chama o mesmo contexto e limita por proposals.guide_id. Retorna identificação/código, status, datas, pessoas e itens operacionais com dia/nome/categoria/horários. Não retorna título/cliente/notas/descriptions, custos, venda ou comissão.
- ACL das duas RPCs e do helper revoga PUBLIC/anon e concede authenticated. SECURITY DEFINER e search_path definidos; relações consultadas são qualificadas. Não é criado SELECT público de guides ou proposals.
- Status permitidos approved/accepted/negotiating/sent são apresentados como status da proposta, não aceite do guia. As contagens por datas não afirmam execução ou remuneração. Ações simuladas foram desabilitadas com explicação explícita.

## Políticas legadas de guide_trip_costs

A migration 20260326000000 cria quatro policies: Guides and admins can view/insert/update/delete guide trip costs. A migration nova remove exatamente as quatro. Não encontrei outra policy dessa tabela nas migrations do commit.

O helper is_own_guide_assignment exige simultaneamente g.user_id=auth.uid(), g.id=p_guide_id e p.guide_id=g.id, p.id=p_proposal_id. Isso evita depender de SELECT guides sob RLS administrativa e impede guia inserir custo com seu ID em proposta atribuída a outro.

SELECT/DELETE e USING de UPDATE checam a associação. INSERT e WITH CHECK de UPDATE repetem a associação para o registro novo, além de valor positivo, teto, centavos e descrição de 1–500 caracteres. Portanto UPDATE não pode transferir um custo para proposta alheia. Admin conserva exceção administrativa existente. Não há GRANT amplo novo nem exclusão de registros históricos pela migration.

parseGuideAmount rejeita zero, negativos, notação exponencial, mais de duas casas e formatos ambíguos; aceita decimal com ponto/vírgula e milhares BR explícitos. UI mostra falha de insert; delete verifica erro e presença de linha retornada. Prévia administrativa não consulta nem altera custos pessoais.

## Sessão, cache e superfícies preservadas

As chaves novas de contexto incluem user.id e preview; roteiros incluem usuário, guia e preview; custos incluem usuário, guia e proposta. No logout, context é suprimido mesmo com cache anterior. Usuário diferente recebe chave diferente, sem placeholderData reaproveitando dados do anterior. PersonalCosts recebe key composta que desmonta seu estado local na troca de usuário/guia/proposta. Esses mecanismos evitam o reaproveitamento direto entre contas no fluxo normal.

O teste de guard cobre logout e erro inicial, mas não cobre respostas fora de ordem, troca A→B com cache preenchido ou revogação durante sessão. Não há remoção explícita do cache ao logout em AuthContext; dados anteriores ficam em memória até coleta. Reentrada da mesma identidade pode reutilizar dados enquanto revalida. useIsGuide pode continuar true com data antiga após erro de refetch; GuideLayout bloqueia quando error está presente, mas o link de navegação pode ficar visível. Não equivale a bypass de RPC/RLS; ampliar testes e limpeza caso o contrato exija descarte imediato de cache.

Perfil/preços ficam bloqueados no layout para guia comum, preview ou admin sem guia vinculado. Admin com vínculo e fora da prévia mantém os fluxos existentes, sob RLS administrativa. Queries antigas de perfil/preços usam cache por guideId sem userId, e conservam tratamentos incompletos de erro; não declarar esses editores saneados por este commit. O novo bloqueio impede expor esses componentes ao guia comum.

## Dependência obrigatória de privacidade

Esta base ainda contém as policies públicas amplas de propostas do histórico anterior. As RPCs mínimas, sozinhas, não impedem SELECT direto por outro caminho. A aprovação do portal pressupõe integrar a revogação na entrega de Claude antes de declarar isolamento de ponta a ponta. Não duplicar a migração de privacidade neste lote nem reabrir tabelas para fazer o portal funcionar.

Fixture de guia verifica SELECT guides vazio, mas não comprova SELECT direto de proposals/proposal_day_items vazio após a integração. Incluir essa checagem no conjunto integrado com privacidade para guia comum, além dos cenários de proprietário autenticado tratados por Claude.

## Limites e critérios adicionais de homologação

1. Rodar migrations/fixtures em PostgreSQL descartável e conferir ACL/RLS efetivas. A fixture já usa roles reais authenticated e anon, perfis guia A/B, conta sem vínculo e admin, whitelist de campos, centavos e tentativa de reatribuição alheia. Não foi executada nesta revisão.
2. Complementar SQL com valor negativo/zero/excesso de casas, descrição inválida, inserção alheia, update/delete próprios e alheios, vínculo removido e proposta reatribuída. O caso de UPDATE alheio existente não cobre toda a matriz de CRUD.
3. get_guide_portal_context rejeita múltiplos guides ligados à conta, mas is_own_guide_assignment aceita cada vínculo correspondente. Isso não dá acesso a conta alheia, porém o bloqueio de reconciliação do portal não é uma suspensão completa de acesso direto aos custos. Definir regra se duplicidade também deve bloquear custos.
4. guides.is_active não participa das novas RPCs/helper. Desativar o catálogo do guia não revoga o vínculo da conta. Não tratar o switch Ativo como revogação de acesso sem implementar/definir essa semântica; hoje a revogação efetiva exige remover user_id/atribuição conforme o caso.
5. Após reatribuir a proposta, o guia anterior perde acesso aos custos daquele roteiro; admin mantém os registros. Isso está documentado. O helper de custos também não filtra status, então custos de proposta draft/rejected atribuída podem ser acessados diretamente mesmo que a agenda não a liste. Confirmar se é a regra desejada para histórico pessoal.
6. Nomes de itens são textos operacionais livres e podem conter dados inseridos pela equipe. A projeção elimina campos internos dedicados, não detecta informações pessoais embutidas em nomes.
7. Tipagem de RPCs ainda usa cast any; não encontrei incompatibilidade nominal nos argumentos enviados, mas types gerados dessas funções podem ser acrescentados após homologar o schema.

Aprovação limitada ao código revisado; SQL executado, política de desativação e integração definitiva de privacidade não foram certificados por este parecer.
