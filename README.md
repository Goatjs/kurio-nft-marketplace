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

## Fase 9A — testes E2E dos fluxos críticos

Dois arquivos de teste ampliam a verificação da aplicação, utilizando a interface real do Kurio, Axios, APIs simuladas por MSW e o cliente `socket.io-client`:

- `tests/phase9a-checkout.spec.ts`: compra do catálogo ao recibo após login; recibo imutável mesmo com alteração posterior do catálogo; pagamento recusado com carrinho preservado; timeout após criação com Socket.IO desconectado, reconexão e recuperação pela chave de idempotência; erro HTTP 503 com recuperação visual.
- `tests/phase9a-account.spec.ts`: alteração de perfil e avatar com persistência após refresh; validação de e-mail, conflito 409; senha incorreta, confirmação divergente e troca válida, seguida de login com a senha nova.

Execute em ambiente local com MSW habilitado:

```bash
npx playwright test tests/phase9a-checkout.spec.ts tests/phase9a-account.spec.ts
npx playwright test
```

Esses testes **não** alteram os componentes de produção. Cada teste inicia com reset determinístico via `POST /api/demo/reset`; os cenários de falha são configurados com `nft-scenario`. Verifique os resultados antes de registrar qualquer contagem de testes como aprovada.


## Fase 9C — UI, contratos e estado do pedido

- O perfil tem consulta autenticada `GET /api/profile` por Axios + handler MSW, com escopo por sessão. A tela usa TanStack Query (`['profile', userId]`) e invalida o cache de sessão após edição.
- `Input`, `Button` e `Card` seguem a composição shadcn/ui (forwardRef, className/cn, CVA/Slot no Button) e agora aplicam utilitários Tailwind reais mantendo os estilos Kurio já existentes. `cn` utiliza `tailwind-merge`.
- Recibos pendentes, confirmados e recusados usam ícones semanticamente diferentes, com rótulo acessível.
- Testes novos: `tests/phase9c-contract-ui.spec.ts` em Chromium desktop/mobile. Nenhuma integração real de pagamentos ou wallet é adicionada.
- Após instalação: executar lint, build, novos testes, suíte completa e regressão visual; resultados ainda dependem de validação local.

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

No DevTools → Application → Local Storage, defina a chave `nft-scenario` como `slow`, `offline`, `http500`, `timeout`, `declined`, `variable-latency` ou `out-of-order`.

**Fase 9B — latência variável e respostas REST fora de ordem (MSW):** os dois novos modos se aplicam exclusivamente a `GET /api/nfts` e não alteram a API de login, os pedidos nem os eventos Socket.IO. Não há aleatoriedade: os resultados podem ser reproduzidos após refresh.

| Cenário | Comportamento determinístico |
|---|---|
| `variable-latency` | A query serializada escolhe 120, 450 ou 900 ms por hash estável. Exemplos com apenas `q`: `Sage` = 120 ms, `Ivory` = 450 ms, `Emerald` = 900 ms. |
| `out-of-order` | `q=Emerald` responde após 1800 ms; `q=Sage` após 80 ms; outras buscas após 300 ms. Inicie Emerald e logo Sage para observar Sage terminar primeiro. |

Nas respostas desses cenários, o header de diagnóstico `X-Kurio-Mock-Delay-Ms` informa o atraso programado. Isso facilita auditoria sem alterar o JSON do contrato REST. Use os comandos abaixo **no Console do navegador**, após carregar o Kurio:

```js
localStorage.setItem('nft-scenario', 'out-of-order');
Promise.all([
  fetch('/api/nfts?q=Emerald').then(r => r.json()),
  fetch('/api/nfts?q=Sage').then(r => r.json())
]);
// Para voltar ao cenário normal:
localStorage.removeItem('nft-scenario');
```

Os testes reproduzíveis estão em `tests/network-latency.spec.ts` e executam as requisições reais interceptadas pelo MSW, além de verificar a interface com TanStack Query.

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


## Fase 9D — acessibilidade e revisão visual

A busca do cabeçalho, os filtros mobile e as abas de detalhe possuem semântica acessível e navegação por teclado. O reflow em larguras compactas foi refinado sem substituir as capturas de referência.

Valide com `npx playwright test tests/phase9d-accessibility.spec.ts --workers=2` e `npx playwright test --config=playwright.visual.config.ts`. Gere o comparativo manual com `node scripts/phase9d-visual-review.mjs` e abra `reports/fase9d-revisao-figma.html`. Veja o checklist em [`docs/FASE9D-REVISAO-VISUAL.md`](./docs/FASE9D-REVISAO-VISUAL.md). **Snapshots aprovados não provam automaticamente fidelidade ao Figma.**
