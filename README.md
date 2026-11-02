# KURIO — NFT Marketplace · Frontend Challenge

Primeira implementação da interface **Kurio**, reproduzida a partir dos **15 frames desktop/mobile fornecidos na conversa** (capturas do Figma). A solução é uma **demonstração técnica**, sem blockchain, transações financeiras ou carteiras reais.

## Status desta entrega

**Etapa 1 (implementada no código):** identidade visual Kurio, imagens recortadas das capturas do usuário, Home/mercado com URL de busca/filtros/ordenação/paginação, detalhe, favoritos com atualização otimista e rollback, carrinho com persistência e cupom, cálculo exato de ETH usando `bigint`, autenticação com duas contas de teste, checkout simulado, confirmação pendente/confirmada/recusada, perfil com alteração de senha, carteiras principal/secundária, Axios, TanStack Query/Router, REST via MSW, Socket.IO com binding MSW, testes Playwright iniciais e documentação.

**Não validado neste ambiente:** instalação npm, TypeScript completo, execução do Vite, testes Playwright, Lighthouse e deploy. O ambiente de geração estava sem DNS de acesso a `registry.npmjs.org`, portanto **não foi possível instalar dependências, criar lockfile ou verificar o build**. Os módulos TypeScript foram verificados quanto à **sintaxe** com `typescript.transpileModule`, mas isso **não substitui** typecheck e teste real. A entrega **não deve ser confundida com challenge 100% concluído**.

**Trabalho pendente:** aprovação pixel-a-pixel do Figma via inspeção no navegador, assets individuais originais (os recortes têm qualidade de referência), revisão de contratos e fluxos de falha complexos, cenários de eventos duplicados e reconexão, regressão visual com baselines versionadas, auditorias completas Lighthouse, lockfile e deploy público.

## Requisitos

- Node.js 22+ e npm 10+
- Navegador Chromium para Playwright
- Acesso ao registro do npm na máquina de desenvolvimento

## Instalação e execução

```bash
npm install
npm run dev
```

O `postinstall` gera `public/mockServiceWorker.js` com `msw init`. Crie `package-lock.json` executando `npm install` e **versione** o arquivo antes da entrega final.

Abra `http://localhost:5173`. Opcional: copie `.env.example` para `.env`.

```bash
npm run typecheck
npm run lint
npm run build
npm run preview
npx playwright install chromium
npm run test:e2e
npm run test:e2e:report
npm run audit
```

## Credenciais fictícias

| Usuário | E-mail | Senha |
|---|---|---|
| Alex | `alex@example.test` | `Demo123!` |
| Sam | `sam@example.test` | `Demo456!` |

As senhas são hashes de demonstração dentro da base do MSW, **não representam autenticação segura para produção**. Ao cadastrar nova conta, cadastre uma carteira fictícia em `/wallets` para realizar o checkout.

## Cenários de falha

No DevTools do navegador (Application > Local Storage), defina `nft-scenario` como:

- `slow` — listagem lenta (skeleton com shimmer).
- `offline` — erro de rede para as rotas com simulação de rede.
- `http500` — falha 503 do catálogo.
- `timeout` — criação do pedido no MSW seguida de HTTP 504; recuperação pela chave de idempotência.
- `declined` — rodada do pedido termina como recusada.

Para retornar ao estado padrão, execute no console do navegador:

```js
fetch('/api/demo/reset',{method:'POST'}).then(()=>location.reload())
```

Remova também `nft-scenario` do Local Storage para cancelar falhas. Como alternativa, execute `localStorage.removeItem('nft-scenario')`.

O cupom de demonstração é `SAVE10`. Erros de cupom são gerados no MSW.

## Rotas

- `/` — início e catálogo
- `/market` — catálogo
- `/nfts/:nftId` — detalhe
- `/cart` — carrinho
- `/checkout` — pagamento simulado, com revisão
- `/orders/:orderId` — recibo e estado do pedido
- `/login` e `/register` — conta
- `/profile` — perfil
- `/wallets` — carteiras

URL da busca/filtros: `/?q=ape&category=Arte%20digital&sort=price_asc&page=1&maxPrice=3.00&network=Ethereum`.

## Origem do visual

Fonte das imagens: screenshots enviados pelo usuário, especialmente `Detalhes do NFT.png` e `Início(1).png`. As artes foram **recortadas manualmente dos frames** e estão no diretório `public/assets/*.webp`, sem copiar imagens externas nem criar NFTs novos. Para qualidade final, substitua-as pelos **assets originais exportados do Figma**.

O design de referência é o arquivo **Frontend Challenge**, Figma: `Ff0SksUi7UFtPWUO8kyNtw`.

## Estrutura

```text
src/
  api.ts                 # Axios e funções REST tipadas
  contracts.ts           # Tipos compartilhados do domínio
  live.ts                # socket.io-client e reconciliação de query cache
  state.ts               # sessão e Query hooks
  main.tsx               # TanStack Router + Query provider
  pages.tsx              # Páginas, layout, formulários e componentes iniciais
  styles.css             # Tokens e estilos responsivos Kurio
  lib/money.ts           # Aritmética decimal exata em wei (bigint)
  mocks/
    data.ts              # Fixtures, persistência, reset e estado simulado
    handlers.ts          # Contratos REST e mutações
    socket.ts            # @mswjs/socket.io-binding + eventos
public/assets/           # Artes da referência
public/mockServiceWorker.js (gerado pelo postinstall)
tests/catalog.spec.ts    # Testes E2E iniciais
ARCHITECTURE.md          # Decisões, contratos e limitações
```

Os links de Criadores, Aprenda e redes sociais são exibidos como itens de interface **não funcionais**, pois estão fora do escopo do challenge. Botões de OAuth estão **desabilitados**, evitando simular autenticação real.
