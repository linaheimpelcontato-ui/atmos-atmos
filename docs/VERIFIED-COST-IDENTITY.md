# Conferência por identidade — delta sobre 813aee6

Migration incremental: `20260912020000_verified_cost_identity.sql`. Aplicar antes do frontend. Substitui a definição de save_proposal_bundle mantendo o contrato anterior (incluindo show_price_breakdown, recebíveis e child_ids), adiciona vínculo/snapshot, histórico e RPC de checklist. Integrar com cuidado se houver outro delta posterior na mesma função.

SQL NÃO EXECUTADO. A fixture `supabase/tests/verified_cost_identity.sql` é para PostgreSQL descartável com baseline completo, não produção. Não houve banco/build/pull. A revisão estática não comprova sintaxe, instalação, ACL, RLS ou concorrência real.

## Contrato

- Bundle exige posições finais únicas por dia, inclusive sem conferência. Payload é coleção completa; itens omitidos seriam removidos e por isso não podem incluir slot conferido. Com check conferido, compara estado persistido e final: UUID, dia, índice, produto, variação, categoria, fornecedor e veículo. Zero também é protegido. Slot persistido ambíguo/orfão bloqueia. Locks do pai e checks precedem gravações.
- O editor conserva identidade original e índices carregados; não renumera ao abrir. Resumo não aplica actual_cost a item diferente, slot ambíguo ou check sem vínculo seguro. Preflight valida coleção filtrada antes de calcular payload; erro de leitura dos checks impede save. Custos próprios registrados continuam fallback, sem tentar reparar contaminação histórica presumida.
- item_id e identity_snapshot são novos e NÃO recebem backfill. UUID é mantido como referência histórica, intencionalmente sem FK: excluir um item não apaga nem desvincula o histórico. Snapshot contém UUID, posição, produto, variação, categoria, fornecedor, quantidade e veículo.
- Novo save_proposal_cost_checks é SECURITY DEFINER, exige auth.uid + admin, bloqueia o mesmo pai que bundle/RPC visual e compara snapshot esperado ao item persistido. Quantidade integra essa comparação para rejeitar checklist aberto antes da mudança. Item de proposta diferente, ambíguo ou ausente falha. Cada revisão/desmarcação guarda o registro anterior completo em proposal_cost_check_history (leitura admin), na mesma transação.
- Trigger SECURITY INVOKER impede INSERT/UPDATE/DELETE direto em checks de dias por authenticated, inclusive admin: apenas execução pelo owner via RPC faz essas escritas. Não depende de flag de sessão forjável. A instalação assume função SECURITY DEFINER e tabela pertencentes ao mesmo owner (padrão das migrations); validar isso no PostgreSQL local. Caminho de slots negativos das hospedagens é preservado e está fora deste contrato de itens diários.
- Legados sem vínculo não fornecem custo/nota/validação para célula atual. UI mostra o registro separado e permite desmarcar explicitamente, preservando histórico. Registro conferido antigo não pode ser reassociado silenciosamente. Após desmarcar, uma nova revisão informada pode ocupar o slot, e o registro anterior fica no histórico completo. Não há exclusão de checks.
- Quantidade normal pode mudar no bundle, mantendo a regra existente de custo unitário versus total. Não inventamos preço nem invalidamos a identidade do serviço só por mudar quantidade. Snapshot de uma nova escrita de checklist precisa coincidir inclusive em quantidade. Fornecedor/veículo mudam a identidade, exigindo desmarcar/reconferir. Nulo de veículo equivale ao default carroTurista existente.
- Removidas heurísticas que convertiam zero em sugestão e que presumiam que custo total histórico estava errado. Sem teto arbitrário de custo baseado no catálogo. Recalcular sugestões desmarca a conferência; erros da RPC não fecham painel nem anunciam sucesso.

## Validação

`tsc --noEmit -p tsconfig.app.json` executado: falhou em arquivos preexistentes da worktree (WaterfallTab/UpdatePayload, RouteTracker/gtag, catalogSync/transferTables, imports, badges e SmartFilterState). Nenhum diagnóstico nos arquivos deste delta; correções do principal não foram copiadas para cá. Não declarar typecheck integrado aprovado.

65 testes Vitest aprovados: helpers de identidade/snapshot/retorno, regressões de cálculos e bundle, e checklist renderizado. B movido ao slot A não herda o 100 conferido; zero é preservado; legacy amount/notes não migram para célula; erro do servidor conserva painel aberto e não anuncia sucesso.

Fixture SQL (NÃO EXECUTADA): authenticated admin de verdade, zero, troca de UUID/dia/posição/catálogo/variação/categoria/fornecedor/veículo, exclusão, reorder, colisão, rollback de título/check, texto/quantidade legítimos, snapshot antigo após quantidade/reorder, bloqueio de write direto, liberação explícita, histórico/reassociação informada, legado sem backfill, nãoadmin e ACL anon. Termina em ROLLBACK.

## Integração e limites

- Coordenador cuida da unicidade final e guard na RPC visual. Não alterados neste delta.
- Permissões de outras tabelas não foram abertas. Slots negativos do checklist de hospedagem mantêm o fluxo anterior; não afirmar que sua persistência usa o novo protocolo.
- Clientes antigos com escrita direta de checks diários passam a receber erro: implantar frontend junto da migration. A nova RPC é chamada por db tipado como any, como as demais chamadas deste módulo; regenerar tipos Supabase quando ambiente permitir.
- Histórico pré-migration não pode provar identidade; exige revisão humana. Preços/custos já contaminados no passado não são corrigidos automaticamente.
- Este protocolo serializa bundle/visual/checklist. Escritas privilegiadas diretas em proposal_day_items fora desses endpoints não participam do protocolo; não afirmar proteção contra manutenção SQL administrativa arbitrária.
- Conflito concorrente de dois revisores para o mesmo item, sem mudança de composição, ainda tem última gravação como vigente; todas as revisões posteriores à migration são arquivadas. Controle de versão do próprio conteúdo da conferência é evolução separada.
