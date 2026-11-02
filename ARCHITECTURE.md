# Architecture & decisions — Kurio NFT Marketplace

## Status

Esta documentação cobre uma **primeira implementação**, não uma solução auditada. A fidelidade foi estimada a partir de screenshots, não de tokens/metadados extraídos do arquivo Figma. O design é fiel nas cores e composição gerais, mas a validação pixel-a-pixel ainda está pendente.

## Divisão de responsabilidades

- **TanStack Router:** rotas explícitas de catálogo, produto, carrinho, checkout, recibo e conta. Busca, categoria, rede, preço máximo, ordenação e página são refletidos na URL (e atualizados via navegação, que reseta a página quando muda filtro).
- **TanStack Query:** estado remoto; `queryKey` inclui filtro de catálogo e, no carrinho, usuário/visitante. Invalidação após mutations e eventos Socket.IO. `staleTime` padrão de 15s.
- **Axios:** todo REST passa por `httpClient` com base `/api`, token demonstrativo no header e timeout de 8s.
- **MSW:** intercepta REST e Socket.IO; preserva uma base mock no `localStorage`. Todas as operações de negócio ficam nos handlers, nunca em componentes.
- **Socket.IO:** o `socket.io-client` conecta com transporte WebSocket ao endpoint simulado com `@mswjs/socket.io-binding`. O servidor emite `nft.updated` e `order.updated`, com IDs e versão.
- **React:** estado local apenas para inputs, modais/etapas de revisão e comportamentos efêmeros. Preferências de catálogo no Router, resultados no Query, autoridade do estado no mock REST.

## Contratos REST implementados

| Método | Caminho | Objetivo |
|---|---|---|
| GET | `/api/nfts` | Catálogo com `q`, `category`, `sort`, `page`, `maxPrice`, `network` |
| GET | `/api/nfts/:id` | Detalhe com versão/estoque |
| GET | `/api/session` | Usuário autenticado |
| POST | `/api/login`, `/api/register`, `/api/logout` | Conta e sessão |
| GET, POST, DELETE | `/api/favorites[/:id]` | Favoritos |
| GET, POST, PATCH, DELETE | `/api/cart[/items][/:id]` | Carrinho |
| PUT | `/api/cart/coupon` | Cupom `SAVE10` |
| POST | `/api/quote` | Cotação com expiração e assinatura |
| POST | `/api/orders` | Criar pedido; `Idempotency-Key` obrigatório |
| GET | `/api/orders/:id` | Status e recibo |
| GET | `/api/orders/by-key/:key` | Recuperação após timeout |
| GET, POST, PUT | `/api/wallets[/:id]` | Carteiras |
| PUT | `/api/profile` | Editar perfil |
| POST | `/api/profile/password` | Alterar senha validando senha atual |
| POST | `/api/demo/price/:id` | Mudar preço na simulação e publicar evento |
| POST | `/api/demo/reset` | Reset determinístico |

## Dinheiro e cotação

Preços e total trafegam como **strings ETH**. Cálculo em `src/lib/money.ts` usa inteiros `bigint` com 18 casas (wei). O mock calcula `subtotal`, `desconto`, `taxa de rede` e `total`; o cliente apenas apresenta a resposta. `quote.signature` inclui identidade, versão, preço e quantidade das linhas, mais cupom.

Antes de enviar o pedido, o cliente solicita nova cotação e compara assinatura/total. Se houve alteração, solicita nova revisão. Pedidos exigem chave idempotente: mesma chave e mesmo conteúdo recuperam o mesmo pedido; chave reaproveitada com conteúdo diferente dá 409. Após timeout, o cliente consulta `/api/orders/by-key/:key` após refresh. Não existem pagamentos ou carteiras reais.

O recibo armazena um snapshot de título, imagem, quantidades, preços, descontos e taxas; não depende do preço atual do catálogo.

## Sessão e isolamento

São emitidos tokens aleatórios temporários, mantidos em Local Storage **apenas para a simulação**. Cache de sessão usa chave `['session',token]`, carrinho `['cart',userId|'guest']`, favoritos `['favorites',userId]`, recibo `['order',orderId]`. A API confere o usuário dono de cada pedido; logout limpa Query cache e desconecta socket. Ao autenticar, o mock mescla carrinho visitante com carrinho do usuário.

Não usar este padrão de armazenamento para autenticação real em produção. Dados mock contêm somente credenciais fictícias e hashes demonstrativos.

## Eventos e reconexão

- `nft.updated`: `{eventId,resourceId,version,data:Nft}` — invalida catálogo, carrinho e cotações; atualiza detalhe se versão não é antiga.
- `order.updated`: `{eventId,resourceId,userId,version,data:Order}` — só aceita eventos do usuário atual, invalida carrinho e atualiza query de pedido.

Duplicatas e eventos antigos são ignorados por versão em um `Map` durante a subscrição; conexões criadas com `socket.io-client`, listeners destruídos no cleanup. Reconexão revalida REST.

**Limitações do binding:** namespace padrão e eventos textuais. Sem acks, namespaces customizados ou binários. Testes reais de duplicatas, desordem e desconexão precisam ser ampliados antes da avaliação.

## Política de cache e retries

Queries com `staleTime: 15_000 ms` por padrão, `30_000 ms` na sessão. Uma tentativa de retry em falhas transitórias, sem retry de 400, 401, 403, 404, 409 e 422. Mutations não possuem retry automático para impedir duplicação; pedido usa idempotência explícita e recuperação por chave. O Axios propaga abort signal às consultas de catálogo, com `placeholderData` preservando layout enquanto atualiza.

## Acessibilidade e UX

Campos com labels, estados de erro por `role=alert`, estados de atualização por `role=status`, ações com nomes acessíveis, foco com outline visível, controles não disponíveis desabilitados. Skeletons shimmer respeitam `prefers-reduced-motion`. Desktop mantém grid e sidebar; mobile aplica catálogo em duas colunas, tela de detalhe e bottom navigation.

**Pendências:** auditoria WCAG com teclado/leitor de tela, regressão visual real para 390/768/1440, baselines Playwright, testes de carrinho/checkout completos, simulação de sessão expirada no meio de checkout, teste end-to-end dos sockets e Lighthouse 3x por combinação.

## Deployment

SPA precisa de fallback de rotas para `/index.html` (configuração `vercel.json`). MSW deve ser ativado no build de demo (`VITE_ENABLE_MSW=true`) e seu service worker precisa existir após `npm install`. Para publicar, primeiro rodar typecheck/build/testes localmente e gerar lockfile.
