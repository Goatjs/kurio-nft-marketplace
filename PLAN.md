# Kurio — plano de execução do Frontend Challenge

## Etapa 1 — Fundamentos e primeira interface (código preparado)

- [x] Mapear os 15 frames desktop/mobile enviados.
- [x] Identidade visual: fundo escuro, laranja caramelo, fonte monoespaçada, grids, sidebar, header/footer, barra mobile.
- [x] Extrair 8 imagens de referência dos screenshots fornecidos (substituir por assets limpos do Figma quando disponíveis).
- [x] Rotas: início, mercado, NFT, carrinho, checkout, recibo, login, cadastro, perfil e carteiras.
- [x] Catálogo URL-state (busca, categoria, rede, preço, ordenação, paginação).
- [x] REST mockado com MSW e cotação em ETH usando bigint.
- [x] Carrinho visitante, mesclagem no login, cupom, disponibilidade, favoritos.
- [x] Simulação de pagamento idempotente com recuperação por chave, recibo snapshot.
- [x] Socket.IO cliente e socket mockado para atualizações de preço/pedido.
- [x] Testes E2E iniciais preparados para Playwright.
- [ ] Validar instalação npm, build e E2E num ambiente com acesso ao npm.

## Etapa 2 — Integração e cobertura de casos extremos

- [ ] Revisar contratos e formulário completo de checkout/validação de carteiras.
- [ ] Testar sessão expirada durante checkout e retomada.
- [ ] Testar concorrência de cotações, respostas fora de ordem e edição indisponível.
- [ ] Testar eventos antigos, duplicatas, reconexão e pedido pendente.
- [ ] Acrescentar fixtures, cenários de reset e documentação reproduzível de eventos.
- [ ] Completar Playwright para todos os cenários definidos no desafio.

## Etapa 3 — Fidelidade visual e qualidade

- [ ] Substituir screenshots recortados pelos assets originais do Figma.
- [ ] Revisar pixels, breakpoints de 390, 768 e 1440 px.
- [ ] Acessibilidade: WCAG, teclado, foco, rotulagem e leitor de tela.
- [ ] Gerar baselines Playwright, aprovar e versionar.
- [ ] Rodar 3x Lighthouse mobile/desktop, páginas Início/Detalhe, registrar medianas, LCP/CLS/TBT.
- [ ] Gerar `package-lock.json`, relatório de testes e traces.
- [ ] Deploy público com fallback de rotas e MSW ativado.

**Atenção:** checkboxes indicam arquivos de implementação criados, não a execução validada. A primeira etapa precisa passar por `npm run typecheck`, `npm run build` e testes antes de ser considerada validada.
