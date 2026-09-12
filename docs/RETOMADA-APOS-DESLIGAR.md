# Atmos — fechamento da sessão e retomada após desligar

Registro da sessão de 11/09/2026, aproximadamente duas horas de trabalho. Esta nota reúne entregas, atividades dos terminais, evidências, pendências e instruções para retomar.

## 1. Estado que fica salvo

- Projeto principal: /Users/gustavosextaro/Projects/atmos
- Branch de integração: codex/atmos-stabilization
- Código funcional aprovado pelo Revisor: b6a72ca59b38741a8dabc200e6f401aa9d1bb38f.
- Commit de fechamento da implementação/documentação anterior a esta nota: 9072540. A cópia desta nota acrescentará somente documentação.
- Repositório: https://github.com/linaheimpelcontato-ui/atmos-atmos
- Todos os códigos entregues pelos agentes foram integrados e commitados no principal. Sua árvore estava limpa na conferência de encerramento.
- GitHub: leitura, clone e push --dry-run para uma nova branch funcionaram. Não houve push real. Os novos commits ainda estão apenas neste notebook; commit local não é backup remoto.
- Não houve merge em main, deploy, aplicação de migrations, alteração de dados reais de negócio ou migração de mídias.
- O login administrativo foi validado, e o site de produção foi inspecionado sem executar operações de negócio.
- Credenciais permanecem na nota original “site”. Não são reproduzidas nesta nota nem na documentação.

## 2. O que cada terminal fez e como ficou

### Codex — principal/coordenador
Leu integralmente a transcrição da conversa, a revisão e a nota de site/acessos/repositório. Consolidou regras da cliente e tarefas externas. Clonou o projeto, verificou acesso GitHub, criou branch e worktrees, dividiu atividades e encaminhou código ao Revisor.
Corrigiu site/mídias/login/runtime, protegeu catálogo público, corrigiu formulários, implementou a RPC de edição visual, integrou cálculos/financeiro/guias/privacidade, resolveu conflitos de tipos das RPCs e fechou o guard do widget Clicksign.
Executou testes, TypeScript, builds e inspeções no preview. Inventariou mídias. Tentou preparar PostgreSQL isolado; as tentativas falharam no Docker. Guardou documentação e pareceres no repositório.

### Executor
Trabalhou em atmos-calculos: cortesias, comissões, preservação de custo zero e valores históricos, arredondamento, rastreabilidade financeira, salvamento transacional da proposta e proteção de recebíveis pagos/cancelados.
Depois implementou o portal de guias em atmos-guias.
Na revisão final, corrigiu a associação de conferências de custos: UUID do item, snapshot, histórico e gravação serializada por RPC, sem reaproveitar custo de outro serviço por posição.
Entregas integradas. Declarou que não iniciará novos trabalhos.
Worktree atmos-calculos: branch codex/atmos-calculos, último commit a6b7f42, com REVISAO-CALCULOS.md local não versionado preservado. Não apagar esse arquivo.
Worktree atmos-guias: branch codex/atmos-guias, commit cb906a6, limpa.

### Claude Code #3
Auditou site público e registrou reprodução das falhas na nota “auditoria-atmos-falhas-pub”.
Trabalhou em atmos-privacidade: políticas de acesso, projeção pública de propostas, toggle de preços, feedback, proteção do CRM e vendedores, edição visual por RPC, datas de validade e isolamento de respostas entre sessões/propostas.
Corrigiu descrições após reorder usando UUID, validação de JSON aninhado e callbacks de salvamento atrasados.
Commits e291022, d400be3 e 893e84f, todos integrados no principal. Worktree limpa e parada. O último ajuste do widget Clicksign foi feito pelo Codex no principal.

### Revisor
Revisou sucessivas rodadas de site, catálogo, cálculos, rastreabilidade, guias, privacidade, edição visual e identidade dos custos.
Encontrou e exigiu correções de perda de descrições, falso sucesso em gravação, vazamento de CRM/JSON, respostas de sessão antiga, custo transferido entre itens e callbacks do Clicksign.
Aprovou a integração funcional final por inspeção. Não executou SQL. A aprovação de código não substitui homologação das migrations.
Pareceres preservados em docs/revisoes/.

### Shell #2, Shell #4 e Shell #5
Na inspeção de encerramento, os três estavam em prompt de shell vazio, sem entrega ou execução de projeto registrada nesta sessão. Não lhes foi atribuída implementação.

### O que ainda estava vivo ao conferir
Um servidor Vite do preview local e 36 processos “maestri ask” em espera de comunicação. Esses processos não significam 36 implementações em andamento: os agentes encerraram as entregas e os commits estão salvos.
Build, TypeScript e testes finais terminaram. A tentativa Supabase foi interrompida após falhar; não existe conexão PostgreSQL local validada para repassar.
Ao desligar, preview e processos em memória param. Não dependemos deles para preservar código ou pareceres. Esta nota não encerrou aplicações nem desligou o notebook.

## 3. Implementações — site, mídia e experiência

- Recuperação de referências antigas para arquivos de imagem já presentes no repositório, preservando nomes Unicode.
- Mapeamento dos 68 arquivos de public/assets e das referências aplicáveis em src/assets; hero-home usa a foto panorâmica existente.
- Fallback de imagem com candidatos finitos, sem recursão/repetição infinita. Falha termina em indicação de indisponibilidade.
- Galeria com renderização estável.
- Vídeo do hero montado somente em telas a partir de 768 px, com foto de fallback e carregamento reduzido.
- Modal Login/Cadastro fecha de verdade pelo botão e por Escape; fechamento não faz logout involuntário. Título/descrição acessíveis e restauração de foco.
- Carregamento da biblioteca de localidades adiado para a etapa de localização, com validação e retry.
- Botão “Assista ao filme” acessível por teclado; proteção contra corrida de play/pause.
- CTAs da hero em português.
- Ajustes de title/canonical/SEO e remoção de provider duplicado.
- Correções de imports e tipos que impediam TypeScript, além de filtros/ordenação/limpeza das tabelas administrativas.
- Correção de referência de tabela e distinções de preço/capacidade na sincronização de transfers. Nenhuma sincronização foi executada em produção.
- Tela neutra de manutenção preparada via VITE_SITE_MAINTENANCE=true, sem ativação em produção. É uma opção visual, não controle de segurança do banco.
- Inventário inicial: 286 arquivos de mídia versionados, 431.069.663 bytes, SHA-256 por arquivo em docs/MEDIA-INVENTORY.json. Destino ainda nulo.
- Nenhuma foto/vídeo remoto foi migrado, apagado ou substituído no provedor.

## 4. Implementações — catálogo, solicitações e privacidade

- RPC get_public_products com projeção explícita e whitelist de JSON: dados públicos sem custos, comissões, fornecedores ou campos internos arbitrários.
- Contatos públicos separados dos contatos internos; controles administrativos para publicar os campos adequados.
- Catálogo público não volta a exibir itens estáticos desativados quando a consulta falha. Há estados de carregamento, erro/retry e vazio.
- Tratamento de textos multilíngues e formas históricas para evitar renderização de objetos como texto.
- Formulários de solicitação preservam respostas quando a gravação falha e não anunciam sucesso nem tentam encaminhar ao WhatsApp antes de persistir.
- Removidas leituras/escritas de CRM pelo cliente nos formulários e cadastro. Perfil pessoal continua sendo cadastrado; o trigger existente da solicitação é responsável pelo lead, a validar no banco.
- get_public_proposal exige token/slug correto e publicação para nãoadmin e retorna somente campos permitidos.
- Migrations removem políticas permissivas de propostas/itens/dias/hospedagens/feedback, vendedores e leitura do próprio prospect com dados CRM internos.
- Detalhamento por linha oculto por padrão, com boolean salvo; admin pode habilitar. O bundle preserva o valor quando omitido, aceita true/false explícito e rejeita null/string.
- Condições de pagamento e descrição do serviço validam tipos JSON antes de extrair texto, evitando serializar segredos aninhados.
- Link de proposta do cabeçalho obtido por RPC específica para o usuário conectado.
- Publicar/despublicar, contrato e detalhamento verificam erro e linha persistida antes de atualizar a tela.
- Edição visual faz uma RPC atômica; preserva IDs/descrições dos dias e atualiza apenas os campos previstos. Descrições de itens usam UUID, inclusive após arrastar/reordenar.
- Respostas antigas de leitura, gravação, aprovação e geração de contrato são descartadas ao trocar sessão/proposta.
- Widget Clicksign ignora script.onload/onSigned antigos após navegação ou desmontagem; evento antigo não marca outra proposta como assinada.
- Validade usa data de calendário em America/Sao_Paulo, inclusive no último dia, coerente entre UI e endpoint.
- Sem pagantes válidos, valor médio fica indisponível, não zero inventado. Rótulo “Valor Médio por Pagante”.
- Feedback passa por RPC com vínculo entre token, proposta e publicação.
- Aprovação e geração de contrato exigem publicação. Integração Clicksign real ainda não homologada.

## 5. Implementações — proposta e financeiro

- Custos do grupo preservados no cálculo de cortesias; exemplo: 20 viajantes com 2 cortesias têm custo distribuído por 18 pagantes.
- Comissão de parceiro sobre custo do fornecedor, com distinção entre preço fixo e por pessoa.
- Preservação de custo zero, percentuais e valores históricos; ausência de comissão exige confirmação, sem inventar percentual.
- Correções de arredondamento e consistência de hospedagem/comissões.
- Fornecedor, número da NF e data de competência acrescentados aos lançamentos, formulários, listagem e exportação.
- Salvamento da composição da proposta por save_proposal_bundle em uma transação, preservando filhos/IDs e informações não editadas.
- source_key para origem dos recebíveis. Legados sem origem não são sincronizados automaticamente: ficam para mapeamento manual.
- Recebível pago vinculado preserva ID/status/data; alteração de valor bloqueia e faz rollback.
- Comissão cancelada reaparecendo exige tratamento manual, sem reabertura silenciosa.
- Retorno de child_ids por coleção na ordem do payload.
- Conferência de custos vinculada ao UUID e snapshot do item, com histórico e RPC sob lock da proposta.
- Reordenar/trocar produto/fornecedor/veículo/remover item não pode transferir custo conferido para outro serviço.
- Custos/notas legados sem identidade segura não alimentam automaticamente uma nova célula.
- Erros ao salvar conferência mantêm o painel aberto e não anunciam sucesso.
- Colisões de posições finais são rejeitadas. Editor visual bloqueia reorder enquanto houver custos conferidos.
- Histórico e conferências legadas são preservados; dados já contaminados no passado não são corrigidos por suposição.

## 6. Implementações — portal de guias

- Identificação do guia pelo vínculo guides.user_id.
- Contexto/agenda por RPC e apenas viagens atribuídas ao guia, com projeção operacional sem valores comerciais internos nem dados privados de clientes.
- Preview administrativo com UUID real de guia, sem IDs fictícios.
- Correção dos campos usados pela agenda/dashboard e remoção de supostos ganhos derivados de custos.
- Políticas e validações para custos do guia vinculados à atribuição vigente; conversão adequada de valores monetários.
- A confirmação simulada foi retirada. Aceitar/recusar participação e informar indisponibilidade permanecem desabilitados até implementar resposta persistida e notificações reais.
- Perfil e tarifas continuam administrativos. Essa parte não é self-service completo do guia.

## 7. O que já foi comprovado funcionando

- 171 testes Vitest, em 28 arquivos: aprovados.
- npx tsc --noEmit -p tsconfig.app.json: aprovado na branch integrada.
- npm run build: aprovado em 18,43 segundos.
- Última inspeção da home local: 123 imagens presentes e nenhuma imagem com carregamento concluído e naturalWidth zero.
- Fechamento do login verificado no preview e nos testes.
- Preview de catálogo sem RPC nova mostrou erro/retry, sem fallback inseguro.
- Inspeção anterior em iframe de 390 px: sem overflow horizontal nem imagens quebradas, sem vídeo do hero.
- Revisor aprovou os deltas funcionais; pareceres estão versionados.

Importante: testes de componentes/helpers usam mocks e não comprovam RLS ou execução SQL. Nenhuma fixture SQL foi executada. O código de banco está preparado e revisado estaticamente, mas ainda não está homologado nem instalado em produção. Não declarar o sistema inteiro pronto para uso real.

## 8. O que Gustavo precisa fazer

1. Recuperar/reiniciar o Docker preservando volumes, ou disponibilizar Supabase de homologação isolado. O download do PostgreSQL falhou por I/O em io.containerd.metadata.v1.bolt/meta.db. O disco chegou a 128 MB livres; recuperou mais de 5 GB, mas o erro persistiu. Não apagar volumes indiscriminadamente.
2. Disponibilizar acesso administrativo de desenvolvimento ao Supabase para verificar migrations aplicadas, homologar e publicar funções/RLS. Variáveis públicas já estão no repo; CLI ainda não autenticado. Não colocar service role no frontend nem em notas abertas.
3. Fornecer originais das fotos/vídeos e relação com produtos/roteiros.
4. Definir provedor/projeto/bucket de destino e orçamento para mídias; acesso Cloudflare para inventário/exportação se necessário. Firestore não é armazenamento de arquivos.
5. Enviar a planilha real “Melhor aos 50” para fechar a comparação de totais, cortesias, hospedagem, comissões, impostos e descontos.
6. Definir com cliente/contabilidade base do imposto, ordem dos descontos, comissão do vendedor, DRE e conciliação.
7. Definir rateio de cortesias entre quartos/modalidades diferentes. A média por pagante não é preço individual exato de hospedagem heterogênea.
8. Providenciar mapeamento de comissões/recebíveis históricos e conferir registros sem origem segura.
9. Disponibilizar fornecedores/vínculos/dados de pagamento faltantes e regras operacionais dos guias.
10. Disponibilizar templates B2B/B2C, IDs e acesso de teste/API Clicksign.
11. Informar o caminho de deploy/configuração Vercel para a publicação posterior.
12. Na etapa de atendimento, definir ManyChat ou outro provedor autorizado, pipeline e eventos/mensagens.
13. Validar em aparelho real, especialmente Safari/iOS e no dispositivo em que ocorreu o stack overflow.
14. Providenciar backup remoto dos commits locais quando retomar, enviando a branch de desenvolvimento; não confundir isso com merge/deploy.

Essas tarefas também estão na nota “tasks for Gustavo”. Não é necessário reenviar as credenciais de admin já fornecidas.

## 9. Pontos de atenção e trabalho técnico restante

- Prioridade seguinte: banco isolado, migrations e fixtures com papéis anon/dono/estranho/admin; depois homologação ponta a ponta com a planilha.
- Implantar frontend, RPCs, políticas e funções de forma coordenada. Sem migrations, partes do frontend novo falharão de modo explícito.
- Conferências novas impedem gravação direta de clientes antigos: atualização de frontend precisa acompanhar a migration.
- Não resolver falta de acesso reabrindo leitura de tabelas internas.
- O preview usa as variáveis existentes do backend do projeto: não fazer testes destrutivos ou criar dados reais nele.
- Nenhum contrato foi enviado, nenhuma mensagem real foi enviada pelo agente e nenhuma migração de mídia aconteceu.
- Não foi comprovada a causa do stack overflow original. Iframe não substitui celular real.
- Permanecem auditoria completa de alt/navegação/modais secundários e investigação visual das faixas escuras em dúvidas/depoimento.
- Bundle/checklist usam locks, mas não existe controle completo de versão/idempotência para todos os fluxos. Retry após resposta perdida pode duplicar solicitações; feedback em múltiplos itens ainda pode ser parcial.
- Checklist de hospedagem conserva fluxo próprio; não afirmar que tudo usa o novo protocolo dos itens diários.
- Portal de guias ainda requer aceite/recusa persistido, notificações e regras de disponibilidade. is_active por si só não revoga a autenticação; vínculo do usuário exige cuidado.
- Dados financeiros antigos sem snapshot/origem precisam revisão humana. Dashboards ainda precisam evidenciar valores incompletos.
- Catálogo requer amostras históricas e validação de referências a produtos filhos desativados/cache/SEO.
- Relações B2B/B2C, fornecedores alternativos, grupos e pedidos exigem homologação completa.
- DRE, conciliação, contratos, mapa e WhatsApp/pipeline não estão concluídos.
- O build avisa sobre chunks grandes; a biblioteca de localidades continua grande, embora adiada.
- A auditoria inicial de dependências apontou 25 vulnerabilidades, incluindo uma crítica, ainda sem remediação/homologação nesta frente. Não executar atualização automática indiscriminada.
- O script de lint original usa “|| true” e não é prova de aprovação. Build/TypeScript aprovados não significam lint limpo.

## 10. Retomada depois de ligar o notebook

1. Abrir Maestri e esta nota. Não é necessário clonar tudo novamente.
2. No terminal principal:
   cd /Users/gustavosextaro/Projects/atmos
   git status --short --branch
   git log -3 --oneline
3. Para reabrir o preview:
   npm run dev -- --host 127.0.0.1 --port 8084
   Abrir http://127.0.0.1:8084 no portal “Atmos — preview local”.
4. node_modules já está instalado. Só reinstalar dependências se houver necessidade; não rodar Docker/build em paralelo sem conferir espaço.
5. As worktrees auxiliares usam sparse-checkout para economizar disco: código está presente, public/ e src/assets/ não. Isso é intencional, não perda de arquivos. Build completo deve usar a pasta principal.
6. Recuperar o Docker ou obter banco isolado antes de testar SQL. A pasta tentativa local é /private/tmp/atmos-db-validation, projeto atmos-db-validation, porta planejada 55322. Isso NÃO é uma conexão operacional; a pasta temporária pode desaparecer ao reiniciar.
7. No banco isolado, verificar baseline e aplicar a cadeia completa de migrations antes das fixtures. Rodar cada supabase/tests/*.sql com psql -v ON_ERROR_STOP=1. Não apontar para produção.
8. Não cherry-pickar novamente os commits dos agentes: já estão integrados no principal.
9. Após SQL/homologação, revalidar fluxos de UI com o backend novo, enviar branch remota e preparar publicação controlada.

## 11. Onde consultar os detalhes

Arquivos permanentes no projeto principal:
- docs/EXECUCAO-ATMOS.md — execução e evidências finais.
- docs/HOMOLOGACAO-E-PENDENCIAS.md — limites e trabalho restante.
- docs/revisoes/ — pareceres de site, catálogo, rastreabilidade, cálculos, guias e privacidade.
- docs/MEDIA-INVENTORY.json — inventário/hashes das mídias.
- docs/CATALOGO-PUBLICO.md — contrato de catálogo.
- docs/VERIFIED-COST-IDENTITY.md — conferências e histórico.
- docs/privacy-migration-notes.md — contrato/entrega da privacidade.
- supabase/migrations/ e supabase/tests/ — SQL preparado, não executado.
- docs/RETOMADA-APOS-DESLIGAR.md — cópia desta nota.

Migrations novas principais:
20260911120000_public_proposal_privacy.sql
20260911223000_financial_transaction_traceability.sql
20260911224000_atomic_proposal_bundle.sql
20260911225000_public_catalog_projection.sql
20260911230000_public_proposal_edits.sql
20260912010000_guide_portal.sql
20260912020000_verified_cost_identity.sql

Notas Maestri anteriores preservadas: conversa-completa, revisao-do-projeto, site, Atmos — requisitos e execução, tasks for Gustavo, auditoria-atmos-falhas-pub e contrato-show-price-breakdow.

Logs finais de testes/tsc/build estavam em /tmp/atmos-final-*.log. Podem desaparecer após reiniciar; seus resultados e os pareceres já estão na documentação permanente.

Resumo para a retomada: implementação deste lote salva e revisada; 171 testes, TypeScript e build passaram; banco e integrações reais aguardam homologação; nada foi publicado em produção.

