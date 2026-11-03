# KURIO — NFT Marketplace

**Frontend Challenge · React + TypeScript · demonstração de marketplace NFT**

- **Demo pública:** [https://kurio-nft-marketplace-six.vercel.app/](https://kurio-nft-marketplace-six.vercel.app/)
- **Código-fonte:** [https://github.com/Goatjs/kurio-nft-marketplace](https://github.com/Goatjs/kurio-nft-marketplace)
- **Referência visual:** [Frontend Challenge no Figma](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1)

> **Projeto demonstrativo.** Pagamentos, carteiras, blockchain, autenticação e backend são simulados no navegador com Mock Service Worker (MSW). Nenhum NFT real é transferido e nenhuma transação financeira é executada. Não use credenciais pessoais ou dados reais.

### Status do projeto — entrega final (03/11/2026)

- **Fase 9F concluída:** última fase planejada, dedicada à revisão visual final do desafio. Não há Fase 10 prevista.
- **Código integrado:** [PR #17 — Fase 9F](https://github.com/Goatjs/kurio-nft-marketplace/pull/17), incorporado à `main` em 03/11/2026. Commit de merge: [`f042c953`](https://github.com/Goatjs/kurio-nft-marketplace/commit/f042c9532947725575a6aad42e767a7354553f84).
- **CI:** [GitHub Actions — execução #41700171094](https://github.com/Goatjs/kurio-nft-marketplace/actions/runs/41700171094) concluída com sucesso: 113 testes funcionais aprovados, 3 ignorados; ESLint e build aprovados.
- **Visual:** 12/12 snapshots Playwright aprovados localmente em Windows (390, 768 e 1440 px); 15 referências do Figma revisadas manualmente, com diferenças de implementação reconhecidas.
- **Publicação:** Vercel **Production READY** para o mesmo commit da `main`, em [kurio-nft-marketplace-six.vercel.app](https://kurio-nft-marketplace-six.vercel.app/).

## Funcionalidades

- Home e catálogo com pesquisa, categoria, rede, preço máximo, ordenação e paginação sincronizados com a URL e o histórico do navegador.
- Detalhes de NFT, galeria, indicadores de disponibilidade e preço em tempo real simulado.
- Favoritos com atualização otimista e reversão em falhas.
- Carrinho de visitante com persistência entre recarregamentos e mesclagem após login.
- Cupom `SAVE10`, cotação e total calculados com precisão decimal usando `bigint` em wei.
- Login, cadastro, perfil e carteiras **fictícios**, com duas contas de demonstração; autenticação desktop apresentada como modal visual sobre o catálogo.
- Carteiras demonstrativas com cadastro, edição, rede e endereço; apresentação visual de provedores de carteira sem conexão real com extensões ou blockchain.
- Checkout e pedidos simulados com cotação assinada, idempotência, detecção de mudanças de preço, recuperação após timeout e estados pendente/confirmado/recusado; comprovante com dados fictícios da compra.
- Eventos `nft.updated` e `order.updated` via cliente Socket.IO, com WebSocket emulado por MSW.
- Estados de loading, skeleton, rede lenta, indisponibilidade e erros de API.
- Layout responsivo refinado na Fase 9F para desktop, tablet e mobile, com foco em home, detalhe do NFT, carrinho, pagamento, autenticação, perfil, carteiras e recibo.

## Stack

| **Camada**            | **Tecnologia**                                          |
| --------------------- | ------------------------------------------------------- |
| Aplicação             | React 19, TypeScript, Vite 6                            |
| Navegação             | TanStack Router                                         |
| Cache e estado remoto | TanStack Query                                          |
| HTTP                  | Axios                                                   |
| Realtime              | Socket.IO Client + `@mswjs/socket.io-binding`           |
| API e dados simulados | Mock Service Worker (MSW), `localStorage`               |
| Estilos               | Tailwind CSS, componentes Radix/shadcn e CSS responsivo |
| Qualidade             | ESLint, TypeScript, Playwright, Lighthouse CI           |
| Hospedagem            | Vercel com fallback SPA em `vercel.json`                |

Detalhes dos contratos, decisões e limitações estão em [`ARCHITECTURE.md`](https://github.com/Goatjs/kurio-nft-marketplace/blob/main/ARCHITECTURE.md).

## Fase 9A — testes E2E dos fluxos críticos

Dois arquivos de teste ampliam a verificação da aplicação, utilizando a interface real do Kurio, Axios, APIs simuladas por MSW e o cliente `socket.io-client`:

- `tests/phase9a-checkout.spec.ts`: compra do catálogo ao recibo após login; recibo imutável mesmo com alteração posterior do catálogo; pagamento recusado com carrinho preservado; timeout após criação com Socket.IO desconectado, reconexão e recuperação pela chave de idempotência; erro HTTP 503 com recuperação visual.
- `tests/phase9a-account.spec.ts`: alteração de perfil e avatar com persistência após refresh; validação de e-mail, conflito 409; senha incorreta, confirmação divergente e troca válida, seguida de login com a senha nova.

Execute em ambiente local com MSW habilitado:

```
npx playwright test tests/phase9a-checkout.spec.ts tests/phase9a-account.spec.ts
npx playwright test
```

Esses testes **não** alteram os componentes de produção. Cada teste inicia com reset determinístico via `POST /api/demo/reset`; os cenários de falha são configurados com `nft-scenario`. Verifique os resultados antes de registrar qualquer contagem de testes como aprovada.

## Fase 9C — UI, contratos e estado do pedido

- O perfil tem consulta autenticada `GET /api/profile` por Axios + handler MSW, com escopo por sessão. A tela usa TanStack Query (`['profile', userId]`) e invalida o cache de sessão após edição.
- `Input`, `Button` e `Card` seguem a composição shadcn/ui (forwardRef, className/cn, CVA/Slot no Button) e agora aplicam utilitários Tailwind reais mantendo os estilos Kurio já existentes. `cn` utiliza `tailwind-merge`.
- Recibos pendentes, confirmados e recusados usam ícones semanticamente diferentes, com rótulo acessível.
- Testes novos: `tests/phase9c-contract-ui.spec.ts` em Chromium desktop/mobile. Nenhuma integração real de pagamentos ou wallet é adicionada.
- Os contratos e fluxos foram novamente exercitados na validação final da Fase 9F, incluindo testes funcionais no GitHub Actions e regressão visual local.

## Evidências de validação — Fase 9F

Resultados confirmados em **03/11/2026** para a Fase 9F. A execução do GitHub Actions corresponde ao commit de merge `f042c9532947725575a6aad42e767a7354553f84` na branch `main`; os testes de snapshot foram executados localmente em Windows/Chromium. Resultados podem variar conforme hardware, sistema operacional e navegador.

| **Verificação** | **Resultado** |
| --- | --- |
| `npm run lint` | **Aprovado** no GitHub Actions e na validação local |
| `npm run build` | **Aprovado** no GitHub Actions e na validação local |
| Playwright funcional local | **113 aprovados, 3 ignorados, 0 falhas** |
| [GitHub Actions — qualidade funcional](https://github.com/Goatjs/kurio-nft-marketplace/actions/runs/41700171094/job/126141057444) | **Sucesso:** 113 aprovados, 3 ignorados, 0 falhas; lint e build aprovados |
| Playwright visual local | **12/12 aprovados** — mobile 390 px, tablet 768 px, desktop 1440 px |
| Referências visuais do Figma | **15 telas revisadas manualmente**; revisão de fidelidade, não equivalência pixel a pixel |
| [PR #17 — Fase 9F](https://github.com/Goatjs/kurio-nft-marketplace/pull/17) | **Merged** em `main` em 03/11/2026; 28 arquivos alterados |
| Vercel | **Produção READY** para o commit `f042c953` |

**Evidências anteriores:** os resultados de `npm audit --omit=dev` (0 vulnerabilidades conhecidas) e dos testes funcionais públicos 28/28 eram registros de **02/11/2026**. Eles não foram reavaliados como parte da confirmação do CI pós-merge da Fase 9F; não devem ser interpretados como resultado atualizado de auditoria ou teste público.

### Lighthouse — evidência histórica da Fase 9E (build de produção, 3 medições por página e perfil)

As medições abaixo foram registradas antes dos ajustes visuais da Fase 9F e **não foram repetidas no CI da entrega final**. Use-as como referência histórica, não como garantia de desempenho atual da versão publicada.

| **Perfil** | **Página** | **Performance** | **Accessibility** | **Best Practices** | **SEO** | **LCP** | **CLS** | **TBT** |
| ---------- | ---------- | --------------- | ----------------- | ------------------ | ------- | ------- | ------- | ------- |
| Mobile     | Início     | 91              | 98                | 96                 | 92      | 3197 ms | 0.027   | 37 ms   |
| Mobile     | Detalhes   | 90              | 100               | 96                 | 92      | 3127 ms | 0.000   | 128 ms  |
| Desktop    | Início     | 99              | 100               | 96                 | 92      | 771 ms  | 0.000   | 0 ms    |
| Desktop    | Detalhes   | 99              | 100               | 96                 | 92      | 815 ms  | 0.000   | 0 ms    |

**Metas atendidas:** Performance ≥90, Accessibility ≥95, Best Practices ≥95 e SEO ≥90. Valores de LCP, CLS e TBT são medianas independentes. As auditorias foram feitas no preview local do **build de produção** com mocks ativados; não são medições de usuários reais da Vercel. Os relatórios HTML/JSON são gerados localmente em `lighthouse-reports/` (ignorado pelo Git).

**Regressão visual:** os 12 testes comparam quatro páginas (Início, Detalhe do NFT, Carrinho e Pagamento) em três resoluções com snapshots Playwright versionados. Na Fase 9F, **seis snapshots** foram atualizados após revisão: quatro mobile, Pagamento tablet e Pagamento desktop. As 15 referências do Figma foram revisadas manualmente, mas isso **não comprova fidelidade pixel a pixel**.

## Como executar localmente

**Requisitos:** Node.js 22+ (recomendado) e npm; Chromium instalado para os testes Playwright.

```
npm ci
npm run dev
```

Abra `http://localhost:5173`. O script `postinstall` executa `msw init public --save`; `public/mockServiceWorker.js` também está versionado.

### Comandos de qualidade

```
npm run lint
npm run build
npx playwright install chromium
npx playwright test --workers=1
npx playwright test --config=playwright.visual.config.ts --workers=1
```

Não utilize `--update-snapshots` numa validação normal: alterar baselines sem revisão pode esconder regressões. Os snapshots versionados desta entrega têm sufixo `win32`; a comparação em outro sistema operacional pode exigir baselines específicos e uma revisão apropriada. Para validar o **domínio público** (não localhost), use o `playwright.public.config.ts` presente neste repositório:

```
npx playwright test --config=playwright.public.config.ts
```

O arquivo de testes públicos usa `baseURL: https://kurio-nft-marketplace-six.vercel.app`, sem iniciar servidor local. Os cenários REST e Socket.IO continuam mockados.

### Lighthouse (perfil local de produção)

```
npm run build
npx lhci autorun --config=./lighthouserc.mobile.json
npx lhci autorun --config=./lighthouserc.desktop.json
node scripts/lighthouse-summary.mjs
```

**Atenção:** o resumo exige exatamente **3 medições por perfil e rota**. Se já tiver relatórios de uma execução anterior, mova ou renomeie `lighthouse-reports/` antes da nova auditoria. Os comandos Lighthouse geram novos arquivos nessa pasta.

## Credenciais e dados fictícios

| **Conta de teste** | **E-mail**          | **Senha**  |
| ------------------ | ------------------- | ---------- |
| Alex               | `alex@example.test` | `Demo123!` |
| Sam                | `sam@example.test`  | `Demo456!` |

O token demonstrativo é salvo em `localStorage` apenas para exercício dos cenários do desafio. **Isso não é autenticação segura para um serviço real.** Para uma carteira fictícia nova, use a página `/wallets` antes do checkout.

Cupom válido: `SAVE10`.

### Simular falhas

No DevTools → Application → Local Storage, defina a chave `nft-scenario` como `slow`, `offline`, `http500`, `timeout`, `declined`, `variable-latency` ou `out-of-order`.

**Fase 9B — latência variável e respostas REST fora de ordem (MSW):** os dois novos modos se aplicam exclusivamente a `GET /api/nfts` e não alteram a API de login, os pedidos nem os eventos Socket.IO. Não há aleatoriedade: os resultados podem ser reproduzidos após refresh.

| **Cenário**        | **Comportamento determinístico**                                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `variable-latency` | A query serializada escolhe 120, 450 ou 900 ms por hash estável. Exemplos com apenas `q`: `Sage` = 120 ms, `Ivory` = 450 ms, `Emerald` = 900 ms.    |
| `out-of-order`     | `q=Emerald` responde após 1800 ms; `q=Sage` após 80 ms; outras buscas após 300 ms. Inicie Emerald e logo Sage para observar Sage terminar primeiro. |

Nas respostas desses cenários, o header de diagnóstico `X-Kurio-Mock-Delay-Ms` informa o atraso programado. Isso facilita auditoria sem alterar o JSON do contrato REST. Use os comandos abaixo **no Console do navegador**, após carregar o Kurio:

```
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

```
fetch('/api/demo/reset', { method: 'POST' }).then(() => location.reload())
```

O estado mock é local ao navegador/origem: contas, carrinhos e pedidos simulados **não** compõem um banco de dados compartilhado entre visitantes.

## Páginas

| **Rota**              | **Descrição**                |
| --------------------- | ---------------------------- |
| `/`                   | Home e catálogo              |
| `/market`             | Catálogo                     |
| `/nfts/:nftId`        | Detalhe do NFT               |
| `/cart`               | Carrinho                     |
| `/checkout`           | Pagamento fictício e revisão |
| `/orders/:orderId`    | Status e recibo fictício     |
| `/login`, `/register` | Conta de demonstração        |
| `/profile`            | Perfil                       |
| `/wallets`            | Carteiras de demonstração    |

Exemplo de filtros na URL: `/?q=ape&category=all&sort=price_asc&page=1&maxPrice=3.00&network=Ethereum`.

## Estrutura resumida

```
src/
  api.ts               Axios e endpoints tipados
  contracts.ts         Tipos compartilhados
  main.tsx             TanStack Router, Query e inicialização MSW
  pages.tsx            Layout e páginas de catálogo
  detail-pages.tsx     Detalhes e ações de NFTs
  commerce-pages.tsx   Carrinho, checkout e recibos
  auth-pages.tsx       Login e cadastro demonstrativos
  account-pages.tsx    Perfil e carteiras demonstrativos
  styles.css           Estilos e breakpoints originais
  phase9f*.css         Camadas de ajustes visuais da fase 9F (V1–V5)
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

## Limitações conhecidas e escopo encerrado

- Não há blockchain, smart contracts, carteiras reais, autenticação de produção, login social OAuth nem pagamentos reais. Os provedores de carteira exibidos são escolhas visuais de demonstração, não integrações ativas.
- A API e os dados são simulados por MSW e `localStorage`, sem banco de dados multiusuário. O projeto não é adequado para uso comercial ou financeiro sem uma arquitetura de produção própria.
- Capturas Playwright não provam fidelidade pixel a pixel ao Figma. O conteúdo e as quantidades de NFTs nas fixtures podem diferir das capturas de referência.
- Alguns links institucionais e botões de redes sociais fazem parte apenas da composição visual, sem destino funcional.
- Os resultados Lighthouse preservados são da Fase 9E, anteriores aos refinamentos 9F; não representam uma nova medição do site publicado.
- A cobertura automatizada é significativa, mas não demonstra ausência de defeitos em todos os navegadores ou cenários possíveis.

**Escopo final:** o desenvolvimento previsto termina na **Fase 9F**. Não há Fase 10 planejada; eventuais mudanças futuras seriam novas solicitações de manutenção ou extensão do projeto.

**Uso pretendido:** avaliação de frontend e demonstração técnica, não operação comercial ou financeira.

## Fase 9D — acessibilidade e revisão visual

A busca do cabeçalho, os filtros mobile e as abas de detalhe possuem semântica acessível e navegação por teclado. O reflow em larguras compactas foi refinado sem substituir as capturas de referência.

Valide com `npx playwright test tests/phase9d-accessibility.spec.ts --workers=2` e `npx playwright test --config=playwright.visual.config.ts`. Gere o comparativo manual com `node scripts/phase9d-visual-review.mjs` e abra `reports/fase9d-revisao-figma.html`. Veja o checklist em [`docs/FASE9D-REVISAO-VISUAL.md`](https://github.com/Goatjs/kurio-nft-marketplace/blob/main/docs/FASE9D-REVISAO-VISUAL.md). **Snapshots aprovados não provam automaticamente fidelidade ao Figma.**

## Fase 9E — evidências de entrega

A Fase 9E adicionou smoke de rotas e MSW no domínio público, um relatório de evidências gerado a partir de execução real e uma verificação funcional via GitHub Actions. Execute `node scripts/phase9e-validate.mjs` para lint, build, Playwright local/visual e smoke na Vercel. Use `--lighthouse` para incluir medições de 3 rodadas mobile/desktop, nas duas páginas de auditoria. Veja [`docs/FASE9E-ENTREGA.md`](https://github.com/Goatjs/kurio-nft-marketplace/blob/main/docs/FASE9E-ENTREGA.md) para os critérios finais. **Não interprete baselines Playwright aprovadas como aprovação manual do Figma.**

## Fase 9F — revisão visual final (concluída)

A **Fase 9F foi a última fase planejada** do Kurio. O objetivo foi aproximar as 15 telas de referência do Figma da aplicação em desktop e mobile, preservando os fluxos de compra, autenticação e carteiras **simulados**.

- **Interface:** refinamentos na Home, detalhe de NFT, carrinho, checkout, login/cadastro desktop em modal, perfil, carteiras e comprovante de pedido. Os ajustes estão nas camadas CSS `src/phase9f.css` e `src/phase9f-v2.css` até `src/phase9f-v5.css`, importadas pelo aplicativo.
- **Cartões e carteiras:** formulários e visualizações reorganizados sem conectar provedores reais nem introduzir movimentação em blockchain.
- **Revisão manual:** comparação das 15 referências disponíveis; diferenças de conteúdo de fixtures e detalhes de composição não devem ser interpretadas como correspondência perfeita ao Figma.
- **Regressão visual:** 12 testes aprovados localmente (4 rotas × 3 larguras); seis snapshots atualizados após inspeção visual.
- **Qualidade e entrega:** `npm run lint`, `npm run build` e os 113 testes funcionais foram aprovados no [GitHub Actions após o merge](https://github.com/Goatjs/kurio-nft-marketplace/actions/runs/41700171094). Três testes foram ignorados por escopo de viewport.
- **GitHub:** [PR #17](https://github.com/Goatjs/kurio-nft-marketplace/pull/17) integrado em 03/11/2026 ao commit [`f042c953`](https://github.com/Goatjs/kurio-nft-marketplace/commit/f042c9532947725575a6aad42e767a7354553f84), com 28 arquivos alterados.
- **Produção:** versão da `main` correspondente ao merge publicada na [Vercel](https://kurio-nft-marketplace-six.vercel.app/) com estado `READY`.

A verificação do GitHub Actions executa **lint, build e testes funcionais**; os **12 testes de snapshot** foram validados localmente e não fazem parte desse workflow. Nenhuma funcionalidade de pagamento ou posse real de NFTs foi introduzida.

**Conclusão:** desenvolvimento previsto encerrado na Fase 9F, sem Fase 10.
