# Autorização de endpoints administrativos

Os sete endpoints abaixo exigem POST e validam autorização antes de acessar integrações ou criar o cliente de serviço, exceto a listagem pública de mídia R2. OPTIONS continua disponível para preflight.

| Endpoint | Autorização |
| --- | --- |
| discover-prospects | módulo `b2b` |
| enrich-prospect | algum entre `cadastros`, `b2b`, `b2c` |
| report-insights | algum entre `financeiro`, `b2b`, `b2c` |
| calendly-setup | administrador com acesso total |
| rename-storage-folders | administrador com acesso total |
| meeting-reminders | segredo do agendador ou sessão de administrador com acesso total |
| r2-storage | módulo `site` para delete/copy/get-upload-url; listagem do bucket público permanece pública |

As sessões são verificadas em Supabase Auth. As RPCs `has_admin_module(p_module text)` e `is_full_admin(_user_id uuid)` são chamadas com o JWT do usuário, nunca com service role. Falha na configuração, Auth ou RPC bloqueia a operação. Aplicar a migration de módulos antes de publicar esses endpoints. Dependências: `SUPABASE_URL` e `SUPABASE_ANON_KEY`.

O bucket R2 é definido por `R2_BUCKET_NAME`, com padrão `atmos` para o frontend existente. A requisição não pode selecionar outro bucket. Uploads da interface agora usam o JWT da sessão; a chave pública isolada não autoriza emissão de URL de upload. Como os caminhos são compartilhados com a Home, acesso apenas a `cadastros` não permite mutações de mídia.

`enrich-prospect` e `report-insights` analisam somente dados enviados pelo chamador; não consultam o CRM ou financeiro com service role. O payload de relatório não é uma fonte financeira autoritativa. A leitura e a persistência de registros na interface continuam sujeitas às políticas por registro/segmento.

## Agendamento de lembretes

Configurar `MEETING_REMINDERS_SECRET` na edge e enviar o mesmo valor no cabeçalho `x-scheduler-secret`, em requisição POST ao endpoint `meeting-reminders`. Usar segredo próprio do agendador; não publicar no frontend. A ausência ou divergência do segredo não autentica a chamada. Alternativamente, uma sessão Auth válida de administrador com acesso total pode executar o endpoint pelo cabeçalho `Authorization: Bearer <JWT>`.

Agendamentos antigos que enviam apenas uma chave de projeto/service role precisam ser atualizados explicitamente para esse contrato antes da publicação. Esta alteração não configura secrets, não altera o agendador remoto e não envia lembretes durante os testes.

`calendly-setup` não retorna `signing_key` no payload de diagnóstico e limita a resposta de criação do provedor a status/URI. Aprovação pública de proposta, criação pública de contrato e webhooks autenticados por assinatura mantêm seus contratos próprios; não passam por este guard administrativo.

Testes: `npx vitest run src/test/adminModuleAuth.test.ts src/test/adminModuleEdges.test.ts src/lib/r2.test.ts`. Usam clientes injetados e executam os sete endpoints com imports e rede simulados; nenhum acesso externo nem envio de convite/mensagem.
