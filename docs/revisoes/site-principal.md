# Revisão do lote principal Atmos

## Decisão

**Lote principal aprovado na revisão de código, com os riscos residuais documentados abaixo.** Os bloqueadores de payload de catálogo e acesso à privacidade foram corrigidos na revisão final. A aprovação é deste lote de estabilização; não aprova o commit de cálculos, migração de dados ou publicação em produção. Não integrei os cálculos, não alterei código e não criei commit.

Checkout: `/Users/gustavosextaro/Projects/atmos`.
Base: `7d1f989ed826056d3a2c6fedd549c068f5c6b985`.
Escopo: diff de 20 arquivos rastreados e os 11 arquivos novos listados ao final. As referências de linha correspondem ao estado examinado e podem mudar.

## Achados anteriores — resolvidos na revisão final

### 1. P1 — Sincronização de transfer compartilhado transforma preço por pessoa em preço fixo

**Resolvido.** O builder agora grava `pricingType: "por_pessoa"` para compartilhado (R$ 260 × 2 = R$ 520), `pricingType: "total"` e `limitPeople: 4` para carro particular, e um item por destino/capacidade para vans de 10, 15 e 20 pessoas. Todas as tarifas são preservadas. Os identificadores das vans incluem capacidade. A análise abaixo registra o defeito anterior, não o comportamento atual.

Local: `src/lib/catalogSync.ts:111-130`.

A correção de `transferTables` para `transferTable` passa a executar a criação dos produtos por destino. Todos são gravados com `category: "transfer"`, sem `variables.pricingType`, usando a primeira tarifa como `unit_price`.

O catálogo de origem (`src/data/services.ts:251-263`) informa explicitamente `R$ 260/pessoa` para o compartilhado de Alto Paraíso. O editor (`src/components/admin/ProposalFormDialog.tsx:1359-1368`) interpreta categoria transfer sem pricingType como preço total e divide o valor pelo grupo.

Exemplo: sincronizar esse produto e adicioná-lo a uma proposta para duas pessoas resulta em R$ 130 por pessoa, R$ 260 para o grupo, em vez de R$ 260 por pessoa, R$ 520 para o grupo. O fluxo é acessível: `AdminProducts.tsx:72-80` registra `syncCatalog` como mutation e a fornece ao controle de sincronização nas linhas 355-356.

Também há risco nas vans: as tarifas para 10, 15 e 20 pessoas são reduzidas à primeira tarifa; `allValues` é salvo, mas não encontrei consumidor que escolha a faixa. A troca de identificadores do produto genérico para produtos por destino mantém os antigos, porque a sincronização só insere ausentes.

Aceite: sincronização preserva unidade de cobrança, capacidade e variações aplicáveis; compartilhado para duas pessoas totaliza R$ 520; carro privativo mantém preço fixo; van respeita tarifa/capacidade selecionada. Testar o payload sem escrever no backend real. Alternativamente, retirar esta alteração do lote e tratar a sincronização separadamente, sem afirmar que ficou corrigida.

### 2. P2 — Manutenção bloqueia o destino do link de privacidade ainda exibido

**Resolvido.** `/privacidade` e `/termos` agora estão na lista de rotas permitidas e têm casos de teste. A análise abaixo registra o defeito anterior.

Local: `src/components/MaintenanceGate.tsx:8-9` e `src/App.tsx:109-113`.

Com `VITE_SITE_MAINTENANCE=true`, o gate permite apenas `/admin`, seus descendentes e `/reset-password`. `CookieConsent` permanece montado fora do gate e apresenta o link “Saiba mais” para `/privacidade`. Ao abrir esse link, o visitante recebe novamente a tela de manutenção em vez do conteúdo anunciado.

Aceite: preservar `/privacidade` enquanto esse banner continuar disponível e adicionar cobertura para o destino do link. Avaliar também `/termos` se houver outro fluxo ativo que o exponha. Este achado é funcional; não constitui parecer jurídico.

## Correções anteriores conferidas

- VideoFeature invalida a promessa antiga de play por contador; pausa seguida de AbortError não remove o controle. O teste novo passou.
- AuthModal apresenta status de carregamento, erro e botão explícito de retry; bloqueia submit tanto no botão quanto no handler enquanto geography não existe. Exige país e estado quando o país possui estados. A inspeção confirma a correção, mas os testes atuais de auth não exercitam este fluxo assíncrono.
- Fechamento usa botão nativo com nome acessível, não chama logout e desmonta DialogContent. Título e descrição estão presentes. Hooks de autofocus capturam o elemento anterior e solicitam restauração de foco; falta teste específico de abertura por botão e retorno de foco.
- OptimizedImage mantém sequência finita e deduplicada, usa original do proxy sem dupla decodificação e termina sem solicitar placeholder externo implícito. GalleryGrid usa o mesmo ciclo de fallback.
- HeroMain não monta vídeo abaixo do breakpoint de 768 px e mostra foto após erro de vídeo.
- Mídias estáticas conhecidas são locais; os 68 nomes correspondem exatamente aos caminhos no Git, inclusive Unicode. Mídias remotas deixam de ser transformadas em /assets inexistentes no desenvolvimento.

## SEO, manutenção e alterações auxiliares

- HelmetProvider duplicado foi removido de main.tsx; o provider de App.tsx permanece.
- Tags estáticas relevantes de index.html estão marcadas data-rh, permitindo gerenciamento pelo Helmet. PageSEO gera URL absoluta para OG e usa /og-image.jpg, que existe no Git.
- Não identifiquei bloqueador adicional no ajuste de título/canonical, nos imports ausentes, na tipagem de supplier_id/gtag, nos variants de Badge ou na busca do SmartTableHead. O teste de combinação busca/filtro/ordenação passou.
- MaintenanceGate é uma barreira de apresentação opcional, não controle de acesso ao backend. As rotas administrativas continuam dependendo dos controles existentes; os testes do gate isolado não demonstram autorização administrativa.
- docs/EXECUCAO-ATMOS.md documenta ativação por build, separação de worktrees, cautela com backend real e pendências. As inspeções visuais e validações de acesso registradas pelo autor são evidências relatadas por ele, não repetidas nesta revisão.

## Riscos residuais não bloqueadores deste lote de estabilização

- Callers ExperienceCard e ItineraryCard continuam passando fotos Unsplash como fallback explícito. A remoção de fotos não relacionadas não está concluída globalmente; o componente apenas removeu o fallback implícito.
- A foto do hero tem aproximadamente 2,6 MB. A biblioteca de localidades continua grande, embora adiada para a etapa apropriada.
- AuthModal permanece montado: fechar o conteúdo não limpa automaticamente estados de formulário nem cancela operações anteriores. Não confundir desmontagem do diálogo com encerramento de todas as operações.
- SEO de uma SPA continua dependente de execução de JavaScript para metadados por rota. O ajuste não equivale a prerender/SSR para previews de compartilhamento.
- Não houve teste em aparelho Safari/iOS nem inspeção visual/rede de navegador nesta rodada. O erro de stack original não pode ser declarado definitivamente resolvido apenas pelos testes unitários.
- O manifesto manual de mídias merece verificação automatizada contra os arquivos versionados.
- A sincronização continua sem migrar/atualizar produtos existentes. Não executar como se corrigisse registros antigos: a coexistência de itens legados precisa de inventário e tratamento próprio. Não executei sync contra produção.
- Há rótulos preexistentes no editor (`ProposalFormDialog.tsx:2199` e `:2393`) que usam a categoria transfer para mostrar “Total”, mesmo quando pricingType é por_pessoa. O cálculo de seleção respeita o pricingType explícito. Corrigir os rótulos no trabalho do editor; esta aprovação de payload não declara toda a interface de cálculos revisada/aprovada.

## Validação da rodada anterior completa

- `npm test`: 19 testes passaram em 7 arquivos.
- Conferência do manifesto: 68 caminhos presentes exatamente no Git.
- `public/og-image.jpg`: presente no Git.
- `npx tsc --noEmit -p tsconfig.app.json`: passou.
- `npm run build -- --outDir /tmp/atmos-revisao-build`: passou (1m59s). Avisos de Browserslist desatualizado e chunks grandes. Saída isolada em /tmp, sem substituir dist do checkout.
- Bundle principal: aproximadamente 798 kB; chunk grande de localidades: aproximadamente 8,62 MB, antes de compressão.
- Nenhum teste de gravação foi executado contra o backend real.

## Validação da revisão final direcionada

- Conferidos `catalogSync.ts`, `catalogSync.test.ts`, `MaintenanceGate.tsx` e seus testes, além da remoção do whitespace.
- `git diff --check`: passou.
- Testes direcionados: 9/9 passaram (2 de catálogo e 7 de manutenção). Somente avisos de future flags do React Router.
- Não repeti build/typecheck nesta revisão direcionada. Os resultados da rodada anterior estão registrados acima.

## Arquivos novos examinados

- docs/EXECUCAO-ATMOS.md
- src/components/MaintenanceGate.tsx
- src/components/MaintenanceGate.test.tsx
- src/components/admin/SmartTableHead.test.tsx
- src/components/auth/AuthModal.test.tsx
- src/components/home/VideoFeature.test.tsx
- src/components/ui/OptimizedImage.test.tsx
- src/lib/imageSources.ts
- src/lib/staticMedia.ts
- src/lib/storage.test.ts
- src/lib/catalogSync.test.ts
