# Retomada e homologação — 12/09/2026

Este registro atualiza o encerramento de 11/09. A branch continua `codex/atmos-stabilization`. As oito notas conectadas foram lidas, incluindo a conversa completa e o fechamento. Nenhuma migration ou publicação foi aplicada ao Supabase remoto; os resultados abaixo são locais, salvo a inspeção explicitamente identificada como painel publicado.

## O que o painel permitiu descobrir

| Área inspecionada | Evidência no painel publicado |
| --- | --- |
| Painel do Site | Métricas, filtros e funis existentes; não é uma página vazia. |
| Editor Visual | Controles Home/Desktop/Mobile e visualização carregados; edição/persistência não homologadas nesta sessão. |
| Mapa | Tela e filtros existentes, nenhum ponto encontrado. O código usa coordenadas do mapa ilustrado; não equivale a um mapa geográfico com rotas. |
| Produtos | 45 cachoeiras, 23 experiências, 13 serviços, 25 hospedagens e 1 roteiro no catálogo administrativo. Preços, status e opções visíveis. |
| Clientes | 36 registros consolidados: 6 B2C e 30 B2B. Há registros antigos de teste e cadastros com etapa ausente. |
| B2C | Duas solicitações e uma proposta em rascunho com total zero. Dashboard e ligação às solicitações acessíveis. |
| B2B | 18 solicitações, duas propostas em rascunho; dashboard exibe várias etapas de nomes repetidos. Não mesclar etapas históricas por suposição. |
| Melhor aos 50 | Editor mostrou R$ 51.000 em itens, R$ 42.000 em serviço Atmos, 20 viajantes, duas cortesias. Exibia R$ 93.000 de roteiro, dedução de R$ 9.300 por cortesias e total R$ 84.980: divergência reproduzida sem salvar o registro. Hospedagem de R$ 97.032 estava em pagamento direto ao fornecedor. |
| Templates B2B | Oito mensagens de abordagem por canais comerciais. Não são os templates de contrato Clicksign pedidos na nota anterior. |
| Configurações financeiras | Plano de contas exibiu “Nenhuma conta cadastrada”. |
| Equipe | Administração autenticada e configurações de acesso visíveis. Nenhuma permissão de usuário real foi alterada. |

Não foi necessário reenviar login do painel, cadastros existentes nem exemplos de solicitações. O painel do site não fornece, por si só, administração do projeto Supabase, secrets do Clicksign ou configuração Vercel.

## Correções implementadas

- Migration de privacidade: corrigido apóstrofo não escapado em comentário SQL que impedia aplicar a cadeia de migrations em PostgreSQL real.
- Removida a RPC legada `force_insert`, sem consumidores no código: executava inserção genérica como definidor e desativava triggers de integridade, sem autorização administrativa.
- Removido o gatilho que concedia admin automaticamente pelo e-mail de um novo cadastro. Papéis existentes são preservados; a gestão administrativa existente continua separada do signup público.
- Removido o gatilho que sobrescrevia valores/custos/fornecedores de rascunhos ao editar catálogo. Propostas salvas conservam os valores negociados; novas seleções continuam consultando o catálogo.
- Revogada explicitamente a execução anônima de `get_my_published_proposal_link`: o teste real demonstrou que revogar apenas PUBLIC não removia o grant explícito de anon do Supabase.
- Solicitações criam CRM no servidor com segmento B2B/B2C correto, e-mail normalizado e deduplicação por contato dentro do segmento. Há locks por contato para envios concorrentes. Cadastro existente não tem notas, tags ou etapa sobrescritas pelo envio público.
- Eliminados UUIDs fixos de etapas. Sem configuração, a solicitação persiste e o lead fica sem etapa, em vez de falhar por chave estrangeira.
- Consulta de vínculo na tela de solicitações considera segmento, ignora diferenças de caixa do e-mail e descarta respostas antigas ao trocar de solicitação.
- `save_proposal_bundle` deriva subtotal e total da composição resolvida no servidor, sob o mesmo lock/transação. Campos de totais enviados pelo navegador não são confiáveis. Não há recálculo em massa de propostas históricas.
- Imposto, desconto, ocupação e valores inválidos são rejeitados no cálculo. Preview e salvamento usam total arredondado em centavos antes do rateio; financeiro arredonda as mesmas etapas monetárias.
- Ranking de guias usa quantidade e custo salvo e calcula resultado com todos os custos das propostas associadas. A tela esclarece que propostas com vários guias aparecem em mais de uma linha e que as linhas não são somáveis.

Regra comercial preservada: desconto percentual/fixo sobre os itens do roteiro; somar serviço Atmos e hospedagem paga à Atmos; aplicar o imposto configurado por dentro. Isso descreve a implementação existente, não uma validação tributária. Base/ordem comerciais ainda precisam da conferência com cliente/contabilidade.

Exemplo sem imposto/desconto: R$ 93.000 divididos por 18 pagantes = média de R$ 5.166,666…; rateio em centavos possível: seis pagamentos de R$ 5.166,66 e doze de R$ 5.166,67. Isso não define rateio de quartos heterogêneos, nem substitui a planilha real.

## Evidências de validação

- Docker reiniciado sem apagar volumes preexistentes. Supabase isolado iniciou e aplicou a cadeia do repositório; as novas migrations finais também foram registradas no histórico local.
- Nove suítes SQL executadas com `psql -v ON_ERROR_STOP=1`, todas aprovadas: atomic_proposal_bundle, guide_portal, legacy_write_security, public_catalog_projection, public_proposal_edits, public_proposal_privacy, request_pipeline_segments, server_proposal_totals, verified_cost_identity.
- Testes usam anon, authenticated, dono, estranho e admin conforme cada fluxo; fixtures SQL terminam em rollback.
- API HTTP local real: três contas fictícias confirmadas localmente, solicitação B2C autenticada, solicitação B2B pública, criação de CRM, salvamento administrativo, publicação local e leitura pública. B2C persistiu R$ 300; B2B R$ 3.000, com 18 pagantes. Cliente obteve o próprio link; leitura de CRM e salvamento administrativo foram negados.
- 183 testes Vitest em 29 arquivos aprovados, incluindo leitura de XLSX real em memória com acentos, centavos, custo zero e vínculo de fornecedor.
- TypeScript aprovado. Build Vite 7 aprovado em 8,23 s. Persistem avisos de chunks grandes, especialmente biblioteca de localidades.
- Instalação limpa `npm ci --ignore-scripts`: zero vulnerabilidades reportadas pelo npm, contra 25 inicialmente (uma crítica). Isso não é garantia de ausência de falhas na aplicação ou no banco remoto.

## Dependências

Atualizações compatíveis de dependências transitivas e atualização coordenada para Vite 7.3.6, plugin React SWC 4.3.3, Vitest 4.1.11 e React Router DOM 7.18.3. SheetJS 0.20.3 está fixado pelo tarball oficial no package.json e pelo integrity do lockfile. Node requerido: `^20.19.0 || >=22.12.0` (a sessão usou Node 24.12).

Referências oficiais consultadas: [SheetJS](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/), [Vite 7](https://v7.vite.dev/guide/migration), [Vitest](https://vitest.dev/guide/migration.html), [React Router](https://reactrouter.com/changelog).

## Ambiente local e retomada

- Configuração persistente, ignorada pelo Git: `scratch/homolog-environment/supabase/config.toml`; project_id `atmos-homolog-20260912`.
- Container PostgreSQL: `supabase_db_atmos-homolog-20260912`; API local 54321; PostgreSQL local 54322.
- `.env.homolog.local` contém somente URL local e chave pública local. Não contém service role. `.env`/`.env.production` não foram alterados.
- Iniciar banco: `supabase start --workdir scratch/homolog-environment -x realtime,storage-api,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor`.
- Atualizar cópia das migrations em scratch antes de retomar novas alterações; a fonte versionada é sempre `supabase/migrations`.
- Iniciar preview: `npm run dev -- --host 127.0.0.1 --port 8084 --mode homolog`.
- Scripts locais de fixtures: `scratch/seed-homolog.mjs` e `scratch/api-homolog.mjs`. O seed é de uso único por banco vazio. Ambos validam a URL exata local antes de escrever. Não apontar para produção. Configuração/chaves operacionais temporárias ficam em `/private/tmp/atmos-homolog-status.env`; não versionar.
- Ao encerrar, o disco estava com menos de 2 GB livres. Não iniciar downloads de imagens ou stacks adicionais sem conferir espaço. Nenhum volume preexistente foi removido.

## Limitações e próximos trabalhos

O portal Maestri antigo manteve a página/módulo anterior em memória: comandos de navegação/reload não produziram o estado esperado. O novo portal “Atmos — homologação isolada” foi registrado no canvas, mas a automação retornou `portal not found`; a tentativa de navegador independente também falhou por timeout. Portanto, o fluxo visual completo com o novo banco NÃO está aprovado. A configuração servida pelo Vite foi verificada como local e os fluxos foram exercitados pela API local, sem criar cadastros no backend publicado. O portal antigo fez uma tentativa de login inválida com credencial fictícia no backend anterior; nenhuma conta foi criada ali.

Permanecem: acesso administrativo ao Supabase remoto e comparação de schema/migrations; deploy coordenado; revisão independente deste novo lote; homologação visual/mobile; contratos Clicksign e notificações; definição de mídias e origem dos arquivos; planilha real; conciliação e rateio comercial; permissões por módulo no servidor; completar fornecedores de custos operacionais e o fluxo financeiro/operacional; editor e mapa completos. O cadastro de teste administrativo já existente no painel publicado não foi revogado automaticamente.

Nenhum contrato, e-mail ou WhatsApp real foi enviado. Nenhuma proposta publicada foi editada. Sem push, merge ou deploy nesta sessão. Não declarar o sistema 100% pronto nem invulnerável.
