# Fechamento — identidade de custos até a6b7f42

**Aprovados por inspeção f5638da8b5f613b775f20ae3281f16c2da9dfc40 e a6b7f42821541c82c9eb70b76bc3b014dda512a3 para integração, mantendo os limites e a homologação SQL pendente.** O P1 de associação de conferência por posição foi tratado nos caminhos revisados; o P2 de campos obrigatórios na fixture nova está encerrado.

Conferido o delta de a6b7f42: somente supabase/tests/verified_cost_identity.sql. O payload inicial do bundle agora informa value=0 e commission_percent=0 nos dois itens e language=pt na proposta. Não depende de defaults para colunas inseridas como NULL por jsonb_populate_record. O cenário legado continua usando INSERT direto com colunas omitidas, onde os defaults se aplicam.

A adaptação da fixture visual raiz para save_proposal_cost_checks/cost_item_identity já foi conferida e aprovada no diff anterior; incluí-la na integração. A RPC visual 45472dc mantém lock pai/guard e não é substituída pelo delta financeiro.

Não localizei novo bloqueador nesta correção. git diff --check f5638da a6b7f42 passou. Não executei SQL, banco, build ou testes; os 65 Vitest do lote anterior são informação do Executor. A aprovação é de código/inspeção, não validação de migrations executadas. Permanecem os limites documentados de legado, slots negativos de hospedagem, owner da RPC/tabela, quantidade e manutenção privilegiada fora do protocolo. Privacidade segue em parecer separado.

---

Histórico detalhado (pendências de fixture indicadas abaixo foram resolvidas conforme fechamento acima):

# Revisão de identidade de custos — f5638da

**P1 tratado por inspeção nos caminhos revisados; parecer do lote ainda pendente de corrigir value/commission_percent na fixture nova (P2). A fixture visual raiz já foi adaptada e conferida no diff.** Commit f5638da8b5f613b775f20ae3281f16c2da9dfc40, dez arquivos, worktree atmos-calculos sem código modificado; REVISAO-CALCULOS.md permanece não versionado. Não executei banco, SQL, build ou testes nesta rodada. Os 65 testes aprovados são informação do Executor; li os testes. git diff --check passou.

## P2 — Fixture nova falha antes de exercitar identidade; fixture visual precisa integração

Em supabase/tests/verified_cost_identity.sql, primeira chamada save_proposal_bundle cria A/B com id/day_number/item_index/category/item_name/quantity/cost_price, mas omite **value e commission_percent**. A RPC insere essas colunas explicitamente a partir de jsonb_populate_record de registro inexistente, produzindo NULL. Ambas são NOT NULL no schema (value em 20260307021006; commission_percent em 20260310040133). Defaults da tabela não se aplicam a NULL explícito. A fixture falha antes de testar o novo protocolo. Preencher os dois valores no payload e conferir demais NOT NULL do baseline.

A fixture raiz **public_proposal_edits.sql de 45472dc** cria um proposal_cost_checks positivo diretamente depois de SET LOCAL ROLE authenticated. O novo require_cost_check_rpc rejeita justamente essa escrita, inclusive admin. Para testar guard visual após todas as migrations, criar o check pela nova RPC e snapshot correspondente, ou provisionar legado como owner antes de trocar role quando esse for o cenário pretendido. Não enfraquecer o trigger para aceitar o teste antigo.

Aceite: corrigir a nova fixture e adaptar a fixture visual integrada. Adicionar cenário cruzado real nas fixtures: abrir snapshot, liberar e reordenar via save_public_proposal_edits, recusar snapshot antigo, depois reconferir o UUID correto preservando histórico. SQL continua para execução futura em ambiente isolado, sem afirmar que os scripts já passaram.

## P1 anterior — proteção implementada

- Bundle monta coleção final resolvendo campos omitidos como no upsert, exige posição presente/única por dia e compara estado persistido/final de cada slot conferido: UUID, dia, posição, produto, variação, categoria, fornecedor e veículo. Remoção, troca/reorder e origem ambígua falham antes de writes. Custo zero está incluído.
- UI preserva índices originais, guarda identidade carregada, deixa de aplicar actual_cost de check sem vínculo/snapshot correspondente e valida coleção filtrada antes de salvar. Mover B para posição A não reaplica o custo conferido de A. Falha de leitura da conferência impede save.
- item_id/identity_snapshot não são preenchidos por associação histórica presumida. O checklist mostra dados legados separadamente; valor/nota não alimentam célula nova. Liberação explícita e regravação arquivam registro completo em tabela de histórico administrativo.
- Zero é preservado e foram retiradas heurísticas que o substituíam por sugestão e que reinterpretavam custo total. Recalcular sugestão desmarca validação; erro/retorno diferente de true não fecha painel nem anuncia sucesso.
- save_proposal_cost_checks exige admin, é SECURITY DEFINER, bloqueia o mesmo pai das RPCs bundle/visual e compara snapshot esperado ao item atual, incluindo quantidade. Tela antiga não consegue confirmar composição que já mudou. Trigger bloqueia escrita direta de checks diários por authenticated, inclusive admin, fechando o caminho anterior sem lock.

## Compatibilidade com RPC visual 45472dc

A função visual permanece com o mesmo contrato e não é sobrescrita. Seu lock pai serializa com checklist/bundle. Guard conservador bloqueia reorder quando existe check conferido. Após liberação pela nova RPC, reorder é permitido; identidade_snapshot antiga inclui dia/posição, impedindo reutilização do custo/nota, e expected_snapshot anterior faz nova confirmação falhar. A validação de posições finais da RPC visual permanece necessária e compatível.

O **código** desse protocolo é compatível por inspeção; a **fixture** visual necessita a adaptação descrita acima. A documentação que orienta apenas desmarcar deve apontar para liberação/reconferência pelo novo fluxo e histórico, sem sugerir edição direta da tabela.

## Limites preservados e integração

1. Quantity foi deliberadamente excluída da comparação de identidade para consumo do custo e guard do bundle, preservando a regra atual de custo unitário/total. Está incluída no snapshot esperado de escrita para rejeitar checklist antigo. Isso é contrato explícito do delta; não afirmar que mudança de quantidade exige sempre nova conferência. A interpretação unitário/total ainda depende de catálogo atual em getEffectiveCost, risco histórico não resolvido por item_id.
2. Owner da função SECURITY DEFINER precisa coincidir com owner da tabela para o trigger autorizar writes. Validar em PostgreSQL; não há flag de sessão forjável usada como autorização.
3. Slots negativos de hospedagem continuam no fluxo anterior, fora deste protocolo; não afirmar identidade/locks completos para suas conferências.
4. Escritas administrativas diretas em proposal_day_items fora das RPCs não são interceptadas pelo protocolo. Evitar esses caminhos na aplicação integrada. Duas conferências da mesma identidade ainda usam última gravação, com histórico preservado; snapshot valida composição, não versão do conteúdo da conferência.
5. Comprovantes/custos contaminados antes da migration não são reconstruídos automaticamente. Check sem vínculo deixa de servir como fonte efetiva; revisão humana do legado é necessária.
6. Types da nova RPC continuam via any; regenerar quando o schema for validado. O typecheck desta worktree não passou integralmente segundo documentação; não transportar aprovação integrada anterior para este delta sem nova verificação do coordenador.
7. A migration substitui bundle mantendo contratos de comissões canceladas, flag explícita, transação e child_ids. Integrar sem perder eventuais deltas posteriores na mesma função. A entrega de privacidade de Claude permanece em parecer separado.

Nenhum novo bypass de identidade foi identificado no fluxo normal examinado. Corrigir os scripts de validação antes de fechar aprovação deste lote; implantação continua dependente de homologação SQL real.

---

Histórico anterior (decisões substituídas pelo estado acima quando aplicável):

# Parecer final de cálculos e persistência

## Decisão

**Aprovado o lote de código até 813aee6ea8f1a173923de0af2d66494e47d45621, com os limites residuais abaixo.** Os dois bloqueadores do parecer anterior foram tratados. Não encontrei novo bloqueador no delta definitivo contra c492e068b2c1cc5f2264dd653ed7c736d294d181.

Worktree: /Users/gustavosextaro/Projects/atmos-calculos. Conferidos os sete arquivos do commit definitivo: migration, fixtures SQL, contrato TypeScript/testes, integração do editor e duas documentações. O checkout não tem alterações de código pendentes; somente REVISAO-CALCULOS.md está não versionado. Este parecer substitui a decisão preliminar anterior.

## Bloqueadores encerrados

### 1. Comissão cancelada que reaparece

Na migration 20260911224000_atomic_proposal_bundle.sql:171–178, a RPC bloqueia com SQLSTATE 55000 qualquer source_key cancelada que reapareça em p_commissions. A checagem ocorre depois do lock dos lançamentos e antes da ramificação de recebíveis legados. Assim, vale para mesmo valor, valor diferente e modo legado; a exceção reverte as alterações anteriores do bundle. Não reabre cobrança automaticamente nem retorna sucesso com comissão desejada ainda cancelada.

As fixtures desmarcam a hospedagem, confirmam cancelamento, permitem salvar novamente sem comissão e tentam remarcar com 0,01 e 0,02. Verificam rejeição, ID/status/valor/notas preservados e rollback de título/seleção. Essas tentativas incluem um recebível legado para comprovar que ele não desvia a guarda. A mensagem exige reconciliação/reabertura manual.

### 2. Asserções SQL e papéis de aplicação

Comparações escalares relevantes foram convertidas para IS DISTINCT FROM ou testes explícitos de existência/boolean, incluindo valores, snapshots, título, contrato, aviso legado e child_ids. NULL/ausência deixa de satisfazer silenciosamente esses critérios.

A conexão privilegiada prepara usuários e contexto; chamadas administrativas passam a usar SET LOCAL ROLE authenticated com usuário admin. A fixture confirma SECURITY INVOKER. Outro usuário authenticated sem admin verifica RLS financeira e rejeição da RPC. O cenário anon verifica ACL e tentativa real de chamada, inclusive com claims locais de admin para separar privilégio SQL de identidade. A estrutura atende ao aceite de revisão; sua execução em PostgreSQL continua pendente.

## Contrato definitivo conferido

- Comissões exigem objeto, campos presentes/não nulos, valor numérico positivo, descrição preenchida, data válida, source_key canônica e única, vinculada à hospedagem selecionada com pagamento direto. As verificações SQL precedem gravações e também valem no modo legado. O frontend faz preflight equivalente.
- show_price_breakdown ausente preserva UPDATE e permite default em CREATE. Boolean true/false explícitos são persistidos na mesma transação por SQL parametrizado; tipo inválido é rejeitado. Solicitar o campo antes de existir a coluna gera erro explícito e rollback. O controle visual e a autorização pública pertencem à integração de privacidade.
- child_ids retorna identidades existentes/geradas por coleção. O editor fecha após sucesso e recarrega ao reabrir; não foi introduzido fluxo de salvar e continuar sem reidratação.

## Correções de c492e06 mantidas

- Snapshot room.commission_percent preservado nos três formatos legados, inclusive zero. Ausência exige confirmação no editor; catálogo atual não recompõe a comissão histórica.
- accommodationAmounts compartilhado por resumo, financeiro e recebível: duas linhas de R$0,05 a 10% resultam em R$0,01 por hospedagem.
- Custo registrado zero não é substituído pelo catálogo; checklist de hospedagem também o preserva.
- Rateio por pagantes preserva total e centavos, sem inventar preço individual por modalidade com cortesias.
- Gravação do bundle transacional, IDs existentes preservados, proteção de recebíveis pagos e manutenção dos legados sem associação presumida por nome.

## Validação e implantação

Revisão estática do diff definitivo e dos testes/documentação. git diff --check c492e06 813aee6 passou. **58 testes Vitest aprovados foram informados pelo Executor/coordenador; não os executei novamente nesta rodada.** Não executei banco, SQL, migration ou build. Não editei código, não integrei e não fiz commit; atualizei somente este parecer.

Aprovação de código não certifica execução da migration. Antes de liberar o fluxo, validar migration e fixtures em PostgreSQL isolado com baseline completo, incluindo RLS, ACL, rollback e compatibilidade de schema. Aplicar a migration revisada antes do frontend. O campo show_price_breakdown depende também da migration de privacidade para ser utilizado.

## Riscos residuais documentados, sem reabrir os bloqueadores encerrados

1. A RPC valida estrutura/vínculo, mas não deriva ou compara amount com rooms nem exige completude das comissões. Outro cliente administrativo pode enviar valor divergente ou omitir entrada; o frontend revisado usa o calculador compartilhado. Não afirmar integridade numérica integral do endpoint.
2. Retry após resposta perdida não tem chave idempotente de requisição. CREATE com p_id null pode duplicar proposta; filhos novos dependem de sucesso recebido e recarga. O índice protege a mesma proposta/origem, não qualquer repetição de chamada.
3. Não há controle de versão otimista para duas telas antigas; serialização não impede sobrescrita de estado desatualizado.
4. missingAccommodationCommissions ainda não aparece nos dashboards. Histórico sem snapshot permanece incompleto.
5. O loader ainda converte Number(d.cost_price) || 0: eventual NULL legado vira zero antes de recordedCost e não alcança fallback. Zero legítimo está protegido.
6. Recebíveis legados sem origem segura suspendem sincronização automática e exigem conciliação manual. O aviso não significa que saldo já esteja sincronizado.
7. A aprovação não inclui o próximo delta de privacidade de Claude, as políticas de acesso de cliente autenticado proprietário nem a RPC do Header. Essas alterações aguardam revisão separada. O catálogo 7717250 mantém seu parecer próprio.

Não restam bloqueadores novos de código identificados no escopo deste delta definitivo. Permanecem a validação SQL e a integração coordenada de privacidade antes da liberação do conjunto.

## Conferência da integração no checkout principal

**Integração aprovada por inspeção até 74c9190009308b0c78427bc933f211fe6571b5ac.** A resolução de Functions em src/integrations/supabase/types.ts:1932 preserva simultaneamente get_public_products e save_proposal_bundle, além das funções preexistentes. As assinaturas correspondem às migrations: p_type opcional/nulo e retorno Json para catálogo; p_id nulo permitido, seis parâmetros Json obrigatórios e retorno Json para o bundle.

Correspondência dos commits revisados com os commits no principal:

| Origem atmos-calculos | Integrado no principal |
| --- | --- |
| 0553fe5 | 765391d6e9ff1aa2eac7a7037fa1f4bbc6168322 |
| 1c21125 | 08e01bd2e1a9a1b1e43df8b3657b166d75a79f68 |
| c492e06 | 949fb503e72cafa7611f8685ad6f5d1df8a4e93c |
| 813aee6 | 74c9190009308b0c78427bc933f211fe6571b5ac |

Comparei o conteúdo dos arquivos de cada commit original com seu correspondente integrado. Todos coincidem, exceto types.ts nos commits de rastreabilidade/snapshots devido à declaração adicional de get_public_products. No estado final, a diferença de types.ts contra 813aee6 é somente essa declaração de catálogo. Não houve perda de save_proposal_bundle ou de seus argumentos na resolução.

Checkout principal limpo no momento da inspeção. **88 Vitest e tsc integrado aprovados foram informados pelo coordenador; não executei novos testes, typecheck, build ou banco.** As pendências SQL e os limites residuais do parecer permanecem. Aguardar hash definitivo de privacidade para revisão separada, incluindo acesso do proprietário autenticado e RPC de link usada pelo Header; esta conferência não aprova alterações ainda não entregues.

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

## Atualização de integração — fixture visual raiz

Conferido o diff não commitado de supabase/tests/public_proposal_edits.sql no principal: o INSERT direto foi substituído por save_proposal_cost_checks com item_id, cost_item_identity(i) como expected_snapshot, actual_cost=50 e is_verified=true. O terceiro argumento usa corretamente o default p_release_ids='[]'. A asserção ok IS DISTINCT FROM true detecta erro/ausência de item. **Adaptação aprovada por inspeção**, sem mudança funcional na RPC visual e sem execução SQL.

Permanece somente o erro de payload inicial da fixture verified_cost_identity.sql de f5638da apontado nesta revisão (value e commission_percent ausentes). O cenário cruzado de snapshot anterior/reorder visual é complemento recomendado de homologação, não alteração exigida da guarda já conferida.
