# Revisão independente da retomada — 12/09/2026

**Parecer sobre o lote original de 13 migrations: não liberar sem as correções abaixo.** Há políticas permissivas reais que as migrations não removem e uma constraint de PRD incompatível com a nova criação segmentada de prospects. O executor informou que as 13 migrations aplicaram sem erro no banco LOCAL `atmos_prd_rehearsal`, criado a partir do dump PRD. O log do ensaio confirma que a cadeia deixa falhas de segurança e rejeita solicitações legítimas. Aplicabilidade do DDL não equivale a aprovação de deploy.

## Escopo e evidência

- Commits `4815206` e `65872e7`, no HEAD `908dd8aac07507cc9d55d19e9ae0551379f76c11`. O hash informado `e65872e7` não existe neste checkout; o segundo commit foi identificado pelo histórico.
- Lido [HOMOLOGACAO-2026-09-12.md](../HOMOLOGACAO-2026-09-12.md), incluindo histórico PRD até `20260330233228` e 13 migrations locais sem registro. Revisão com agentes independentes de cálculos, segurança e cadeia SQL.
- Comparação com os arquivos locais fornecidos: [prd-schema.json](../../scratch/remote-audit/prd-schema.json) e o dump complementar [prd-schema-before.sql](../../scratch/remote-audit/prd-schema-before.sql), que ficou disponível durante a revisão. Não houve consulta remota desta revisão.
- SHA-256 JSON: `ee47f71139a90611dcd51c08beee55efa4025f70ac6fdafab8533ba39292081b`; SQL: `554d4d72ad5e126e8b48eb64e208044cfca8e12f2c5cd0ecbed0043895506f98`.
- Evidência estática de schema, funções e consumidores. O dump SQL complementa o JSON com constraints e grants. Não executei ataques, alterações de dados, migrations, portais, fixtures ou testes SQL de escrita. Um agente validou a função de cálculo local com `BEGIN READ ONLY; SELECT; ROLLBACK`, sem DML/DDL. Os testes anteriores descritos na homologação não foram reexecutados nesta revisão.
- Evidência adicional do executor, recebida após o primeiro parecer: [rehearsal-tests-first.log](../../scratch/remote-audit/rehearsal-tests-first.log). Li o log local: `guide_portal.sql` falha com `guides table exposed`; `public_proposal_privacy.sql` falha na asserção de zero linhas para SELECT anônimo de proposals; `request_pipeline_segments.sql` falha com `duplicate key value violates unique constraint "unique_email"`. Isso reproduz os achados 1–3 sobre schema derivado de PRD. A aplicação das 13 migrations sem erro foi relatada pelo executor, não executada por esta revisão.
- A suspeita inicial de falha em `require_cost_check_rpc` por diferença entre `supabase_admin` e `postgres` não é classificada como bug de produção. O trecho de `verified_cost_identity.sql` do log lido termina em ROLLBACK sem erro; a identificação final de papéis/reexecuções permanece com o executor. Não inferir uma nova vulnerabilidade a partir de uma fixture executada com papel diferente do esperado.
- P1: corrigir antes de liberar o fluxo afetado. P2: defeito concreto de consistência, sem classificar isoladamente como bloqueador crítico. Achados anteriores ao lote estão identificados; não são apresentados como regressões introduzidas por esses commits.

## 1. P1 — PRD continua permitindo leitura pública e escrita de propostas por qualquer cliente

**Drift real não coberto pelo lote.** O JSON, linhas 3398 e 3447, e o dump SQL, linhas 1726 e 2008, contêm estas políticas de `public.proposals`:

- `Admins can do everything on proposals`: `ALL TO authenticated USING (true) WITH CHECK (true)`.
- `Public can read specific proposal`: `SELECT USING (true)`, para PUBLIC.

O nome da primeira não restringe seu funcionamento a administradores. Ambas são permissivas. O dump, linhas 2406–2408, confirma `GRANT ALL` na tabela para `anon`, `authenticated` e `service_role`; portanto, não é apenas uma hipótese condicionada à existência de grants.

A migration [public_proposal_privacy.sql](../../supabase/migrations/20260911120000_public_proposal_privacy.sql), linhas 52–67, remove os nomes `Anon view shared proposals` e `Customer view published proposals`, mas nenhuma migration pendente remove os dois nomes acima. A política administrativa correta coexistente não restringe uma política permissiva verdadeira.

**Cenário e impacto:** a leitura direta da tabela continua revelando propostas completas, inclusive rascunhos, tokens e campos internos, sem apresentar token. O ensaio local confirmou a falha da asserção de zero linhas para anon. Uma conta comum continua autorizada pelas políticas e grants a inserir, alterar ou excluir propostas; esse DML não foi explorado nesta revisão. Alterar `total`, status ou vínculo por acesso direto contorna a RPC e sua validação administrativa. A projeção segura e `server_proposal_totals` não protegem esse caminho.

**Correção necessária:** reconciliar explicitamente essas políticas no schema real, preservando apenas os acessos administrativos intencionais e as RPCs públicas. Validar anon e cliente comum contra leitura e DML diretos, inclusive rascunhos. Os testes sobre uma instalação limpa não reproduzem esse drift.

## 2. P1 — Outras políticas reais permitem adulterar CRM, catálogo e identidade dos guias

**Drift real não coberto pelo lote.** Os seguintes nomes também sobrevivem às migrations:

| Tabela | Política | Acesso real | Linha no JSON |
| --- | --- | --- | --- |
| products | Admins can delete products | DELETE authenticated, true | 3483 |
| products | Admins can insert products | INSERT authenticated, check true | 3495 |
| products | Admins can update products | UPDATE authenticated, using/check true | 3519 |
| prospects | Admins can do everything on prospects | ALL authenticated, using/check true | 3543 |
| guides | Admins can mutate guides | ALL authenticated, using/check true | 3591 |
| guides | Public can read guides | SELECT PUBLIC, true | 3603 |
| sellers | Admins can do all to sellers | ALL authenticated, using/check true | 3797 |
| suppliers | Admins can do all to suppliers | ALL authenticated, using/check true | 4007 |

O dump confirma grants de tabela: guides 2316–2318, products 2352–2354, prospects 2418–2420, sellers 2436–2438 e suppliers 2448–2450. Em products, a remoção do SELECT público pode limitar UPDATE/DELETE que necessitem visualizar linhas; **INSERT continua autorizado** pela política verdadeira. Não é correto tratar o catálogo como protegido apenas por remover `Public can read products`.

**Cenário especialmente grave:** cliente altera `guides.user_id` para sua própria identidade. A nova [guide_portal.sql](../../supabase/migrations/20260912010000_guide_portal.sql), linhas 13–15, aceita esse vínculo; linhas 26–34 retornam as propostas do guia e linhas 43–62 autorizam custos por esse vínculo. O dump também confirma grants de `guide_trip_costs` nas linhas 2304–2306. A verificação da RPC depende de um cadastro que, em PRD, qualquer cliente pode adulterar.

**Correção necessária:** remover/restringir todas essas políticas permissivas, proteger a atribuição de identidade do guia e revalidar a matriz anon/cliente/guia/admin. Não basta corrigir somente proposals. Não há evidência de ataque ocorrido; há autorização indevida demonstrada pelos arquivos de schema.

## 3. P1 — UNIQUE(email) de PRD derruba solicitações entre segmentos

**Incompatibilidade concreta do novo fluxo com PRD.** O dump, linhas 1398–1399, define `public.prospects CONSTRAINT unique_email UNIQUE(email)`. Essa constraint não aparece na cadeia local e nenhuma das 13 migrations a reconcilia.

A nova [request_pipeline_segments.sql](../../supabase/migrations/20260912130000_request_pipeline_segments.sql), linhas 36–48, procura contato apenas no segmento da solicitação e insere outro prospect quando encontra o contato somente no outro segmento.

**Reprodução:** existe prospect B2B com `pessoa@example.invalid`; chega solicitação B2C com esse mesmo e-mail normalizado. O EXISTS segmentado retorna falso; o INSERT viola `unique_email` com `23505`. Como é um gatilho AFTER INSERT na mesma transação, a solicitação também é desfeita. O caminho inverso tem o mesmo problema. O ensaio do executor confirmou a violação com `segment-test@example.invalid` dentro de `sync_request_prospect`. Locks por contato não resolvem incompatibilidade de unicidade.

**Correção necessária:** reconciliar a regra de unicidade com a deduplicação segmentada antes de ativar o fluxo. Examinar dados e dependências antes de substituir a constraint; não apagar ou mesclar contatos por suposição. A migration pode aplicar sem erro e o defeito surgir apenas no uso.

## 4. P1 — Edição em massa continua deixando total incompatível com desconto/imposto

**Caminho preexistente não abrangido pelo novo cálculo.** [AdminProposals.tsx](../../src/pages/admin/AdminProposals.tsx), linhas 357–359 e 416–422, oferece desconto percentual/fixo e imposto na edição em massa e executa UPDATE direto de um campo em `proposals`.

**Cenário:** proposta de R$ 1.000,00 em itens, sem extras/imposto/desconto. Alterar em massa o desconto para 10% persiste `discount_percent=10`, mas mantém `total=1000`, quando o cálculo esperado é R$ 900,00. A página pública usa o total persistido. Também é possível gravar imposto de 100% por esse caminho, que a nova RPC rejeitaria. Não existe recálculo obrigatório de total no UPDATE direto examinado.

**Correção necessária:** encaminhar alterações de campos financeiros pelo cálculo transacional, ou retirar esses campos da edição em massa até corrigir o fluxo. Corrigir o drift de RLS dos achados 1–2 não elimina esse defeito para administradores legítimos. A afirmação de totais derivados no servidor precisa ser limitada a `save_proposal_bundle` enquanto houver outros caminhos.

## 5. P2 — Arredondamento da prévia difere do SQL

[proposalCalcs.ts](../../src/lib/proposalCalcs.ts), linhas 2 e 47, usa `Math.round` sobre ponto flutuante; [server_proposal_totals.sql](../../supabase/migrations/20260912140000_server_proposal_totals.sql), linhas 77–83, usa `round(numeric,2)`.

Entrada permitida: subtotal R$ 100,75, desconto 10%, demais componentes zerados. A função TypeScript retorna desconto R$ 10,07 e total R$ 90,68; a função SQL retorna desconto R$ 10,08 e total R$ 90,67. Resultado confirmado com função local somente leitura. A mesma função `money` participa do financeiro.

Usar aritmética decimal/centavos com regra explícita e validar paridade nesse caso. Não basta somar `Number.EPSILON`. Não encontrei evidência da hipótese de truncamento obrigatório do preço unitário: `proposal_day_items.value` é numeric sem escala no schema examinado.

## 6. P2 — E-mail normalizado no prospect não encontra a solicitação original

[request_pipeline_segments.sql](../../supabase/migrations/20260912130000_request_pipeline_segments.sql), linhas 15, 20 e 46–48, normaliza apenas o e-mail salvo no prospect. [server_proposal_totals.sql](../../supabase/migrations/20260912140000_server_proposal_totals.sql), linhas 355 e 359, ainda localiza a solicitação com igualdade exata de e-mail.

Solicitação com `Pessoa@Example.invalid` gera prospect `pessoa@example.invalid`; salvar proposta com novas datas/participantes pode concluir sem atualizar a solicitação. A UI encontra o prospect por `ilike` e trim em `AdminQuotes.tsx:269`, mascarando a divergência. Corrigir a comparação nos dois ramos ou usar um vínculo explícito com a solicitação.

## Limites anteriores de segurança

**Permissões por módulo:** continuam sendo restrição de interface, não autorização no servidor. A migration `20260308030132_314d8553-41a0-4752-be04-153ca9cc2cac.sql:15–39` permite a qualquer admin alterar `admin_permissions` e conceder papéis. `manage-admin/index.ts:24` e `server_proposal_totals.sql:119` verificam apenas admin. Um colaborador com módulos limitados pode ampliar seu próprio acesso. P1 se a configuração de equipe for usada como fronteira de segurança; pendência já reconhecida na homologação.

**Storage:** a migration local `20260305163813_808973ce-8da2-43b7-baad-3638f5b063bf.sql:12–27` permite INSERT/UPDATE/DELETE no bucket `assets` a qualquer authenticated, sem ownership/admin. `EditorModeListener.tsx:296` usa esse bucket com upsert. P1 para o bucket se essas políticas estiverem presentes no remoto; os snapshots examinados não inventariam storage, portanto esse estado remoto não foi confirmado. Parte das mídias usa R2: não afirmar que todo o catálogo atual está exposto.

## Cobertura das remoções e aplicação da cadeia

- **Auto-admin signup coberto:** o snapshot contém exatamente `on_auth_user_created_assign_admin` e `assign_admin_role_on_signup()`. As linhas 13–14 de [remove_unsafe_legacy_writes.sql](../../supabase/migrations/20260912120000_remove_unsafe_legacy_writes.sql) removem ambos e preservam o gatilho de perfil `on_auth_user_created`. Papéis já concedidos permanecem; isso não corrige os acessos diretos dos achados 1–2.
- **force_insert coberto no estado final:** a assinatura histórica é `force_insert(text,jsonb)` e a linha 3 da mesma migration a remove. Os snapshots fornecidos não a listam. A migration pendente de abril, entretanto, cria essa RPC SECURITY DEFINER sem checagem/revogação, e só a migration de setembro a apaga. Aplicação com commits intermediários e API disponível pode introduzir uma janela vulnerável; falha intermediária pode deixá-la ativa. Definir execução sem exposição intermediária, sem simplesmente aplicar a cadeia com tráfego aberto. As migrations de catálogo/edições contêm BEGIN/COMMIT próprios; não presumir que um wrapper externo torne todo o lote atômico.
- **Sincronização destrutiva de catálogo coberta:** `trg_sync_product_to_drafts` e a função do snapshot correspondem às remoções das linhas 8–9. Propostas negociadas deixam de ser sobrescritas por esse gatilho no estado final.
- **RPC de link próprio:** o REVOKE de PUBLIC e anon cobre grants explícitos que apenas revogar PUBLIC deixaria ativos. Não encontrei escape novo concreto nessa alteração.
- **DDL:** as novas colunas financeiras e de identidade de custo não constam no snapshot; os quatro nomes de policies de `guide_trip_costs` usados por DROP existem no dump. A aplicação completa sem erro foi posteriormente confirmada pelo executor em banco local derivado de PRD. Isso não assegura reexecução parcial: diversas instruções CREATE/ADD não são idempotentes.
- **Abril não é mero reparo de histórico:** `handle_new_user()` remoto também cria prospect B2C; a migration `20260421113744` o substitui por criação apenas de perfil, com birth_date/city. Isso é mudança efetiva de comportamento a incluir na homologação de signup; não marcar a migration como aplicada só porque parte das colunas já existe. As solicitações passam a ser a origem do CRM nesse caminho local.


## Atualização — revisão da migration de reconciliação

Revisada também `20260912150000_reconcile_remote_policy_drift.sql`, fornecida pelo executor após os achados. **Não encontrei bloqueador concreto nessa migration para o snapshot examinado. Ela cobre os achados 1–3**, sem resolver os achados 4–6 e as limitações anteriores.

- As dez instruções DROP POLICY correspondem exatamente aos dez nomes permissivos observados nas seis tabelas. As políticas administrativas com `has_role` permanecem. Com as demais remoções anteriores, os grants de tabela não bastam para liberar um cliente sem uma policy que autorize a operação. A remoção da mutação pública de guides protege o vínculo usado pelo portal.
- `DROP CONSTRAINT unique_email` seguido de índice único `(segment,email)` remove a incompatibilidade B2B/B2C. `segment` é NOT NULL no dump; a unicidade anterior global de e-mail não nulo é mais restritiva, portanto os dados que a satisfazem também satisfazem o novo índice. A comparação case-sensitive e a aceitação de múltiplos e-mails NULL preservam as características anteriores por segmento. Não há normalização ou mesclagem de contatos nessa migration.
- A transação engloba as remoções e o novo índice; erro ao criar o índice desfaz também o DROP da constraint. O uso de `IF NOT EXISTS` não verifica a definição de um índice já existente com o mesmo nome; esse nome não consta no snapshot, portanto não é impedimento concreto para a primeira aplicação examinada.
- Há um `ON CONFLICT(email)` no `handle_new_user` remoto, mas a migration de abril substitui essa função antes desta reconciliação. Não encontrei consumidor desse conflito simples no código/migrations finais. Aplicar a nova migration isoladamente sobre o PRD antigo, omitindo a substituição de abril, deixaria esse caminho de signup incompatível; respeitar a cadeia revisada.
- O executor informou aprovação das nove suítes na cópia local do schema PRD após a correção. Esta revisão não reexecutou as suítes. A regressão adicional de leitura/escrita nas seis tabelas está sendo preparada pelo executor: conferir o estado persistido após UPDATE/DELETE, pois RLS pode produzir zero linhas afetadas sem erro. Incluir tentativa de alteração de `guides.user_id` e controle positivo administrativo.

**Pendência necessária que permanece:** edição em massa de desconto/imposto no achado 4 ainda contorna o cálculo. Para uma correção mínima, remover os três campos financeiros da edição em massa e restringi-los também no handler; a alternativa completa é executar cálculo transacional nessa operação. O problema de centavos e a sincronização por e-mail dos achados 5–6 também permanecem. A nova migration não elimina a janela intermediária de force_insert na aplicação da cadeia; manter a exigência de execução sem exposição intermediária.

## Condições para reconsiderar a liberação

A reconciliação fornecida cobre políticas reais e unicidade de prospects; confirmar sua aplicação e a regressão adicional. Corrigir o caminho de edição em massa; definir a aplicação sem exposição temporária de force_insert. Validar o schema resultante com o drift do snapshot presente, incluindo acesso direto anon/cliente, adulteração de vínculo de guia e solicitações B2B/B2C com o mesmo contato. As evidências locais anteriores continuam úteis, mas não cobrem esses desvios reais de PRD.

Único arquivo escrito por esta revisão: este parecer. Sem commit, alterações de código, banco ou histórico remoto. As alterações de layout em `ProposalPublic.tsx` e `src/styles/proposal-public.css` pertencem ao executor e não foram modificadas nesta revisão.
