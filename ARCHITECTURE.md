# Arquitetura e decisões — Kurio NFT Marketplace

## Escopo e status

O **Kurio** é uma implementação frontend de avaliação, com dados e transações **100% simulados**. Não possui backend persistente real, blockchain, wallet provider nem processamento financeiro. O deploy de demonstração está em https://kurio-nft-marketplace-six.vercel.app/.

**Validação registrada em 02/11/2026:** lint e build aprovados; 28/28 testes funcionais em localhost; 12/12 testes visuais em 390/768/1440 px; 28/28 testes funcionais no domínio Vercel; Lighthouse com 3 repetições por página e perfil, todas as pontuações de categoria atingindo as metas. Isso não comprova fidelidade pixel-a-pixel ao Figma nem segurança de produção.

## Responsabilidades e estado

- **TanStack Router:** rotas explícitas; busca, categoria, preço, rede, ordenação e paginação persistem na URL/histórico.
- **TanStack Query:** estado remoto, cache de consultas e invalidações após mutações e eventos. `staleTime` padrão de 15 segundos.
- **Axios:** cliente HTTP tipado com `baseURL: '/api'`, timeout de 8 segundos e cabeçalho de token demonstrativo.
- **MSW:** handlers REST e WebSocket, simulações de falhas e persistência dos dados do demo em `localStorage` na origem do navegador.
- **Socket.IO:** `socket.io-client` fala com o WebSocket simulado via `@mswjs/socket.io-binding` no caminho `/kurio-realtime/`.
- **React:** estado local para componentes e entradas de formulário; o estado de negócio é obtido das APIs simuladas.

O cliente Socket.IO é carregado **dinamicamente após** `worker.start()` do MSW, evitando o registro precoce de WebSocket antes da instalação da interceptação. A reconexão invalida consultas relevantes.

## Contratos REST simulados

| Método | Caminho | Finalidade |
|---|---|---|
| GET | `/api/nfts` | Catálogo e filtros |
| GET | `/api/nfts/:id` | NFT, preço, estoque e versão |
| GET | `/api/session` | Sessão atual |
| POST | `/api/login`, `/api/register`, `/api/logout` | Sessão de demonstração |
| GET, POST, DELETE | `/api/favorites[/:id]` | Favoritos |
| GET, POST, PATCH, DELETE | `/api/cart[/items][/:id]` | Carrinho |
| PUT | `/api/cart/coupon` | Cupom |
| POST | `/api/quote` | Cotação e prazo |
| POST | `/api/orders` | Pedido com chave `Idempotency-Key` |
| GET | `/api/orders/:id` | Recibo e estado |
| GET | `/api/orders/by-key/:key` | Recuperação após timeout |
| GET, POST, PUT | `/api/wallets[/:id]` | Carteiras fictícias |
| PUT | `/api/profile` | Perfil |
| POST | `/api/profile/password` | Troca de senha simulada |
| POST | `/api/demo/price/:id` | Mudança de preço e emissão de evento |
| POST | `/api/demo/reset` | Reset determinístico |

## Valores e consistência do checkout

Os valores trafegam como strings decimais em ETH e são calculados com `bigint` em unidades de wei (18 casas decimais), em `src/lib/money.ts`. O mock calcula subtotal, desconto, taxa de rede e total.

A cotação guarda um snapshot dos itens, preços, versões, quantidades e cupom, com expiração e assinatura. Ao confirmar, o frontend deve revisar uma cotação potencialmente desatualizada. A criação do pedido exige chave idempotente: repetir a mesma operação recupera o pedido; conteúdo diferente com a mesma chave retorna conflito. Após timeout, a recuperação ocorre por `GET /api/orders/by-key/:key`.

Estados de pedido incluem `pending`, `confirmed` e `declined`. Recibos usam dados congelados da compra simulada. A compra nunca é encaminhada a uma rede blockchain.

## Sessão e isolamento

Tokens temporários são gerados pela simulação e persistidos no `localStorage`. Os handlers verificam associação de sessão, usuário e pedido; o logout limpa cache e sessão de demonstração. O carrinho de visitante é mesclado com o carrinho da conta após autenticação.

**Aviso:** `localStorage` como armazenamento de token e base mockada **não são soluções de segurança para uma aplicação real**. As credenciais de teste são públicas por definição; não envie credenciais pessoais.

## Cenários de rede REST determinísticos (Fase 9B)

Os handlers MSW aceitam dois novos valores na chave `localStorage['nft-scenario']`, apenas em `GET /api/nfts`. Os demais handlers, a autenticação e o transporte Socket.IO não são modificados.

- `variable-latency`: o hash estável dos parâmetros serializados da URL seleciona **120, 450 ou 900 ms**. Consultas idênticas recebem a mesma latência; não depende de `Math.random()` nem da ordem global dos requests.
- `out-of-order`: `q=Emerald` aguarda **1800 ms** e `q=Sage` aguarda **80 ms**; demais valores aguardam **300 ms**. Duas consultas iniciadas nessa sequência podem terminar na ordem inversa.
- O cabeçalho de diagnóstico `X-Kurio-Mock-Delay-Ms` expõe o atraso programado sem modificar o formato do recurso `CatalogResult`.
- Os testes `tests/network-latency.spec.ts` verificam tempos/cabeçalhos, ordem efetiva das respostas REST e busca visual que não regride para um resultado obsoleto. O `AbortSignal` do Axios, as chaves do TanStack Query e o estado de URL continuam responsáveis pelo descarte de buscas antigas.
- `slow`, `offline`, `http500`, `timeout` e `declined` mantêm os comportamentos anteriores. A chave pode ser removida para restaurar o cenário padrão.

## Verificação de fluxos críticos — Fase 9A

- As jornadas completas são verificadas em Playwright desktop/mobile e percorrem catálogo, detalhe do NFT, carrinho, login, checkout, revisão, pedido e recibo **pela interface**, sem gerar um pedido diretamente por `fetch` no teste.
- As consultas de verificação (`GET /api/orders/:id`, `GET /api/cart`, `GET /api/session` e recuperação `GET /api/orders/by-key/:key`) passam por handlers REST do MSW.
- Os cenários `declined`, `http500` e `timeout` exercitam os erros reais da API simulada. A queda e restauração do WebSocket utilizam endpoints de controle MSW, enquanto a reconexão depende do cliente Socket.IO efetivo.
- Após timeout, a UI usa a chave em `sessionStorage['kurio-pending-checkout']` para recuperar a tentativa anterior; o teste também confere que a fixture simulada guarda apenas um pedido.
- Perfil e senha são alterados por formulários reais, com testes de validação HTML e erros HTTP 409/422/401. Os dados e o avatar devem persistir após refresh; a senha antiga deixa de autenticar.
- Os novos testes ficam em `tests/phase9a-checkout.spec.ts` e `tests/phase9a-account.spec.ts`. A suíte funcional completa deve ser reexecutada antes de merge e entrega.


## Fase 9C — UI, contratos e estado do pedido

- O perfil tem consulta autenticada `GET /api/profile` por Axios + handler MSW, com escopo por sessão. A tela usa TanStack Query (`['profile', userId]`) e invalida o cache de sessão após edição.
- `Input`, `Button` e `Card` seguem a composição shadcn/ui (forwardRef, className/cn, CVA/Slot no Button) e agora aplicam utilitários Tailwind reais mantendo os estilos Kurio já existentes. `cn` utiliza `tailwind-merge`.
- Recibos pendentes, confirmados e recusados usam ícones semanticamente diferentes, com rótulo acessível.
- Testes novos: `tests/phase9c-contract-ui.spec.ts` em Chromium desktop/mobile. Nenhuma integração real de pagamentos ou wallet é adicionada.
- Após instalação: executar lint, build, novos testes, suíte completa e regressão visual; resultados ainda dependem de validação local.

## Eventos Socket.IO

- `nft.updated`: `{ eventId, resourceId, version, data }`. Atualiza o cache do NFT e invalida catálogo, carrinho e cotações.
- `order.updated`: `{ eventId, resourceId, userId, version, data }`. Atualiza consultas pertinentes apenas à sessão correta.

Eventos antigos são ignorados conforme a versão mantida durante a subscrição. Conexões e listeners são removidos no cleanup; ao reconectar, consultas REST são invalidadas. Cenários avançados adicionais de eventos simultâneos, fora de ordem e longas desconexões ainda podem ampliar a cobertura.

## Resiliência, UX e acessibilidade

As queries não repetem automaticamente erros de cliente 400/401/403/404/409/422; erros transitórios podem ter retry limitado. Mutações de pedido usam idempotência explícita, em vez de retry sem controle. O frontend utiliza nomes acessíveis, labels de entrada, alertas de erro, foco visível e skeletons que respeitam `prefers-reduced-motion`.

A auditoria Lighthouse atingiu as metas automáticas de Accessibility, mas avaliação manual com teclado e leitores de tela continua recomendada. O layout possui variações para 390, 768 e 1440 px, com screenshots em `visual-tests/`; baselines aprovadas não garantem correspondência pixel-a-pixel ao Figma.

## Deploy e verificações

- **Vercel:** projeto Vite, `npm run build`, saída `dist/`, SPA fallback em `vercel.json`.
- **MSW:** `public/mockServiceWorker.js`, variável de build `VITE_ENABLE_MSW=true`, interceptação REST e WebSocket no navegador.
- **Testes locais:** `npx playwright test`.
- **Regressão visual:** `npx playwright test --config=playwright.visual.config.ts`.
- **Testes no domínio:** `npx playwright test --config=playwright.public.config.ts`.
- **Lighthouse:** `lighthouserc.mobile.json`, `lighthouserc.desktop.json` e `scripts/lighthouse-summary.mjs`.

As rotas `/`, `/nfts/nft-1`, `/cart`, `/checkout` e `/login` responderam HTTP 200 no deploy, e os bundles, imagem de NFT e arquivo MSW estavam disponíveis. A suíte funcional no domínio público executou 28/28 testes aprovados.

## Limitações deliberadas

Sem banco remoto, login real, autorização de produção, pagamentos, APIs blockchain, transações e garantias de dados entre navegadores. Algumas entradas institucionais da interface são decorativas e OAuth está desativado. Os NFTs foram extraídos de capturas recebidas; para melhorar a arte, exporte os assets originais do Figma. Existe um aviso não bloqueante de chunk JS >500 KB no Vite.


## Fase 9D — navegação, reflow e auditoria visual

- A busca desktop expõe estado `aria-expanded`, landmark `search` e retorno de foco ao fechar com Escape; os filtros mobile expõem uma região nomeada e restauram o foco ao botão de abertura.
- As abas de detalhes têm `tablist`, `tab`, `tabpanel`, `aria-selected` e alternância por setas/Home/End. Os controles da galeria mobile preservam seleção acessível.
- CSS adicional incide apenas abaixo de 360 px, evitando alteração das baselines em 390/768/1440 px. Essa abordagem não garante ausência de regressões; os testes visuais devem ser executados.
- `tests/phase9d-accessibility.spec.ts` adiciona verificação desktop/mobile de semântica, foco, reflow (320/390/768/1440) e redução de movimento.
- `scripts/phase9d-visual-review.mjs` produz um comparativo local das oito referências Figma com as baselines Windows. Auditoria visual manual permanece pendente até revisão das diferenças.
