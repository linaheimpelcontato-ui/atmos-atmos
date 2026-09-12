# Atmos — execução e validação

## Ambiente e branches

Repositório: https://github.com/linaheimpelcontato-ui/atmos-atmos
Base examinada: 7d1f989ed826056d3a2c6fedd549c068f5c6b985.

- `codex/atmos-stabilization`: integração e correções do site/painel.
- `codex/atmos-calculos`: cálculos e rastreabilidade financeira, worktree independente.
- `codex/atmos-privacidade`: projeção pública segura e migrações de acesso.
- `codex/atmos-guias`: contexto, agenda e custos restritos ao guia atribuído; integrada à principal.

A leitura, o clone e `git push --dry-run` para uma nova branch no origin funcionaram. Isso comprova a possibilidade de propor a branch, sem alterar main. Não implica autorização de merge em branch protegida. Credenciais de admin validadas no portal, sem serem copiadas para o repositório.

## Executar

```sh
npm ci
npm test
npx tsc --noEmit -p tsconfig.app.json
npm run build
npm run dev -- --host 127.0.0.1
```

Preview: http://127.0.0.1:8084/. Os arquivos `.env` existentes apontam para o backend do projeto; não usar o preview para testes que criam, editam ou apagam dados reais. Testes automatizados devem usar mocks ou banco isolado.

O script de lint original termina com `|| true` e não é evidência de aprovação. Use ESLint diretamente para examinar erros; há dívida de lint anterior ao trabalho.

## Tela neutra

Definir `VITE_SITE_MAINTENANCE=true` nas variáveis do ambiente a publicar e executar novo build. A tela preserva acesso ao painel e recuperação de senha. Para reabrir o site, remover a variável ou defini-la como `false` e publicar novo build.

A flag controla a apresentação das rotas públicas, não substitui autenticação ou políticas do banco. Não foi ativada em produção nesta execução. Configure por ambiente para manter previews disponíveis.

## Mídias

Os 68 arquivos estáticos versionados em `public/assets` são servidos pelo próprio site. Referências legadas `home/<arquivo>` com original em `src/assets` usam o bundle; `hero-home.jpg` usa a foto panorâmica `hero-chapada.jpg` existente. Os nomes Unicode dos arquivos são preservados. Novas mídias dinâmicas não devem ser incluídas nesse manifesto: permanecem no armazenamento configurado.

URLs remotas não são convertidas em caminhos locais inexistentes no desenvolvimento. O componente de imagem percorre candidatos sem repetição e termina em indicação de indisponibilidade. Nenhum arquivo remoto foi apagado, renomeado ou migrado.

A migração ainda requer inventário de objetos reais, originais e escolha de bucket/provedor. Preservar origem, gerar mapa de chave antiga → nova, comparar tamanho/hash e relações produto/galeria, testar com amostra, então trocar referências com plano de retorno. A conversa não estabelece migração integral do Supabase.

## Critérios de negócio

- Wishlist informa preferências; apenas equipe monta a proposta.
- Catálogo distingue custos fixos e por pessoa, fornecedores alternativos e validação negociada.
- Custos do grupo com cortesias são distribuídos entre pagantes; custos, comissão e total devem fechar entre editor, cliente e financeiro.
- Comissão de parceiro usa custo do fornecedor. Guardar valores negociados/históricos, inclusive zero.
- Hospedagem distingue pagamento à Atmos e direto ao parceiro.
- Proposta pública só disponibiliza dados públicos; custos, margens, dados bancários e contatos internos ficam protegidos no backend.
- NF, fornecedor e proposta/grupo devem acompanhar os lançamentos. DRE e conciliação precisam validação com contabilidade e planilha real.
- Contratos Clicksign e WhatsApp requerem credenciais, templates e fluxo definidos; não simular integração concluída.

## Pendências externas

Ver nota `tasks for Gustavo` no Maestri: mídias/destino, acesso de desenvolvimento ao Supabase e deploy, planilha Melhor aos 50, regras contábeis/fiscais, contratos e API Clicksign, fornecedores e etapa posterior de WhatsApp.

## Evidências iniciais

- Home local desktop: nenhuma imagem quebrada na inspeção após correção; antes havia referências ausentes da galeria e erro de Unicode nos destaques.
- Home em iframe com viewport 390 px: sem overflow horizontal, nenhuma imagem quebrada; vídeo do hero não é montado. Isso não equivale a teste em aparelho Safari/iOS real.
- Modal de login: botão de fechar remove o diálogo e libera interação com a página; testes cobrem fechar e Escape sem logout involuntário.
- Biblioteca de localidades adiada para a etapa de localização; bundle inicial caiu de aproximadamente 9,4 MB para 0,8 MB, antes de compressão. O chunk de localidades ainda é grande.
- Erro de stack reportado pela cliente não foi reproduzido; não declarar sua causa resolvida sem teste no dispositivo afetado.

## Segundo lote: catálogo

Commit `7717250`: projeção pública com whitelist aninhada, separação de contatos públicos, tratamento explícito de falha e remoção da restauração automática de catálogos desativados. Parecer do Revisor em `docs/revisoes/catalogo-publico.md`.

Validação local após o lote: 31 testes Vitest passaram; TypeScript e `git diff --check` passaram. Preview da home: 109 imagens, nenhuma com carregamento concluído e largura natural zero. Preview de catálogo sem migration: mensagem de indisponibilidade e retry, sem consulta de fallback à tabela interna. Isso valida o tratamento de ausência do backend novo, não o conteúdo retornado pela futura RPC.

Consulte `HOMOLOGACAO-E-PENDENCIAS.md` para o limite exato desta entrega e os ensaios ainda necessários. As fixtures SQL ainda não foram executadas.

## Inventário inicial de mídia

`docs/MEDIA-INVENTORY.json` registra 286 arquivos de mídia versionados no repositório, somando 431.069.663 bytes, com SHA-256 por arquivo. O campo `target_object_key` permanece nulo até definição do destino. Esse inventário não inclui objetos remotos de Cloudflare/Supabase nem originais ainda não fornecidos; nenhuma mídia foi migrada. A fonte e o hash permitem conferir cópia e preservar os nomes exatos, inclusive Unicode.

## Validação da integração final

Código integrado até `b6a72ca`, incluindo catálogo, cálculos, rastreabilidade, identidade de conferências, portal de guias, privacidade e callbacks do widget. As revisões de código estão em `docs/revisoes/`. Conflitos da integração de privacidade ficaram apenas nas declarações de RPCs em types.ts; todos os contratos foram preservados. Tipos ainda precisam regeneração com o schema homologado.

- Vitest: **171 testes em 28 arquivos aprovados** (8,22 s).
- TypeScript: `npx tsc --noEmit -p tsconfig.app.json` aprovado.
- Build completo: `npm run build` aprovado em **18,43 s**. Persistem avisos de chunks grandes, sobretudo a biblioteca de localidades carregada sob demanda.
- Preview final da home: 123 imagens presentes, nenhuma imagem com carregamento concluído e naturalWidth zero.
- Fixtures SQL: **não executadas**. Mesmo após recuperar mais de 5 GB livres, a nova tentativa local falhou por I/O em `io.containerd.metadata.v1.bolt/meta.db` do Docker e foi interrompida. Nenhuma migration foi aplicada.

Build e testes JavaScript não comprovam políticas RLS, instalação SQL, autorização efetiva em produção ou funcionamento dos provedores externos. Seguir HOMOLOGACAO-E-PENDENCIAS.md antes da publicação.
