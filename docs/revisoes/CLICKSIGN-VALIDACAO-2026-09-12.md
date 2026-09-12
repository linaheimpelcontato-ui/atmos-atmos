# Clicksign: transação, identidade e duplicatas — 12/09/2026

## Resultado

Correção implementada e validada em banco PostgreSQL local descartável. Sem commit, deploy, chamada externa real, contato real ou alteração do banco usado pelo preview. FIN21/22, editor e funções approve/receivable ficaram fora deste lote.

O webhook anterior ignorava erros/ausência de linhas no update e nas interações, permitia duas execuções simultâneas e retornava 200 em falha de verificação. A busca por request_signature_key podia aceitar um document_key de outra proposta.

## Arquivos

- `supabase/functions/clicksign-webhook/index.ts`: mantém autenticação HMAC sobre corpo bruto e delega o processamento autenticado; erros ficam explícitos no HTTP e logs sem telefone/credenciais.
- `supabase/functions/_shared/clicksignProcess.ts`: processamento testável, confirmação pela API existente, RPC transacional e entrega protegida por posse persistente da notificação.
- `supabase/migrations/20260912230000_clicksign_webhook_atomic.sql`: nova migration reservada; cria duas RPCs exclusivas do service_role e tabela outbox com RLS, inacessível a anon/authenticated.
- `supabase/functions/_shared/clicksignProcess.test.ts`: 24 casos novos.
- `supabase/tests/clicksign_webhook_atomic.sql`: identidade, atomicidade, permissões e transições da fila; fixtures/falhas injetadas terminam em rollback.
- `supabase/tests/clicksign_webhook_concurrency.py`: duas sessões PostgreSQL reais disputando assinatura e posse da notificação.

Helpers existentes `webhookAuth.ts` e `clicksignVerify.ts` preservados. Nenhuma migration existente foi editada. A migration nova depende das colunas/índices da `20260912180000_clicksign_document_key_link.sql`.

## Garantias verificadas

1. A proposta é localizada exclusivamente pelo document_key salvo e bloqueada com `FOR UPDATE`. Quando o evento contém request_signature_key, ela também deve coincidir com a coluna da MESMA proposta. Chaves conflitantes em dois campos do payload são rejeitadas antes da API. Não há fallback inseguro pelo contract_url legado.
2. Status signed, nota, eventual mudança de etapa e intenção de notificação fazem parte de uma só transação. Update sem linha lança erro; falha no histórico desfaz também o status. A etapa respeita o segmento do prospect e não gera stage_change quando já é a mesma.
3. Duplicatas encontram signed e a mesma entrada da fila. UNIQUE(proposal_id, document_key) e lock da proposta impedem dupla intenção. Reset manual de signed com entrada histórica produz conflito, sem repetir efeitos.
4. Falha/configuração ausente na verificação Clicksign retorna 503; resultado ainda não fechado também retorna 503, pois pode haver consistência eventual. Erro/retorno vazio do DB retorna 500. Identidade desconhecida/incompatível retorna 409. Sucesso/duplicata só retorna 200 depois de confirmação persistente, salvo evento ignorado ou registro histórico já signed.
5. A fila tem estados pending → processing → sending → sent; skipped é usado quando não há telefone/prospect. Só um token assume processing; lease de cinco minutos permite recuperar falha ANTES do envio e invalida o token anterior. Lookup/configuração ManyChat falhos voltam para pending e retornam 503.
6. Antes de chamar sendFlow, sending é persistido. Falha HTTP, resposta de erro, timeout ou falha ao registrar sent deixa sending e retorna erro. Duplicatas nunca retomam automaticamente sending. Sucesso ManyChat exige HTTP bem-sucedido e status semântico `success`.

## Execução e evidências

Banco `atmos_clicksign_test`, criado como clone do banco descartável `atmos_team_auth_test`, no container local `supabase_db_atmos-homolog-20260912`. Foram aplicadas somente nesse clone as migrations 180000 e 230000. O banco `postgres` do preview não foi modificado. Nenhuma configuração externa foi lida para testes.

Comandos executados com sucesso:

```sh
npx vitest run supabase/functions/_shared/clicksignProcess.test.ts supabase/functions/_shared/clicksignVerify.test.ts supabase/functions/_shared/webhookAuth.test.ts
# 43 testes / 3 arquivos aprovados (24 novos + 19 helpers existentes).

docker exec -i supabase_db_atmos-homolog-20260912 psql -U postgres -d atmos_clicksign_test -v ON_ERROR_STOP=1 < supabase/tests/clicksign_webhook_atomic.sql
# DOs concluídos; rollback. Inclui erro de CHECK no histórico e trigger que suprime update.

python3 supabase/tests/clicksign_webhook_concurrency.py
# PASS: two real sessions; one signed transition, one note, one outbox, one notification claim

npx tsc -p tsconfig.app.json --noEmit
npx tsc --noEmit --skipLibCheck --allowImportingTsExtensions --target es2022 --module esnext --moduleResolution bundler --lib ES2022,DOM supabase/functions/_shared/clicksignProcess.ts supabase/functions/_shared/clicksignProcess.test.ts
```

Os testes de concorrência usam locks e observam `pg_stat_activity` antes de iniciar a segunda sessão; executam as RPCs sob service_role. As fixtures fictícias dessa suíte ficam apenas no clone para inspeção. Testes TS usam exclusivamente fetch simulado, incluindo concorrência, erro DB, ausência de retorno, falha de API, configuração ausente, identidade inválida, falha de lookup recuperável, falha de send e falha ao persistir sent. O entrypoint Deno não foi executado em runtime Edge; a checagem de tipos Deno também passou, conforme complemento abaixo.

## Limites e pendências de integração

- Não há garantia de exactly-once em uma API externa sem protocolo de idempotência confirmado. A fila evita reenvio cego: sending significa **resultado incerto**, inclusive queda entre persistir sending e iniciar HTTP. Exige reconciliação humana autorizada com evidência do provedor antes de marcar como enviado ou liberar uma nova tentativa. Pode haver mensagem não enviada aguardando essa decisão; não se afirma entrega garantida.
- Não foi criado worker/cron de drenagem da fila. pending e leases expirados são retomados por nova entrega do webhook. HTTP não-2xx deixa a falha explícita, mas não garante política/prazo de retry do provedor. Se cessarem reentregas, operação autorizada precisa localizar e reprocessar pendências. Não há painel, alerta, política de retenção ou procedimento automatizado de reconciliação neste lote.
- Sem configuração ManyChat ou sem subscriber correspondente, a assinatura permanece salva e a notificação permanece pending, com resposta 503. Ausência de telefone fica skipped. Telefone é snapshot no momento da assinatura; a fila não altera contato nem resolve contato ausente. Fluxo/configuração de envio usam o valor vigente no retry.
- Propostas legadas sem document_key exigem vínculo verificado/backfill controlado antes de aceitar eventos. Nenhum vínculo foi inferido de request_signature_key/contract_url. Linhas já signed antes desta mudança, sem outbox, não recebem nova nota/notificação retrospectiva; eventual perda anterior exige auditoria.
- Não cria etapa “Contrato Assinado”; se ela não existir no segmento correto, não avança pipeline. Se houver mais de uma, escolhe por position/id, sem mesclar configuração histórica.
- Integração deve aplicar 180000 e 230000 antes do novo webhook, revisar secrets/configuração e homologar provedor em sandbox autorizado. Nenhuma chamada real Clicksign/ManyChat foi feita. Compatibilidade v1/v3 e política oficial de retries não foram reavaliadas neste lote.

## Revisão financeira anterior

`docs/revisoes/FIN-VALIDACAO-2026-09-12.md` registra precisão decimal, FIN01, FIN09 e FIN12: 99 testes, TypeScript e oráculo decimal de 1.001 casos aprovados, com limite residual em consumidores que multiplicam float antes do arredondamento. FIN21/22 não revisados.

## Complemento: parser CLI 2.67.1 e Deno

Após solicitação do root, a migration 23 foi aplicada também pelo **Supabase CLI 2.67.1**, em outro clone descartável, `atmos_clicksign_cli_test`. Um projeto temporário continha exclusivamente as migrations 180000 (dependência) e 230000; 21/22 não foram executadas. O clone de origem não tinha tabela de histórico de migrations; o CLI a criou e registrou as duas versões.

```sh
supabase migration up --db-url postgresql://postgres:postgres@127.0.0.1:54322/atmos_clicksign_cli_test --workdir <projeto-temporario>
# Applying migration 20260912180000_clicksign_document_key_link.sql...
# Applying migration 20260912230000_clicksign_webhook_atomic.sql...
# Local database is up to date.

docker exec -i supabase_db_atmos-homolog-20260912 psql -U postgres -d atmos_clicksign_cli_test -v ON_ERROR_STOP=1 < supabase/tests/clicksign_webhook_atomic.sql
# PASS: dois blocos DO concluídos, ROLLBACK.

npm exec --yes --package=deno -- deno check --no-config supabase/functions/clicksign-webhook/index.ts
# Check supabase/functions/clicksign-webhook/index.ts; exit 0.
```

A tabela `supabase_migrations.schema_migrations` registra 230000 com **12 statements**. As RPCs criadas pelo CLI passaram pela suíte SQL de identidade, rollback, permissões e estados da fila. Portanto, não foi necessário trocar `END;` + quebra de linha + `$$;` nesta migration; a falha relatada nas migrations 21/22 não se reproduziu aqui. Deno validou o entrypoint e seus imports após a última alteração. Não houve aplicação da 23 no banco principal/preview, nem mudança em 21/22.
