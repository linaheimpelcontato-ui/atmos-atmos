# Interatividade de clientes e camadas da interface — 22/09/2026

## Preparação de commit e push — 22/09/2026

- Usuário autorizou commit e push das correções acumuladas. Destino confirmado: `origin/codex/atmos-stabilization`, com base remota `4277c74`; sem merge ou push para `main`.
- Validação repetida antes do envio: **70 arquivos / 593 testes aprovados**, TypeScript do app e build em modo **production** aprovados. Build isolado em `/private/tmp/atmos-production-prepush.ui8D7M/build`, sem substituir `dist` nem reiniciar a homologação. Permanece o aviso preexistente de chunks grandes.
- Revisados 59 arquivos alterados/novos; arquivos de ambiente, credenciais, caches, build e fixtures do banco local não integram o commit. Logs de testes/build em `/private/tmp/atmos-prepush-{tests,build}-20260922.log`.
- Leitura da Vercel confirmou produção atual em `4277c74` e rastreamento automático de produção na branch `main`. O push desta branch deve gerar preview; promoção ao domínio oficial é uma etapa separada.
- Consulta REST remota somente leitura, sem registros (`select=city&limit=0`), confirmou **HTTP 400 / 42703: `column prospects.city does not exist`**. A migration aditiva está incluída no código, mas não foi aplicada remotamente nesta preparação. Solicitada autorização específica para aplicação no banco real e promoção do frontend; commit/push não comprovam essas etapas.

## Atualização: destaque preto no gráfico B2C e menu lateral voltando ao topo

### Causas confirmadas

- **Evolução Mensal:** o cursor do Recharts usava `rgba(var(--admin-primary), 0.03)`, mas o token vale `0 0% 0%` (HSL). No WebKit/Maestri a expressão é inválida; o preenchimento SVG computado era `rgb(0, 0, 0)`, opaco. A borda dos tooltips usava a mesma mistura inválida de RGBA com tokens HSL.
- **Barra lateral:** `useAdminGuard` dependia de `navigate`. No BrowserRouter instalado, essa função muda de identidade quando muda o pathname; o efeito reiniciava `checking`, desmontando todo o painel e recriando o `<nav>`. Reprodução antes da correção: B2C → Metas alterou `scrollTop` de **416 para 0** e o nó anterior ficou desconectado do DOM.
- O carregamento lazy das páginas também dependia do Suspense global da aplicação, sem uma fronteira local no conteúdo administrativo. Além disso, o reset de rolagem apontava para `<main>` com `overflow:hidden`, não para o contêiner central realmente rolável.

### Correções e evidências

- Cores convertidas para `hsl(var(--admin-primary) / 0.03)` e `hsl(var(--admin-border) / 0.4)`. No portal, o mesmo hover passou a computar **`rgba(0, 0, 0, 0.03)`**, mantendo o tooltip legível e os valores das séries intactos.
- O guard usa a função de navegação atual por referência e mantém o efeito vinculado à identidade/estado de carregamento da autenticação, sem reiniciá-lo por uma simples troca de rota. Verificações de papel/permissões, bloqueio em erro, cancelamento de respostas antigas e limpeza no logout foram preservados. `canAccessAdminRoute` continua sendo avaliado em cada rota/query, antes de renderizar o módulo; nenhuma regra de autorização/RLS foi relaxada.
- Suspense adicionado dentro do conteúdo da página: carregamento de módulos não substitui a navegação. Somente o contêiner central volta ao topo quando muda o pathname; removido o reset global da janela. Link atual recebe `aria-current="page"`.
- Após a correção, cliques reais no portal dedicado preservaram **o mesmo nó e o mesmo scrollTop**: B2C → Metas **416 → 416**; Metas → B2B **814 → 814**; B2B → B2C **567 → 567**. Conteúdo central inicia em zero e a seção selecionada acompanha a rota. Não houve overlay de erro. O portal foi deixado no gráfico B2C; o Portal #10 não foi operado.
- Novos testes com MemoryRouter real reproduziram o defeito antes da correção (três falhas), cobrindo persistência do nó/rolagem, página lazy pendente, reset somente do conteúdo e rota não autorizada. Acrescentados testes da cor do gráfico e da consulta de permissão em andamento quando muda o callback de navegação, incluindo logout pela referência mais recente.
- **70 arquivos / 593 testes passando**, 22 nos testes focados desta rodada. TypeScript do app e `git diff --check` sem erros. Build homolog isolado concluído em `/private/tmp/atmos-dashboard-navigation.WFieUb/build`, sem substituir `dist`; aviso preexistente de chunks grandes permanece. Logs `/private/tmp/atmos-dashboard-navigation-{tests,suite,types,build}-20260922.log`.
- Nenhum commit, deploy, alteração de schema ou gravação de cadastro/proposta nesta rodada.

## Validação assistida: proposta de teste para o botão Validar Custos

- Criada **pela interface administrativa local** a proposta **ATMOS-0009 — LOCAL — Teste Validar Custos 22/09**, ID `424cf61e-7f6d-4470-a397-a7acc1713380`, em B2C/Rascunho. Dois participantes, dois dias, um item `LOCAL Passeio Homologação` por dia (catálogo `3b4be0b4-77a5-4607-bbbd-3b0893f3fb13`), venda unitária R$ 127,35, custo cadastrado R$ 80,00 e Serviço ATMOS de R$ 50,00 por pessoa/dia. Total R$ 709,40. Sem prospect, vendedor, publicação ou envio.
- Regra confirmada: `ProposalCostChecklistButton` não renderiza sem `proposalId` ou sem item vinculado ao catálogo fora da categoria `Hospedagem`. Item de catálogo recém-adicionado e ainda sem ID persistido desabilita o botão e pede salvar. O botão fica ao lado do título **Custos Operacionais**, abaixo do Serviço ATMOS. Custos operacionais digitados à mão não substituem os itens de catálogo nessa condição.
- Antes do primeiro salvamento o botão estava ausente, conforme a regra. Depois de salvar e reabrir, apareceu habilitado com duas pendências. Clique real abriu o Checklist de Custos, com ambos os dias.
- Pela interface, alterado o custo real do Dia 1 para **R$ 75,00/pessoa**, marcado como validado e clicado **Salvar validação**. Toast de sucesso e SQL independente confirmaram `actual_cost=75`, `is_verified=true`, `item_id=9fd32631-6917-4da1-95ba-69c0fec3102f` e identidade vinculada corretamente. Dia 2 mantido em R$ 80,00/pessoa e `is_verified=false`, item `875634c7-cf02-45e4-ba5e-6db048b4cbad`.
- Navegação nova/recarregamento do portal dedicado e reabertura pelo parâmetro `?edit=` confirmaram persistência: **1/2 validados**, Dia 1 = 75 marcado, Dia 2 = 80 não marcado, botão com uma pendência. **Filtrar pendentes** exibiu somente Dia 2. Escape fechou somente o checklist e deixou o editor aberto, com o botão visível, habilitado e recebendo o clique.
- A proposta permanece no banco local para teste do usuário. Portal **Atmos — teste de produtos** foi deixado no editor, rolado até o botão. Acesso direto: `http://127.0.0.1:8088/admin/b2c/propostas?edit=424cf61e-7f6d-4470-a397-a7acc1713380`.
- Seis testes focados em `ProposalCostChecklist.test.tsx` e `ProposalCostChecklistButton.test.tsx` passaram (`/private/tmp/atmos-validar-custos-20260922.log`). Esta rodada não alterou código, schema, dados de outras propostas ou produção; não houve deploy. A validação demonstra o fluxo local, não a infraestrutura após deploy.

## Atualização: atalho Galeria de Mídia não abre a área de fotos

- **Causa reproduzida no Maestri:** o atalho executava `document.querySelector('[value="images"]')?.click()`. O `value` do `TabsTrigger` é uma propriedade do componente Radix, não um atributo HTML do botão renderizado. A consulta retornava `null` e o encadeamento opcional ocultava o erro, deixando o clique sem efeito. Dois testes de regressão (produto novo e existente) falharam antes da correção.
- `ProductDialog` agora controla a aba ativa pelo estado React. O atalho seleciona `images` e posiciona o foco na aba Galeria, sem busca global no DOM. A rolagem retorna ao topo ao trocar de aba, deixando **Adicionar mídia** visível. Abrir outro produto inicia em Geral; navegar entre abas preserva o rascunho do formulário.
- Verificação visual e DOM no portal dedicado **Atmos — teste de produtos**, em 8088: clique real no atalho abriu a Galeria, exibiu os dois controles de adição, foco em Galeria e rolagem em zero. A chamada ao input de arquivos também foi observada ao clicar em **Adicionar mídia**, cancelando preventivamente a abertura nativa apenas nessa medição (listener de uso único, removido após o disparo). O input aceita múltiplas imagens/vídeos.
- Quatro testes de navegação e quatro testes do componente de mídia cobrem ambos os atalhos de adição, seleção múltipla, pasta temporária do produto, cancelamento do seletor e falha de envio com nova tentativa. Uploads nesses testes usam `r2` simulado: **não foi realizado upload real nem validada a infraestrutura de produção nesta rodada**.
- Suíte final: **68 arquivos / 587 testes aprovados**; TypeScript do app e `git diff --check` sem erros. Logs: `/private/tmp/atmos-product-gallery-tests-20260922.log`, `/private/tmp/atmos-product-gallery-suite-20260922.log` e `/private/tmp/atmos-product-gallery-types-20260922.log`.
- Sem commit, deploy, upload externo ou gravação de produto. Apenas o formulário descartável do portal dedicado foi operado/cancelado; não houve navegação ou recarga comandada no Portal #10.

## Atualização: subcategoria criada fica vazia no cadastro de produto

- **Causa reproduzida:** confirmar a nova subcategoria atualizava `formSubcategory`, mas o menu era derivado exclusivamente de `allProducts`, sem incluir o valor em edição. O Radix Select recebia um valor sem `SelectItem` correspondente e exibia o campo vazio. O teste de regressão falhou antes da correção exatamente nesse ponto.
- O seletor agora inclui a subcategoria confirmada imediatamente, sem duplicar opções existentes. Os valores internos das opções são separados da ação `NEW`, permitindo também nomes que coincidam com essa palavra. O nome original, sem o prefixo interno, continua no payload.
- Confirmar por botão ou Enter remove espaços nas extremidades; nomes vazios não são confirmados. Rótulo associado ao campo, nomes acessíveis dos botões e texto explicativo acrescentados. Cancelar/Escape descarta apenas a criação inline, mantendo o produto e a seleção anterior. Rascunhos inline são limpos ao abrir outro produto.
- **Persistência preservada:** não há cadastro independente de subcategorias neste fluxo; elas ficam em `products.variables.subcategory` e são gravadas ao clicar em **Criar Produto / Atualizar Produto**. O botão de confirmação inline seleciona o nome no formulário. Nenhuma migration ou nova tabela foi necessária.
- Validação no portal dedicado **Atmos — teste de produtos**, homologação 8088 / Supabase local 54321: confirmação exibiu o nome antes do salvamento; criado um produto inativo de teste, SQL confirmou o nome da subcategoria; após recarregar somente esse portal, editar o produto mostrou a seleção persistida e um novo produto ofereceu a opção no menu.
- Fixture local `586a8693-5532-48a1-aa10-971cafb85a59` (`LOCAL — QA subcategoria 22-09 1526`) removida ao terminar, com predicados de ID, nome, status e subcategoria exatos. Nenhum produto preexistente foi alterado. Não houve operação nos Portais #10/#11, reinício de servidor, commit, deploy ou escrita remota.
- **66 arquivos / 576 testes aprovados**, incluindo dez novos testes do componente real. TypeScript do app e `git diff --check` sem erros. Logs em `/private/tmp/atmos-product-subcategory-tests-20260922.log` e `/private/tmp/atmos-product-subcategory-suite-20260922.log`.

## Atualização: erro ao abrir Metas — cache de dependências local

**Estado: aplicada ao serviço 8088 após o usuário pedir para reabrir o localhost. Instância temporária 8089 encerrada; portais reabertos e verificados sem overlay de erro.**

- Erro reproduzido no Portal #10 e no portal dedicado, inclusive após uma navegação nova. `AdminGoals.tsx` responde HTTP 200, mas `recharts.js?v=d23cca77` responde **504 Outdated Optimize Dep**. O arquivo React mencionado na captura é onde a importação rejeitada é propagada, não necessariamente a dependência ausente.
- `node_modules/.vite/deps` não existe no disco; somente `.vite/vitest` permanece. Os processos Vite 8084 e 8088 usavam o mesmo diretório padrão. O processo 8088 ainda serve alguns módulos do cache em memória, mas não consegue servir Recharts, acessado ao entrar na rota de Metas.
- No Vite instalado, o carregador de dependências devolve esse 504 também quando `readFile` do arquivo otimizado falha. A inicialização de outro otimizador com configuração diferente pode remover `deps`. Não há evidência suficiente para atribuir a remoção observada a um comando ou agente específico.
- Novo `scripts/homolog-config.mjs` centraliza a configuração e separa o cache da homologação em `node_modules/.vite-homolog`; mantém banco obrigatoriamente `127.0.0.1:54321`, porta 8088 fixa, bind loopback e HMR correspondente. `dev-homolog.mjs` usa essa configuração. Nenhuma configuração ou regra de Metas foi alterada.
- Instância temporária de diagnóstico em 8089, com o mesmo modo/banco local e o cache novo: Metas abriu com gráfico renderizado, sem overlay de erro; Nova Meta abriu e foi cancelada sem gravar. Verificados 16 módulos otimizados da cadeia de imports com HTTP 200 / JavaScript, inclusive Recharts. Após a suíte de testes, Recharts continuou em HTTP 200.
- **65 arquivos / 566 testes passando** (`--maxWorkers=2`), incluindo cinco novos testes de isolamento/configuração e rejeição de banco remoto. TypeScript sem erros e diff sem problemas de whitespace.
- Log: `/private/tmp/atmos-metas-tests-20260922.log`. Nenhum deploy, alteração de banco, reinício do 8084 ou recarga dos Portais #10/#11 nesta etapa.
- Retomada: instância temporária 8089 parada e somente `npm run dev:homolog` reiniciado em 8088. Metas/Recharts respondem HTTP 200 com cache `.vite-homolog`. Portal #10 reaberto em Metas, Portal #11 na mesma proposta/edição, portal de Clientes em `/admin/clientes` e antigo portal de validação 8087 redirecionado à homologação 8088 em `/monte-seu-roteiro`. Todos com conteúdo renderizado e sem overlay de erro. Os serviços 8084/8087 não foram reiniciados e nenhum dado de cadastro foi alterado.

## Atualização: estrutura visual dos formulários administrativos

Escopo desta rodada: aparência e identificação dos controles, preservando ordem dos campos, abas, ações e regras. Trabalho dividido com Claude Code #3: `AdminGuides.tsx` exclusivamente com o agente; padrão compartilhado, integração e testes com Codex. Sem deploy, push ou alteração do banco remoto.

### Causas verificadas

- Os campos do cadastro de guias removiam explicitamente as bordas (`border-none`) sobre um fundo quase igual ao do formulário. Não era um campo desabilitado: a área editável simplesmente não tinha contraste suficiente.
- O `TabsContent` tinha `tabIndex=0`; o autofocus do modal chegava ao painel inteiro. A classe de foco dessa superfície desenhava o retângulo grande visto na captura. A correção do cadastro direciona a sequência de foco aos controles reais, sem remover globalmente os indicadores de teclado.
- Os componentes `.admin-card` e `.admin-table-row` usavam tokens HSL crus como cores CSS (`var(--admin-border)`), sem `hsl(...)`. Essas declarações eram inválidas; agora são cores válidas.

### Padrão aplicado

- Escopo `admin-ui` no layout e contexto React herdado pelos portais de Dialog, Sheet, Drawer, AlertDialog, Popover e Select; nenhum seletor global baseado em URL ou classe persistente no body.
- Campos de texto, números, áreas de texto, seletores e datas: fundo branco e borda visível, foco verde escuro, bloqueados/somente leitura acinzentados, inválidos em vermelho. Dimensões e disposição continuam sob controle dos componentes existentes.
- Campos ocultos do Radix e busca interna do Command são excluídos da borda de formulário. Checkboxes e switches desligados têm contraste maior, mantendo seus estados ligados.
- Fechar dos modais administrativos ganha área visível e contraste sobre cabeçalhos claros ou pretos.
- Guias: rótulos associados aos campos, contraste das abas, separação discreta das seções e identificação das áreas editáveis, sem mudança das regras de cadastro.
- O desenho decorativo do cabeçalho não intercepta mais eventos. O corpo rolável ganhou contexto relativo, altura mínima zero e contenção de rolagem; o rodapé continua no mesmo lugar, agora separado por borda e respiro. No portal, apenas `position: relative` reduziu o `scrollHeight` externo de 802 para 476px (igual à altura do modal), confirmando a origem do transbordamento.

### Evidências locais

- Portal dedicado de homologação, `127.0.0.1:8088`; não houve interação com os formulários do usuário nos Portais #10/#11.
- Computed styles: campo normal `1px solid rgb(144,134,122)` / branco; bloqueado `rgb(242,240,238)`; inválido `rgb(177,37,37)`. A mesma fixture fora do escopo administrativo mantém seu `border-none` e fundo transparente.
- Em Clientes, menu Segmento abre com ambas as opções e escopo administrativo. O botão Novo Cliente cria uma linha imediatamente: a única linha vazia desta checagem (`a6c3a4b5-26f4-4d68-b08c-9d5c95b48aec`) foi removida do banco local por ID, nome e timestamp exatos; nenhum cadastro preexistente foi removido.
- Em Propostas, campos editáveis, cálculo bloqueado e calendário foram inspecionados; calendário continua acima do modal (`z=9999`), sem Runtime Error e sem salvar proposta.
- Em Guias, autofocus em `guide-name`, três painéis com `tabIndex=-1` e sem sombra de foco; abas Geral/Logística/Cachoeiras acessíveis, seletor de localidade abre, 4x4 revela 5/7 lugares, botão Fechar visível. Testes também cobrem rótulos associados, persistência do preenchimento entre abas, requisito de cadastro antes dos preços e Cancelar sem chamada ao banco.
- Validação final: **64 arquivos / 561 testes passando** (`npx vitest run --maxWorkers=2`); TypeScript do app sem erros; `git diff --check` limpo. A execução simultânea inicial de build + suíte provocou três timeouts de 5 segundos em testes antigos de Propostas; a suíte completa passou ao rodar isolada com dois workers, sem aumentar timeout ou mudar os testes desses fluxos.
- Build homolog isolada em `/private/tmp/atmos-admin-appearance.4mQyKz/build`, concluída; aviso preexistente de chunks grandes permanece. O `dist` usado por outros previews não foi substituído. Logs: `/private/tmp/atmos-admin-appearance-tests-20260922-final.log` e `/private/tmp/atmos-admin-appearance-types-20260922.log`.
- Esta rodada valida o padrão visual compartilhado e os fluxos amostrados (Guias, Clientes e Propostas); não equivale a uma auditoria funcional completa de todas as telas administrativas.

## Atualização: rolagem e saída do editor de propostas

Confirmados dois defeitos de layout no Maestri/WebKit local:

- O cabeçalho `sticky z-10` cobria o botão X absoluto do `DialogContent`, que não possuía uma camada superior. `elementFromPoint` no centro do X retornou o cabeçalho, não o botão. Portanto, a saída existia no DOM, mas o clique era interceptado.
- O corpo com rolagem não era posicionado; os controles nativos ocultos/absolutos dos seletores Radix usavam a janela inteira como referência. Medido no portal de teste: janela com `clientHeight=476` e `scrollHeight=1197`, mesmo com `overflow:hidden`. Aplicando apenas `position:relative` ao corpo, o `scrollHeight` da janela caiu para **476**, mantendo intacta a área rolável do formulário. Isso confirma o transbordamento indevido para o contêiner externo. O congelamento intermitente da captura não foi reproduzido de forma determinística; não há evidência suficiente para atribuí-lo especificamente a um bug do motor WebKit.

Correção: altura delimitada em `90dvh`, `gap-0`, corpo `relative min-h-0 overflow-y-auto overscroll-contain`; cabeçalho e rodapé são irmãos não roláveis do corpo. Retirados `sticky`, transparência e desfoque do cabeçalho. Adicionado **Voltar** visível no cabeçalho e **Cancelar/Salvar Proposta** no rodapé sempre disponível. `DialogContent` ganhou a opção `showCloseButton`, verdadeira por padrão: apenas a proposta oculta o X substituído, sem remover a saída dos demais diálogos. Eliminado o título duplicado oculto.

As saídas passam pelo aviso existente de alterações não salvas. O salvamento do rodapé usa o formulário por ID, e **Salvar e sair** agora usa `requestSubmit()` após fechar a confirmação, respeitando a validação nativa em vez de chamar a mutação diretamente. Erro ao salvar mantém a proposta aberta e os valores digitados.

Validação: **62 arquivos / 547 testes aprovados**; nove testes novos do formulário real com Radix/React Query e banco simulado cobrem estrutura de rolagem, Voltar/Cancelar/Escape, continuar/descartar, campos obrigatórios, salvamento pelos dois caminhos e falha sem perda do rascunho. TypeScript, build isolado e `git diff --check` aprovados; aviso preexistente de bundles grandes permanece.

No portal Maestri local, rolagens rápidas alternadas de até 5000 px chegaram ao fundo (`scrollTop=2211`) e retornaram a zero, mantendo a janela externa em `scrollTop=0` e `scrollHeight=clientHeight=476`; cabeçalho e rodapé mantiveram suas coordenadas. Verificado que o botão Voltar recebe o clique. Testados continuar edição preservando título e posição da rolagem, Escape com confirmação e descarte explícito apenas do rascunho fictício. Após fechar, nenhum modal permaneceu e `body.pointerEvents` voltou a `auto`; a lista permitiu reabrir a proposta sem recarregar. O seletor de prospects continuou abrindo suas cinco opções. SQL independente confirmou que o título/total do rascunho de teste não foram alterados pelo descarte.

Nenhum commit, deploy, alteração de schema ou gravação no banco nesta rodada. Não foram operados os formulários do usuário nos Portais #10/#11; houve apenas inspeção DOM de leitura no #10 para diagnosticar o X encoberto.

## Atualização: formatação dos campos monetários ao editar

O componente `CurrencyInput` foi aplicado aos valores dos itens (por dia e tabela), Serviço ATMOS, desconto em reais, custo operacional por dia e custo/venda dos quartos da proposta. Digitar `1000` e sair do campo mostra `R$ 1.000,00`; durante a edição o texto fica livre para não deslocar o cursor. O estado e o payload continuam numéricos, sem símbolo ou separadores. Valores carregados do banco/catálogo também são formatados. Quantidades, dias e percentuais não recebem máscara monetária. As colunas de valor foram ampliadas para acomodar o símbolo e os milhares.

Preservadas validação de campo obrigatório, limites mínimo/máximo, rejeição de texto inválido e precisão de tarifas com frações de centavo. Não há arredondamento silencioso ao focar/sair de uma tarifa existente. No modo por dia, a regra de custo mínimo continua aplicada ao confirmar a edição e o campo passa a mostrar o valor efetivamente aceito pelo formulário.

Validação: **61 arquivos / 538 testes aprovados**, TypeScript, build isolado e `git diff --check`. Dezoito testes do componente cobrem formatação, digitação/colagem, zero/limpeza, obrigatoriedade, limites, entrada inválida, atualização pelo catálogo, precisão, valor ajustado pelo pai e confirmação por Enter sem submeter o valor anterior. No Maestri, conferidos visualmente `R$ 1.000,00` no campo de item, quantidade `21` sem máscara e total diário `R$ 21.000,00`; o valor foi mantido ao alternar para tabela. O rascunho fictício local `21780182-24e9-4928-be04-8941f7fb66e1` foi atualizado: consulta SQL confirmou valor unitário **1000**, quantidade **21**, subtotal **21000** e total **24150** com o Serviço ATMOS já existente. Nenhuma proposta do usuário foi salva nesta rodada, nem houve deploy ou escrita remota.

## Atualização: valores e prospects nas propostas

O editor de propostas concatenava `R$` com `toFixed(2)`: `1470` aparecia como `R$ 1470.00`. A listagem já usava formatação brasileira, portanto havia inconsistência entre as telas. O novo `formatBRL`, com `Intl.NumberFormat("pt-BR")`, foi aplicado aos valores exibidos no editor (por dia, tabela, catálogo, resumo, custos, comissões e hospedagem) e nas conferências. A formatação não altera os números enviados ao banco nem as regras comerciais. No caso da imagem, 21 × 70 = 1470 estava correto.

Durante a revisão foi encontrado outro problema no campo textual numérico: `parseFloat(text.replace(",", "."))` transformava `1.470,00` em `1.47` e aceitava prefixos como `70abc`. O parser agora valida o texto inteiro, aceita vírgula brasileira com milhares e mantém a entrada decimal com ponto e a precisão existente. Texto inválido bloqueia a validação nativa em vez de gravar valor truncado/zero. O parser foi aplicado ao `NumericCell` usado no modo por dia; os campos nativos `type=number` continuam seguindo as regras do navegador, sem nova máscara.

O banco **local** contém dois prospects B2C distintos chamados `LOCAL fluxo integrado`, criados em 12/09 em horários diferentes, com IDs e e-mails de teste diferentes. Além disso, o seletor usava `CommandItem.value = name`, causando colisão de foco/destaque. O novo `ProspectCombobox` usa o ID como identidade, busca por nome/contato/empresa e diferencia homônimos por contato e código curto. Fecha após a seleção e marca a proposta como alterada. Nenhum prospect foi apagado, fundido ou renomeado.

### Hospedagem — explicação do fluxo, sem mudança de cadastro

O seletor `Hospedagens do Roteiro` lista somente produtos com `type = accommodation` e `is_active = true`. A consulta local confirmou **zero** hospedagens (o catálogo tem apenas uma experiência). A frase “cadastro acima” se refere ao seletor, não a um formulário de criação: é necessário cadastrar primeiro em **Produtos → Hospedagem → Novo Produto**, configurar unidades/modalidades, capacidades e valores, manter ativo e então selecionar na proposta. A redação é imprecisa e não explica catálogo vazio. Conforme o pedido, não foi alterado esse fluxo nem criado produto de hospedagem; apenas seus valores exibidos receberam a mesma formatação monetária.

### Validação desta rodada

- **60 arquivos / 520 testes aprovados** em `npm test -- --maxWorkers=2`, incluindo seleção real com Radix/cmdk de homônimos, busca/limpeza do vínculo, BRL e leitura/rejeição de entradas numéricas.
- TypeScript, build em diretório temporário separado e `git diff --check` aprovados. O aviso preexistente de bundles grandes permanece.
- PostgreSQL **local**, três suítes com rollback: `server_proposal_totals.sql`, `atomic_proposal_bundle.sql` e `verified_cost_identity.sql`. Cobrem recálculo pelo servidor, descontos/impostos, centavos, comissões, salvamento sem alterações parciais, custos conferidos, permissões e negação de anônimo/não administrador.
- No portal Maestri `Atmos — clientes local`, confirmados: seleção do segundo homônimo; 21 × 70 exibindo **R$ 1.470,00**; entrada `1.470,00` preservada como 1470 (21 × 1470 = **R$ 30.870,00**); `70abc` bloqueado; Serviço ATMOS obrigatório vazio tornando o formulário inválido.
- Salvo somente o rascunho fictício **LOCAL — Validação proposta BRL 22/09**, ID `21780182-24e9-4928-be04-8941f7fb66e1`. Consulta SQL independente confirmou prospect `dc800c82-e95f-4b2a-84b2-091c71e03ae3`, item 21 × 70, subtotal 1470 e total 4620 (mais serviço: 21 pessoas × 3 dias × 50). Toast `Proposta criada` confirmado. Não houve envio/publicação ao cliente.

A atualização do código provocou recarregamento do ambiente de desenvolvimento e fechou o formulário de teste não salvo. O Portal #10 também foi observado na lista, sem formulário aberto; não foi navegado nem teve salvamento/descarte manual realizado. O usuário foi avisado para conferir eventual preenchimento não salvo. Houve uma interrupção temporária da automação do Maestri; a conexão voltou e os testes visuais foram concluídos.

Nenhum commit, push, deploy, migration ou gravação remota nesta rodada. A validação local não confirma o estado do banco de produção.

## Atualização: exportação legível de clientes

A tela de Clientes já exportava `.xlsx`, não CSV. O exportador copiava os valores brutos dos filtros: `stage_id` saía como UUID, datas como timestamp ISO e Origem/Potencial/Prioridade como códigos. Não havia largura de colunas nem filtro no arquivo.

A rotina `prospectExport.ts` agora resolve etapas pelos nomes, aplica os rótulos existentes, mantém B2C/B2B compatíveis com a importação, grava datas tipadas com exibição brasileira (incluindo horário em Follow-up/Último Contato), moeda como número e telefone como texto. Campos vazios não viram zeros inventados; etapa sem vínculo aparece como `Sem etapa`, e vínculo ausente como `Etapa não encontrada`. Colunas seguem a ordem selecionada e só recebem as linhas já filtradas. Larguras são calculadas pelo conteúdo exibido, com filtros no cabeçalho e altura de linhas consistente. Os dois botões agora dizem `Exportar Excel`.

O importador reconhece também a coluna `Nascimento` exportada e converte as datas Excel tipadas para `yyyy-MM-dd`, sem deslocar aniversários por fuso. A implementação usa a biblioteca já instalada no produto; os metadados de [largura de colunas](https://docs.sheetjs.com/docs/csf/features/colprops/) e [datas](https://docs.sheetjs.com/docs/csf/features/dates/) seguem a documentação do SheetJS.

Validação: seis testes novos com serialização e releitura de XLSX real, incluindo rótulos, largura/filtros, tipos, zero, telefone com zero inicial, texto parecido com fórmula, arquivos sem registros e aniversário de ida/volta. Suíte total: **58 arquivos / 492 testes aprovados**, com dois workers. TypeScript, build e `git diff --check` aprovados. O build de teste foi gerado em diretório temporário separado, sem substituir `dist` do preview existente.

Foi gerado um arquivo de verificação pelo mesmo exportador com os sete clientes do banco local; releitura e renderização independente confirmaram nomes, datas e etapas legíveis. A aparência foi inspecionada, mas não foi feita uma validação nativa no Numbers/Excel. Não houve gravação no banco, envio de arquivo a clientes ou publicação. O Portal #10 estava sendo usado pelo usuário em uma proposta e não foi navegado/fechado durante esta tarefa.

## Atualização: Portal #10 com módulo antigo após rebuild

A imagem de erro `TypeError: Importing a module script failed` na porta 8087 foi confirmada no DOM do Portal #10. A página mantinha `/assets/index-CmOgr7_3.js` do build anterior carregado. O build de validação posterior substituiu os arquivos em `dist`, enquanto o processo `vite preview` continuava servindo essa mesma pasta. O arquivo antigo já não existia: a requisição ao caminho antigo retornou `200 text/html` (fallback da SPA), enquanto o asset atual retornou `200 text/javascript`. Isso explica a falha de carregamento dos módulos; não foi erro de autenticação ou perda de dados.

O endereço persistido do Portal #10 foi atualizado via Maestri para `http://127.0.0.1:8088/admin/clientes`, no servidor de desenvolvimento de homologação isolada, independente dos rebuilds de `dist`. Não reutilizar o preview 8087 durante novos builds na mesma pasta. Nenhuma publicação foi realizada.

## Atualização: erro ao salvar Cidade

O erro `Could not find the 'city' column of 'prospects' in the schema cache` é uma segunda causa, independente das camadas: o clique dispara o salvamento, mas a API rejeita o payload inteiro. O commit `0aa8f1a`, de 11/05/2026, incluiu `city` no formulário e na importação de clientes sem incluir uma migration em `prospects`. Os tipos da tabela também não tinham o campo. Como o formulário envia `city: null` mesmo vazio, o erro pode impedir qualquer alteração, não apenas uma edição de Cidade. A tabela `profiles` possui uma migration de Cidade, mas é outra tabela.

Correção: `20260922160000_prospects_city.sql` acrescenta `city text` nullable, sem reescrever registros nem alterar políticas, e notifica a API para recarregar o esquema. O uso de `NOTIFY pgrst, 'reload schema'` segue a [documentação oficial do PostgREST](https://docs.postgrest.org/en/stable/references/schema_cache.html). Foram atualizados os tipos Row/Insert/Update e o payload de Geral/Inteligência e a mutação da ficha passaram a usar `TablesUpdate<"prospects">` e o cliente Supabase tipado. Isso restaura a checagem de nomes/tipos no salvamento; não substitui executar a migration no ambiente de destino.

### Separação entre frontend local e banco local

**Atenção: `localhost:8084` iniciou com `.env`, que aponta para o mesmo Supabase remoto de produção. Apenas a interface era local.** Não foi alterada essa configuração nem interrompido o servidor 8084, para preservar a sessão do usuário. Nenhuma migration ou escrita desta correção foi executada remotamente.

O Docker local foi iniciado preservando seus volumes. Foi reutilizado o ambiente `atmos-homolog-20260912`, com banco/API locais em 54322/54321. O banco foi inspecionado antes da alteração: não havia `prospects.city`, e a última migration registrada era `20260912240000`. A nova migration foi aplicada e registrada **somente nesse ambiente local** com `supabase migration up --local --workdir scratch/homolog-environment`.

Para continuar testes de gravação: portal Maestri **Atmos — clientes local**, `http://127.0.0.1:8088/admin/clientes`, com conta e cliente fictícios. O comando `npm run dev:homolog` carrega `.env.homolog.local` e recusa iniciar se `VITE_SUPABASE_URL` não for exatamente `http://127.0.0.1:54321`. A recusa a um destino remoto foi testada com `https://example.invalid`. Seu HMR usa 8088, sobrescrevendo a porta fixa 8084 da configuração original; o primeiro ensaio em porta alternativa encontrou um overlay de erro de WebSocket, resolvido no ponto de entrada isolado sem reiniciar o servidor do usuário.

### Validação de persistência

- `supabase/tests/prospects_city.sql`: aprovado no PostgreSQL local com papel `authenticated` de administrador e rollback das fixtures. Cobre cidade com acentos, mudança B2C/B2B, leitura persistida, limpeza com NULL e preservação das notas.
- API REST local com sessão administrativa fictícia: inserção sem cidade, atualização, leitura em requisição separada e limpeza aprovadas. Criado o cliente `LOCAL — Teste Cidade 22/09` para continuação visual; não é um cliente de produção.
- UI Maestri no ambiente 8088: preenchido `Alto Paraíso de Goiás`, clicado em Salvar alterações; toast `Prospect atualizado` e consulta SQL independente confirmaram o valor salvo. Depois de recarregar a página e reabrir a ficha, o campo manteve `Alto Paraíso de Goiás`. O formulário enviou o payload completo, não apenas Cidade.
- Vitest do formulário: hidratação, edição/limpeza da cidade e cliente legado sem cidade; seletores reais e troca B2C/B2B permanecem cobertos.
- `npm test -- --maxWorkers=2`: **57 arquivos / 486 testes aprovados**. A primeira rodada em paralelismo padrão, simultânea ao build e início do ambiente, falhou em cinco testes por timeout/espera; a repetição com dois workers passou sem alterar limites de tempo nem os testes preexistentes.
- TypeScript e build aprovados; aviso preexistente de bundles grandes permanece. `git diff --check` aprovado.

Não há commit, push, deploy ou alteração de schema remoto. A validação em produção fica para depois, conforme solicitado pelo usuário. O ambiente 8084 continuará sujeito à coluna ausente enquanto usar o banco remoto sem essa migration; utilizar o portal 8088 para conferir esta correção agora.

## Estado e conclusão

A falha de **Clientes → ficha do cliente → Geral → Classificação (Segmento)** foi reproduzida no Portal #9 do Maestri, em produção. A correção está na pasta local `/Users/gustavosextaro/Projects/atmos`, branch `codex/atmos-stabilization`, e foi validada no Portal #10, em `http://127.0.0.1:8084/admin/clientes`.

Produção continua no commit `4277c741d18773bc6ed03900259fbab3064c016a`, de 20/09/2026. A Vercel mostrou o deployment `EUrMNRR6NEoX8xyoQuyNxFMQa27h` como **Ready / Production / Current**, com `www.atmos.tur.br`. A referência remota da branch também aponta para esse SHA. Esta correção ainda não foi commitada, enviada ou publicada.

O Portal #9 já possuía sessão administrativa. O login local foi realizado com as credenciais da nota `site`, sem copiá-las para o código ou este relatório. Os testes visuais usaram uma ficha sintética de homologação já existente. Nenhum cadastro, alteração de cliente, exclusão, mensagem ou pagamento foi gravado em produção.

## Causa e mecanismo

O commit `4277c74` alterou o componente compartilhado `src/components/ui/dialog.tsx`:

| Camada | Antes | Produção com o problema |
| --- | ---: | ---: |
| Cabeçalho público | 60 | 60 |
| Fundo escuro do Dialog | 50 | 65 |
| Conteúdo do Dialog | 50 | 70 |
| Lista do Select | 50 | 50 |
| Popover padrão | 50 | 50 |
| AlertDialog padrão | 50 | 50 |

Elevar o modal o colocou acima do cabeçalho. As listas e confirmações que ele abre, entretanto, permaneceram abaixo dele. Esses componentes usam portais: a lista é inserida no corpo da página, fora do elemento visual do formulário. Por isso ela não herda a camada 70 do formulário.

Evidência no navegador de produção: depois do clique, o campo apresentava `aria-expanded=true`, existia um `role=listbox` com as duas opções B2C/B2B e `z-index: 50`, mas `document.elementFromPoint` na área da lista retornava o fundo escuro de `z-index: 65`. A lista tinha aberto, porém estava coberta.

O Select também protege a interação enquanto está aberto, bloqueando cliques fora da lista. Com a lista escondida, essa proteção contribui para a sensação de que outros controles foram interrompidos. Remover indiscriminadamente `pointer-events` ou desativar o comportamento modal enfraqueceria a interação e o foco; a correção deve respeitar a ordem visual.

Essa evidência explica o caso da imagem e a família de menus dentro de modais. Não demonstra que todo botão do sistema tenha a mesma causa.

### Login escurecido e clique que retorna à página inicial

A segunda imagem enviada pelo usuário mostra a mesma regressão no acesso público. `AuthModal` possuía um override explícito `z-[50]`, abaixo do fundo de Dialog elevado para 65. Assim, o fundo escuro cobria também o formulário. Um clique visualmente sobre o formulário atingia o backdrop e era tratado como clique externo, fechando o modal. O bloqueio ocorre antes do envio das credenciais; esse sintoma não indica falha de senha ou do serviço de autenticação.

Reteste da versão compilada corrigida, em uma sessão nova no portal Maestri **Atmos — validação do login**, endereço `http://127.0.0.1:8087/`: formulário em camada 70; `elementFromPoint` sobre o e-mail retorna o próprio input; clique mantém o modal aberto e dá foco ao campo. O preenchimento e envio das credenciais da nota concluíram a autenticação e redirecionaram para `/monte-seu-roteiro`. A sessão administrativa de produção não foi desconectada para esse teste. A correção continua local, sem publicação.

## Correção aplicada

- Criado o token Tailwind `z-overlay = 70`, compartilhado entre fundos, conteúdos de modais e controles flutuantes. Acima do cabeçalho, elementos abertos depois ficam acima de seus pais pela ordem de montagem dos portais, inclusive confirmações aninhadas.
- Padronizados Dialog, Select, Popover, AlertDialog, Sheet, Drawer, DropdownMenu e seus submenus, ContextMenu, Menubar, Tooltip e HoverCard.
- Removido o `z-[50]` próprio de `AuthModal`, que o colocava abaixo do seu fundo escuro.
- Registrado `z-overlay` no combinador de classes `cn`, preservando os overrides explícitos de componentes. Sem esse registro, `z-overlay` e `z-[9999]` coexistiam e a ordem do CSS podia anular o override.
- No formulário de clientes, os campos B2B agora acompanham `form.segment`. Antes, dependiam da aba da listagem. A ficha e a aba Inteligência também passam a usar o segmento salvo no cliente, com a prop da listagem apenas como fallback.
- Associado o rótulo Classificação ao controle, melhorando navegação acessível e seleção nos testes.

## Alcance e outros padrões

| Padrão | Situação encontrada | Tratamento nesta etapa |
| --- | --- | --- |
| Select dentro de Dialog | Confirmado em produção na classificação; componente compartilhado mantinha a lista em 50 | Corrigido e testado na ficha B2C/B2B |
| Popover dentro de Dialog | Mesmo conflito no componente padrão | Base corrigida; calendário da ficha validado |
| Confirmação dentro de Dialog | AlertDialog permanecia em 50 | Base corrigida; abertura e cancelamento da confirmação da proposta validados |
| Login | AuthModal forçava conteúdo em 50, abaixo do fundo 65 | Override removido; login local validado |
| Dropdown principal e submenu | Principal em 70 e submenu em 50 | Padronizados; revisão de todas as telas permanece pendente |
| Sheet/Drawer e cabeçalho público | Base em 50, cabeçalho em 60 | Padronizados; verificação visual integral permanece pendente |
| Calendários/popovers com override 9999/100 | Tinham tratamento local diferente do padrão | Overrides preservados; não presumir que estavam todos quebrados |
| Busca global e sino no cabeçalho administrativo | Busca sem lógica de consulta e sino sem ação no código atual | Problema de implementação distinto; registrado para a revisão funcional seguinte |
| Etapas B2C/B2B | Na listagem Geral, o seletor da ficha recebeu 49 etapas; o formulário mapeia todas sem filtrar pelo segmento escolhido | Revisar regra de troca de segmento e compatibilidade das etapas na próxima etapa |

Inventário estático: 40 arquivos administrativos referenciam `SelectContent`, 13 referenciam `PopoverContent` e 22 referenciam `AlertDialogContent`. São contagens de arquivos consumidores, não de botões comprovadamente defeituosos; alguns aparecem fora de modais ou já possuem overrides. Exemplos para a próxima revisão: propostas, roteiros, produtos/categorias, edição em massa, financeiro, guias, metas e calendário.

## Verificação executada

- Produção, Portal #9: reprodução do campo aberto e coberto, com inspeção das camadas e do elemento que recebe o ponteiro.
- Local, Portal #10: abertura, clique nas opções, fechamento e reabertura de Classificação; seleção B2C → B2B → B2C e aparecimento dos campos empresariais.
- Ficha B2C: seis seletores abrem e recebem cliques — Classificação, CPF/CNPJ, Etapa no Funil, Origem do Lead, Vendedor Responsável e Potencial de Venda.
- Ficha B2B: os mesmos controles, mais Tipo Empresa e Segmento empresarial, totalizando oito seletores. As escolhas de teste permaneceram no formulário, sem salvar no banco.
- Calendário de nascimento e confirmação de exclusão de proposta: abrem na frente da ficha; cancelar a confirmação mantém a ficha aberta e não exclui nada.
- Testes com os componentes Radix reais verificam a troca B2C/B2B, o segmento enviado ao callback de salvamento e a abertura de um cliente B2B a partir da listagem geral/B2C.
- Teste de `cn` cobre a precedência entre o token compartilhado e overrides explícitos.
- `npm test`: **57 arquivos, 484 testes aprovados**.
- `npx tsc --noEmit -p tsconfig.app.json`: aprovado.
- `npm run build`: aprovado; permanece o aviso de bundles acima de 500 kB.

O salvamento do segmento foi verificado no callback por teste automatizado. Não foi executada uma gravação/releitura de segmento no banco de produção. A verificação dos outros módulos foi de padrões no código, não uma homologação integral de todos os controles.

## Por que os testes anteriores não detectaram

O teste existente de `AdminProspects` substituía `ProspectDetailDialog` por um mock vazio. Além disso, o runner usa jsdom, que não calcula a pintura e a interceptação física do ponteiro como um navegador. Uma lista pode existir no DOM e ter handlers corretos, mas continuar invisível atrás de um modal.

Para futuras alterações nesses componentes, além de testes de estado/salvamento, verificar no navegador: abrir modal → abrir lista → clicar opção → fechar → reabrir; testar popover e confirmação aninhada; verificar foco/teclado e retorno ao formulário. Alterações na camada de um modal precisam ser revisadas junto com seus controles flutuantes e cabeçalhos.

## Próxima etapa

Após a conferência desta correção, cruzar o relatório de botões do usuário com os padrões acima. Para cada item registrar tela, ação esperada, estado habilitado/desabilitado, camada que recebe o clique, evento disparado, resposta da API, mensagem de erro/sucesso e persistência após recarregar. Assim, problemas de camadas, ações ausentes, validação, permissões e persistência recebem tratamentos próprios.

A publicação e o reteste do novo código no Portal #9 permanecem pendentes.
