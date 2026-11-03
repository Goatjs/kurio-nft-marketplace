# Fase 9D — Revisão visual e acessibilidade

> Estado: **revisão visual manual pendente**. Ter snapshots aprovados não equivale a comprovar fidelidade ao Figma. As imagens disponíveis são capturas de referência em `referencias-figma/`.

## Escopo da entrega

- Busca no cabeçalho desktop com `aria-expanded`, região `search`, Escape e retorno de foco.
- Filtros mobile com `aria-controls`, região identificada, Escape e retorno de foco.
- Abas de detalhe do NFT com semântica `tablist/tab/tabpanel` e teclado (setas, Home, End); galeria mobile mantém `aria-pressed`.
- Ajustes exclusivos para telas menores que 360 px; as baselines existentes em 390, 768 e 1440 px não são atualizadas automaticamente.
- Suíte complementar `tests/phase9d-accessibility.spec.ts` em desktop/mobile: teclados, reflow e preferência por movimento reduzido.

## Comparação visual — 8 pares

Execute após a instalação:

```powershell
node .\scripts\phase9d-visual-review.mjs
```

Abra `reports/fase9d-revisao-figma.html` no navegador para comparar cada imagem. São referências locais, não a especificação editável do Figma. O relatório é gerado localmente e não deve ser versionado.

| Tela | Referência | Snapshot de comparação | Revisão manual |
|---|---|---|---|
| Início mobile | `referencias-figma/inicio-mobile.png` | `inicio-visual-mobile-390-win32.png` | Pendente |
| Início desktop | `referencias-figma/inicio-desktop.png` | `inicio-visual-desktop-1440-win32.png` | Pendente |
| Detalhe mobile | `referencias-figma/detalhe-mobile.png` | `detalhe-nft-visual-mobile-390-win32.png` | Pendente |
| Detalhe desktop | `referencias-figma/detalhe-desktop.png` | `detalhe-nft-visual-desktop-1440-win32.png` | Pendente |
| Carrinho mobile | `referencias-figma/carrinho-mobile.png` | `carrinho-visual-mobile-390-win32.png` | Pendente |
| Carrinho desktop | `referencias-figma/carrinho-desktop.png` | `carrinho-visual-desktop-1440-win32.png` | Pendente |
| Pagamento mobile | `referencias-figma/pagamento-mobile.png` | `pagamento-visual-mobile-390-win32.png` | Pendente |
| Pagamento desktop | `referencias-figma/pagamento-desktop.png` | `pagamento-visual-desktop-1440-win32.png` | Pendente |

Confira: proporções, espaço em branco, colunas e grids, tamanhos/tipo de fonte, recorte dos assets, posição dos botões, foco, conteúdo da dobra, versão mobile e contraste. Na resolução de 768 px, compare também as quatro baselines de tablet como referência de regressão, mesmo sem screenshot Figma equivalente.

## Validação antes do PR

```powershell
npm run lint
npm run build
npx playwright test tests/phase9d-accessibility.spec.ts --workers=2
npx playwright test --workers=2
npx playwright test --config=playwright.visual.config.ts
node .\scripts\phase9d-visual-review.mjs
git diff --check
```

Os relatórios e backups locais não devem ser adicionados ao Git. Não executar `--update-snapshots` sem comparar e aprovar diferenças reais.
