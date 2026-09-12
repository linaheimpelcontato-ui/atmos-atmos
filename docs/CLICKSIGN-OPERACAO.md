# Operação assistida Clicksign / ManyChat

Procedimento de triagem e reconciliação da implementação da migration `20260912230000_clicksign_webhook_atomic.sql`. **Operação assistida não é worker, não drena a fila automaticamente e não garante entrega.** Este documento contém somente consultas SQL de leitura; não autoriza envio, alteração de vínculo ou alteração de estado.

Em 12/09/2026, o root informou consulta PRD com zero `contract_url` iniciado por `clicksign:` e zero contratos `sent`/`signed` naquele levantamento. Isso é um retrato informado pelo root, não demonstra fila vazia nem dispensa inventário posterior. Nenhuma consulta PRD foi executada para redigir este procedimento.

## 1. Preparação e inventário

Responsável: operador autorizado do ambiente, com apoio de engenharia para qualquer escrita. Confirme projeto/ambiente na conexão já aprovada antes de executar SQL. Use credencial de leitura administrativa apropriada; `anon`/`authenticated` não têm acesso à outbox. Não distribua service-role key, HMAC, claim_token, telefone completo ou payload pessoal em tickets.

Execute os blocos em uma sessão SQL sem transação anterior aberta. Todos usam `BEGIN READ ONLY` e terminam em `ROLLBACK`. Não invoque `complete_clicksign_document` ou `transition_clicksign_notification` como consultas diagnósticas: essas funções escrevem, mesmo quando chamadas por `SELECT`.

Primeiro confirme os objetos. Se ausentes, interrompa a triagem da fila e peça ao root verificar integração; este roteiro não aplica migrations.

```sql
BEGIN READ ONLY;
SELECT current_database() AS database_name,
       current_user AS database_user,
       now() AS observed_at,
       to_regclass('public.clicksign_notification_outbox') AS outbox_table,
       to_regprocedure('public.complete_clicksign_document(text,text)') AS completion_rpc,
       to_regprocedure('public.transition_clicksign_notification(uuid,uuid,text)') AS notification_rpc;
ROLLBACK;
```

Inventário atual e idade das pendências. A idade sozinha nunca autoriza reenvio.

```sql
BEGIN READ ONLY;
SELECT state, count(*) AS quantity,
       min(created_at) AS oldest_created_at,
       min(updated_at) AS oldest_updated_at
FROM public.clicksign_notification_outbox
GROUP BY state ORDER BY state;

SELECT id AS outbox_id, proposal_id, document_key, state,
       created_at, updated_at, lease_until,
       now() - updated_at AS time_since_update,
       CASE
         WHEN state = 'sending' THEN 'reconciliar; nao reenviar'
         WHEN state = 'pending' THEN 'avaliar causa antes de retry'
         WHEN lease_until IS NULL THEN 'lease ausente; investigar'
         WHEN lease_until < now() THEN 'lease vencido antes do envio'
         ELSE 'execucao em andamento; aguardar'
       END AS triage
FROM public.clicksign_notification_outbox
WHERE state IN ('pending', 'processing', 'sending')
ORDER BY created_at, id;
ROLLBACK;
```

Inspeção de um caso: substitua `NULL::uuid` pelo UUID da outbox, mantendo o cast. Com NULL, a consulta retorna zero linhas. O telefone é apenas indicado como presente; comparação do destinatário completo, se necessária, deve ocorrer em ambiente restrito.

```sql
BEGIN READ ONLY;
WITH target AS (SELECT NULL::uuid AS outbox_id)
SELECT n.id AS outbox_id, n.proposal_id, n.state, n.document_key,
       n.created_at, n.updated_at, n.lease_until,
       nullif(btrim(n.phone), '') IS NOT NULL AS has_phone_snapshot,
       p.prospect_id, p.segment, p.contract_status,
       p.clicksign_document_key,
       p.clicksign_request_signature_key,
       p.clicksign_document_key IS NOT DISTINCT FROM n.document_key AS document_still_linked
FROM public.clicksign_notification_outbox n
JOIN public.proposals p ON p.id = n.proposal_id
JOIN target t ON t.outbox_id = n.id;
ROLLBACK;
```

Registre no caso: ambiente, horário/fuso, IDs de proposta/outbox/documento, estado e lease observados, versão implantada, identificadores dos logs correlacionados, causa, evidência do provedor, decisão, responsável e resultado da releitura. A outbox atual não registra contador de tentativas, último erro, ID do subscriber, fluxo enviado ou ID de entrega externa. Não deduza esses dados de `updated_at`; obtenha-os em evidência restrita disponível ou registre que não foi possível correlacionar.

## 2. Critérios de retry e acompanhamento

| Estado | Significado na implementação | Conduta |
| --- | --- | --- |
| `pending` | Intenção persistida; esta tentativa ainda não iniciou sendFlow. Pode faltar configuração ou falhar lookup do contato. | Investigar e corrigir a causa com responsável autorizado. Avaliar reentrega autenticada somente pelos critérios abaixo. |
| `processing` com lease vigente | Um token detém a tentativa antes do envio. | Aguardar a execução; não alterar estado/token nem disparar outra tentativa operacional. |
| `processing` com lease vencido | A posse pré-envio pode ser retomada pelo handler, com novo token. | Confirmar vínculo e causa. A reentrega normal pode disputar a posse; o token antigo perde autorização. Não force liberação manual. Lease ausente é anomalia, não equivale a vencido. |
| `sending` | O guard foi persistido antes do HTTP. Pode ter enviado, falhado ou caído antes de iniciar HTTP. | **Não reenviar e não voltar a pending, mesmo após expirar o lease.** Aplicar seção 3. |
| `sent` | O handler recebeu HTTP bem-sucedido/status `success` do ManyChat e persistiu esse resultado. | Não reenviar. Isso não comprova leitura pelo destinatário nem entrega final em todos os canais. |
| `skipped` | Na criação da intenção não havia prospect/telefone utilizável segundo o teste atual de presença. | Não tratar como entregue. Avaliar cadastro e necessidade comercial em caso separado; não reabrir fila automaticamente. |

Para `pending` ou `processing` vencido, cumpra todos os passos:

1. Verifique vínculo exato do documento, proposta signed e motivo dos logs. Se o documento mudou, houver conflito de identidade ou indício de envio fora deste fluxo, interrompa e reconcilie primeiro.
2. Confirme configuração do ambiente com o responsável, sem copiar secrets. Para falha de lookup, confira destinatário e evidência disponível do cadastro no provedor; telefone na fila é snapshot, não é atualizado automaticamente quando o prospect muda.
3. Determine se há reentrega do evento original pendente no provedor. Use somente um mecanismo de reentrega efetivamente disponível e confirmado para a conta/integração pelo responsável. Este documento não presume botão, endpoint, prazo ou política de retry do Clicksign/ManyChat.
4. Uma reentrega autorizada deve passar pelo webhook normal, com payload autêntico, HMAC e verificação API do documento. Não fabrique HMAC, não simule fechamento e não chame a RPC de assinatura para contornar a verificação. Se não houver mecanismo verificado para reentrega, registre **bloqueado: falta procedimento de reprocessamento autorizado** e encaminhe à engenharia; não há comando de drenagem neste lote.
5. Releia o caso e os logs após a execução. `sent` encerra a tentativa técnica, `sending` exige reconciliação, `pending` mantém a causa em aberto. HTTP 200 sozinho não prova notificação: também existe retorno de evento ignorado, skipped e contrato histórico já signed sem outbox.

Respostas 500/503 tornam falhas explícitas, mas não asseguram que o provedor tentará novamente. A assinatura pode estar salva mesmo com notificação pendente e resposta 503. Defina um responsável e data de próxima verificação para cada pendência; não substitua esse acompanhamento por expectativa de retry automático.

## 3. Reconciliação de `sending`: sem reenvio

1. Preserve o estado e suspenda qualquer tentativa manual de envio desse caso. Reentrega do webhook não deve provocar novo sendFlow nesse estado; ela responde pendência de reconciliação. Não altere lease/claim_token para contornar o guard.
2. Correlacione janela de horário e ambiente com destinatário, fluxo vigente na tentativa e registros disponíveis no provedor. Use console, registros ou suporte efetivamente disponíveis na conta, sem presumir ferramentas/API. Documento fechado no Clicksign prova uma condição contratual; não prova execução de fluxo no ManyChat.
3. Evidência positiva suficiente deve identificar inequivocamente a execução externa pertinente e seu resultado: conta/ambiente, destinatário, fluxo, horário e identificador de execução/resposta quando disponível. Captura genérica de conversa ou sucesso de lookup não comprova sendFlow. Redija referência auditável em local restrito.
4. Com confirmação de aceitação da tentativa pelo provedor, peça à engenharia uma reconciliação **somente do registro**, sem disparo externo: releitura sob lock, conferência de ID/documento/estado e atualização transacional condicionada à posse correta, com evidência e autorização registradas. A RPC existente admite `sending → sent` com o token vigente, mas este roteiro deliberadamente não fornece nem executa comando de escrita. `sent` representa aceitação técnica confirmada, não leitura da mensagem.
5. Com evidência de não execução, ou resposta inconclusiva, mantenha `sending`. Ausência em uma tela, timeout, 5xx, silêncio do destinatário ou idade do registro não são prova de não envio. Encaminhe a decisão à engenharia/responsável comercial. **Mesmo com evidência negativa, este procedimento não libera reenvio de sending.** Qualquer nova comunicação exige avaliação e autorização próprias, fora desta rotina, para evitar duplicidade.

Feche o caso apenas com decisão documentada: aceitação confirmada e registro reconciliado, ou pendência explicitamente mantida com responsável. Se não há evidência suficiente, registre “resultado externo indeterminado”; não marque sucesso por suposição.

## 4. Vínculo legado verificado

Inventário de candidatos e vínculos potencialmente incompletos, sem inferir documento a partir de `contract_url`:

```sql
BEGIN READ ONLY;
SELECT id AS proposal_id, prospect_id, segment, contract_status,
       contract_url, clicksign_document_key, clicksign_request_signature_key
FROM public.proposals
WHERE contract_url LIKE 'clicksign:%'
   OR clicksign_document_key IS NOT NULL
   OR clicksign_request_signature_key IS NOT NULL
   OR contract_status IN ('sent', 'signed')
ORDER BY id;
ROLLBACK;
```

O formato legado `clicksign:<chave>` contém request_signature_key, não document_key. Igualdade de título, telefone, nome, e-mail, data aproximada ou segmento isolados não demonstram identidade do documento.

1. Abra caso por proposta. Obtenha evidência de criação/registro original que ligue aquela proposta ao contrato, e evidência do provedor que relacione exatamente document_key e request_signature_key. Confira conta/ambiente, documento/conteúdo contratual e signatário. Registre as referências e quem verificou; não anexe contrato pessoal em ticket público.
2. Exija correspondência inequívoca das duas chaves com a mesma proposta. Se há documentos substituídos, solicitações múltiplas, conta diferente ou evidência ausente, interrompa. Não escolha pela primeira ocorrência nem pela semelhança do texto.
3. Antes de solicitar backfill, execute a consulta abaixo com as chaves verificadas no lugar dos NULLs. Ela deve mostrar somente o vínculo esperado, ou nenhuma linha se ainda inexistente. Qualquer concorrente precisa de investigação, não sobrescrita.

```sql
BEGIN READ ONLY;
WITH verified AS (
  SELECT NULL::text AS document_key, NULL::text AS request_signature_key
)
SELECT p.id AS proposal_id, p.prospect_id, p.segment, p.contract_status,
       p.clicksign_document_key, p.clicksign_request_signature_key, p.contract_url
FROM public.proposals p CROSS JOIN verified v
WHERE (v.document_key IS NOT NULL AND p.clicksign_document_key = v.document_key)
   OR (v.request_signature_key IS NOT NULL AND
       (p.clicksign_request_signature_key = v.request_signature_key
        OR p.contract_url = 'clicksign:' || v.request_signature_key));
ROLLBACK;
```

4. Encaminhe à engenharia um backfill individual revisável: proposta, valores atuais e valores verificados, evidências, aprovador. A execução autorizada deve reler/bloquear a proposta, exigir os valores anteriores esperados, respeitar unicidade das chaves e alterar somente o vínculo comprovado. Não alterar signed, histórico ou outbox para fazer o evento “passar”. Este documento não contém UPDATE de backfill nem o autoriza.
5. Depois da escrita autorizada, releia o vínculo e os conflitos. Eventual reprocessamento deve seguir a seção 2 e a autenticação/verificação normal. Registro que já era signed e não tinha outbox continua sem notificação retrospectiva automática; registre a necessidade de auditoria separada.

## 5. Limites e referências locais

Não há worker, cron, botão de reconciliação, política automatizada de retry ou garantia exactly-once externa neste lote. Os passos de escrita/reentrega dependem de autorização e meio operacional efetivamente disponível; os blocos acima tornam executável a triagem de leitura, não criam um mecanismo de envio. Pendências sem esses meios permanecem registradas e acompanhadas.

Referências: [validação técnica](revisoes/CLICKSIGN-VALIDACAO-2026-09-12.md), [migration da fila](../supabase/migrations/20260912230000_clicksign_webhook_atomic.sql), [handler autenticado](../supabase/functions/_shared/clicksignProcess.ts), [verificação de documento](../supabase/functions/_shared/clicksignVerify.ts).
