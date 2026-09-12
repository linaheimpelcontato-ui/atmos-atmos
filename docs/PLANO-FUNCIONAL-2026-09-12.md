# Plano funcional — inventário executável (12/09/2026)

> **Atualização da execução:** o inventário abaixo preserva o diagnóstico inicial e seus adendos. Para o resultado integrado mais recente (470 testes, 18 suítes SQL e testes reais de interface/HTTP), consulte [HOMOLOGACAO-FLUXOS-2026-09-12.md](HOMOLOGACAO-FLUXOS-2026-09-12.md). CRM-01/02, FIN-01/02/03, SITE-EDT-01 e autorização por módulos foram corrigidos localmente; publicação remota ainda deve ser conferida no registro de entrega.

## 0. Metadados e método

- **Autor**: Claude Code #3 (terminal Maestri), a pedido de Gustavo.
- **Escopo do lote**: leitura de notas conectadas (`atmos-requisitos-e-execuca`, `auditoria-atmos-falhas-pub`, `contrato-show-price-breakdow`), leitura de `docs/HOMOLOGACAO-2026-09-12.md` e dos demais documentos em `docs/`, e leitura do código em `/Users/gustavosextaro/Projects/atmos` (branch `codex/atmos-stabilization`, commit `908dd8a`).
- **O que NÃO foi feito neste lote** (por instrução explícita): nenhuma edição de código, nenhuma escrita/migração em banco, nenhum uso de portal Maestri, nenhuma chamada real a Clicksign/ManyChat/Supabase remoto. Tudo abaixo vem de leitura estática do repositório e dos documentos já produzidos por outras sessões.
- **Método**: 4 sub-investigações de leitura em paralelo (uma por área), cada uma lendo os arquivos-fonte por completo e citando `arquivo:linha`. Os achados foram reconciliados por mim contra os documentos primários (`docs/HOMOLOGACAO-2026-09-12.md` e demais) — quando um achado pontual parecia contradizer o registro de homologação mais recente, isso está sinalizado explicitamente no item correspondente (ver seção 4.2).
- **Como ler este documento**: cada item tem um ID estável (ex.: `FIN-03`) para ser referenciado em conversas futuras sem ambiguidade. Não invento política comercial, fiscal ou contratual em nenhum item — onde a lacuna depende de decisão da cliente/contabilidade, isso está marcado como "Depende de decisão externa", não preenchido com suposição.

## 1. Resumo executivo — achados mais críticos

Por impacto, os 6 achados que merecem atenção antes de qualquer nova frente de desenvolvimento:

1. **`FIN-01` — Bug sistêmico `status accepted` vs `approved`**: todo o pipeline de leitura financeira (Dashboard, Lucro & Margem, Receitas, Relatórios, Reports, Goals, Dashboards B2B/B2C) filtra propostas por `status === "accepted"`, mas o fluxo real de aceite (`approve-proposal`) grava `status = "approved"`. Nenhum ponto do código escreve `"accepted"`. Resultado: propostas aprovadas por clientes reais **nunca aparecem** como receita/lucro nos KPIs financeiros nem nos dashboards comerciais.
2. **`CTR-02` — Validação do webhook Clicksign é contornável**: `clicksign-webhook/index.ts:24` só rejeita a requisição se o header `x-webhook-secret` estiver **presente e errado**; se o header simplesmente não for enviado, a checagem inteira é ignorada e o payload é aceito sem autenticação, mesmo com o secret configurado.
3. **`CRM-01` — `AdminProspects.tsx: handleSync` pode cruzar segmentos B2B/B2C**: roda automaticamente ao abrir a tela de clientes, procura e-mail existente **sem filtrar por segmento**, e pode sobrescrever `segment`/`notes` de um prospect já existente — contradizendo diretamente a garantia (testada em SQL) de que a mesma pessoa não deve ter registro cruzado entre B2B e B2C.
4. **`FIN-02` / `FIN-03` — Falta de idempotência em `approve-proposal` e em geração manual de recebíveis**: duas requisições concorrentes podem aprovar a mesma proposta duas vezes (duplicando interações) ou duplicar o lançamento financeiro gerado a partir de uma proposta.
5. **`SITE-EDT-01` — Edição de texto no Editor Visual do site é descartada silenciosamente**: o editor emite um evento `TEXT_CONTENT_OVERRIDE` ao editar texto, mas não existe handler para esse evento nem coluna no banco para esse conteúdo — a alteração nunca persiste, sem erro visível ao admin.
6. **`MAPA-01` — O "Mapa" hoje é 100% ilustrativo**: coordenadas percentuais sobre uma imagem SVG artística fixa (`viewBox 1200x900`), sem lib de mapa geográfico, sem lat/lng, sem rotas reais e sem tela pública — condizente com estar listado como fase 2 nos requisitos da cliente, mas relevante deixar explícito o tamanho do gap.

Todos os demais achados estão detalhados por área abaixo, com evidência e critério de conclusão.

## 2. Legenda

**Status**
- `✅ Implementado e testado` — código funcional com teste automatizado cobrindo o caso.
- `🟡 Implementado parcialmente / não homologado` — existe e não é mock, mas tem lacuna concreta ou não foi validado ponta a ponta.
- `🟠 Placeholder / esqueleto` — a tela/rota existe mas não faz o que o nome sugere, ou o dado exibido é vazio por ausência de implementação real.
- `⚪ Não iniciado` — não há nenhum código para essa capacidade.

**Prioridade**
- `P0` — correção/segurança; afeta integridade de dado ou expõe o sistema hoje.
- `P1` — alto impacto funcional; bloqueia homologação ponta a ponta de um fluxo já "pronto no papel".
- `P2` — gap relevante, mas não bloqueador imediato (inclui fase 2 já acordada com a cliente).
- `P3` — limpeza técnica (código morto, duplicidade), sem risco funcional direto.

**Depende de decisão/credencial externa**: marcado explicitamente por item quando a conclusão não depende só de código.

---

## 3. Editor Visual — páginas do site (`AdminVisualEditor.tsx`)

Esta é uma feature **distinta** do modo de edição da proposta pública (seção 4) — não compartilham código, rota ou RPC, apesar de ambas serem chamadas de "editor visual" nas notas de negócio.

- [ ] **`SITE-EDT-01` — Edição de conteúdo de texto não persiste**
  — Status: 🟠 Placeholder / esqueleto (para texto especificamente; imagem/estilo funcionam, ver `SITE-EDT-02`)
  — Evidência: `src/components/editor/EditorModeListener.tsx:360-367` emite `TEXT_CONTENT_OVERRIDE` ao editar texto; `src/pages/admin/AdminVisualEditor.tsx:72-106` (listener de mensagens) só trata `FOCAL_POINT_CHANGED`, `STYLE_OVERRIDE`, `IMAGE_REPLACED` — sem `case` para `TEXT_CONTENT_OVERRIDE`, mensagem descartada. Tabela `site_overrides` (`supabase/migrations/20260313223140_...sql`) só tem coluna `styles jsonb`, sem coluna para conteúdo textual. `src/components/editor/TextEditPanel.tsx:82,125,149` só altera `element.innerText` no DOM da sessão do iframe — some ao recarregar.
  — Lacuna: falta handler + coluna/tabela de persistência + consumidor no site público que troque o texto real (hoje `useSiteOverrides` só aplica CSS via `!important`).
  — Depende de decisão externa: nenhuma — é puramente técnico.
  — Critério verificável: admin edita o texto de um parágrafo, salva, recarrega a página pública fora do iframe do editor — o novo texto deve aparecer. Hoje não aparece.
  — Prioridade: P1

- [ ] **`SITE-EDT-02` — Edição de imagem (foco/recorte) e estilo CSS**
  — Status: 🟡 Implementado parcialmente / não homologado
  — Evidência: `src/hooks/useFocalPoints.ts:67-70` (upsert em `image_focal_points`), `AdminVisualEditor.tsx:251-262` (upsert em `site_overrides`, `onConflict:"element_selector,device"`), diferenciação real por dispositivo aplicada via `@media` (`useSiteOverrides.ts:52-67`, `useApplyFocalPoints.ts:31-34`).
  — Lacuna: seletor de elemento (`ensureEditorId`, `TextEditPanel.tsx:13-23`, `BackgroundEditPanel.tsx:16-24`) é gerado por posição no DOM (`${sectionId}.${tag}[${idx}]`), não por id estável — qualquer mudança na quantidade/ordem de elementos do mesmo tipo na seção reaplica o override no elemento errado, sem aviso. Nenhum teste automatizado existe para `AdminVisualEditor.tsx` ou para `src/components/editor/*`. Não usa o padrão de guarda de corrida (`requestGuard`/`isCurrent`) já disponível no repo e usado em `ProposalPublic.tsx`.
  — Depende de decisão externa: nenhuma.
  — Critério verificável: admin edita cor/tamanho de um texto e o recorte de uma imagem hero, salva, abre `/` em aba anônima nova (fora do iframe) e confirma as duas mudanças aplicadas; RLS bloqueia gravação por usuário autenticado sem role admin (policy já existe, falta teste que exercite).
  — Prioridade: P1

- [ ] **`SITE-EDT-03` — Código morto no editor**
  — Status: 🟠 Placeholder / esqueleto
  — Evidência: `src/components/editor/DeviceConfirmDialog.tsx` e `src/components/editor/FocalPointOverlay.tsx` não são importados por nenhum outro arquivo do repositório (confirmado por busca completa).
  — Lacuna: manutenção de código sem uso; risco de confundir quem for mexer no editor depois.
  — Depende de decisão externa: nenhuma.
  — Critério verificável: arquivos removidos ou reintegrados com propósito documentado.
  — Prioridade: P3

## 4. Editor Visual — Proposta pública (modo de edição administrativa)

Refere-se ao modo de edição embutido em `src/pages/ProposalPublic.tsx` (observações, títulos de dia, descrições, ordem de itens), persistido via RPC `save_public_proposal_edits`.

- [ ] **`PROP-EDT-01` — Confirmar aplicação da migration no ambiente alvo**
  — Status: 🟡 Implementado parcialmente / não homologado
  — Evidência: `supabase/migrations/20260911230000_public_proposal_edits.sql:1` traz o comentário `-- SQL NOT EXECUTED locally`. **Reconciliação importante**: esse comentário está desatualizado — `docs/HOMOLOGACAO-2026-09-12.md` registra que a suíte `supabase/tests/public_proposal_edits.sql` foi executada e **aprovada** localmente em 12/09 (uma das nove suítes SQL rodadas com `psql -v ON_ERROR_STOP=1`). O que continua **não confirmado** é a aplicação desta migration no Supabase remoto: a mesma nota lista as migrations de setembro (incluindo esta) entre as treze sem registro em `supabase migration list --linked` contra o projeto PRD.
  — Lacuna: falta confirmar objetivamente, via `supabase migration list --linked` ou consulta direta, se a função `save_public_proposal_edits` existe no ambiente que será usado para a próxima homologação/publicação.
  — Depende de decisão externa: acesso administrativo ao Supabase remoto (já listado como pendência geral em `docs/RETOMADA-APOS-DESLIGAR.md`, item 2).
  — Critério verificável: `select 1 from pg_proc where proname='save_public_proposal_edits'` (ou tentativa do RPC) no ambiente alvo retorna presença da função.
  — Prioridade: P0 (bloqueia qualquer teste real deste fluxo)

- [ ] **`PROP-EDT-02` — Cobertura de teste é só da função pura, não do RPC**
  — Status: 🟡 Implementado parcialmente / não homologado
  — Evidência: `src/lib/proposalEdits.test.ts` cobre `buildProposalEditsPayload` (4 casos: reorder mantendo descrição por id estável, fallback, descarte de item sem id, montagem de `p_days`). Não existe teste de integração que efetivamente chame `supabase.rpc("save_public_proposal_edits", ...)`. Tratamento de erro em `ProposalPublic.tsx:545-549` é um toast genérico que não diferencia "função ausente no banco" de "validação falhou" de "erro de rede".
  — Lacuna: teste de integração real contra o RPC; diagnóstico de erro mais específico no toast.
  — Depende de decisão externa: nenhuma.
  — Critério verificável: como admin, abrir `/proposta/:token?edit=1`, editar descrição + reordenar itens + mudar observação de um dia, salvar, recarregar do zero e confirmar as três mudanças persistidas; como sessão anônima, confirmar rejeição por permissão (`REVOKE ... FROM anon`, presente na migration); como autenticado não-admin, confirmar rejeição por `has_role` (`42501`).
  — Prioridade: P1

- [x] **`PROP-EDT-03` — Guarda contra resposta antiga de sessão/proposta**
  — Status: ✅ Implementado e testado
  — Evidência: `src/lib/requestGuard.ts`, usado em `ProposalPublic.tsx:521,543,560,564` (checagem de `isCurrent()` após o RPC e no catch/finally).
  — Prioridade: — (concluído, sem ação necessária)

## 5. Mapa

- [ ] **`MAPA-01` — Ferramenta admin de pontos (ilustrativa) — ciclo CRUD**
  — Status: 🟡 Implementado parcialmente / não homologado
  — Evidência: `src/components/admin/map/MapCanvas.tsx`, `MapPoints.tsx`, `MapPointDialog.tsx`; tabela `map_points` (`supabase/migrations/20260319212813_...sql`) com `x`/`y` percentuais (não lat/lng); `MapPointDialog.tsx:46-56` permite vincular um `product_id` real do catálogo ao pino, mas a posição é sempre definida manualmente pelo clique do admin no canvas ilustrado.
  — Lacuna: zero testes automatizados (`AdminMap.tsx` e `src/components/admin/map/*`); nenhuma migration/seed popula `map_points` — consistente com "nenhum ponto encontrado" registrado na inspeção do painel publicado (`docs/HOMOLOGACAO-2026-09-12.md`).
  — Depende de decisão externa: nenhuma para o CRUD básico funcionar; população de pontos reais depende de curadoria da equipe.
  — Critério verificável: criar ponto em `/admin/mapa`, recarregar e confirmar persistência via `map_points`; excluir e confirmar remoção; usuário autenticado não-admin tentando escrever é bloqueado pela policy `"Admins can manage map_points"`.
  — Prioridade: P2

- [ ] **`MAPA-02` — Mapa geográfico real com rotas (requisito de fase 2)**
  — Status: ⚪ Não iniciado
  — Evidência: nenhuma dependência de mapa real no `package.json` (sem Leaflet/Mapbox/Google Maps/react-map-gl); zero ocorrências de `lat|lng|latitude|longitude` em `src/`; `roads` em `src/components/admin/map/mapData.ts:88-124` é arte SVG estática sem relação com pontos cadastrados; não existe rota pública de mapa (`App.tsx` só tem `/admin/mapa`, protegida).
  — Lacuna: tudo — lib de mapa real, schema com lat/lng, cálculo/exibição de rotas, tela pública, população automática a partir do catálogo.
  — Depende de decisão externa: esta é explicitamente a "segunda fase" já acordada com a cliente ("mapa de produtos/roteiros... após definição do atendimento") — não é um bug, é trabalho ainda não iniciado por acordo prévio.
  — Critério verificável: existir rota pública com mapa geográfico real, pontos com lat/lng vindos de produtos do catálogo, e ao menos uma rota calculada entre dois pontos exibida na tela.
  — Prioridade: P2 (fase 2 já combinada — não é urgência de correção, é planejamento)

## 6. Clientes / CRM / Pipeline / B2B / B2C

- [ ] **`CRM-01` — `handleSync` pode cruzar segmentos e sobrescrever notas**
  — Status: 🟠 Placeholder / esqueleto obsoleto (contradiz a migration nova)
  — Evidência: `src/pages/admin/AdminProspects.tsx:134-262` (`handleSync`), disparado automaticamente ao montar a tela (`AdminProspects.tsx:264-268`). Linha 146: mapa e-mail→id construído **sem filtro de segmento**. Linhas 186-198/215-226: se e-mail já existe (de qualquer segmento) e status de origem é pendente, faz `update` incluindo `segment` e sobrescrevendo `notes`. Isso contradiz a garantia testada em `supabase/tests/request_pipeline_segments.sql:22-23` (isolamento B2B/B2C para a mesma pessoa) e em `supabase/migrations/20260912130000_...sql` (cadastro existente não deve ter notas sobrescritas).
  — Lacuna: reescrever `handleSync` para respeitar segmento (igual ao trigger `sync_request_prospect`) e nunca sobrescrever notas manuais, ou removê-lo — o trigger do servidor já cobre a criação automática.
  — Depende de decisão externa: nenhuma.
  — Critério verificável: com um prospect B2B existente e uma nova solicitação B2C do mesmo e-mail, abrir `/admin` de clientes e confirmar que `segment`/`notes` do prospect existente permanecem inalterados. Hoje isso não é garantido.
  — Prioridade: P0

- [ ] **`CRM-02` — `handleSendToPipeline` duplica prospect**
  — Status: 🟡 Implementado parcialmente / não homologado
  — Evidência: `src/pages/admin/AdminQuotes.tsx:471-529` insere em `prospects` sem checar existência prévia por segmento+contato — como o trigger já cria o prospect automaticamente no INSERT da solicitação, clicar neste botão sempre cria um segundo registro. A mesma tela já tem a consulta de vínculo correta em outro lugar (`linkedProspectId`, linhas 191/265-269).
  — Lacuna: reaproveitar a consulta de vínculo já existente antes de decidir entre `insert`/no-op.
  — Depende de decisão externa: nenhuma.
  — Critério verificável: clicar "Enviar para pipeline" numa solicitação cujo e-mail já tem prospect no mesmo segmento não deve criar uma segunda linha (`SELECT count(*) FROM prospects WHERE segment=... AND email=...`).
  — Prioridade: P1

- [ ] **`CRM-03` — Sem tela de gestão de etapas (`pipeline_stages`)**
  — Status: ⚪ Não iniciado (CRUD de etapas); ✅ Implementado e testado (comportamento de etapa ausente no trigger)
  — Evidência: nenhuma tela faz insert/update/delete em `pipeline_stages` — todas as etapas existentes vêm de `INSERT` embutidos em migrations antigas. Kanban (`AdminPipeline.tsx`) não exibe/contabiliza prospects com `stage_id NULL` — ficam invisíveis na visão de funil (mas aparecem em `AdminProspects.tsx`, que lista todos).
  — Lacuna: tela de CRUD para etapas por segmento (criar, renomear, reordenar, mesclar/desativar); coluna/indicador no Kanban para `stage_id NULL`.
  — Depende de decisão externa: nenhuma para construir a tela; a decisão de quais etapas/nomes usar é da cliente.
  — Critério verificável: existir tela onde o admin cria/edita/reordena etapas sem SQL direto; Kanban exibir ou contabilizar prospects sem etapa.
  — Prioridade: P1

- [ ] **`CRM-04` — Dashboards B2B/B2C identificam etapas "finais" por substring de nome**
  — Status: 🟡 Implementado parcialmente / não homologado
  — Evidência: `AdminDashboardB2B.tsx:139-146`, `AdminDashboardB2C.tsx:119-126` — `stages.find(s => name.includes("aguardando"))`/`includes("fechado")`. Frágil justamente no cenário já observado ("etapas de nomes repetidos" na nota de homologação): se nomes divergirem, KPIs de "Aguardando"/"Taxa de Conversão" ficam incorretos sem erro visível.
  — Lacuna: campo explícito (`is_won`/`is_awaiting` booleano) em `pipeline_stages`, em vez de match por texto.
  — Depende de decisão externa: nenhuma.
  — Critério verificável: KPIs do dashboard batem com contagem manual em SQL direto, usando dados de produção reais (não os dados de teste hoje presentes).
  — Prioridade: P1

- [ ] **`CRM-05` — Tela órfã `AdminImmersionLeads.tsx`**
  — Status: 🟠 Placeholder / esqueleto (código morto)
  — Evidência: não roteada em `App.tsx`; tela ativa para leads B2B é `AdminQuotes.tsx` com `segment="b2b"`.
  — Lacuna: decidir remoção ou propósito documentado — hoje lê a mesma tabela (`imersao_leads`) com lógica potencialmente divergente da tela ativa.
  — Depende de decisão externa: nenhuma.
  — Critério verificável: arquivo removido ou roteado com propósito claro.
  — Prioridade: P3

- [ ] **`CRM-06` — Cobertura de teste de frontend desigual entre B2C e B2B**
  — Status: 🟡 Implementado parcialmente
  — Evidência: `src/components/wishlist/ReservationPersistence.test.tsx` cobre `WishlistReservationForm`/`ItineraryReservationForm` (persistência em falha, não duplicar WhatsApp antes do sucesso). Não existe teste equivalente para `ImmersionQuestionnaire.tsx` (B2B).
  — Lacuna: teste de submissão/erro/retry para `ImmersionQuestionnaire`.
  — Depende de decisão externa: nenhuma.
  — Critério verificável: existir `.test.tsx` para `ImmersionQuestionnaire` análogo ao já existente para o fluxo B2C.
  — Prioridade: P2

- [ ] **`CRM-07` — Entidade "Grupo" (múltiplas propostas agrupadas)**
  — Status: ⚪ Não iniciado
  — Evidência: busca exaustiva por `group_id`/`grupo_id`/tabela `groups` não retorna nada além de campos de formulário de marketing (`tipo_grupo`, `num_participantes`); `proposals` só tem `prospect_id` (FK única), sem campo de agrupamento entre propostas.
  — Lacuna: modelagem completa (schema, tela) inexistente.
  — Depende de decisão externa: definição de produto de como "grupo" deve funcionar (múltiplas propostas do mesmo evento? mesma família?) — sem essa definição não há o que implementar.
  — Critério verificável: não aplicável até definição de produto.
  — Prioridade: P2 (bloqueado por decisão, não por esforço técnico)

- [ ] **`CRM-08` — Responsável (vendedor) só é atribuído manualmente**
  — Status: 🟡 Implementado, sem automação e sem teste
  — Evidência: única gravação de `seller_id` é `assignSeller` em `src/pages/admin/AdminCalendar.tsx:321-329`, ação manual; o trigger novo não define `seller_id` no INSERT automático.
  — Lacuna: nenhum teste cobre `assignSeller`; se a intenção for atribuição automática (round-robin, regra por fonte), isso está totalmente não iniciado.
  — Depende de decisão externa: se atribuição automática é desejada, e com que regra — não invento critério aqui.
  — Critério verificável: atribuição manual já funciona (testável manualmente); automação, se desejada, não existe.
  — Prioridade: P3 (a menos que a cliente confirme que quer automação, então sobe de prioridade)

## 7. Financeiro

- [ ] **`FIN-01` — Filtro de status financeiro (`accepted`) nunca corresponde ao valor real gravado (`approved`)**
  — Status: 🟠 Placeholder / esqueleto (dados corretos nunca aparecem)
  — Evidência: enum canônico do formulário de proposta é `draft|sent|negotiating|approved|rejected|expired` (`src/components/admin/ProposalFormDialog.tsx:213-219`, sem `accepted`); `supabase/functions/approve-proposal/index.ts:92-95` grava `status: "approved"`. Busca em todo o repositório por qualquer `.update()`/`SET` escrevendo `status='accepted'` não encontrou nenhuma ocorrência — só leituras/filtros. Consumido incorretamente em: `src/pages/admin/finance/financeCalcs.ts:72,115` (usado por Dashboard e Lucro & Margem), `AdminFinanceReceitas.tsx:95`, `AdminFinanceReports.tsx:91,94,345`, e fora do financeiro em `AdminReports.tsx`, `AdminDashboardB2B.tsx`, `AdminDashboardB2C.tsx`, `AdminGoals.tsx`, `AdminCalendar.tsx`.
  — Lacuna: trocar todos os filtros `status === "accepted"` para `"approved"` (ou o valor que a regra de negócio confirmar como correto).
  — Depende de decisão externa: nenhuma — é uma inconsistência de código verificável, não uma escolha de negócio.
  — Critério verificável: aprovar uma proposta pelo fluxo real do cliente (link compartilhado) e confirmar que ela aparece com receita/lucro/margem no Dashboard Financeiro e em Lucro & Margem — hoje não aparece.
  — Prioridade: P0

- [ ] **`FIN-02` — Race condition em `approve-proposal`**
  — Status: 🟠 Placeholder / esqueleto (sem atomicidade)
  — Evidência: `supabase/functions/approve-proposal/index.ts` — leitura de status (linhas 43-47), checagem em memória (84-89), update sem cláusula condicional de status (92-95) e sem lock; insere em `prospect_interactions` incondicionalmente após (100-106). Três operações não atômicas.
  — Lacuna: guarda condicional no update (`.eq("status", ...).in("status", ["sent","negotiating"])` checando linhas afetadas) ou mover para RPC transacional com `FOR UPDATE`, seguindo o padrão já existente em `save_proposal_bundle`/`server_proposal_totals`.
  — Depende de decisão externa: nenhuma.
  — Critério verificável: disparar duas requisições concorrentes contra uma proposta em `sent` — hoje ambas podem retornar sucesso e duplicar `prospect_interactions`; corrigido, só uma deve suceder.
  — Prioridade: P0

- [ ] **`FIN-03` — Geração manual de recebível a partir de proposta duplica e tem falso-negativo de filtro**
  — Status: 🟠 Placeholder / esqueleto
  — Evidência: `AdminFinanceReceitas.tsx` — `fetchAll`/`unlinkedProposals` (linhas 68-95) calcula "sem lançamento" só a partir de recebíveis dentro da janela de data filtrada (padrão: 1º jan até hoje) — um recebível existente com vencimento fora dessa janela faz a proposta reaparecer como "disponível para lançar"; `handleGenerateFromProposal` (121-129) insere sem `source_key`/idempotência — cliques concorrentes duplicam.
  — Lacuna: calcular vínculo sem depender do filtro de data visual (ou avisar visualmente da limitação); `source_key` determinística por proposta com índice único, análoga à já existente para comissão de hospedagem; desabilitar botão durante requisição.
  — Depende de decisão externa: nenhuma.
  — Critério verificável: mudar filtro de data para não incluir o vencimento de um recebível já lançado e confirmar que a proposta reaparece indevidamente (hoje reaparece); clicar duas vezes rápido em "Lançar" e confirmar 1 vs 2 lançamentos (hoje cria 2).
  — Prioridade: P0

- [ ] **`FIN-04` — Aba "DRE" em Lucro & Margem não é um DRE**
  — Status: 🟠 Placeholder / esqueleto
  — Evidência: `AdminFinanceLucroMargem.tsx:341-363` mostra só dois números estáticos ("Ponto de Equilíbrio", "Eficiência ROI") com texto "Selecione as outras abas para detalhamento granular" — não é uma demonstração de resultado.
  — Lacuna: implementar um DRE real ou remover o rótulo enganoso.
  — Depende de decisão externa: estrutura contábil (linhas de imposto, deduções, despesas operacionais vs. administrativas, EBITDA vs. líquido) depende de definição com a contabilidade da cliente.
  — Critério verificável: existe uma única fonte de verdade de DRE, com estrutura aprovada pela contabilidade, batendo com um DRE de referência real fornecido pela cliente.
  — Prioridade: P1 (depende de decisão externa para a versão final, mas o rótulo enganoso pode ser corrigido já)

- [ ] **`FIN-05` — Duas implementações de DRE simplificado, mutuamente inconsistentes**
  — Status: 🟡 Implementado parcialmente / não homologado
  — Evidência: `AdminFinanceReports.tsx:59-66,235-277` ("DRE — Consolidado", baseado em `financial_transactions.due_date`) vs. `AdminFinanceLucroMargem.tsx:126-170` ("DRE Operacional", baseado em `status === "accepted"` de propostas — hoje vazio pelo bug `FIN-01`). Nenhuma usa `competence_date` (campo já coletado, mas não usado em nenhum agregado).
  — Lacuna: unificar a fonte de cálculo; decidir se o DRE é por caixa (`due_date`/`paid_date`) ou por competência (`competence_date`).
  — Depende de decisão externa: qual regime (caixa vs. competência) e validação contra a planilha real "Melhor aos 50" quando recebida.
  — Critério verificável: as duas telas produzem o mesmo número para o mesmo período — hoje não produzem.
  — Prioridade: P1

- [ ] **`FIN-06` — Conciliação bancária**
  — Status: ⚪ Não iniciado
  — Evidência: busca por `reconcil|concilia` só retorna mensagens de erro pedindo ação manual humana ("Reconcilie ou reabra manualmente o recebível...", presente em 3 migrations) — nenhuma tela, import de extrato ou matching automático existe.
  — Lacuna: tudo — importação de extrato (OFX/CSV), matching por valor+data+conta, tela de revisão, persistência do vínculo.
  — Depende de decisão externa: regras de conciliação e formato de extrato bancário a importar.
  — Critério verificável: existir rota `/admin/financeiro/conciliacao` com upload de extrato e lista de pendências — hoje não existe.
  — Prioridade: P2

- [ ] **`FIN-07` — Centro de resultado / resultado por grupo**
  — Status: ⚪ Não iniciado
  — Evidência: nenhuma ocorrência de `cost_center`/"centro de resultado" no código; sem entidade "grupo" (mesmo achado de `CRM-07`) — hoje o único agregador é a proposta individual.
  — Lacuna: modelagem de "grupo" (compartilhada com `CRM-07`) e agregação de resultado por grupo nas telas financeiras.
  — Depende de decisão externa: mesma definição de produto de `CRM-07`.
  — Critério verificável: mesmo de `CRM-07`, aplicado a uma tela financeira que some receita/custo/lucro de N propostas de um grupo.
  — Prioridade: P2 (bloqueado por decisão)

- [ ] **`FIN-08` — Comissão de vendedor sem rastreabilidade equivalente à de hospedagem**
  — Status: 🟡 Implementado parcialmente
  — Evidência: comissão de hospedagem tem `source_key` único, proteção contra alteração de valor liquidado e bloqueio de reabertura de cancelada (`supabase/migrations/20260911224000_...sql`, `20260912140000_...sql:307-341`). Comissão de vendedor (`atmos.seller_commission_percent`, usada em `financeCalcs.ts:34`) só é descontada no cálculo de lucro — não encontrada nenhuma geração automática de lançamento `commission_out` rastreável com `source_key` equivalente.
  — Lacuna: confirmar (revisão adicional de `save_proposal_bundle`, fora do escopo desta leitura) se comissão de vendedor gera lançamento rastreável; se não gerar, aplicar o mesmo padrão de idempotência já usado para hospedagem.
  — Depende de decisão externa: regra de quando/como a comissão de vendedor deve ser paga (à vista, por parcela, etc.) — não invento essa regra aqui.
  — Critério verificável: aprovar proposta com comissão de vendedor configurada e confirmar que surge lançamento `commission_out` correspondente em Contas a Pagar.
  — Prioridade: P1

- [ ] **`FIN-09` — `missingAccommodationCommissions` não é exibido em nenhum dashboard**
  — Status: 🟡 Implementado parcialmente (calculado, não exibido)
  — Evidência: `calcProposalProfit` (`financeCalcs.ts:24,28,40`) calcula o indicador; `proposalMargins` em `AdminFinanceLucroMargem.tsx:45-48` não repassa esse campo para a UI.
  — Lacuna: exibir o indicador nos dashboards para não tratar lacuna de dado histórico como lucro comprovado.
  — Depende de decisão externa: nenhuma.
  — Critério verificável: uma proposta com comissão de hospedagem ausente aparece sinalizada visualmente como "resultado incompleto" em Lucro & Margem.
  — Prioridade: P1

- [ ] **`FIN-10` — Páginas financeiras órfãs de rota**
  — Status: 🟠 Placeholder / esqueleto (código morto duplicado)
  — Evidência: `src/pages/admin/AdminFinance.tsx` ("Livro Caixa") e `src/pages/admin/AdminChartOfAccounts.tsx` ("Plano de Contas") não estão registradas em `App.tsx` nem no menu (`AdminLayout.tsx:72-82`) — a tela real de Plano de Contas usada é a aba dentro de `AdminFinanceConfig.tsx:184-245`. Ambas as órfãs são funcionais (CRUD completo), só inacessíveis pela UI.
  — Lacuna: decidir remoção ou propósito; risco de manutenção divergente entre a versão órfã e a ativa.
  — Depende de decisão externa: nenhuma.
  — Critério verificável: arquivos removidos, ou roteados com propósito documentado.
  — Prioridade: P3

- [ ] **`FIN-11` — Plano de contas vazio em produção**
  — Status: 🟡 Implementado e funcional; dado de produção vazio
  — Evidência: mensagem "Nenhuma conta cadastrada" (`AdminFinanceConfig.tsx:206`) é estado vazio real de `chart_of_accounts`, não bug de código — confirmado pela leitura do componente (CRUD funcional, dialog de criação operante).
  — Lacuna: nenhuma técnica; falta o cadastro inicial do plano de contas.
  — Depende de decisão externa: estrutura de contas contábeis a ser definida pela cliente/contabilidade.
  — Critério verificável: após cadastro, contas persistem e aparecem nos seletores de Despesas/Receitas/Livro Caixa.
  — Prioridade: P2 (aguardando insumo externo)

- [ ] **`FIN-12` — Previsão de caixa ignora contas vencidas**
  — Status: 🟡 Implementado parcialmente
  — Evidência: `calcCashForecast` (`financeCalcs.ts:233-245`) só considera `status === "pending"`, ignorando `overdue` — uma conta vencida some da previsão de 4 semanas em vez de aparecer como saída imediata pendente.
  — Lacuna: incluir `overdue` na previsão.
  — Depende de decisão externa: nenhuma.
  — Critério verificável: criar transação `overdue` com vencimento nas próximas 4 semanas e confirmar que aparece na previsão — hoje não aparece.
  — Prioridade: P2

- [ ] **`FIN-13` — Relatórios usam `due_date`, nunca `competence_date`**
  — Status: 🟡 Implementado parcialmente
  — Evidência: `AdminFinanceReports.tsx:47` filtra por `due_date`; `competence_date` (coletado desde a migration de rastreabilidade) não é usado em nenhum agregado.
  — Lacuna: decidir e implementar corte por competência onde a regra de negócio exigir.
  — Depende de decisão externa: se DRE/relatórios devem ser por competência ou caixa.
  — Critério verificável: lançamentos com `due_date` fora do período mas `competence_date` dentro dele aparecerem no relatório, se essa for a regra definida.
  — Prioridade: P2

## 8. Contratos — Clicksign

- [ ] **`CTR-01` — Criação de documento sem sandbox e com fallback de PDF em branco**
  — Status: 🟡 Implementado parcialmente / não homologado
  — Evidência: `supabase/functions/clicksign-create-document/index.ts:9` — `CLICKSIGN_API = "https://app.clicksign.com/api/v1"` fixo, sem alternância sandbox/produção; linhas 94-113 tentam criar documento a partir de **template**; se falhar, linhas 118-136 sobem um **PDF em branco hardcoded de uma página**, sem dados da proposta, só para o fluxo não quebrar. Requer `CLICKSIGN_API_KEY` (linha 22).
  — Lacuna: variável/flag de ambiente para sandbox; o fallback de PDF em branco mascara a ausência de template real — não deveria existir silenciosamente em teste.
  — Depende de decisão externa: **template Clicksign real com os campos da proposta configurado no painel da Clicksign** (pendência já documentada); confirmação de qual versão de API a conta contratada usa (v1 vs. v3, ver `CTR-06`). Atualização: um inventário posterior (nomes apenas, com digests, sem valores — `scratch/remote-audit/prd-secret-inventory.json`) confirma que `CLICKSIGN_API_KEY` **já existe configurado em PRD**. Isso não confirma se é uma chave de sandbox ou produção, nem se funciona — valor e funcionamento permanecem não verificados.
  — Critério verificável (sandbox): chamar a function com proposta de teste (`status='approved'`, `published_at` preenchido) usando `CLICKSIGN_API_KEY` de conta sandbox; confirmar que a resposta vem do branch de template bem-sucedido (não do fallback de PDF em branco — verificável pelo log "Template creation failed..."); confirmar no painel sandbox que documento e signatário foram criados; confirmar `proposals.contract_url` atualizado.
  — Prioridade: P1 (técnico) + depende de credencial/decisão para fechar de vez

- [ ] **`CTR-02` — Validação do webhook Clicksign é logicamente contornável**
  — Status: 🟠 Placeholder / esqueleto (falha de segurança concreta)
  — Evidência: `supabase/functions/clicksign-webhook/index.ts:20-25` — `if (WEBHOOK_SECRET && headerSecret && headerSecret !== WEBHOOK_SECRET) return 401`. Se o header `x-webhook-secret` não for enviado, a condição inteira é `false` e a requisição é **aceita** mesmo com o secret configurado — não é fail-closed. Compare com `manychat-webhook/index.ts:34-41`, que faz a checagem corretamente (rejeita se o secret não bater OU não existir).
  — Lacuna: corrigir para exigir presença do header antes de qualquer teste com tráfego externo simulado — do jeito que está, "testar em sandbox" e "estar exposto de forma insegura" são a mesma situação.
  — Depende de decisão externa: nenhuma para a correção do código. Atualização: `CLICKSIGN_WEBHOOK_SECRET` **já existe configurado em PRD** (confirmado só por nome/digest, `scratch/remote-audit/prd-secret-inventory.json`) — valor e se corresponde ao secret real configurado no painel Clicksign não foram verificados; teste de ponta a ponta ainda depende disso.
  — Critério verificável: enviar POST sem o header — deve retornar 401 (hoje não retorna); com header correto, aceitar; com header errado, rejeitar.
  — Prioridade: **P0**

- [ ] **`CTR-03` — Idempotência de webhook: implementada; parsing de payload nunca validado contra Clicksign real**
  — Status: 🟡 Implementado parcialmente / não homologado
  — Evidência: idempotência real via checagem `contract_status === "signed"` antes de reprocessar (linhas 106-112). Parsing de `body.event.name`/`body.document.key`/`body.request_signature_key` (linhas 82-96) é uma suposição de formato nunca validada contra um payload real da Clicksign.
  — Lacuna: validar formato real do payload assim que houver acesso a um documento de teste na conta Clicksign.
  — Depende de decisão externa: acesso à conta Clicksign (sandbox ou real) para gerar um payload de teste genuíno.
  — Critério verificável: enviar payload sintético fiel ao formato real de um evento de assinatura de teste; confirmar matching correto da proposta.
  — Prioridade: P1

- [ ] **`CTR-04` — Avanço automático de pipeline pós-assinatura é código morto hoje**
  — Status: 🟠 Placeholder / esqueleto
  — Evidência: `clicksign-webhook/index.ts:131-136` procura etapa `ilike("name", "%Contrato Assinado%")`; busca em todas as migrations confirma que **não existe** nenhuma etapa com esse nome cadastrada — o bloco de avanço nunca executa hoje.
  — Lacuna: criar a etapa "Contrato Assinado" (ou nome equivalente) em `pipeline_stages`, se esse avanço automático for desejado.
  — Depende de decisão externa: nome/posição da etapa é decisão da cliente/equipe comercial (ligado a `CRM-03`, que trata da falta de tela de gestão de etapas).
  — Critério verificável: etapa existe e o webhook, ao processar assinatura de teste, move o prospect para ela.
  — Prioridade: P2

- [ ] **`CTR-06` — Integração usa API v1 (legada) da Clicksign, sem sandbox real**
  — Status: 🟡 Implementado parcialmente / não homologado
  — Evidência: `clicksign-create-document/index.ts:9` chama `https://app.clicksign.com/api/v1/...` (templates/documents, documents, signers, lists). Pesquisa na documentação oficial atual (`developers.clicksign.com/docs/descubra-sua-versao-da-api`, `docs/migracao-da-api-19-para-30`) confirma: **API 1.9 é legada e não recebe mais atualizações/melhorias**; toda evolução da plataforma é na API 3.0 ("Envelope"), que tem ambiente de sandbox real e distinto (`https://sandbox.clicksign.com/api/v3/...`) da produção. A v1 não tem esse sandbox dedicado — testar nela usa a mesma base de produção.
  — Lacuna: decidir se vale migrar `clicksign-create-document` para a API v3/Envelope (o que dá acesso a sandbox real e ao mecanismo de assinatura de webhook documentado, `CTR-02`) ou manter v1 sabendo que não há mais atualizações da Clicksign para ela. Esta decisão está **fora do escopo do lote de segurança aplicado nesta sessão** (que tratou só de fechar a validação do webhook, não de reescrever a criação de documento).
  — Depende de decisão externa: confirmação de qual API a conta contratada da cliente usa/deveria usar; se migrar para v3, requer nova credencial/token daquela API (o `CLICKSIGN_API_KEY` atual pode não servir para v3, que usa esquema de autenticação por `Authorization` token, conforme `developers.clicksign.com/reference/api-detalhes-do-webhook`).
  — Critério verificável: confirmar com a Clicksign/documentação qual API a conta ativa suporta; se v3, testar contra `sandbox.clicksign.com` sem qualquer chance de afetar produção.
  — Prioridade: P2

- [x] **`CTR-05` — Guard do widget frontend contra callbacks antigos**
  — Status: ✅ Implementado e testado
  — Evidência: `src/lib/clicksignWidget.ts:11-35` (flag `active`, `current()`, dispose limpando `script.onload`); `ProposalPublic.tsx:738,751` invalida por `[clicksignKey, token, user?.id, proposal?.id]`; teste `src/lib/clicksignWidget.test.ts` (3 cenários: contexto mudou antes do load, callback retido após navegação, invalidação de load já enfileirado).
  — Prioridade: — (concluído)

## 9. WhatsApp — ManyChat

- [ ] **`WPP-01` — Webhook recebido: bug de normalização de telefone**
  — Status: 🟡 Implementado parcialmente / não homologado
  — Evidência: `supabase/functions/manychat-webhook/index.ts:83` — `phone.trim().replace(/[^\\d+]/g, "")` (barra dupla — em JS/TS isso exclui literalmente os caracteres `\`, `d`, `+`, **não** dígitos). Compare com `clicksign-webhook/index.ts:178`, que usa corretamente `/[^\d+]/g`. Consequência: números com espaços/parênteses/traços não são limpos, gerando `prospects.phone` inconsistente entre o que o ManyChat grava e o que `clicksign-webhook` busca para disparar mensagem pós-assinatura — quebrando o matching por telefone.
  — Lacuna: corrigir o regex (`/[^\\d+]/g` → `/[^\d+]/g`).
  — Depende de decisão externa: nenhuma para a correção; depende de decisão sobre o provedor (ver `WPP-03`) para o teste completo. Atualização: `MANYCHAT_WEBHOOK_SECRET` **já existe configurado em PRD** (confirmado só por nome/digest), o que não confirma funcionamento real do fluxo.
  — Critério verificável: enviar telefone `+55 (11) 99999-9999` — hoje o valor salvo mantém espaços/parênteses; corrigido, deve salvar só dígitos e `+`.
  — Prioridade: P1

- [x] **`WPP-02` — Validação de origem do webhook ManyChat é fail-closed corretamente**
  — Status: ✅ Implementado (validação); sem teste automatizado
  — Evidência: `manychat-webhook/index.ts:34-41` rejeita se o secret não estiver configurado OU o header não bater exatamente — ao contrário do bug em `CTR-02`. Não é HMAC (secret compartilhado simples, sem proteção contra replay), mas funcionalmente correto para o modelo.
  — Lacuna: nenhum teste automatizado cobre isso ainda.
  — Depende de decisão externa: nenhuma.
  — Critério verificável: POST sem header ou com header errado retorna 401 — já funciona hoje.
  — Prioridade: P3 (só falta teste)

- [ ] **`WPP-03` — Decisão formal do provedor de WhatsApp ainda não fechada**
  — Status: 🟡 Implementado no código, decisão de negócio em aberto
  — Evidência: código já assume ManyChat como provedor (`manychat-webhook`, chamadas em `clicksign-webhook`, `meeting-reminders`, `calendly-webhook`), mas o contexto de negócio registra explicitamente: "Mapa, editor visual e WhatsApp/pipeline permanecem na fase posterior acordada; provedor e fluxos de mensagens ainda não foram definidos."
  — Lacuna: nenhuma técnica — é uma decisão pendente da cliente.
  — Depende de decisão externa: **confirmação formal de que ManyChat é o provedor escolhido**, e de que o payload assumido (`{name, phone, email, tags}`) corresponde ao que o fluxo real do ManyChat vai enviar. Atualização: `MANYCHAT_API_KEY` e vários `MANYCHAT_FLOW_*` **já existem configurados em PRD** (confirmado só por nome/digest, `scratch/remote-audit/prd-secret-inventory.json`) — presença do secret não confirma que a decisão de provedor está formalmente fechada nem que os flows apontados existem/funcionam na conta ManyChat.
  — Critério verificável: decisão registrada; payload real do ManyChat testado bate com o que o código espera.
  — Prioridade: P1 (bloqueia validar o resto como "pronto", mesmo com o código funcionando)

- [ ] **`WPP-04` — Dois UUIDs de estágio "atendimento" não encontrados em nenhuma migration**
  — Status: 🟠 Placeholder / esqueleto (risco de falha silenciosa)
  — Evidência: `manychat-webhook/index.ts:10-19` (`STAGE_MAP`) usa 4 UUIDs fixos; os dois de `orcamento` existem em migrations reais, os dois de `atendimento` não foram encontrados em nenhuma migration lida.
  — Lacuna: confirmar se esses UUIDs existem no ambiente alvo, ou substituir por lookup dinâmico por nome (como já feito em `clicksign-webhook`).
  — Depende de decisão externa: nenhuma técnica — é uma verificação de ambiente.
  — Critério verificável: `SELECT id FROM pipeline_stages WHERE id IN (...)` confirma existência no ambiente alvo antes de usar em produção.
  — Prioridade: P1

- [ ] **`WPP-05` — Envio de mensagem só existe em edge functions reativas, nunca sob controle manual do time**
  — Status: 🟡 Implementado parcialmente
  — Evidência: envio real só ocorre em `clicksign-webhook` (pós-assinatura), `meeting-reminders` (lembretes 24h/1h) e `calendly-webhook` (confirmação/reagendamento/cancelamento) — nenhum botão de UI dispara mensagem manualmente. `calendly-webhook` usa fallback `flow_ns || ""` (linhas 348,508,629,727) — se a env var não estiver configurada, chama a API real do ManyChat com `flow_ns` vazio em vez de pular a chamada (padrão inconsistente com `clicksign-webhook:169`, que checa antes de chamar).
  — Lacuna: uniformizar o padrão de "pular chamada se env var ausente" em todos os pontos de disparo.
  — Depende de decisão externa: nenhuma técnica; API do ManyChat não tem sandbox isolado — "testar com segurança" exige conta/subscriber de teste dentro da própria conta ManyChat real.
  — Critério verificável: com conta ManyChat de teste e subscriber de teste, disparar cada gatilho e confirmar no painel ManyChat que só o subscriber de teste recebeu o flow — sem qualquer contato real notificado.
  — Prioridade: P2

## 10. Dependências externas consolidadas (só Gustavo/cliente resolve)

Lista consolidada — cada item referencia os IDs técnicos que ele desbloqueia:

| Dependência externa | Desbloqueia |
|---|---|
| Acesso administrativo ao Supabase remoto (dev/PRD) para aplicar/confirmar as 13 migrations de set./abril sem registro remoto | `PROP-EDT-01` e homologação de todo o restante |
| Template de contrato Clicksign aprovado com campos da proposta; confirmação se a conta é v1 (legada) ou v3 (com sandbox real) | `CTR-01`, `CTR-03`, `CTR-06` |
| Confirmação formal de que ManyChat é o provedor de WhatsApp definitivo; flows reais (`MANYCHAT_FLOW_*`) existem e correspondem aos IDs configurados | `WPP-03`, e por extensão `WPP-01`, `WPP-04`, `WPP-05` |
| Definição de "grupo" como entidade de negócio (múltiplas propostas) | `CRM-07`, `FIN-07` |
| Planilha real "Melhor aos 50" para validar cálculos | `FIN-04`, `FIN-05` e regras de rateio/imposto já registradas em `docs/HOMOLOGACAO-2026-09-12.md` |
| Definição contábil de estrutura de DRE (caixa vs. competência, linhas) junto à contabilidade | `FIN-04`, `FIN-05`, `FIN-13` |
| Cadastro inicial do plano de contas | `FIN-11` |
| Regra de pagamento de comissão de vendedor | `FIN-08` |
| Nome/posição da etapa "Contrato Assinado" (e demais etapas do pipeline) | `CTR-04`, `CRM-03` |
| Originais de mídia e destino de armazenamento definitivo | já registrado em `docs/EXECUCAO-ATMOS.md`; não reaberto neste lote |
| Deploy/configuração Vercel | já registrado em `docs/RETOMADA-APOS-DESLIGAR.md`, item 11; não reaberto neste lote |

Esta tabela não substitui a nota "tasks for Gustavo" (não lida neste lote por não estar entre as notas conectadas informadas) — é um recorte específico aos 6 fluxos pedidos.

## 11. Fora do escopo desta auditoria / não verificado

- Nenhuma consulta SQL foi executada contra qualquer Supabase (local, dev ou PRD) — todos os achados de schema vêm de leitura de arquivos de migration.
- Nenhum teste (`npm test`/`tsc`/`build`) foi reexecutado nesta sessão — os números citados (183 testes Vitest, TypeScript, build) são os já registrados em `docs/HOMOLOGACAO-2026-09-12.md` de 12/09, não uma nova rodada.
- Nenhum portal (Atmos-Audit ou outro) foi usado — todos os achados vêm de leitura estática de código.
- Não foi verificado por mim o **valor** ou **funcionamento** de nenhum secret em nenhum ambiente Supabase — só os **nomes** de variáveis que o código espera foram levantados por leitura de código. Um inventário paralelo e independente (`scratch/remote-audit/prd-secret-inventory.json`, nomes e digests apenas, sem valores, sem envio real) confirmou que `CLICKSIGN_API_KEY`, `CLICKSIGN_WEBHOOK_SECRET`, `MANYCHAT_API_KEY`, `MANYCHAT_WEBHOOK_SECRET`, vários `MANYCHAT_FLOW_*` e credenciais de assinatura/token do Calendly **já existem configurados em PRD**. Isso não deve ser lido como "credencial ausente" em nenhum item deste documento — a lacuna real, onde ainda existe, é de **validação de valor/funcionamento**, não de presença.
- Homologação visual/mobile real (Safari/iOS) não foi revisitada neste lote — segue como pendência já registrada.
- Este documento não define nem sugere políticas comerciais, fiscais ou de rateio — onde a lacuna depende disso, está marcada como "Depende de decisão externa" sem preencher com suposição.

## 12A. Adendo — lote de segurança Clicksign/ManyChat implementado (mesma sessão, 12/09/2026)

Após a auditoria acima, foi implementado — na mesma sessão, no mesmo worktree, **sem commit** — um lote de correções de segurança limitado a `supabase/functions/clicksign-webhook`, `clicksign-create-document`, `manychat-webhook` e helpers/testes relacionados. Escopo deliberadamente independente do trabalho concorrente em frontend/cálculos de preço (feito por outro terminal no mesmo worktree nesta janela). Nenhum e-mail/contrato real foi enviado; nenhuma migration foi aplicada; nenhum deploy foi feito.

**Pesquisa prévia (documentação oficial, não inventada)**: consultado `developers.clicksign.com` — webhook usa header `Content-Hmac: sha256=<hex>` com HMAC-SHA256 sobre o corpo bruto da requisição (chave = secret gerado no cadastro do webhook); API v1 (usada pelo código) é legada mas ainda ativa, com host de sandbox real (`sandbox.clicksign.com`) distinto de produção (`app.clicksign.com`); `GET /api/v1/documents/:key` retorna `document.status` (`closed`/`running`/`canceled`) e `document.finished_at`, usável para confirmar assinatura sem depender só do payload do webhook. Para ManyChat, confirmado que a ação "External Request" não tem mecanismo de assinatura/HMAC documentado para chamadas de saída — um segredo compartilhado comparado com *fail-closed* é a verificação mais forte disponível para esse provedor, não uma solução improvisada.

**Arquivos novos**:
- `supabase/functions/_shared/webhookAuth.ts` — `verifyClicksignContentHmac` (HMAC-SHA256 real via Web Crypto, fail-closed em qualquer condição: secret ausente, header ausente, header malformado, ou assinatura não confere) e `verifySharedSecretHeader` (usado pelo ManyChat, mesma postura fail-closed).
- `supabase/functions/_shared/clicksignVerify.ts` — `fetchClicksignDocumentStatus`, chama `GET /api/v1/documents/:key` real antes de qualquer gravação de `contract_status='signed'`; só confirma quando `status==='closed' && finished_at` presente.
- `supabase/functions/_shared/webhookAuth.test.ts` e `clicksignVerify.test.ts` — 19 testes com Vitest, secret/fetch mockados, sem qualquer chamada de rede real (HMAC de referência calculado de forma independente com `node:crypto` para não mascarar um bug compartilhado entre implementação e teste).
- `supabase/migrations/20260912180000_clicksign_document_key_link.sql` — timestamp reservado como combinado, **sem colidir com nenhuma migration do Codex** (verificado antes e depois da implementação: `170000_admin_team_authorization.sql` e `190000_site_text_overrides.sql` já existiam e não foram tocadas). Adiciona `proposals.clicksign_document_key` e `proposals.clicksign_request_signature_key` (nullable, índices únicos parciais) para permitir correspondência **exata** proposta↔documento no webhook. SQL **não executado** — só revisão estática, seguindo a convenção já usada no restante do repositório.

**Mudanças por arquivo**:
- `clicksign-webhook/index.ts`: (1) substitui o header customizado `x-webhook-secret` (falho — aceitava requisição sem header mesmo com secret configurado) pela verificação HMAC real `Content-Hmac`, lida sobre o corpo bruto antes de qualquer `JSON.parse`; falha sempre responde 401 genérico (o motivo específico só vai para o log do servidor, não para a resposta). (2) Matching passou a ser só por igualdade exata (`clicksign_request_signature_key`/`clicksign_document_key`/`contract_url` legado) — removida a busca por `includes()` que nunca teria funcionado de fato (`contract_url` nunca conteve o `document.key`). (3) Antes de gravar `contract_status='signed'`, chama `fetchClicksignDocumentStatus` contra a API real da Clicksign e só confirma se `status==='closed' && finished_at` presente — um evento de webhook autenticado mas desatualizado/repetido não basta mais sozinho.
- `clicksign-create-document/index.ts`: (1) `CLICKSIGN_API_BASE` (env var nova, opcional) permite apontar para `sandbox.clicksign.com` sem mudar comportamento padrão (produção, igual antes, se a variável não for definida). (2) Ao salvar o contrato criado, agora também grava `clicksign_document_key` e `clicksign_request_signature_key` nas colunas novas — sem isso, o matching exato do item anterior não teria o que comparar para contratos criados a partir de agora. Proposta com contrato já existente antes desta mudança não é retroativamente preenchida (sem backfill, documentado no comentário da migration).
- `manychat-webhook/index.ts`: (1) corrigido bug de regex `/[^\\d+]/g` (barra dupla — não limpava telefone formatado) para `/[^\d+]/g`. (2) verificação de secret migrada para o helper compartilhado (mesmo comportamento fail-closed de antes, agora testado e reaproveitado).
- `vitest.config.ts`: `include` estendido para também rodar `supabase/functions/_shared/**/*.test.ts` — única mudança em config de frontend, aditiva, não afeta nenhum teste existente (confirmado: suíte completa segue em 38 arquivos/294 testes aprovados após a mudança, incluindo o trabalho concorrente de outro terminal no mesmo worktree).

**Verificação feita nesta sessão**: `npx vitest run` completo — 38 arquivos, 294 testes aprovados (19 novos + 275 pré-existentes, incluindo os do terminal concorrente). Não foi possível rodar `deno check`/`deno test` (Deno CLI indisponível neste ambiente) — os três arquivos de função editados foram relidos manualmente por completo para conferência de sintaxe/tipos. Nenhuma chamada real foi feita a `app.clicksign.com`, `sandbox.clicksign.com` ou `api.manychat.com`.

**O que isto NÃO resolve (permanece dependente de credencial/decisão externa, sem mudança de status abaixo)**:
- `CLICKSIGN_WEBHOOK_SECRET` **precisa conter o secret real gerado pela Clicksign** no cadastro do webhook (retornado pela API/painel deles) — não mais uma string arbitrária escolhida pela equipe. Um inventário paralelo confirmou que essa env var **já existe em PRD por nome**, mas se o valor atual foi definido arbitrariamente (provável, já que o código antigo só precisava de uma string qualquer), **todos os webhooks reais passarão a ser rejeitados (401) até o valor ser trocado pelo secret real** — isso é uma troca de valor a ser feita por quem administra o painel Clicksign, não algo que este lote possa validar sem acesso à conta.
- Nenhum teste foi feito contra sandbox real da Clicksign nem conta de teste do ManyChat — os 19 testes novos usam apenas payload/`fetch` mockados, conforme escopo definido.
- `CTR-06` (API v1 legada vs. v3) continua uma decisão em aberto — este lote não migrou `clicksign-create-document` para v3; só tornou a base de URL configurável para permitir testar a v1 contra o sandbox real da Clicksign quando alguém tiver a credencial certa.
- O avanço automático de pipeline para "Contrato Assinado" continua sem efeito (etapa não existe em nenhuma migration) — `CTR-04` sem mudança.

## 12B. Coordenação entre terminais

Durante esta sessão, o worktree principal (`codex/atmos-stabilization`) tinha alterações não commitadas de outro terminal (Codex), incluindo aparente correção do achado `FIN-01` (`src/lib/proposalStatus.ts`) e do achado `SITE-EDT-01` (`src/hooks/useSiteTextOverrides.ts`), além de 5 migrations novas (`150000` a `170000`, `190000`, `200000`). Nenhum desses arquivos foi tocado por este lote — escopo mantido estritamente a Clicksign/ManyChat, timestamp `180000` reservado e confirmado livre antes e depois da implementação. Recomenda-se reler os achados `FIN-01` e `SITE-EDT-01` deste documento à luz do trabalho do Codex antes de considerá-los pendentes — este documento não foi atualizado retroativamente com o resultado desse trabalho concorrente por estar fora do escopo deste lote.

## 12C. Adendo — lote FIN-02/FIN-03 implementado e testado com concorrência real (mesma sessão, 12/09/2026)

Autorizado por Gustavo para execução imediata. Escopo: só `supabase/functions/approve-proposal`, `src/pages/admin/AdminFinanceReceitas.tsx` e duas migrations novas reservadas (`20260912210000`, `20260912220000`). Migrations `170000`–`200000` (Codex) não foram tocadas — verificado antes e depois. **Sem commit, sem push, sem deploy, sem migration aplicada em ambiente compartilhado.** Nenhum e-mail/WhatsApp/contrato real enviado.

**Metodologia de teste**: como o CLI Deno não está disponível neste ambiente (edge runtime não pode ser baixado — pouco espaço em disco), a validação não passou pelo Deno/HTTP; foi feita direto no Postgres, que é onde a garantia de atomicidade realmente vive. Cloneu-se o schema do banco local compartilhado (`supabase_db_atmos-homolog-20260912`, banco `postgres`, migrations até `200000` aplicadas) via `pg_dump --schema-only` para um banco descartável isolado (`atmos_fin_batch_test`, apagado ao final) — **nenhuma escrita de teste tocou o banco compartilhado com o Codex**. Grants padrão do Supabase (`GRANT ALL ... TO anon, authenticated, service_role`) precisaram ser restaurados manualmente no clone, pois `--no-privileges` os omite; isso não reflete nenhuma mudança real de permissão no ambiente compartilhado.

### FIN-02 — `approve_proposal_atomic` (migration `20260912210000`)

- **O que mudou**: toda a sequência validar→transicionar (token, publicação, validade, status atual, update, log de interação) agora roda dentro de uma única função Postgres `SECURITY DEFINER`, travando a linha da proposta (`FOR UPDATE`) antes de qualquer leitura. `supabase/functions/approve-proposal/index.ts` foi reescrito para chamar essa RPC via `service_role` (`REVOKE ALL ... GRANT EXECUTE ... TO service_role`, não exposta a `anon`/`authenticated`) em vez de fazer SELECT+UPDATE+INSERT separados.
- **Teste de concorrência real**: 15 chamadas verdadeiramente simultâneas (`docker exec` em paralelo, não sequenciais) contra a mesma proposta em `sent` → **exatamente 1 sucesso**, as outras 14 rejeitadas com `55002` ("cannot be approved in current status: approved") porque já enxergaram o estado pós-commit da vencedora. Confirmado no banco: `status='approved'` uma única vez, **exatamente 1 linha** em `prospect_interactions` (não 15).
- **Todos os caminhos de rejeição testados e com SQLSTATE confirmado**: não encontrada (`P0002`→404), token errado (`42501`→403), não publicada (`55000`→403), expirada (`55001`→422, mesma regra de calendário America/Sao_Paulo do código anterior), status inválido (`55002`→422), token malformado/não-UUID (`22P02`→400, comportamento novo: antes uma string qualquer só "não batia"; agora PostgREST rejeita o formato antes de entrar na função — mudança de borda aceitável, sem consumidor no frontend que dependa da diferença).
- Teste SQL versionado e **executado com sucesso**: `supabase/tests/approve_proposal_atomic.sql` (todos os caminhos sequenciais + ACL: `anon`/`authenticated` não têm `EXECUTE`).
- **Revisão do Root incorporada**: nenhum apontamento específico do Root recaiu sobre FIN-02 (o lote de revisão preliminar foi sobre a migration 220000); FIN-02 foi validado direto por mim com o teste de concorrência real acima.

### FIN-03 — `generate_proposal_receivable` (migration `20260912220000`)

- **O que mudou**: `handleGenerateFromProposal` em `AdminFinanceReceitas.tsx` não faz mais `insert` direto — chama a RPC nova, que trava a proposta (`FOR UPDATE`), verifica **qualquer** `financial_transactions` já vinculado à proposta (tipo `receivable`/`commission_in`, com ou sem `source_key` — não só o novo `source_key='proposal_approval'`) antes de criar algo. `fetchAll` ganhou uma query adicional **sem filtro de data** para calcular `linkedIds`, corrigindo o falso "aguardando lançamento" quando o recebível existente cai fora da janela `[filterFrom, filterTo]` visível na tela. Botão "Lançar" desabilita por linha enquanto a chamada está em voo.
- **Revisão preliminar do Root, incorporada antes de qualquer teste** (achados reais, não estilísticos):
  1. *Recebível legado sem `source_key` não bloqueava nova cobrança via RPC* — corrigido: a RPC agora busca por `proposal_id + type IN ('receivable','commission_in')` sem exigir `source_key` específico; se achar um legado, retorna `{created:false, reason:'legacy_unlinked', requires_manual_review:true}` **sem inserir nada**, e o frontend mostra toast distinto pedindo reconciliação manual — sem reassociação automática, mesmo padrão já usado para comissões legadas de hospedagem no restante do sistema.
  2. *Catch genérico de `unique_violation` podia mascarar erro alheio* — corrigido: o handler só retorna `created:false` se, ao reconsultar, **encontrar de fato** a linha `(proposal_id, 'proposal_approval')`; se não encontrar (violação de outra constraint), faz `RAISE;` (relança o erro original) em vez de fabricar uma resposta de sucesso falso.
  3. *Comentário sobre a race estava factualmente errado* — corrigido: como a função trava a linha da `proposals` **antes** de checar `financial_transactions`, duas chamadas concorrentes para a **mesma** proposta já são serializadas por esse lock (confirmado no teste de concorrência abaixo: nenhuma delas nunca chega a colidir na constraint). O handler de `unique_violation` é defesa em profundidade contra *outro* caminho de escrita que não passe por essa trava — não é o mecanismo que evita a race entre duas chamadas desta função. Comentário no SQL e no teste corrigido para não afirmar o contrário.
  4. *Valor zero/negativo não era validado* — corrigido: `total <= 0` é rejeitado com `22023` antes de qualquer inserção.
- **Teste de concorrência real**: 15 chamadas verdadeiramente simultâneas contra a mesma proposta aprovada → **exatamente 1 `created:true`**, as outras 14 com `created:false` apontando para o **mesmo id**. Confirmado no banco: **exatamente 1 linha** em `financial_transactions` para essa proposta.
- Teste SQL versionado e **executado com sucesso**: `supabase/tests/generate_proposal_receivable.sql` — cobre ACL (`anon` sem `EXECUTE`, não-admin rejeitado com `42501`), proposta em rascunho rejeitada (`55002`), primeira chamada cria com os campos certos, segunda chamada é no-op idempotente retornando o mesmo id, recebível legado bloqueia com o motivo certo, total zero/negativo rejeitados (`22023`).
- **Limite reconhecido, não escondido**: o handler de `unique_violation` é hoje inalcançável pelo próprio caminho de chamada desta função (a trava da proposta já serializa) — o teste sequencial o exercita simulando artificialmente o estado que ele foi feito para tratar, não uma race real. Isso é dito explicitamente no comentário da migration e no teste, em vez de alegar uma cobertura de concorrência que não existe para esse branch específico.

### Atualização — bloqueador de CLI resolvido, migrations aplicadas em `scratch/homolog-environment`

Depois da validação acima (banco isolado, descartável), tentamos aplicar `20260912210000`/`20260912220000` no ambiente compartilhado via `supabase migration up --local --include-all --workdir scratch/homolog-environment` (CLI 2.67.1) e falhou com `cannot insert multiple commands into a prepared statement (SQLSTATE 42601)`, agrupando `CREATE FUNCTION` até `COMMIT` como um único "statement 1". Isolei a causa por bisseção (arquivo sintético mínimo até reproduzir, testado via `--db-url` contra bancos descartáveis, nunca contra o ambiente compartilhado): não é apóstrofo em comentário (removidos e o erro persistiu, idêntico), não é o terminador `END;`/`$$;` em linhas separadas (testei igualando ao padrão `END $$;` do Codex e persistiu), não é `SELECT...FOR UPDATE`, não é `RAISE EXCEPTION` multi-linha com `%`, não é o bloco de comentário antes do `BEGIN;` — nenhuma dessas variáveis isoladas reproduziu a falha. O Root sugeriu testar com a versão atual do CLI (`2.117.0`, via `npm exec --yes --package=supabase@2.117.0`, sem alterar dependência do projeto/global) antes de aprofundar a bisseção: **confirmado, é bug do parser da CLI 2.67.1** — os mesmos dois arquivos (já com o ajuste `END $$;`, mantido por ser o padrão do repositório) aplicaram sem erro na primeira tentativa com 2.117.0.

Estado final: `20260912210000_approve_proposal_atomic.sql` e `20260912220000_generate_proposal_receivable.sql` estão **aplicadas e registradas** (`supabase migration list` mostra local=remote) no Postgres do ambiente `atmos-homolog-20260912` compartilhado (mesmo container usado por outros terminais). As duas funções existem no banco (`approve_proposal_atomic/2`, `generate_proposal_receivable/1`), e os dois testes SQL versionados (`supabase/tests/approve_proposal_atomic.sql`, `supabase/tests/generate_proposal_receivable.sql`) **passaram rodando contra esse banco real** (com `ROLLBACK`, sem deixar resíduo). Endpoint `approve-proposal` recebeu endurecimento adicional pedido nesta sessão: método diferente de `POST`/`OPTIONS` → 405; corpo JSON malformado → 400 (antes caía no catch genérico); erro de banco não mapeado agora retorna mensagem genérica ("Internal server error") ao cliente em vez de `error.message` cru, mantendo o log completo só no servidor — as mensagens das SQLSTATEs conhecidas (token inválido, expirada, etc.) continuam sendo repassadas por serem deliberadamente escritas para o usuário final.

**Ainda não testado por mim**: o caminho HTTP real via Deno (Root montou servidor nativo local na porta 8787 para isso, em paralelo). Meu teste ficou inteiramente no nível SQL/RPC direto contra Postgres.

### O que este lote NÃO faz

- Não migra recebíveis/comissões legados existentes para o novo `source_key` — permanecem como estavam, sinalizados para revisão manual quando encontrados pela RPC, nunca reassociados por suposição.
- Não implementa idempotência por chave de requisição (retry de rede) — a garantia é por estado final no banco (segunda tentativa é sempre um no-op seguro), não por deduplicação de requisição em trânsito.
- Não aplica as migrations em nenhum ambiente compartilhado ou remoto — ficam como arquivos no repositório, revisão estática + teste em banco descartável isolado, mesmo padrão de honestidade epistêmica do resto do projeto ("SQL não executado" vs. "executado e aprovado": aqui foi **executado e aprovado**, mas só localmente, em banco isolado, não no ambiente compartilhado nem em produção).

## 12. Referências

**Documentos fonte lidos integralmente nesta sessão**: `docs/HOMOLOGACAO-2026-09-12.md`, `docs/HOMOLOGACAO-E-PENDENCIAS.md`, `docs/RETOMADA-APOS-DESLIGAR.md`, `docs/EXECUCAO-ATMOS.md`, `docs/CATALOGO-PUBLICO.md`, `docs/CORRECOES-REVISAO-CALCULOS.md`, `docs/FINANCEIRO-RASTREABILIDADE.md`, `docs/GUIAS-VALIDACAO.md`, `docs/SAVE-PROPOSAL-BUNDLE-CONTRACT.md`, `docs/VERIFIED-COST-IDENTITY.md`, `docs/privacy-migration-notes.md`; notas Maestri `atmos-requisitos-e-execuca`, `auditoria-atmos-falhas-pub`, `contrato-show-price-breakdow`.

**Migrations mais relevantes aos achados** (setembro/2026, sem registro remoto confirmado): `20260911120000_public_proposal_privacy.sql`, `20260911223000_financial_transaction_traceability.sql`, `20260911224000_atomic_proposal_bundle.sql`, `20260911225000_public_catalog_projection.sql`, `20260911230000_public_proposal_edits.sql`, `20260912010000_guide_portal.sql`, `20260912020000_verified_cost_identity.sql`, `20260912120000_remove_unsafe_legacy_writes.sql`, `20260912130000_request_pipeline_segments.sql`, `20260912140000_server_proposal_totals.sql`.

**Suítes SQL locais aprovadas em 12/09** (per `docs/HOMOLOGACAO-2026-09-12.md`): `atomic_proposal_bundle`, `guide_portal`, `legacy_write_security`, `public_catalog_projection`, `public_proposal_edits`, `public_proposal_privacy`, `request_pipeline_segments`, `server_proposal_totals`, `verified_cost_identity`. Existe também `supabase/tests/remote_policy_drift.sql`, ligado à checagem de gap de migration remota.

**Branch/commit da leitura**: `codex/atmos-stabilization` @ `908dd8a`.
