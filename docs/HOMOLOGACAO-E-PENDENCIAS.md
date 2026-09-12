# Homologação e trabalho restante

## Limite desta entrega

As correções estão em branches de desenvolvimento. Nenhuma migration, função remota, alteração de dados reais ou publicação em produção foi executada. A inspeção de políticas no repositório não comprova o estado das permissões do banco em produção.

O PostgreSQL local não iniciou: o pull Docker falhou por falta de espaço e erro de I/O. O disco chegou a 128 MB livres; foram removidos apenas builds gerados nesta sessão. Nenhum volume Docker ou arquivo pessoal preexistente foi apagado. As fixtures SQL são código de teste ainda não executado.

## Antes de promover a branch

1. Liberar espaço e recuperar Docker, ou disponibilizar Supabase de homologação isolado. Conferir baseline e migrations já aplicadas no destino.
2. Aplicar migrations novas em homologação, verificando ordem, donos de funções, ACL e RLS. Executar cada arquivo `supabase/tests/*.sql` com `psql -v ON_ERROR_STOP=1`; os testes usam fixtures e rollback e não devem apontar para produção.
3. Exercitar leitura como anon, cliente dono, cliente não dono e administrador. Nenhum cliente deve obter linhas internas de produtos/propostas/itens/vendedores. Conferir publicação, despublicação, detalhamento e feedback.
4. Validar editor → salvamento → reabertura → proposta pública → financeiro com a planilha Melhor aos 50. Confirmar custo zero, comissão histórica ausente, cortesias, quartos diferentes, impostos, descontos, cancelados/pagos e falhas com rollback.
5. Conferir rastreabilidade NF/competência/fornecedor/grupo em criação, edição, lista e exportação; testar fornecedores inativos e acesso administrativo.
6. Executar build integrado com espaço suficiente e teste de navegação desktop e aparelho móvel real, inclusive Safari/iOS no dispositivo afetado pelo stack overflow relatado. A verificação em iframe de 390 px não substitui esse teste.
7. Configurar variáveis de ambiente e publicar frontend/funções em conjunto com suas migrations. Sem a RPC de catálogo, a tela informa indisponibilidade e oferece retry; não restaura leitura insegura. Preparar retorno sem reabrir políticas de acesso a dados internos.

## Funcionalidades que ainda exigem desenvolvimento/validação

- Migração integral de imagens/vídeos: faltam originais, inventário de objetos e destino autorizado. Os ajustes atuais recuperam arquivos já versionados e encerram tentativas de imagem com falha; não representam migração concluída.
- Relações completas entre fornecedores alternativos, solicitações/wishlist, clientes B2B/B2C, grupos e publicação precisam homologação ponta a ponta. Cadastro grava o perfil pessoal; criação de lead CRM ocorre pelo trigger existente da solicitação (quote_requests), cuja execução depende da homologação. Tentativas de cadastro/alteração de CRM direto pelo cliente foram removidas: as políticas anteriores não concediam a gravação necessária. Tags adicionais de wishlist/roteiro exigem fluxo servidor explícito; não sobrescrever notas internas. Falha de insert da solicitação mantém o formulário e impede confirmação/encaminhamento como sucesso.
- Portal de guias: contexto e agenda agora usam RPCs com vínculo guides.user_id e projeção operacional restrita às viagens atribuídas. A confirmação simulada foi removida; aceitar/recusar participação e informar indisponibilidade ficam desabilitados até existir resposta persistida e notificação real. Perfil/tarifas permanecem administrativos. Validar RLS dos custos e troca de responsável; is_active não revoga autenticação por si só, exigindo desfazer o vínculo de usuário quando necessário.
- Comissões históricas sem snapshot e recebíveis antigos sem origem exigem confirmação/mapeamento. Dashboards ainda precisam explicitar resultados incompletos, sem tratar ausência como lucro comprovado.
- Rateio de cortesias entre modalidades heterogêneas, regras fiscais, desconto/comissão de vendedor, DRE e conciliação dependem de exemplos e definição da cliente/contabilidade.
- Gravações concorrentes e retries após resposta perdida ainda exigem controle de versão/idempotência completo; verificar também aceite concorrente e geração de recebíveis.
- Clicksign: templates, credenciais de teste, variáveis e ciclo assinatura/pré-reserva precisam integração e validação reais. Não foi enviado contrato a ninguém.
- Mapa, editor visual e WhatsApp/pipeline permanecem na fase posterior acordada; provedor e fluxos de mensagens ainda não foram definidos.
- Catálogo: validar formatos históricos representativos, referências a produtos filhos desativados, contatos públicos e SEO/sitemap dinâmico. O cache pode mostrar conteúdo anterior durante falha de atualização.
- Acessibilidade: auditoria adicional de textos alternativos, navegação e modais secundários; os espaços escuros em dúvidas/depoimento seguem hipóteses visuais, sem causa isolada.

A nota `tasks for Gustavo` contém somente acessos, informações e decisões que dependem de Gustavo/cliente. Este arquivo também registra o trabalho técnico restante da equipe.

## Edição visual da proposta

`save_public_proposal_edits` salva observações, títulos dos dias, descrições e ordem de itens em uma transação administrativa. Atualiza apenas a observação em `proposal_days`, preservando ID/descrição e sem excluir dias. Itens precisam pertencer à proposta. A interface será integrada na frente de privacidade; não publicar a UI sem a migration.

A migration 20260912020000_verified_cost_identity.sql vincula novas conferências ao UUID e ao estado do item, preserva histórico e serializa gravações pelo mesmo lock da proposta. O editor visual mantém uma proteção conservadora: não reordena enquanto houver custos conferidos. Desmarcar é uma operação explícita e persistida; após reorganizar, o checklist não reaproveita custo/nota de outra identidade. Registros legados não recebem associação presumida e exigem revisão manual. Consulte VERIFIED-COST-IDENTITY.md para contratos e limites, inclusive hospedagens e concorrência. Fixtures SQL preparadas, ainda não executadas.
