# Kurio — Lighthouse: medianas de 3 execuções

As métricas são calculadas a partir dos relatórios Lighthouse **reais**, gerados com o build de produção e os mocks ativados.

| Perfil | Página | Execuções | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| mobile | Início | 3 | 88 ⚠️ | 98 ✓ | 96 ✓ | 92 ✓ | 3123 ms | 0.029 | 32 ms |
| mobile | Detalhe do NFT | 3 | 89 ⚠️ | 96 ✓ | 96 ✓ | 92 ✓ | 3089 ms | 0.000 | 37 ms |
| desktop | Início | 3 | 99 ✓ | 100 ✓ | 96 ✓ | 92 ✓ | 784 ms | 0.000 | 0 ms |
| desktop | Detalhe do NFT | 3 | 99 ✓ | 99 ✓ | 96 ✓ | 92 ✓ | 829 ms | 0.000 | 0 ms |

## Metas

- Performance ≥90; Accessibility ≥95; Best Practices ≥95; SEO ≥90.
- LCP, CLS e TBT são medianas independentes das 3 medições de cada perfil/página.
- ⚠️ = abaixo da meta. N/D = dado ausente (não interprete como aprovação).

## Condições da auditoria

- Alvo: `npm run build` + `npm run preview` na porta 4175, com o mesmo frontend e assets usados na entrega.
- Dados: cenário padrão de mocks MSW; o service worker deve estar ativado no build.
- Perfis Lighthouse: mobile padrão e desktop com `preset: desktop`; execução em Chrome local.
- Utilize os arquivos HTML e JSON em `lighthouse-reports/<perfil>/` como evidência.
- Registrar Windows/versão do Chrome e quaisquer diferenças entre máquinas antes de comparar pontuações.

- **mobile / Início** — Lighthouse 12.6.1; Chrome/UA: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/156.0.0.0 Safari/537.36
- **mobile / Detalhe do NFT** — Lighthouse 12.6.1; Chrome/UA: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/156.0.0.0 Safari/537.36
- **desktop / Início** — Lighthouse 12.6.1; Chrome/UA: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/156.0.0.0 Safari/537.36
- **desktop / Detalhe do NFT** — Lighthouse 12.6.1; Chrome/UA: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/156.0.0.0 Safari/537.36

## Interpretação

Pontuações variam conforme hardware, Chrome e condições da máquina. Se alguma categoria ficar abaixo da meta, abra o HTML correspondente e anote os diagnósticos antes de alterar o código.
