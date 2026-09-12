# Parecer final — privacidade e widget

**Código aprovado por inspeção, integrado até b6a72ca59b38741a8dabc200e6f401aa9d1bb38f.** Hash obtido diretamente com git rev-parse HEAD no checkout principal, substituindo o identificador provisório informado. O delta do widget já havia sido revisado antes do commit; nenhum novo teste ou build foi executado pelo revisor nesta atualização.

Evidências de validação integrada informadas pelo coordenador:

- 171 testes passaram em 28 arquivos.
- tsc --noEmit passou.
- npm run build passou em 18,43 segundos.

**SQL CONTINUA NÃO EXECUTADO.** Conforme relato do coordenador, nova tentativa de iniciar PostgreSQL com aproximadamente 5 GB livres falhou imediatamente por erro de I/O em meta.db do Docker e foi cancelada. Isso não valida migrations, fixtures, ACL/RLS nem concorrência real em PostgreSQL. Homologação SQL isolada permanece pendente antes de declarar o banco validado.

Os bloqueadores de código apontados neste parecer foram encerrados pelos deltas revisados. Permanecem os riscos residuais e limites de escopo registrados abaixo; aprovação de código e sucesso do build não substituem validação SQL ou integração real de assinatura.

---

# Fechamento de código — privacidade integrada e widget

**Aprovado por inspeção o lote de privacidade integrado em 18efca7, incluindo o delta final não commitado de clicksignWidget.ts/test.ts e efeito de ProposalPublic.tsx. O último P1 de callback do widget está resolvido no código examinado.** Registrar o hash desse delta quando commitado. Nenhum novo bloqueador identificado nesta revisão.

O helper combina snapshot de contexto com flag active própria da montagem. onload e onSigned verificam ambos. Cleanup desativa a instância, remove handler/script e limpa container; uma função onload já capturada continua sem efeito depois da desativação. O efeito depende de chave, token, user.id e proposal.id. O setter também confirma o UUID da proposta antes de marcar signed. Assim, callback de widget antigo não configura nem altera a nova proposta, inclusive troca de widget no mesmo contexto de página.

Testes escritos cobrem load após invalidação de contexto, assinatura atual, callback retido após navegação/cleanup e load já enfileirado chamado depois de dispose. Nenhum widget real foi acionado pelo revisor. A ligação do helper ao efeito/setter foi conferida por inspeção.

Functions integrado preserva get_public_products, save_public_proposal_edits, save_proposal_bundle, get_public_proposal, submit_proposal_feedback e get_my_published_proposal_link. Funções novas de guias/checklist ainda usadas via any não passam a ser tipadas por esta conferência. O delta de forms a4776a5 e RPC visual 45472dc mantêm seus pareceres próprios.

Os cinco itens originais e as complementações de sessão/reorder/callbacks estão encerrados no código revisado: revogação CRM próprio, confirmação de persistência/erro, edição visual atômica com UUIDs, invalidação de contexto e whitelist tipada de pagamento. Os dois erros determinísticos da fixture de privacidade foram corrigidos nos deltas anteriores.

**Validação:** git diff --check passou. Não executei testes, banco, SQL ou build nesta rodada. Suite integrada e tsc estavam em execução pelo coordenador; não afirmo seu resultado. Os 28 testes da entrega anterior foram informados, não repetidos pelo revisor.

**Pendências de implantação:** SQL/fixtures continuam NÃO EXECUTADOS; validar baseline, owner, ACL/RLS e contratos no ambiente isolado. Complementos já registrados de cobertura SQL (agregados, matriz de papéis/filhos e marcadores aninhados) permanecem recomendados para homologação. Aprovação de código não certifica banco instalado, rateio individual de modalidades, idempotência de feedback ou integração real Clicksign. Os riscos residuais documentados não foram removidos por este delta.

---

Histórico anterior (bloqueadores resolvidos conforme fechamento acima):

# Revisão por hash — d400be3 após e291022

**Não aprovado para cherry-pick como lote concluído.** Hash conferido: d400be393fc68923a3ff78947bba0087b6a9d5ff, worktree atmos-privacidade limpa. Há dois bloqueadores de UI e erros concretos na fixture SQL. Nenhum código editado, banco/build/SQL executado ou teste repetido. git diff --check e291022 d400be3 passou.

## Situação dos cinco itens originais

| Item | Situação em d400be3 |
| --- | --- |
| 1. Prospect próprio expõe CRM | Corrigido: DROP Customer can view own prospect presente. Forms a4776a5 no principal removem dependência legítima da leitura. |
| 2. Despublicação/contrato confirmam falha | Corrigido por inspeção: error + retorno single, estado vem da linha persistida e toast em falha. |
| 3. Edição destrutiva de dias | RPC única com contrato de 45472dc e true/error está correto; novo problema de identidade das descrições após reorder impede fechar a UI. |
| 4. Sessão/respostas obsoletas | Parcial: cancelamento dos efeitos foi adicionado, mas identidade não invalida o fetch da proposta nem limpa imediatamente estados já carregados. |
| 5. JSON permitido serializa segredo aninhado | Corrigido: tipo de installments, elementos e label/percent/due_rule validado antes de extrair; atmos_service.description também só string. |

## Bloqueador A — P1: a resposta administrativa sobrevive à troca de sessão

ProposalPublic.tsx:334–402: efeito de get_public_proposal continua com dependência **[token]**, não identidade. Sua variável cancelled só invalida quando muda token/desmonta. Portanto carregar como admin e sair/trocar usuário mantendo a rota conserva proposal/items administrativos; inclusive uma resposta administrativa em voo pode resolver depois do logout e ser aplicada. Adicionar cancelled sem incluir a identidade não cobre o caso solicitado.

O efeito de papel só limpa isAdmin imediatamente quando user é null; na troca direta A→B mantém true até responder a RPC de B. editMode/editItemOrder/editDescriptions e proposalIdRef também não são limpos pela troca. Header tem proteção contra resposta atrasada, mas mantém myProposalSlug já carregado de A enquanto busca B (só limpa imediatamente se não há email).

Aceite: invalidar fetch e dados/estado de edição por identidade e token, zerar papel/link imediatamente na troca, garantir que respostas e callbacks de gravação antigos não afetem nova tela/sessão. Testes RTL com admin→logout, A→B e promessas fora de ordem, com e sem payload já carregado. Garantir que dados privilegiados saiam do estado/render antes de nova consulta. A proteção servidor está correta para novas chamadas; isto é retenção indevida no cliente.

## Bloqueador B — P1: reorder faz descrições colidirem/perderem edição

ProposalPublic.tsx:454 agora faz map para criar objetos novos ao reordenar. Porém saveEdits:488/508 e render das descrições:1481 continuam identificando item por **items.indexOf(item)**. Para os objetos novos esse índice é -1. Todos os itens reordenados do mesmo dia compartilham chave day_number--1.

Reprodução: editar descrição de A e arrastar A/B. A descrição digitada sob a chave antiga não é encontrada e o save pode persistir a descrição anterior. Se editar uma descrição após o drag, todos os itens novos daquele dia leem a mesma chave -1 e podem receber o mesmo texto. O endpoint atômico grava fielmente esse payload incorreto; não é falha da RPC raiz.

Aceite: usar UUID estável do item em inicialização, inputs, reorder, construção do payload e atualização local. Teste com dois itens: editar antes de arrastar e depois de arrastar; cada UUID deve conservar somente sua própria descrição, inclusive clear. Verificar a chamada real da RPC no teste da página, não apenas helper.

## Bloqueador C — P2: fixture real presente, mas não executável como escrita

Arquivo supabase/tests/public_proposal_privacy.sql existe com 290 linhas e aviso NOT EXECUTED. Dois erros determinísticos na inspeção:

1. INSERT de prospects (aprox. linha 40) informa id/name/email e omite segment. No baseline, prospects.segment é NOT NULL sem default. A fixture falha antes de testar RLS. Preencher b2c explicitamente.
2. Cenário anon de get_my_published_proposal_link (aprox. linha 227) espera NULL. A migration revoga PUBLIC e concede EXECUTE somente a authenticated; anon deve receber insufficient_privilege. Testar ACL e chamada negada, sem ampliar grant para fazer passar.

As asserções passam por pg_temp.assert com p_condition IS NOT TRUE: comparações com = dentro desse helper não têm o bug de IF NULL do parecer anterior. Não trocar por igualdade permissiva. A verificação internal_costs compara o objeto serializado contra '999', podendo passar com vazamento de [{cost:999}]; exigir ausência da chave e marcador secreto, em todos os níveis relevantes.

Faltam asserções dos agregados prometidos: items_subtotal, desconto percentual+fixo simultâneos, num_paying, total/num_paying e pagantes inválidos. A fixture traz discount_fixed=0 e não afirma resultados numéricos. Incluir também owner/stranger via RPC, leitura direta dos filhos e pagamentos com objeto no lugar de installments/percent/due_rule. Esses complementos não equivalem a SQL executado.

## Integração com principal e pontos encerrados

- get_public_products chamado sem fallback bruto, com p_type:null, compatível com RPC raiz. Tipagem any residual não muda o contrato.
- save_public_proposal_edits envia p_proposal_id/p_days/p_items e exige data === true sem error; assinatura corresponde a 45472dc. Não duplica implementação SQL na worktree. O payload de descrição é o bloqueador B acima.
- Nenhum dos três arquivos de forms a4776a5 foi tocado neste commit. Revogação de prospects é compatível com a remoção de acesso CRM já aprovada no principal.
- types.ts deve ser integrado preservando as funções raiz get_public_products/save_public_proposal_edits/save_proposal_bundle e as três funções de privacidade. Não substituir o bloco Functions inteiro pela versão desta worktree antiga.
- Flag retornada é salva, visibilidade efetiva admin é separada; toggleShowBreakdown confirma persistência. Pagamento agora tem whitelist tipada.
- Agregados usam total salvo / pagantes e subtotal de itens do grupo, com descontos somados. Zero pagantes retorna null e UI Indisponível; média por pagante não promete rateio individual de modalidades.
- Validade agora compara dia civil em America/Sao_Paulo, inclusive a data informada; UI e endpoint usam a mesma regra. Testes de dateRules estão presentes, não repetidos nesta revisão.
- RPCs de feedback/link e remoção de policies conhecidas foram conferidos. Submissão múltipla de feedback continua parcial/não idempotente em falha intermediária, já documentada.

## Encaminhamento

Consultei maestri list: conectados Codex, Executor e Shell #2; **Claude não está conectado ao Revisor**. Não enviei a outro agente presumindo que fosse Claude. Os bloqueadores devem ser encaminhados pelo coordenador. Parecer final de aprovação aguarda delta corretivo fechado. Executor continua dono de cost_identity; nenhuma conclusão aqui encerra esse P1.

---

Histórico de pareceres anteriores (decisões substituídas pelo estado acima quando aplicável):

# Revisão preliminar de privacidade

## Estado e decisão

**Não é parecer final. Há bloqueadores no estado lido.** Base e291022ffdfdacaf9d93cf3d5c7ff255d7cc7611 mais diff não commitado em atmos-privacidade: Header, types, publicProposal/testes, ProposalPublic e migration 20260911120000_public_proposal_privacy.sql. Claude ainda modifica o lote; conferir novamente no hash fechado. Nenhuma edição de código, build ou banco foi realizada. Somente este relatório foi gravado.

## 1. P1 — Política de prospect continua expondo CRM interno ao cliente

Evidência: supabase/migrations/20260310001618_b78a91b5-c7f8-49ed-a1fb-54949029fd53.sql:93 cria Customer can view own prospect, SELECT TO authenticated USING (email = auth.email()). A migration de privacidade lida não a remove.

A tabela prospects contém notes, tags, stage_id, source e next_followup_at, além de contato (schema 20260307012725). Mesmo com as três políticas Customer view published removidas, o cliente autenticado pode selecionar a linha completa do próprio prospect e ler essas informações internas, sem passar por projeção. O Header novo já não precisa dessa leitura.

Aceite: revogar essa leitura ampla e preservar os consumidores legítimos por operações/projeções mínimas com identidade derivada da sessão. Auditar AuthModal, WishlistReservationForm e ItineraryReservationForm, que ainda consultam prospects; não restaurar SELECT * para manter compatibilidade. Fixture com usuário proprietário deve provar que notes/tags internos não são legíveis diretamente, enquanto get_my_published_proposal_link continua funcionando. Não é necessário abrir acesso a prospect para o RPC SECURITY DEFINER funcionar.

## 2. P1 — Despublicação pode falhar e a UI confirmar o estado oposto

Evidência: ProposalPublic.tsx:500–513, togglePublish aguarda update sem ler error nem confirmar linha retornada e altera published_at localmente. Supabase costuma resolver com {error}, sem lançar exceção.

Reprodução: proposta publicada; clique para despublicar com erro de rede/RLS/servidor. A UI passa a mostrar despublicada, mas o banco pode continuar permitindo get_public_proposal. É uma falsa confirmação de retirada pública.

Aceite: verificar error e linha retornada, atualizar estado somente com valor persistido, mostrar erro e manter estado anterior em falha ou zero linhas. Testar publicar/despublicar com sucesso, erro retornado, zero linhas e exceção. Não inferir status sent localmente se o banco não o retornou.

## 3. P1 — saveEdits apaga composição de dias e ignora falhas

Evidência: ProposalPublic.tsx:441–495. saveEdits deleta todos os proposal_days; insere somente dias com observação não vazia, sempre com description vazio. Depois altera labels/itens em chamadas separadas, todas sem verificar error. Atualiza o estado local e fecha edição mesmo com erro retornado.

Editar uma observação pode apagar descrições de dias criadas pelo editor administrativo e mudar IDs; se a inserção falhar depois da exclusão, os dias ficam removidos. Isso também contraria a preservação de dias do bundle de cálculos integrado. O problema é preexistente, mas está no fluxo de gravação solicitado para esta revisão.

Aceite: preservar identidade, description e demais campos não editados; gravar alterações de dias/itens atomicamente por caminho administrativo ou fornecer garantia equivalente contra perda parcial. Validar retorno e manter edição/erro em falha. Testar dia com descrição e observação, observação vazia, reorder e falha intermediária. saveContractUrl:542–555 também ignora error e fecha diálogo com valor não confirmado; aplicar confirmação de persistência e feedback de erro.

## 4. P2 — Estado administrativo e resposta podem sobreviver à troca de sessão

Evidência: ProposalPublic.tsx:318–385 verifica papel num efeito e só chama setIsAdmin(true) quando a RPC retorna true; retorno false/erro com user presente não limpa um true anterior. O carregamento da proposta depende somente de token. Header.tsx:49–59 não invalida resposta assíncrona de usuário anterior.

Cenário: consulta do usuário A em voo, logout/troca para B, resposta A chega depois. Header pode repor link de A. Na proposta, login/logout sem trocar token não refaz a projeção; payload administrativo ou controles podem continuar no estado da tela. RLS impede writes indevidos, mas não limpa dados já carregados no cliente.

Aceite: invalidar respostas antigas na troca de identidade/token, limpar dados/estado administrativo imediatamente, tratar false/erro explicitamente e recarregar a projeção conforme identidade. Testes com promessas resolvidas fora de ordem e admin → nãoadmin/logout. Não basta ocultar botão mantendo dados privilegiados no estado.

## 5. P2 — Whitelist de pagamento ainda converte objeto arbitrário em texto

Evidência: get_public_proposal, payment_terms.installments usa inst->>'label' e inst->>'due_rule'. Remove chaves extras superiores, mas ->> serializa também objetos/arrays dentro dos campos permitidos. Exemplo de fixture: label={public:"Parcela",secret:"SECRET"}; o objeto inteiro volta como string, incluindo SECRET. percent malformado ou installments não array também pode derrubar a leitura por cast/jsonb_array_elements.

Aceite: impor tipos por campo antes de projetar: label/due_rule strings, percent número conforme contrato, installments array de objetos válidos. Descartar ou rejeitar de forma controlada estruturas inesperadas; não serializá-las. Fixtures com segredos aninhados sob chaves permitidas, tipos incorretos, null e ausência. O formato normal do formulário funciona; a pendência é a garantia de whitelist tipada para JSON legado/futuro.

## Outro ajuste funcional localizado

approve-proposal passou a comparar new Date(valid_until) com new Date(). valid_until é coluna date: YYYY-MM-DD vira meia-noite UTC. Se a data de validade deve incluir o dia informado, a aprovação expira antes do fim desse dia (inclusive na noite anterior no Brasil). Definir semântica de vencimento e comparar datas no fuso/regra escolhidos. A mesma regra deve ser consistente entre UI e endpoints. Não examinei regra jurídica/comercial externa; isto é a consequência técnica da conversão atual.

## Correções já presentes na inspeção

- Remove políticas anon das propostas, dias, itens, hospedagens e feedback, além da leitura pública de sellers. Remove também as três políticas Customer view published. As versões históricas Authenticated can view own published foram removidas por migrations intermediárias; não identifiquei restauração posterior dessas três no baseline lido.
- get_public_proposal filtra por slug/share_token e exige published_at para nãoadmin. Retorno explícito exclui custos, comissões, fornecedores, custos internos do serviço e rooms de hospedagem. Campos de preço por linha são nulos quando detalhamento está desligado.
- show_price_breakdown retornado é o valor salvo; visibilidade efetiva administrativa é separada. toggleShowBreakdown já verifica error, exige retorno single e mantém estado em falha. Falta a mesma proteção em publicação/contrato/edições.
- get_my_published_proposal_link exige auth.uid, limita por prospects.email = auth.email e published_at, retorna somente slug/share_token, sem argumento que permita escolher outro proprietário. EXECUTE concedido a authenticated; PUBLIC revogado. Verificar ACL efetiva na homologação.
- Agregados atuais usam total salvo/num_paying; subtotal e desconto percent+fixo são do grupo e dos itens. Rollup diário antigo foi removido. A revisão final deve conferir fixtures e o contrato integrado com cálculos; não aprovo novos totais apenas pelos comentários.
- Feedback usa RPC com proposal_id + token + publicação; frontend verifica retorno false/erro. Envio de múltiplos itens continua sequencial: falha após um sucesso pode deixar envio parcial e retry duplicar os primeiros. Registrar como risco ou adotar operação em lote/idempotência.
- approve-proposal e clicksign-create-document passam a exigir publicação. Demais requisitos de identidade/token existentes permanecem no delta lido.

## Critérios para o hash fechado

1. Resolver os bloqueadores acima e revisar alterações finais sem presumir que o diff móvel já está fechado.
2. Fixtures anon, autenticado estranho, proprietário e admin: leitura direta bloqueada em tabelas internas, incluindo prospects; tokens ausente/incorreto, publicado/despublicado; flag false/true e papel admin sem alterar valor salvo.
3. Confirmar ausência de segredos em nested JSON e preço por linha quando desligado; agregado correto com quantidade, cortesias, hospedagem, impostos e descontos combinados; pagamento com entradas malformadas.
4. Header: próprio link somente, sem dados de outro usuário ou resposta obsoleta; feedback sem token/par indevido recusado; erros de publicação/edição/contrato não confirmam sucesso.
5. Verificar integração com get_public_products e save_proposal_bundle/types; atualizar o campo salvo sem substituir pela visibilidade efetiva admin.

Fixtures SQL ainda não estavam presentes no diretório supabase/tests desta worktree no momento da leitura. Não executei testes nesta rodada. Banco/build permanecem proibidos nesta tarefa; execução SQL posterior em ambiente isolado é requisito de implantação, não evidência já obtida. A nova frente de guia está fora deste parecer.

## Delta independente no principal — retirada de CRM dos formulários

**Aprovado por inspeção, sem regressão bloqueadora identificada no diff.** Escopo: AuthModal.tsx, WishlistReservationForm.tsx, ItineraryReservationForm.tsx e novo ReservationPersistence.test.tsx. Este aceite é somente desse delta, não encerra os bloqueadores da worktree de Claude.

- AuthModal remove apenas o bloco de SELECT/UPDATE/INSERT de prospects; fluxo auth/profile permanece. Não é necessário conceder leitura CRM ao cliente para cadastro pessoal.
- Ambos os formulários mantêm payload de quote_requests (itens, respostas e contato). Erro retornado ou exceção interrompe o fluxo antes de analytics, window.open e onClose; respostas e confirmação ficam disponíveis para retry, com alerta e botão reabilitado. Caminho de sucesso permanece após persistência.
- Trigger trg_auto_prospect_from_quote está definido em 20260308034232. A versão vigente da função em 20260311044314 é SECURITY DEFINER e procura prospect por email/telefone: se existente, não altera o CRM; se ausente, cria com contato e tag turista. Não cria necessariamente um novo prospect a cada solicitação e não atualiza contato/tags/notas de prospect existente.
- Teste RTL monta os dois formulários reais, percorre perguntas, simula erro retornado e retry bem-sucedido, verifica ausência de abertura/fechamento em falha e igualdade de payload nas duas tentativas. window.open está mockado; nenhuma mensagem real é enviada. Não executado por este revisor nesta rodada. git diff --check passou.

Documentação deve preservar as limitações informadas: cadastro isolado não cria CRM pelo cliente; tags adicionais wishlist/roteiro e enriquecimento futuro exigem fluxo servidor; notas CRM não devem ser sobrescritas. O insert original no cliente não tinha write RLS que justificasse reabrir a tabela.

Riscos residuais não introduzidos pelo delta: erro após commit com resposta perdida pode produzir solicitação duplicada no retry (sem chave idempotente); popup pode ser bloqueado pelo navegador após await. O mock de window.open retornando null testa que houve tentativa de abertura, não que o WhatsApp realmente abriu. AuthModal ainda contém tratamentos incompletos de erro de auth/profile preexistentes; a retirada de prospects não os modifica nem comprova sua correção.

A revogação de Customer can view own prospect ainda precisa entrar na migration de Claude; remover chamadas frontend, por si só, não fecha acesso direto. O aceite acima elimina a necessidade desses três consumidores de ler CRM e facilita essa revogação.

## Revisão adicional — RPC visual e associação de custos por posição

Escopo: novo diff no principal de 20260911230000_public_proposal_edits.sql, fixture public_proposal_edits.sql e assinatura em types.ts; comparação com bundle e checklist existentes. SQL/build não executados. A UI de Claude ainda não foi revisada usando esta RPC.

**Decisão: estrutura transacional da RPC visual adequada; liberação do fluxo aguarda proteção equivalente no bundle e critérios abaixo. Esta descoberta acrescenta bloqueador ao parecer anterior de cálculos.**

### P1 — Bundle permite transferir custo conferido para outro item

proposal_cost_checks usa UNIQUE(proposal_id,day_number,item_index), sem UUID de item. getEffectiveCost em ProposalFormDialog.tsx:579 procura somente esse endereço e prioriza actual_cost conferido. reorderItems:1039 altera índices em memória. save_proposal_bundle faz upsert dos novos day_number/item_index/catalog_item_id/variation_id/supplier_id/quantity/vehicle_type e apaga itens omitidos, sem proteger a associação com a conferência.

Reprodução: dia 1 posição 0 contém A com custo conferido 100; posição 1 contém B com custo 20. Arrastar B para posição 0 faz B receber custo 100 em getEffectiveCost; o payload já leva cost_price errado e a RPC o persiste. Trocar catálogo/variação/fornecedor do item mantendo posição também reutiliza conferência que pertence ao serviço anterior. Excluir/recriar item no mesmo endereço tem o mesmo risco.

Aceite mínimo: no servidor, com estado persistido como referência, rejeitar alteração estrutural que mude associação de custo conferido: identidade, dia, posição, remoção/substituição, referência de catálogo/variação/fornecedor e mudanças que alterem interpretação da conferência (quantidade/tipo de veículo, quando aplicável). Não confiar apenas no UUID se o serviço vinculado mudou. Manter edição de texto/labels/observação permitida. Frontend deve impedir ou invalidar explicitamente o uso da conferência antes de recalcular custo/payload; bloquear somente ao salvar não impede resumo errado durante a edição.

Fixtures: reorder, mudança de dia, substituição de catálogo/variação, remoção e novo UUID no mesmo endereço devem falhar atomicamente enquanto conferidos; edição textual deve passar. Conferência zero também deve ser protegida. Teste real do calculador/editor deve demonstrar que B nunca herda actual_cost de A.

### P2 — RPC visual não rejeita posições finais duplicadas

A RPC rejeita IDs repetidos, mas permite dois IDs distintos com o mesmo item_index no mesmo dia, ou mover apenas um para a posição de item omitido do payload. A tabela de itens não tem UNIQUE equivalente ao checklist. Mesmo sem conferência atual, a próxima conferência por dia/índice pode passar a servir a dois itens.

Aceite: validar unicidade de (day_number,item_index) no estado final completo da proposta após aplicar o patch, incluindo itens não enviados; exceção reverte a transação. Permitir índices iguais em dias diferentes. Aplicar a mesma invariância ao bundle. Fixture de colisão com item enviado e com item omitido, além de reorder válido.

### Atenção: desmarcar não equivale a reconciliar

A mensagem da RPC orienta desmarcar conferência antes de reorganizar. ProposalCostChecklist.tsx:106–135 continua reaproveitando actual_cost e notes pelo endereço antigo mesmo quando is_verified=false. Portanto desmarcar → reorganizar → abrir checklist ainda apresenta custo/nota do item anterior como sugestão para o novo. Uma reconferência pode confirmar o dado errado. Invalidar/remapear também o conteúdo associado à posição, ou exigir confirmação informada mostrando que a associação mudou; não apagar histórico silenciosamente.

Além disso, o checklist grava diretamente com UPDATE/upsert e ignora error (linhas 194–218). Não participa do lock pai das RPCs. Uma tela antiga pode confirmar posições após reorganização, ou uma falha de desmarcação pode ser mostrada como sucesso. Para uma garantia completa, gravação da conferência precisa validar versão/identidade da composição sob o mesmo protocolo de lock e tratar erro. Guard que verifica apenas is_verified no instante do save não protege uma conferência antiga gravada depois.

### Pontos positivos da nova RPC visual

- SECURITY INVOKER, guarda admin explícita, ACL sem anon e lock do pai antes de editar.
- Dias usam ON CONFLICT(proposal_id,day_number) atualizando somente observation: preserva ID/description e permite limpar observação. Labels alteram somente day_label dos itens daquele dia.
- Itens atualizam somente description/item_index por ID e proposta; item estrangeiro/ausente falha e reverte observações/labels anteriores. Sem delete de dias, nem alteração de valores/fornecedor por esta RPC.
- Guard existente impede mudanças de item_index se houver qualquer custo conferido; como a RPC visual não altera dia/referências, cobre o reorder simples serializado nesse endpoint. É conservador e pode bloquear item não conferido por existir outro conferido.
- A assinatura types.ts corresponde a três parâmetros obrigatórios e retorno boolean. A UI deve aceitar somente data === true sem error, preservar edição em falha e não simular sucesso.
- Fixture examinada usa authenticated admin/nãoadmin e ACL anon, asserções null-safe para preservação/clear/reorder/rollback. O coordenador adicionava o cenário guard durante esta leitura; revalidar a fixture no hash fechado, sem afirmar execução.

Risco adicional fora do delta visual: o checklist geral ainda substitui actual_cost=0 por proposalCostTotal>0 ao abrir (linha 119), diferentemente do checklist de hospedagem corrigido antes. Assim zero conferido pode ser perdido ao salvar o checklist. Deve ser incluído na correção do ciclo de conferência; aprovação anterior de recordedCost não cobria essa regravação.

## Fechamento da RPC visual — 45472dc

**Aprovados por inspeção os quatro arquivos de 45472dc0b6b7cfb8db27dd584581ac90adafd333**, no checkout principal. Hash identificado diretamente no HEAD e confirmado pelo coordenador. Nenhum novo bloqueador localizado nesse delta; isto não encerra o P1 de identidade/conferência de custos encaminhado ao Executor, nem aprova a UI ainda em desenvolvimento por Claude.

A migration agora verifica GROUP BY day_number,item_index HAVING count(*) > 1 sobre todos os itens persistidos da proposta após aplicar o patch. Cobre colisão entre itens enviados e contra item omitido; permite mesmo índice em dias diferentes. Exceção 23505 reverte a transação. Assim, o P2 de posições duplicadas está resolvido neste endpoint; sua invariância no bundle permanece parte da frente de cálculos.

Conferidos: guarda administrativa/SECURITY INVOKER, lock pai, updates por item+proposta, upsert de dias somente em observation, preservação de ID/description, clear com string vazia/null conforme campo, whitelist de campos alteráveis, retorno boolean e assinatura TypeScript. get_public_products e save_proposal_bundle continuam declarados em Functions.

Fixtures versionadas incluem reorder válido com índice igual em outro dia, observação vazia, identidade/descrição de dia preservadas, colisões explícita e com item omitido, rollback da posição, rejeição de reorder com custo conferido, item estrangeiro com rollback de observação/labels, authenticated nãoadmin e ACL anon. O teste do guard captura raise_exception, distinto da unique_violation que a colisão causaria se o guard fosse removido. Nenhuma fixture foi executada. git diff --check passou; não houve SQL, banco, testes ou build nesta conferência.

Limites preservados: a guarda conservadora vale para a associação antiga por posição e não resolve concorrência/gravação de checklist antigo. A instrução de desmarcar/reconferir não substitui a futura proteção de identidade/snapshot/locks. Alinhar a RPC visual e suas fixtures com a migration posterior do Executor antes da implantação. UI deverá chamar uma única RPC, exigir data === true sem error e preservar edição/mostrar erro em falha. O parecer da interface será feito no hash final de Claude.

## Pré-leitura do delta em andamento após d400be3

Sem aprovação formal até hash fechado. Li os novos requestGuard.ts/test.ts, proposalEdits.ts/test.ts e diff de ProposalPublic/fixture SQL. Não editei a worktree nem executei testes, SQL, banco ou build.

Conferidos como corrigidos no estado lido:

- Guard usa geração crescente por start; invalidate só invalida a própria geração ainda corrente. A→B→A, mesma chave repetida, cleanup sem nova requisição e cleanup antigo sem invalidar a nova geração estão cobertos no helper.
- Efeito da proposta depende de token e user.id, inicia geração antes do retorno por token ausente, invalida no cleanup e verifica validade após ambas as RPCs. Limpa proposal/items/isAdmin/edição/proposalIdRef.
- Descrições usam UUID na inicialização, input, payload e atualização local. Helper conserva a associação após clonagem/reorder e preserva clear explícito. Não encontrei mais indexOf no caminho de descrição alterado.
- Fixture agora fornece prospects.segment=b2c e testa insufficient_privilege para chamada anon ao link próprio, sem abrir ACL.

**Duas lacunas de sessão permanecem no código lido:**

1. Header mantém myProposalSlug já carregado de A enquanto carrega usuário B. O efeito só chama setMyProposalSlug(null) imediatamente se não existe user.email; precisa limpar também na troca entre duas contas presentes. Cancelamento de resposta atrasada não limpa um valor antigo que já estava no estado. Critério: link de A deixa de renderizar assim que muda identidade, antes de resolver B; teste com A já carregado e resposta de B pendente.
2. Callbacks de mutação não estão vinculados à geração/identidade/proposta de origem. Exemplo: salvar contrato em A, navegar para B antes da resposta; setProposal(prev => {...prev, contract_url: data.contract_url}) aplica URL de A ao objeto B. saveEdits pode repor itens/observações de A após B carregar; togglePublish/breakdown têm a mesma forma de setState sem validar origem. Guard protege somente leituras. Capturar validade da geração corrente ao iniciar a mutação (sem start que invalide uma leitura legítima), e antes de qualquer sucesso/erro/finally com efeito local conferir que tela/identidade ainda são as mesmas. Comparar só propId não cobre A→B→A; usar geração. Resetar também estados de diálogo/carregamento vinculados à sessão, especialmente contractUrlInput/contractDialogOpen, para não carregar buffer de uma proposta para outra. Teste com promessa de mutação de A resolvendo depois de B e depois de voltar a A; operação pode ter sido salva no banco para A, mas não deve adulterar o estado da nova tela.

Esses casos complementam o item 4 original (callbacks antigos e buffers), não alteram a autorização da RPC no servidor. Os testes novos são de helpers; não comprovam que todos os callbacks/efeitos reais da página e Header os utilizam. A pré-leitura confirma o avanço, mas não fecha o parecer enquanto as duas lacunas e o hash final estiverem pendentes.

## Última revisão do staged — callbacks e Header

Staged lido sobre d400be3 (HEAD ainda d400be393fc68923a3ff78947bba0087b6a9d5ff nas duas consultas desta rodada). Oito arquivos; git diff --cached --check passou. Os 28 testes são informação do coordenador; não executei testes/banco/build. Aprovação final ainda pendente pelo callback abaixo.

Conferidos: Header limpa link antes da busca; snapshot de geração protege saveEdits, publicação, detalhamento, contrato, aprovação e solicitação HTTP Clicksign. Resets abrangem diálogos, flags de loading, buffer de contrato e chave Clicksign. Descrições continuam por UUID. Correções da fixture permanecem staged.

**P1 remanescente no componente do widget Clicksign** — ProposalPublic.tsx:732–757: o efeito que carrega widget.js registra script.onload e configura onSigned sem validar geração/contexto. onSigned faz setProposal(prev => {...prev, contract_status:'signed'}) sobre qualquer proposta atual. Cleanup apenas remove a tag script; isso não invalida uma função já registrada no widget, nem garante descarte de onload já enfileirado. A proteção de handleLoadContract não cobre esses callbacks.

Reprodução controlada: capturar onSigned do widget A, navegar/carregar B, disparar o callback antigo. B fica signed localmente. onload atrasado de A também pode configurar chave/nome de A no container com o mesmo ID da nova tela. Aceite: capturar snapshot do contexto e flag de vida do próprio efeito; checar ambos em onload e onSigned; invalidar no cleanup e remover handlers/recurso conforme API disponível. A flag local é necessária também para troca de widget no mesmo contexto de proposta, que não necessariamente incrementa a geração de página. Teste com script/widget mockados, nenhum serviço real, disparando ambos os callbacks após cleanup/troca para B e confirmando que não configuram nem alteram B. Callback atual deve continuar funcionando.

Esta é a única lacuna nova identificada nesta última passagem dos callbacks; as lacunas anteriores de Header e mutações HTTP estão corrigidas no staged examinado. Aguardar delta/hash final sem certificar o estado atual como aprovado.

Hash publicado ao terminar esta revisão: **893e84f983609f564912439cca84f438866b1161**. O efeito Clicksign sem guard permanece no commit. Parecer desse hash: pendente do P1 de callback do widget descrito acima.
