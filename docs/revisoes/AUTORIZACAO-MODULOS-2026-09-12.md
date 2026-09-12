# Autorização administrativa por módulos — migration 24

Estado: implementação local, sem commit ou deploy. A fronteira usa os sete identificadores já apresentados pela TeamTab. Nenhuma migration 21–23 foi editada. Não há alterações de dados ou permissões em PRD nesta execução.

## Identidade e legado

Administrador total continua sendo `user_roles.role='admin'` com linha de permissões ausente ou `allowed_modules=[]`. Os sete módulos explicitamente selecionados não equivalem a administrador total para gestão de equipe. `configuracoes` isolado também não concede equipe.

A migration original `20260308030132_314d8553-41a0-4752-be04-153ca9cc2cac.sql` define default `{}` e documenta vazio como acesso total. O snapshot PRD tem o mesmo default. Não foi encontrada evidência de que `['all']` fosse um módulo válido. Conforme decisão do responsável, a migration 24 **preserva a linha legada desconhecida, sem convertê-la em total**. O AdminLayout bloqueia suas rotas e apresenta aviso solicitando revisão por administrador de acesso total, sem revelar a identidade. A conta permanece pendente de reconciliação; existem outros administradores totais segundo o preflight fornecido.

A constraint de chaves reconhecidas é `NOT VALID`: dados legados não impedem a aplicação; novos INSERT/UPDATE precisam de lista válida. A edge de equipe também valida antes de procurar/convidar uma conta. Listas que misturam identificadores conhecidos e desconhecidos não concedem módulos parcialmente.

## Matriz de dados

`C` significa o módulo comercial correspondente ao segmento **exatamente** `b2c` ou `b2b`. Nomes como `site` não são aceitos como segmentos comerciais. `F` significa financeiro. As permissões abaixo intersectam as policies existentes: não criam acesso onde nenhuma policy anterior o concedia.

| Dados | Leitura administrativa | Mutação administrativa |
| --- | --- | --- |
| proposals; proposal_items/day_items/days/accommodations/costs/feedback | C ou F | C; referências de prospect devem permanecer no mesmo segmento |
| prospects; contacts; prospect_interactions | C, cadastros ou F | C ou cadastros; trocar email exige acesso comercial às propostas vinculadas |
| quote_requests | b2c | b2c |
| imersao_leads | b2b | b2b |
| financial_transactions, bank_accounts, branches | F | F |
| proposal_cost_checks/history | C ou F | F, mantendo o contrato de RPC de conferência |
| guide_trip_costs | F para admin; guia verdadeiro mantém seu contrato próprio | F para admin; guia verdadeiro mantém seu contrato próprio |
| products, guides, guide_waterfall_prices, sellers, suppliers, default_prices, catalog_items | cadastros, b2c, b2b ou F | cadastros; vincular/desvincular `guides.user_id` exige **total** |
| chart_of_accounts | cadastros, b2c, b2b ou F | F |
| pipeline_stages | C, cadastros ou F | C |
| email_templates | C | C |
| sales_goals | ferramentas ou C | ferramentas |
| calendar_events | C ou ferramentas, com autorização dos vínculos | C ou ferramentas, com autorização dos vínculos |
| itinerary_checklist | ferramentas e acesso à proposta | ferramentas e acesso à proposta |
| site_overrides, site_text_overrides, image_focal_points | leitura pública já existente | site |
| map_points | pontos ativos públicos; inativos exigem site | site |
| profiles | própria conta; cadastros pode ler | contrato de proprietário anterior |
| wishlist_items | própria conta | própria conta |
| admin_permissions, user_roles | própria linha ou total | total, conforme migration 17 |
| tabelas internas/desconhecidas | restrito negado | restrito negado |

Total mantém o acesso administrativo anterior. As verificações não alteram a autorização de service role/manutenção SQL, que continuam identidades confiáveis.

As leituras compartilhadas de catálogos dão acesso às linhas, incluindo os campos cadastrais existentes (não há projeção por coluna). Isso permite compor propostas e relatórios; não autoriza escrever nesses catálogos. Financeiro é transversal aos dois segmentos para conciliação/relatórios. Não concedemos essa leitura comercial transversal a `site`, `cadastros` ou `ferramentas` apenas para preencher dashboards.

## RPCs e caminhos indiretos

- `save_proposal_bundle` permanece **SECURITY INVOKER**, valida segmento antigo sob trava e segmento novo. Sincronização de comissões exige adicionalmente F quando há comissões enviadas ou comissões de hospedagem existentes, inclusive legadas. Sem F a operação inteira falha, sem salvar parcialmente nem omitir sincronização silenciosamente.
- `save_public_proposal_edits` exige mutação no segmento da proposta.
- `save_proposal_cost_checks` e `generate_proposal_receivable` exigem F antes de executar seus corpos privilegiados. A migration 24 injeta os guards nas definições vigentes, conservando ACLs, assinatura e lógica financeira; verifica as âncoras antes da substituição.
- `get_public_proposal` só concede a visão administrativa a quem pode ler a proposta. O caminho público publicado por token permanece disponível.
- Prévia de guia exige cadastros, e suas propostas exigem acesso ao segmento/F. Vínculo administrativo legado com guia não contorna esse filtro. Só total pode atribuir uma conta de login ao guia; isso impede que cadastros delegue o acesso a uma segunda conta controlada. Guias não administradores mantêm a relação verificada existente.
- Policies **restritivas** se combinam por AND com as policies permissivas existentes, incluindo possíveis permissões redundantes. `USING` e `WITH CHECK` protegem o estado anterior e posterior.
- Trigger adicional verifica o principal JWT em escritas feitas por funções privilegiadas e ações de FK. Excluir proposta não pode desvincular financeiro ou apagar custos de guia sem F. Excluir prospect não pode alterar propostas fora do escopo por SET NULL. Filhos comerciais em cascata herdam a autorização de exclusão do pai validado; filhos financeiros continuam exigindo F.
- Clientes, guias e chamadas públicas continuam usando suas policies/contratos prévios. Aprovação e criação de contrato públicas exigem token e estados de negócio; não recebem uma exigência de módulo administrativo. Webhooks mantêm autenticação própria. Não alteramos as funções Clicksign ativas do Executor.

## Interface, mídia e integrações

AdminLayout usa allowlist de 32 rotas e não monta o Outlet sem permissão. Query `segment` não substitui o módulo da rota; valores inválidos/duplicados bloqueiam restritos. Rotas públicas/cliente/guia não passam por esse bloqueio.

Como os arquivos de mídia dividem caminhos, escrita no bucket assets e mutações/presign R2 exigem site. Cadastros sozinho não pode sobrescrever mídia da Home. Upload R2 usa JWT da sessão; listagem pública do bucket configurado continua pública. Uma delegação por pasta exigiria um contrato separado, não implementado neste lote.

Sete edges recebem autenticação antes de operações externas: discover-prospects(b2b), enrich-prospect(cadastros/b2b/b2c), report-insights(F/b2b/b2c), calendly-setup(total), rename-storage-folders(total), meeting-reminders(segredo scheduler ou total), r2-storage(site para escrita). Relatórios/enriquecimento usam o payload enviado, sem consulta privilegiada ao CRM. Calendly deixa de devolver a signing_key.

Configuração necessária antes da publicação: `MEETING_REMINDERS_SECRET` e cabeçalho `x-scheduler-secret` no agendador, ou sessão Auth de total. Um agendamento antigo somente com chave do projeto não autentica esse endpoint. Nada foi alterado no scheduler remoto. Detalhes em `supabase/functions/_shared/ADMIN_AUTHORIZATION.md`.

## Limites funcionais explícitos

- Site sozinho não vê dados pessoais/comerciais para os contadores atuais do painel; não foi criada uma RPC agregada de métricas neste lote.
- Ferramentas sozinho não autoriza ler ou editar propostas vinculadas de todos os segmentos. Agenda/checklist precisam também do segmento apropriado. Alterações genéricas de proposta, inclusive guia designado, exigem o módulo comercial.
- Cadastros sozinho não abre propostas no detalhe do cliente, não delega login de guia e não altera identidade de cliente para obter propostas fora do escopo.
- Salvar propostas com sincronização financeira exige também financeiro; mídia exige site. Essas dependências são recusas reais no servidor.
- Não há segregação por vendedor, coluna de catálogo ou organização além dos módulos/segmentos descritos. O banco não trata preferências da UI como autorização.

## Validação

Banco exclusivo `atmos_module_auth_test` no container `supabase_db_atmos-homolog-20260912`, criado de dump **somente schema** local (public/auth/extensions/storage), sem dados PRD. Donos foram omitidos para usar postgres no clone; grants de objetos foram preservados e comandos ALTER DEFAULT PRIVILEGES de outros donos foram omitidos. Foi criada a linha singleton local da trava de equipe. Nenhum teste escreveu no banco compartilhado `postgres`, no ensaio de PRD de outro executor ou remotamente.

A aplicação limpa de 21/22 e da versão final da 24 passou via psql. Não foi usado o parser CLI antigo; integração CLI permanece com o Root usando 2.117.0.

O teste SQL versionado `supabase/tests/admin_module_authorization.sql` usa 13 contas fictícias em transação e rollback: total/7 explícitos/cada módulo/legado desconhecido/cliente/guia/segunda conta de controle. Inclui DML real permitido e negado, segmentos falsos, movimentação de filhos, conferência financeira, geração de recebível, bundle, editor público, cascatas, vínculo de guia e tentativa de reassociar identidade de cliente. Nenhuma fixture de conta permanece após rollback.

Testes de frontend/edges: 125 casos em seis arquivos (rotas/layout, autorização de endpoints, R2/JWT e equipe). TypeScript app e diff check aprovados. Integrações externas são simuladas: nenhum contrato, email, WhatsApp ou operação de storage real foi enviado por estes testes.

Regressão final: 12 suítes SQL aprovadas no mesmo banco isolado (módulos, equipe, aprovação, recebível, portal de guia, catálogo público, privacidade pública, edição pública, bundle, identidade de custos, textos e assets). A fixture de equipe que usava a chave fictícia `fixture_restricted` passou a usar `site`, respeitando a validação nova; a mesma substituição foi feita no script de concorrência, que não foi reexecutado neste lote.
