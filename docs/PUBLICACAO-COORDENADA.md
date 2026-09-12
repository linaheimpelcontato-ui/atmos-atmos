# Publicação coordenada — Atmos

Roteiro de execução futura, preparado em 12/09/2026. **Nenhuma ação remota, deploy, push para main ou commit foi executado para criar este documento.** **Gustavo já autorizou alterações, testes e publicação.** Essa autorização permanece válida: não solicitar nova permissão pessoal ou GO para repetir o escopo autorizado. A execução depende dos pré-requisitos técnicos abaixo; quando atendidos, prosseguir pela sequência registrada. Restauração destrutiva de PRD é uma ação separada, caso se torne necessária.

## Candidato e evidências

| Item | Estado registrado |
| --- | --- |
| Base integrada | `a509b53` — `origin/codex/atmos-stabilization`, enviado pelo responsável |
| Delta posterior validado pelo Root | Hardening de `20260410000000_force_insert.sql`, pendente no histórico PRD; no clone, `anon_execute=false` e `authenticated=false`, com helper removido ao final da cadeia; atualizar SHA/manifesto do candidato |
| Validação integrada informada pelo Root | 470 testes, 18 suítes SQL no clone da estrutura PRD e 12 endpoints Deno aprovados; catch de erro desconhecido R2 corrigido para erro genérico |
| Revisão independente | Claude revisa a migration 24 somente leitura; incorporar parecer e resolver bloqueadores técnicos antes da execução |
| Supabase PRD | `ekbsqckzelabjabuodmo`; histórico observado anteriormente até `20260330233228` |
| Plano SQL | CLI 2.117.0 dry-run informado lista **23 migrations pendentes**, terminando em `20260912240000`; confirmar novamente na janela |
| DEV | `zjavxhmxrbpidvssrbca`, inativo; restauração retornou **403**; não homologado remotamente |
| Vercel | Preview [CPBKtrxci7PYCSYWEhfjTs8t4Kqv](https://vercel.com/studio-78/atmos-atmos/CPBKtrxci7PYCSYWEhfjTs8t4Kqv) bloqueado; GitHub informou **Deployment was blocked**; sem login/token Vercel disponível |

Os resultados integrados acima pertencem à base `a509b53`. O Root informou adicionalmente o ensaio aprovado do delta de abril no clone e uma consulta atual a PRD confirmando `force_insert` ausente. A ausência do objeto em PRD não equivale ao registro de aplicação da migration histórica; conferir ambos separadamente. Essas evidências foram fornecidas pelo Root, sem nova consulta remota nesta edição.

O bloqueio Vercel é um fato informado pelo responsável, não um diagnóstico da causa ou uma nova consulta remota feita para este documento. Não presumir problema de plano ou autoria. Não propor upgrade pago, falsificação de autor Git ou substituição de credenciais para contornar a política. O titular autorizado precisa inspecionar o motivo, regularizar acesso/política e obter um preview elegível do SHA correto.

Testes locais e push da branch não comprovam funcionamento do preview, aplicação remota, validade dos secrets ou entrega de mensagens pelos provedores.

## Pré-requisitos técnicos de execução

Registrar responsável técnico, evidência e horário de cada verificação no ticket da publicação. Trata-se de prontidão operacional, não de um novo fluxo de autorização de Gustavo.

1. **Acesso legítimo ao frontend:** titular com permissão no projeto Vercel `studio-78/atmos-atmos`, preview desbloqueado e procedimento autorizado de publicação e retorno ao artefato anterior. Não iniciar schema PRD enquanto for impossível concluir a etapa frontend.
2. **Homologação:** resolver o 403 de DEV com o titular da conta e validar nesse ambiente, ou usar clone local + preview isolado como alternativa técnica, documentando cobertura, configuração isolada e lacunas remanescentes. Não apontar um preview de QA para PRD para simular DEV, nem restaurar dados reais em ambiente exposto. A indisponibilidade de DEV não desaparece do registro por haver testes locais.
3. **Código e revisão:** parecer da 24 concluído sem bloqueador de código; SHA, arquivos, checksums das migrations e artefatos congelados. Qualquer correção posterior exige novo SHA, avaliação do impacto e repetição dos checks pertinentes. Este documento novo não faz parte de `a509b53` até integração posterior pelo responsável.
4. **Backup restaurável:** baseline completa e ensaio de recuperação concluídos, descritos abaixo. Export de schema isolado não é backup dos dados.
5. **Contenção comprovada:** mecanismo ensaiado para impedir uso de versões incompatíveis durante a janela, incluindo REST/RPC, funções antigas com service role, clientes com abas abertas e integrações. Uma tela de manutenção no site não bloqueia chamadas diretas às APIs. Sem mecanismo de contenção e retorno verificado, não começar a aplicação SQL.
6. **Integrações:** conferir secrets, configuração de assinatura e destinos com os responsáveis dos provedores, sem copiar valores para logs/Git. Definir retenção/reentrega de webhooks e suspensão/retomada de jobs. Não presumir que o provedor repetirá eventos automaticamente.
7. **Operação:** coordenador técnico, executor Supabase, executor frontend e responsável por recuperação disponíveis na mesma janela; critérios de interrupção e tempo máximo combinados antes do início.

A conta com `allowed_modules=['all']` é uma pendência conhecida de reconciliação por admin total: não converter silenciosamente para `[]`. Confirmar que os administradores totais existentes conseguem autenticar e gerir equipe antes da janela; não registrar suas identidades neste documento. A 24 preserva o legado, nega seus privilégios administrativos e mostra aviso na UI.

## Baseline de backup e preservação

Antes da janela, e novamente após conter escritas, produzir um conjunto identificado por timestamp UTC e projeto. Guardar fora do repositório, com acesso restrito, retenção definida e checksums. Não imprimir senhas, tokens, connection strings ou dados pessoais em logs compartilhados.

| Parte | Evidência mínima |
| --- | --- |
| Banco | Schema, dados e grants necessários de public/auth/storage e dependências/extensions; funções, triggers, policies, índices, sequências, configurações relevantes e histórico `supabase_migrations.schema_migrations` |
| Integridade | Contagens e manifestos por tabela; somas de transações por tipo/status; totais e estados de propostas; chaves de origem, vínculos de contatos/segmentos e referências de contratos; timestamps/LSN quando disponíveis |
| Identidade | Relações Auth, roles e admin_permissions; confirmação de recuperação do acesso dos administradores totais, sem divulgar dados das contas |
| Arquivos | Inventário e cópia/versionamento verificável dos objetos Supabase Storage **e R2**, com chaves/tamanho/checksum ou versão; metadata de storage não contém os bytes dos arquivos |
| Aplicações | Deployment Vercel anterior e seu SHA/artefato; versões efetivamente implantadas das functions, configurações JWT e dependências; o commit anterior no Git não prova qual código está em PRD |
| Configuração | Mapa de variáveis, IDs dos recursos e referências seguras aos secrets recuperáveis; lista de nomes de secrets sozinha não permite restaurar valores |
| Integrações | Webhooks, assinatura, destinos, schedulers, IDs/eventos em trânsito e estados de notificação; comprovação de quem consegue suspender e retomar cada integração |

Restaurar uma cópia em banco isolado compatível com a versão/extensões de PRD, conferir contagens, relações, autenticação e leitura da aplicação. Manter exportação de dados pessoais protegida; não colocar dumps ou fixtures reais no preview. Confirmar espaço disponível e duração real da recuperação. Não declarar PITR disponível sem comprovar o recurso e o ponto recuperável.

Marcar o baseline pré-release e conservar um segundo snapshot se houver incidente após novas escritas. Não restaurar todo PRD sobre dados mais novos apenas para voltar código.

## Sequência de execução

### 1. Preparação sem modificar PRD

- Usar checkout isolado do candidato aprovado, limpo, com Node compatível com `package.json` e lockfile. Conferir `git rev-parse HEAD` e checksums. Não fazer merge/push em main como efeito lateral do deploy.
- Repetir build (`npm ci`, `npm run build`) e validação pertinente. `npm run lint` contém `|| true`; seu exit code não é evidência suficiente de lint aprovado.
- Confirmar preview, URLs de callback/Auth, origens, SPA/rotas diretas e configurações separadas por ambiente. O build lê `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`; nunca incluir service role ou secrets de provedores em variáveis VITE.
- Separar artefatos frontend para homologação e produção: variáveis Vite entram no build. Não promover cegamente um bundle de preview conectado a DEV/local para PRD.
- Fixar CLI **2.117.0**; o parser 2.67.1 falhou em SQL válido. Não alterar comentários/corpos SQL para acomodar a versão antiga.

Comandos de referência para o executor autorizado, **não executados por este roteiro**. Usar checkout vinculado explicitamente ao projeto confirmado, sem presumir `project_id="default"` ou vínculo salvo no notebook:

```sh
npm exec --yes --package=supabase@2.117.0 -- supabase --version
npm exec --yes --package=supabase@2.117.0 -- supabase link --project-ref ekbsqckzelabjabuodmo
npm exec --yes --package=supabase@2.117.0 -- supabase migration list --linked
npm exec --yes --package=supabase@2.117.0 -- supabase db push --linked --include-all --dry-run
```

O link é configuração da ferramenta; as credenciais devem vir do mecanismo seguro do operador. Conferir o projeto antes de cada comando remoto. Dry-run não substitui ensaio de execução nem garante ausência de conflito com dados reais.

Plano esperado: três migrations de abril (`force_insert`, campos de profiles, variation support) e vinte de setembro, até a 24. Registrar a lista exata e checksums na janela. **Se a lista divergir das 23 revisadas, parar e reconciliar**; não usar `migration repair` para marcar arquivos não executados ou apagar histórico para forçar correspondência.

### Exceção documentada: migration histórica ainda não aplicada em PRD

O Root alterou somente `20260410000000_force_insert.sql`: envolveu CREATE/REVOKE em BEGIN/COMMIT, qualificou `public.force_insert`, fixou `SET search_path = public` e revogou todos os privilégios da assinatura `(text,jsonb)` de PUBLIC, anon e authenticated. A migration de setembro `20260912120000_remove_unsafe_legacy_writes.sql` continua removendo exatamente essa assinatura.

**Justificativa:** esse arquivo histórico ainda aparece como pendente em PRD. A correção endurece sua primeira aplicação, em vez de reescrever algo já registrado como executado nesse ambiente. Confirmar essa condição no preflight imediatamente anterior ao release. Não generalizar a exceção para migrations já aplicadas; se o histórico remoto indicar execução de abril, interromper e planejar correção incremental. Não reparar/apagar histórico para reaplicar abril em ambientes que já passaram por ela.

Revisão estática do delta: não identifiquei bloqueador no mecanismo de criação/revogação atômica. O REVOKE explícito cobre tanto o grant padrão a PUBLIC quanto grants diretos de anon/authenticated; não depende somente do search_path. A função mantém sua implementação privilegiada e não deve ser chamada durante a janela; owner e eventual service role confiável não foram desautorizados por esse REVOKE. Não classificá-la como segura para uso geral. A remoção final de setembro permanece obrigatória.

Ensaio concluído pelo Root no clone: `anon_execute=false`, `authenticated=false`; helper removido ao final da cadeia. Consulta atual do Root a PRD também confirmou `force_insert` ausente. Não atribuir a esse resultado testes adicionais de rollback induzido que não foram informados. Resta conferir o plano de 23 migrations na janela e registrar checksum novo e SHA do candidato que incorpora o delta. Esta revisão não executou a função nem SQL no banco.

### 2. Abrir janela e conter tráfego

- Impedir novas operações administrativas/comerciais, aprovações, solicitações, uploads e consumo de funções antigas durante a troca. Tratar também sessões abertas e acesso direto à API; comprovar a contenção pelo mecanismo aprovado no preflight.
- Suspender produtores/jobs de mensagens e coordenar entrada de webhooks com retenção durável/reentrega comprovada. Não responder sucesso a um evento descartado e não acionar envios reais como teste de conectividade.
- Drenar requisições em voo; verificar ausência de escritas concorrentes e capturar o baseline final. Manter observação de locks e sessões. Interromper se a contenção não funcionar.

A cadeia contém uma criação temporária de `force_insert` antes de sua remoção em setembro. O delta posterior de abril cria a função e revoga EXECUTE de PUBLIC, anon e authenticated **na mesma transação**, fechando a exposição transitória desses papéis ao reaplicar a cadeia. Esse hardening não substitui a contenção: funções antigas com service role continuam fora da proteção RLS da 24 e versões intermediárias do conjunto permanecem incompatíveis. **Não expor os estados intermediários.** Cada migration pode ter transação própria; não existe uma transação única envolvendo 23 arquivos, deploy de functions e frontend.

### 3. Aplicar schema completo, em ordem

Com os pré-requisitos técnicos atendidos, a contenção comprovada e o dry-run conferido, executar sob a autorização já concedida:

```sh
npm exec --yes --package=supabase@2.117.0 -- supabase db push --linked --include-all
```

Aplicar o plano revisado inteiro, na ordem dos timestamps; não publicar somente 23/24 pulando dependências. Entre elas: índice source_key/bundle/totais; correção de drift e email; equipe 17; identidade Clicksign 18; editor/storage 19/20; aprovação 21; recebíveis 22; outbox Clicksign 23; autorização 24.

Em qualquer erro, manter contenção e parar. Registrar último arquivo comprovadamente concluído, SQLSTATE e transação efetivamente confirmada. Comparar histórico **e** objetos reais antes de decidir como retomar; não reaplicar cegamente um arquivo possivelmente parcialmente confirmado e não remover a migration do histórico como rollback.

Ainda sem tráfego, verificar:

- Histórico correspondente ao plano, nenhuma migration pendente inesperada; ausência final de force_insert e auto-admin signup.
- Policies permissivas de drift removidas; grants de RPCs, RLS e triggers de módulos presentes; 24 preservou SECURITY INVOKER do bundle e guards nas funções privilegiadas.
- Equipe restrita/total; valor legado não normalizado; proteção do último total.
- Unicidade `(segment,email)` histórica sem fusão de contatos; índice source_key; integridade dos vínculos; comparação dos manifestos antes/depois, distinguindo alterações intencionais de discrepâncias.
- Tabela/outbox da 23 e ACLs de service role; nenhuma exposição de payloads por anon/authenticated.

Não rodar diretamente em PRD as suítes SQL de teste do repositório: algumas criam fixtures, alteram constraints ou dependem de rollback. Executá-las na cópia isolada do estado resultante. Em PRD usar verificações de leitura e contas/registros de homologação explicitamente autorizados.

### 4. Publicar functions e configuração compatíveis

Com schema aprovado e tráfego ainda contido, configurar secrets/destinos e implantar do mesmo SHA as doze functions modificadas. Exemplo de comando por função:

```sh
npm exec --yes --package=supabase@2.117.0 -- supabase functions deploy manage-admin --project-ref ekbsqckzelabjabuodmo
```

Repetir nominalmente para `discover-prospects`, `enrich-prospect`, `report-insights`, `calendly-setup`, `rename-storage-folders`, `meeting-reminders`, `r2-storage`, `approve-proposal`, `clicksign-create-document`, `clicksign-webhook` e `manychat-webhook`. Registrar versão/resultados de cada deploy; erro em uma impede liberar o conjunto. Helpers em `_shared` acompanham seus consumidores. Não publicar indiscriminadamente outras functions não alteradas.

Preservar as opções de `supabase/config.toml`: funções públicas/webhooks com `verify_jwt=false` têm autenticação própria. Não ativar verificação de JWT de usuário globalmente e quebrar assinatura pública, nem remover os guards internos de módulos das funções administrativas. Conferir comportamento efetivo do gateway para chave pública e JWT de sessão.

Verificar com os titulares, sem revelar valores: SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY; R2 bucket/credenciais; CLICKSIGN_API_BASE/API_KEY/WEBHOOK_SECRET; MANYCHAT_WEBHOOK_SECRET/API_KEY/fluxos; configuração Calendly de assinatura e token. Nomes existentes não comprovam que o segredo coincide com o provedor. Não apontar fixtures de contrato para a API real por falta de sandbox comprovado.

`MEETING_REMINDERS_SECRET` e `x-scheduler-secret` precisam ser configurados juntos antes de habilitar lembretes, ou usar sessão Auth total para execução manual autorizada. O preflight anterior não encontrou job em `cron.job`; não inventar um scheduler existente. Se configuração permanecer ausente, manter lembretes desativados e registrar a funcionalidade indisponível.

Smoke tests autenticados/negativos devem provar que nenhuma function administrativa antiga ficou acessível. Testes de contrato/mensagens precisam de sandbox e destinos autorizados; chamadas públicas com token válido podem produzir efeitos reais.

### 5. Publicar frontend do mesmo candidato

Somente com backend verificado e acesso Vercel resolvido, o titular publica o artefato de produção do SHA aprovado pelo fluxo legítimo do projeto. Registrar deployment ID, SHA, ambiente e bundle servido. Não há comando automático de Vercel neste roteiro: não existem login/token disponíveis e o preview está bloqueado.

Manter contenção até provar que a origem de produção entrega o bundle correto, com variáveis PRD e assets resolvidos. Planejar recarga das sessões antigas/cache; um bundle antigo em aba aberta não recebe correções por ter sido criado um deployment novo.

### 6. Verificação integrada e reabertura gradual

| Frente | Critério de aprovação |
| --- | --- |
| Autorização | Total acessa equipe; restrito não eleva permissões; URL direta não monta módulo proibido; chamada REST/RPC direta também nega; B2C não lê/escreve B2B; legado desconhecido recebe aviso |
| Cliente/guia/público | Conta cliente mantém seus dados; guia mantém somente sua atribuição; proposta não publicada não aparece ao público; resposta pública não revela custos |
| Financeiro | Aprovação repetida não duplica interação; recebível repetido não duplica cobrança; legado pede reconciliação; status approved/accepted e arredondamento conferidos com fixtures autorizadas |
| Editor | Home e handshake; editar/salvar/editar novamente/reload; salvar seleção preserva previews; desktop/mobile isolados; dispositivo bloqueado com painel aberto |
| Storage | Leitura pública funciona; upload R2 usa sessão; escrita sem site negada; não usar mídia real como fixture destrutiva |
| Clicksign/webhooks | Assinatura inválida rejeitada sem mutação; identidade exata; idempotência e transição/outbox verificadas em sandbox; não reenviar mensagens para testar retry |
| Operação | Sem novos erros de schema/cache/RPC, loops de autenticação, falhas de permissão em fluxos autorizados ou divergência inexplicada de dados |

As dependências da [matriz de módulos](revisoes/AUTORIZACAO-MODULOS-2026-09-12.md) são intencionais: sincronizar comissão exige financeiro; mídia compartilhada exige site; ferramentas não concede acesso comercial transversal. Não tratar uma negação correta como motivo para reabrir policies gerais.

Liberar usuários e integrações por etapas, observando erros HTTP, locks, duplicidades, outbox, falhas de autenticação e entregas confirmadas pelos provedores. Definir intervalo e responsáveis no ticket; não encerrar a janela apenas porque o build respondeu 200. Retomar eventos retidos de forma controlada com IDs de deduplicação. Registrar reconciliações pendentes e manter os backups.

## Interrupção e rollback compensatório

Interromper imediatamente em vazamento de dados, escalada de privilégio, escrita fora de segmento, corrupção/duplicação financeira, perda de vínculo de contrato, envio duplicado, lockout administrativo, erro de migration ou impossibilidade de concluir functions/frontend. Manter/repor contenção, suspender produtores e preservar logs/IDs e snapshot pós-incidente.

| Ponto de falha | Resposta segura |
| --- | --- |
| Antes de qualquer mutação PRD | Cancelar janela; nenhum rollback de banco necessário |
| Durante migrations | Inspecionar o que confirmou; criar correção incremental revisada e ensaiada. Não presumir rollback global nem editar migrations já registradas |
| Functions parcialmente publicadas | Manter contenção e completar/corrigir versões compatíveis com o schema novo. Não reinstalar endpoints vulneráveis só porque eram a versão anterior |
| Frontend indisponível/incompatível | Manter backend protegido; usar apenas artefato anterior cuja compatibilidade com schema/guards novos tenha sido ensaiada. Se nenhum for compatível, manter manutenção e publicar correção |
| Dados escritos incorretamente | Identificar IDs e intervalo; comparar snapshots; compensar linhas afetadas com trilha de auditoria e transação revisada. Preservar novas escritas legítimas |
| Notificação/contrato externo incerto | Reconciliar com o provedor antes de retry. Estado `sending` na outbox não prova entrega nem falha; não resetar para pending nem apagar a outbox para forçar reenvio |

Uma migration compensatória tem **novo timestamp**, passa pelo clone do estado real após falha e mantém privacidade/RLS/grants seguros. Não restaurar `force_insert`, auto-admin signup, policies `USING(true)` administrativas ou ausência de guards como forma de rollback. Não alterar main, autores Git ou histórico remoto para disfarçar o estado aplicado.

DDL novo aditivo pode permanecer enquanto código é corrigido. Não apagar site_text_overrides, source_key, histórico de custos, vínculos Clicksign ou outbox que passaram a conter dados. Contratos assinados e mensagens enviadas não são desfeitos por restaurar PostgreSQL; precisam de procedimento comercial/provider separado e autorizado.

Restauração destrutiva integral não está incluída automaticamente na autorização de publicação e requer autorização específica se necessária. É último recurso: conter todas as escritas, preservar snapshot pós-incidente, confirmar ponto recuperável e quantificar a perda/reconciliação necessária. Restaurar primeiro em destino isolado, conferir integridade e obter decisão explícita do responsável antes de substituir PRD. Não executar `db reset`, restore destrutivo, limpeza de tabelas ou repair de histórico como atalho.

## Registro de encerramento

Guardar no ticket: SHA/manifesto liberado; parecer da 24; ambiente e cobertura efetiva de homologação diante do bloqueio DEV; evidência de desbloqueio/preview e deployment Vercel final; projeto e lista de migrations; versões das functions; backup e ensaio de restore; responsáveis/horários; checks de dados antes/depois; resultados dos smoke tests; eventos reconciliados e pendências. Secrets e dados pessoais ficam em armazenamento restrito, nunca anexados ao Git.

Referências locais: [homologação integrada](HOMOLOGACAO-FLUXOS-2026-09-12.md), [matriz de autorização](revisoes/AUTORIZACAO-MODULOS-2026-09-12.md) e [configuração das edges](../supabase/functions/_shared/ADMIN_AUTHORIZATION.md).
