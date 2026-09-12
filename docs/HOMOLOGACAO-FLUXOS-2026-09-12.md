# Homologação integrada — 12/09/2026

Ambiente: frontend local 127.0.0.1:8084, Supabase local 127.0.0.1:54321. Contas e registros fictícios, identificados como LOCAL, sem envio de mensagens ou contratos reais. Banco de ensaio separado contém a estrutura exportada de produção, sem dados de clientes. Estes resultados não são evidência de publicação em produção.

## Resultados confirmados

- Proposta pública B2C: dez combinações de visitante/admin e viewports 320×568, 390×844, 844×390, 1024×768, 1360×669. Título abaixo da barra, conteúdo visível e nenhuma rolagem horizontal. Corrigido também o título Investimento em 320 px. Screenshots inspecionados em portrait estreito e landscape. Safari/iOS físico não validado.
- Editor: Home passou a montar hooks de ajustes/focais e listener de edição. Handshake EDITOR_READY elimina dependência do evento load para código lazy. Salvar texto, editar novamente, recarregar editor e página pública, e salvar versões desktop/mobile passaram pela interface. Revisão de refetch e salvamento seletivo concluída; os quatro cenários foram repetidos com sucesso.
- Clientes: criar solicitação B2C autenticada e lead B2B público com o mesmo contato gerou dois registros separados por segmento. Repetir solicitação não duplicou cliente nem apagou nota manual. Abrir a tela Clientes preservou os dois registros e a nota manual.
- Proposta via RPC: totais falsos enviados pelo navegador foram ignorados. Três itens a R$100,75 produziram subtotal R$302,25; desconto de 10% arredondado para R$30,23 produziu R$272,02. Uma cortesia entre três participantes resultou em dois pagantes de R$136,01. Projeção pública preservou o total e não expôs cost_price, em B2B e B2C.
- Proposta via interface: Criar Proposta em Solicitações reutilizou o cliente vinculado; formulário carregou três pessoas/um dia. Salvo serviço ATMOS a R$100,75 por pessoa/dia com uma cortesia: total R$302,25, rateado entre dois pagantes. Pela regra atual implementada, desconto de itens não reduz a taxa de serviço ATMOS; isso não substitui validação comercial de uma planilha real.
- Segurança: cliente comum não leu CRM e não executou salvamento administrativo. Suítes SQL executadas em estrutura real de produção, localmente, cobrem privacidade, cálculos, catálogo, equipe, guias, identidade de custos e editor.
- Mapa: criação, reload, edição e exclusão do próprio ponto fictício passaram pela interface. O mapa continua ilustrativo; geografia/rotas reais permanecem fase 2.

## Acesso e publicação

- Supabase PRD ekbsqckzelabjabuodmo está ativo. DEV zjavxhmxrbpidvssrbca permanece INACTIVE; última tentativa de restore retornou403 por privilégio da conta. Portal Supabase existente está na tela de login.
- GitHub confirmou permissão push no repositório privado linaheimpelcontato-ui/atmos-atmos. Integração existente: Vercel studio-78/atmos-atmos, produção atmos-atmos.vercel.app. Nenhum token/login Vercel local foi encontrado nos locais de configuração verificados.
- Não aplicar políticas restritivas desacopladas do frontend novo. Schema, funções e frontend precisam de uma publicação coordenada e verificação posterior.
- Nomes dos secrets Clicksign/ManyChat/Calendly existem em produção. O valor do segredo de assinatura e a configuração do provedor não foram comprovados pelos testes simulados.

## Próximo fechamento

Concluir migrations de aprovação/recebíveis e transição Clicksign, revisar concorrência, repetir testes integrados após o lote final, salvar commits e backup da branch. Atualizar este documento com os resultados finais antes da entrega.

## Verificações adicionais

- Produtos: preço do produto fictício alterado de100,00 para127,35 pela interface; valor persistiu depois de recarregar.
- Editor após correção do Revisor: repetidos os quatro cenários de edição/reload e isolamento desktop/mobile, todos aprovados. Vinte regressões de DOM/mensagens cobrem refetch, salvamento seletivo e dispositivo fixo durante edição.
- Dependências: npm audit retornou zero vulnerabilidades conhecidas; isso não certifica ausência de vulnerabilidades no código ou nos provedores.
- Autorização de equipe: quatro corridas reais (READ COMMITTED/REPEATABLE READ, último admin e ator revogado) passaram.
- Nova pendência de autorização descoberta: uma linha PRD contém `allowed_modules=['all']`, enquanto o contrato do código usa vetor vazio para acesso total. Não converter silenciosamente esse legado em privilégio ampliado. Fronteira de módulos implementada e testada; conta com valor desconhecido requer reconciliação explícita por administrador total.

## Fechamento da integração local — 17:56 BRT

- 470 testes em 53 arquivos, TypeScript e build aprovados. As 18 suítes SQL passaram no clone local da estrutura PRD após aplicação de todas as migrations até `20260912240000`. Histórico da homologação principal confirma a mesma versão.
- Deno 2.9.6 verificou os 12 endpoints alterados. Corrigido catch de mídia incompatível com `unknown`; erros internos de armazenamento permanecem no log e a resposta pública é genérica.
- Repetido fluxo completo após autorização por módulos: mesmo contato em B2B/B2C, pedidos repetidos, nota preservada, total calculado no servidor, privacidade pública e recusa de operação administrativa por cliente. Em cada segmento, oito chamadas HTTP concorrentes resultaram em uma aprovação e um histórico; oito chamadas concorrentes de recebíveis produziram uma linha de R$272,02.
- Clicksign testado com runtime Deno real e banco local, mas APIs Clicksign/ManyChat simuladas: oito notificações concorrentes, uma assinatura persistida, uma interação e uma chamada de envio. Duas assinaturas HMAC inválidas rejeitadas. Consulta somente leitura em PRD confirmou zero referências legadas `clicksign:`, zero contratos enviados e zero assinados na data desta verificação.
- Precisão residual resolvida: serviço e hospedagem usam produtos decimais exatos; comissão arredonda uma vez por hospedagem após somar parcelas. Custos operacionais usam o mesmo cálculo decimal. Teste pela interface salvou serviço `0,145 × 3 = 0,44` e custo `1,5 × 0,29 = 0,44`; rótulos monetários exibem centavos. Revisão independente do Executor aprovou os últimos deltas.
- Autorização por módulo cobre RLS, RPC, rotas e endpoints administrativos, com matriz de 13 perfis e proteção contra escritas indiretas por FK. Valor legado `['all']` permanece bloqueado e sinalizado, sem conversão automática para acesso total.

## Limites operacionais remanescentes

- DEV permanece pausado; restore foi recusado com403 pela conta Supabase disponível. Homologação foi feita localmente e sobre clone da estrutura PRD, não no DEV remoto.
- Publicação remota ainda não executada neste registro; preparar backup e integrar schema, funções e frontend em conjunto.
- Notificação Clicksign em estado incerto exige reconciliação manual com o provedor antes de novo envio. Não existe worker/painel de recuperação automática; o teste simulado não comprova credenciais e modelos reais.
- Nenhum job existe em `cron.job` de produção. `MEETING_REMINDERS_SECRET` não consta nos nomes de secrets consultados; configurar o agendador autenticado antes de ativar lembretes. Agendadores externos não foram comprovados.
- A conta com módulo legado desconhecido precisa ser revisada por um administrador total. Não altera os outros dois administradores sem restrição registrada.
- Regras comerciais que dependem de planilha real, contabilidade/DRE e mapa geográfico de fase2 não foram inventadas nem declaradas completas.

## Backup e revisão final — 18:03 BRT

- Commit de implementação `a509b53` enviado para `origin/codex/atmos-stabilization`; SHA remoto conferido.
- GitHub/Vercel tentou preview e retornou **Deployment was blocked**, deployment `6414286543`, [registro Vercel](https://vercel.com/studio-78/atmos-atmos/CPBKtrxci7PYCSYWEhfjTs8t4Kqv). Não houve publicação de frontend, migrations ou functions em PRD. A causa detalhada ainda requer sessão do titular; não presumir problema de plano/autoria. Solicitação de sessão autenticada enviada ao Gustavo.
- Teste real de navegador com conta admin fictícia restrita a B2C confirmou propostas B2C disponíveis e B2B/financeiro bloqueados por URL direta. Conta temporária removida e sessão local administrativa restaurada.
- Revisão independente do Claude confirmou RLS por segmento. Uma tentativa da suíte em banco populado falhou por execução fora do contrato documentado (clone descartável vazio); repetida no ambiente exigido, passou. Nenhum defeito funcional foi confirmado nesse caso e nenhum teste/migration24 precisou ser alterado.
- Exceção histórica de segurança: migration de abril ainda pendente em PRD agora cria `force_insert` e revoga EXECUTE de PUBLIC/anon/authenticated na mesma transação, impedindo janela de exposição antes de sua remoção em setembro. Ensaio local confirmou privilégios false/false; helper removido do clone depois. Consulta PRD confirmou que essa função não existe atualmente. Isso não é uma alteração de histórico já aplicado em PRD.
- Procedimento assistido de Clicksign disponível em [CLICKSIGN-OPERACAO.md](CLICKSIGN-OPERACAO.md); guia de integração/recuperação em [PUBLICACAO-COORDENADA.md](PUBLICACAO-COORDENADA.md). Documentos operacionais não representam deploy nem comprovação de configuração dos provedores.

Revisão final do Claude: nenhum bypass ou lockout confirmado como bug na24. Suíte independente passou em clone vazio; consulta adicional no banco de QA confirmou B2C sem leitura de B2B. Permissões legadas e contas com papéis combinados continuam sujeitos ao preflight documentado.
