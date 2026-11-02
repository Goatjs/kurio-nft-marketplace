# KURIO — NFT Marketplace

**Frontend Challenge · React + TypeScript · demonstração de marketplace NFT**

- **Demo pública:** https://kurio-nft-marketplace-six.vercel.app/
- **Código-fonte:** https://github.com/Goatjs/kurio-nft-marketplace
- **Referência visual:** [Frontend Challenge no Figma](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1)

> **Projeto demonstrativo.** Pagamentos, carteiras, blockchain, autenticação e backend são simulados em navegador por Mock Service Worker (MSW). Nenhum NFT real é transferido e nenhuma transação financeira é executada. Não use credenciais pessoais ou dados reais.

## Funcionalidades

- Home e catálogo com pesquisa, categoria, rede, preço máximo, ordenação e paginação sincronizados com a URL e o histórico do navegador.
- Detalhes de NFT, galeria, indicadores de disponibilidade e preço em tempo real simulado.
- Favoritos com atualização otimista e reversão em falhas.
- Carrinho de visitante com persistência entre recarregamentos e mesclagem após login.
- Cupom `SAVE10`, cotação e total calculados com precisão decimal usando `bigint` em wei.
- Login, cadastro, perfil e carteiras **fictícios**, com duas contas de demonstração.
- Checkout e pedidos simulados com cotação assinada, idempotência, detecção de mudanças de preço, recuperação após timeout e estados pendente/confirmado/recusado.
- Eventos `nft.updated` e `order.updated` via cliente Socket.IO, com WebSocket emulado por MSW.
- Estados de loading, skeleton, rede lenta, indisponibilidade e erros de API.
- Layout responsivo projetado para desktop, tablet e mobile.

## Stack

| Camada | Tecnologia |
|---|---|
| Aplicação | React 19, TypeScript, Vite 6 |
| Navegação | TanStack Router |
| Cache e estado remoto | TanStack Query |
| HTTP | Axios |
| Realtime | Socket.IO Client + `@mswjs/socket.io-binding` |
| API e dados simulados | Mock Service Worker (MSW), `localStorage` |
| Estilos | Tailwind CSS, componentes Radix/shadcn e CSS responsivo |
| Qualidade | ESLint, TypeScript, Playwright, Lighthouse CI |
| Hospedagem | Vercel com fallback SPA em `vercel.json` |

Detalhes dos contratos, decisões e limitações estão em [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Evidências de validação

Resultados reportados após execução em Windows/Chrome, em **02/11/2026**. As pontuações podem variar conforme hardware, navegador e rede.

| Verificação | Resultado |
|---|---|
| `npm run lint` | **Aprovado — 0 erros** |
| `npm run build` | **Aprovado** (aviso não bloqueante sobre chunk >500 KB) |
| `npm audit --omit=dev` | **0 vulnerabilidades conhecidas** na execução registrada |
| Playwright funcional local | **28/28 aprovados** (desktop + mobile) |
| Playwright visual local | **12/12 aprovados** (390, 768 e 1440 px) |
| Playwright funcional no domínio Vercel | **28/28 aprovados** (desktop + mobile) |
| Deploy Vercel | **Production READY** na branch `main` |

### Lighthouse — build de produção, 3 medições por página e perfil

| Perfil | Página | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Mobile | Início | 91 | 98 | 96 | 92 | 3197 ms | 0.027 | 37 ms |
| Mobile | Detalhes | 90 | 100 | 96 | 92 | 3127 ms | 0.000 | 128 ms |
| Desktop | Início | 99 | 100 | 96 | 92 | 771 ms | 0.000 | 0 ms |
| Desktop | Detalhes | 99 | 100 | 96 | 92 | 815 ms | 0.000 | 0 ms |

**Metas atendidas:** Performance ≥90, Accessibility ≥95, Best Practices ≥95 e SEO ≥90. Valores de LCP, CLS e TBT são medianas independentes. As auditorias foram feitas no preview local do **build de produção** com mocks ativados; não são medições de usuários reais da Vercel. Os relatórios HTML/JSON são gerados localmente em `lighthouse-reports/` (ignorado pelo Git).

**Regressão visual:** os 12 testes comparam telas a snapshots Playwright versionados; isso não equivale a comprovação de fidelidade pixel-a-pixel com o arquivo Figma. Os assets foram recortados das referências recebidas; uma entrega de design ainda pode ser refinada com exportação de imagens originais e revisão manual.

## Como executar localmente

**Requisitos:** Node.js 22+ (recomendado) e npm; Chromium instalado para os testes Playwright.

```bash
npm ci
npm run dev
```

Abra `http://localhost:5173`. O script `postinstall` executa `msw init public --save`; `public/mockServiceWorker.js` também está versionado.

### Comandos de qualidade

```bash
npm run lint
npm run build
npx playwright install chromium
npx playwright test
npx playwright test --config=playwright.visual.config.ts
```

Não utilize `--update-snapshots` numa validação normal: alterar baselines sem revisão pode esconder regressões. Para validar o **domínio público** (não localhost), use o `playwright.public.config.ts` presente neste repositório:

```bash
npx playwright test --config=playwright.public.config.ts
```

O arquivo de testes públicos usa `baseURL: https://kurio-nft-marketplace-six.vercel.app`, sem iniciar servidor local. Os cenários REST e Socket.IO continuam mockados.

### Lighthouse (perfil local de produção)

```bash
npm run build
npx lhci autorun --config=./lighthouserc.mobile.json
npx lhci autorun --config=./lighthouserc.desktop.json
node scripts/lighthouse-summary.mjs
```

**Atenção:** o resumo exige exatamente **3 medições por perfil e rota**. Se já tiver relatórios de uma execução anterior, mova ou renomeie `lighthouse-reports/` antes da nova auditoria. Os comandos Lighthouse geram novos arquivos nessa pasta.

## Credenciais e dados fictícios

| Conta de teste | E-mail | Senha |
|---|---|---|
| Alex | `alex@example.test` | `Demo123!` |
| Sam | `sam@example.test` | `Demo456!` |

O token demonstrativo é salvo em `localStorage` apenas para exercício dos cenários do desafio. **Isso não é autenticação segura para um serviço real.** Para uma carteira fictícia nova, use a página `/wallets` antes do checkout.

Cupom válido: `SAVE10`.

### Simular falhas

No DevTools → Application → Local Storage, defina a chave `nft-scenario` como `slow`, `offline`, `http500`, `timeout` ou `declined` para testar os cenários de rede e pedidos documentados em `ARCHITECTURE.md`.

Para retornar aos dados iniciais, remova `nft-scenario` e execute no Console:

```js
fetch('/api/demo/reset', { method: 'POST' }).then(() => location.reload())
```

O estado mock é local ao navegador/origem: contas, carrinhos e pedidos simulados **não** compõem um banco de dados compartilhado entre visitantes.

## Páginas

| Rota | Descrição |
|---|---|
| `/` | Home e catálogo |
| `/market` | Catálogo |
| `/nfts/:nftId` | Detalhe do NFT |
| `/cart` | Carrinho |
| `/checkout` | Pagamento fictício e revisão |
| `/orders/:orderId` | Status e recibo fictício |
| `/login`, `/register` | Conta de demonstração |
| `/profile` | Perfil |
| `/wallets` | Carteiras de demonstração |

Exemplo de filtros na URL: `/?q=ape&category=all&sort=price_asc&page=1&maxPrice=3.00&network=Ethereum`.

## Estrutura resumida

```text
src/
  api.ts               Axios e endpoints tipados
  contracts.ts         Tipos compartilhados
  main.tsx             TanStack Router, Query e inicialização MSW
  pages.tsx            Layout e páginas
  styles.css           Estilos e breakpoints
  state.ts             Sessão, queries e mutations
  live.ts              Assinaturas Socket.IO
  lib/money.ts         Cálculos ETH/wei com bigint
  mocks/               Fixtures, handlers REST, eventos e persistência
public/                Assets e worker MSW
scripts/               Consolidação das auditorias Lighthouse
tests/                 Testes funcionais Playwright
visual-tests/          Testes e snapshots visuais
referencias-figma/     Capturas de referência
playwright.public.config.ts   Testes contra Vercel
vercel.json            Fallback SPA
ARCHITECTURE.md        Arquitetura, contratos e limitações
PLAN.md                Registro das etapas
```

## Limitações conhecidas e próximos refinamentos

- Sem blockchain, contratos, carteiras, login social nem pagamentos reais.
- Backend simulado no navegador; não substitui API, autenticação ou persistência reais.
- Snapshots visuais não substituem inspeção pixel-a-pixel contra o Figma. Recomenda-se usar assets originais exportados do design quando disponíveis.
- Links institucionais e de redes sociais exibidos apenas como parte do layout podem não ter destinos funcionais; botões OAuth permanecem desativados.
- Casos avançados adicionais (eventos duplicados/fora de ordem e recuperação sob desconexões prolongadas) podem ampliar a cobertura, embora os cenários exigidos executados estejam aprovados.
- Há aviso de chunk JS >500 KB no Vite. O build e as metas Lighthouse passaram; uma divisão adicional do bundle é possível.

**Uso pretendido:** avaliação de frontend e demonstração técnica, não operação comercial ou financeira.
