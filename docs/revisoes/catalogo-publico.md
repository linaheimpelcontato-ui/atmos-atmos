# Parecer final — projeção pública do catálogo

## Decisão

**Aprovado o código do lote de projeção pública de products no estado conferido.** Os dois P2 finais foram corrigidos. Esta aprovação não certifica migração aplicada nem encerra a frente de privacidade de sellers/ProposalPublic, cujo delta ainda é aguardado.

Checkout: /Users/gustavosextaro/Projects/atmos. Revisão do diff e arquivos novos da projeção, hook, consumidores, formulário administrativo, status, sitemap e testes, incluindo os últimos ajustes informados pelo coordenador.

## Correções conferidas

- ItineraryDetail normaliza product_name/product_description e nomes legados por publicText antes do JSX; guideNames e resolvedTitle também usam o helper. Itineraries normaliza os caminhos de product_name. Objetos pt/en/es deixam de ser renderizados como filhos React.
- SQL preserva product_name/product_description localizados via whitelist de idiomas, product_storage_info apenas com prefix/folder e dayNumber. O mapper de detalhe aceita day ou dayNumber.
- Asserções de preservação da fixture usam IS DISTINCT FROM; ausência de campo esperado passa a falhar. ACL cobre anon/authenticated × ambos os helpers.
- requiresGuide/requires4x4 normalizam boolean e strings exatas true/false; consumidores preservam false explícito por fallback nullish.
- Contatos públicos têm controles explícitos no admin. Strings vazias publicadas ocultam o complemento estático nos consumidores ajustados. Não houve cópia automática de contato interno para público.
- public_email, longDescription_pt/en/es, total_capacity/total_rooms e capacity escalar têm projeção explícita. Arrays descartam is_active false boolean ou string.

## Segurança e contrato

A migration remove a política pública ampla conhecida de products e publica get_public_products com lista explícita de campos, filtro de ativo e tipo. O retorno aninhado é reconstruído por shapes restritos, sem repassar variables bruto, custos, comissões, supplier_id ou objetos arbitrários. Helpers têm EXECUTE revogado dos papéis públicos. A política administrativa permanece.

publicProducts consulta o RPC, propaga erro e não volta à tabela. O hook usa cache público separado. Consumidores revisados deixam de restaurar produtos/roteiros ausentes via catálogo estático; CatalogStatus oferece estado e retry. GuideWaterfalls e sitemap consomem a projeção.

## Validação realizada

Nesta rodada: **8/8 testes passaram** em publicProducts.test.ts, publicText.test.tsx e CatalogStatus.test.tsx. O teste de publicText renderiza um trecho com o helper, não a página inteira; a ligação dos pontos reais de JSX foi conferida por inspeção. Os 29 testes e tsc anteriores foram informados pelo coordenador.

Não executei build, SQL, banco ou migração. Não editei código nem fiz commit; escrevi somente pareceres.

## Pendências de implantação e riscos residuais

1. Validar SQL em PostgreSQL isolado: compilação, ACL efetiva, leitura direta anon/nãoadmin bloqueada, RPC seguro, acesso/update admin e baseline completo. Fixtures escritas não equivalem a fixtures executadas.
2. Integrar com revogação pública de sellers e adaptação de ProposalPublic. O commit e291022 e próximo delta de Claude terão parecer separado; esta aprovação não os inclui. Não reabrir products bruto para recuperar compatibilidade.
3. Verificar políticas permissivas alternativas, views/RPCs e privilégios no ambiente alvo. A revisão de migrations não prova o estado de produção.
4. Snapshot de item de roteiro sem is_active pode continuar citando produto filho posteriormente desativado. Definir se despublicação do filho também deve retirar conteúdo do roteiro ativo.
5. Cache durante falha de refetch pode continuar exibindo dados anteriores. A tela de roteiros ainda pode não mostrar vazio específico quando há outros tipos de produto no catálogo.
6. A validação frontend de variables não é whitelist recursiva; segurança depende do SQL. Sitemap recebe payload maior que o necessário.
7. Ampliar regressão integrada de páginas com dados representativos e verificar preservação de campos legados. A fixture autenticada verifica acesso/disponibilidade; a inspeção integral de segredos está concentrada no cenário anon. O endpoint é comum aos dois papéis.

A aprovação encerra os bloqueadores de código do catálogo apontados neste parecer. A liberação em ambiente depende das validações e da integração coordenada acima.
