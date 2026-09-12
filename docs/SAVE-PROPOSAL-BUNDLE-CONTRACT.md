# Contrato de save_proposal_bundle

## show_price_breakdown — integração com a frente de privacidade

A coluna pertence à migração de Claude: `public.proposals.show_price_breakdown boolean NOT NULL DEFAULT false`. Esta entrega não cria nem muda a política pública dessa coluna.

`p_proposal.show_price_breakdown` aceita somente booleano JSON:

- Campo ausente em CREATE: vale o default da coluna (false após a migração de privacidade).
- Campo ausente em UPDATE: mantém o valor salvo.
- `true` ou `false` explícitos: persistidos tanto em CREATE quanto UPDATE, na mesma transação do bundle.
- `null`, string ou número: rejeitados com SQLSTATE `22023`.
- Campo enviado antes de existir a coluna: erro explícito `42703`, com rollback de toda a gravação. Não há sucesso silencioso.

A atualização usa SQL dinâmico com nome de coluna constante e valores parametrizados. Assim, a definição da RPC pode existir antes da migração pública sem referência estática a uma coluna ausente. Para usar o toggle no frontend, ambas as migrações precisam estar aplicadas.

Claude deve carregar o booleano salvo e enviá-lo em `p_proposal` quando editar o toggle. O editor desta worktree ainda não contém o controle visual, que pertence à frente de privacidade. Sua ausência não redefine a preferência já salva.

## Validação de p_commissions

A validação ocorre antes de qualquer INSERT/UPDATE/DELETE, inclusive quando há recebíveis legados que suspendem a sincronização automática. O frontend faz a mesma verificação para feedback imediato; a RPC é a autoridade.

Cada entrada exige `source_key`, `amount`, `description` e `due_date`, com tipos JSON não nulos. `amount` é número positivo; strings numéricas não são aceitas. `description` não pode estar vazia. `due_date` exige uma data válida no formato YYYY-MM-DD.

`source_key` tem o formato `accommodation:<uuid canônico minúsculo>`. Deve apontar para um ID presente em `p_accommodations`, selecionado e com `payment_type = 'hospedagem'`. Chaves repetidas são rejeitadas mesmo se todos os campos forem iguais; não são deduplicadas silenciosamente. O índice único continua como proteção adicional.

## Reaparecimento de comissão cancelada

Quando uma `source_key` com recebível `cancelled` reaparece em `p_commissions`, a RPC rejeita a gravação inteira com SQLSTATE `55000` e pede reconciliação/reabertura manual. Isso vale para o mesmo valor, valor diferente e modo legado. A aplicação não infere se o cancelamento foi manual ou automático, não reabre o lançamento e não retorna sucesso com uma comissão desejada ainda cancelada. Salvar novamente sem incluir essa comissão continua permitido.

Os testes SQL versionados desmarcam e remarcam a hospedagem nos dois valores, verificando status/ID/notas preservados e rollback da seleção e do título. **Esses testes SQL não foram executados.**

## IDs e ciclo de vida do editor

A resposta inclui:

```json
{
  "id": "id-da-proposta",
  "legacy_commissions": false,
  "child_ids": {
    "items": ["id-do-item"],
    "costs": [],
    "days": ["id-do-dia"],
    "accommodations": ["id-da-hospedagem"]
  }
}
```

Cada array está na ordem da respectiva coleção enviada à RPC, depois dos filtros do frontend. Inclui IDs existentes ou gerados pelo banco, conforme o caso. Não inclui custos/comissões na resposta.

O `ProposalFormDialog` atual fecha em `onSuccess`, invalida `admin-proposals` e carrega novamente a proposta e filhos quando reaberto (`useEffect` dependente de `open` e `proposalId`). Itens, custos e hospedagens recuperam IDs do banco; dias são identificados por `day_number` na RPC. A UI atual não tenta salvar novamente mantendo os IDs antigos em memória. Se no futuro for implementado “Salvar e continuar”, esse fluxo deverá hidratar `child_ids` e o ID da proposta, ou recarregar antes de permitir outra gravação.

## Validação e implantação

Esta alteração refina a migração ainda não aplicada `20260911224000_atomic_proposal_bundle.sql`. Não foi criada uma segunda definição divergente da mesma RPC. Implantar a versão revisada após aprovação; nenhuma migração foi aplicada nesta tarefa.

58 testes Vitest passaram (28 novos para o contrato). Os testes SQL versionados incluem `true`/`false`/omissão, ausência de coluna com rollback, IDs retornados, duplicidade, origem inexistente e amount/source_key nulos ou ausentes. **SQL NÃO EXECUTADO**, por orientação do coordenador e indisponibilidade do banco local. Nenhum banco ou build foi iniciado nesta tarefa.

Claude não consta entre os agentes conectados ao terminal Executor; o contrato foi enviado ao Codex via Maestri para encaminhamento.

## Fixtures e limites residuais do parecer final

As asserções escalares usam `IS DISTINCT FROM` para falhar também diante de NULL/ausência. A conexão privilegiada somente prepara usuários de teste e contexto temporário; as chamadas administrativas usam `SET LOCAL ROLE authenticated` com usuário admin. O bloco nãoadmin usa a mesma role `authenticated`, outro usuário e verifica RLS financeira mais rejeição da RPC. O bloco `SET LOCAL ROLE anon` verifica `has_function_privilege` e tenta uma chamada real, que deve ser negada pela ACL mesmo com claims locais de admin. A fixture também verifica `SECURITY INVOKER`. Tudo permanece versionado e **NÃO EXECUTADO**.

Limites conhecidos, mantidos fora dos dois bloqueadores corrigidos:

- A validação da RPC verifica tipos, positividade, origem e duplicidade; **não deriva nem compara `amount` com `rooms` e não exige a completude das comissões de todas as hospedagens elegíveis**. O frontend usa o calculador compartilhado, mas outro cliente administrativo pode enviar valores divergentes ou omitir entradas. Não confundir validação estrutural com integridade numérica integral do endpoint.
- O loader de itens ainda usa `Number(d.cost_price) || 0`: zero legítimo é preservado, porém eventual NULL legado vira zero antes de `recordedCost`. Não prometer fallback para ausência que já foi convertida pelo loader.
- `missingAccommodationCommissions` não é exibido pelos dashboards atuais. Resultados históricos com snapshots ausentes continuam incompletos.
- O índice é idempotência por proposta/origem; repetir CREATE com `p_id = null` após perder a resposta pode criar outra proposta. A proteção de IDs dos filhos no fluxo atual pressupõe sucesso recebido e recarga. Não há idempotência integral por chave de requisição nem versão otimista para duas telas antigas.
