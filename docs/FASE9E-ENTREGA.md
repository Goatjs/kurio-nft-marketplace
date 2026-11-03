# Kurio — Fase 9E: entrega, evidências e qualidade

## Objetivo

Consolidar uma evidência **auditável** dos comandos executados, sem alterar componentes visuais nem fingir que a revisão visual manual foi concluída.

## Preparação

1. Atualize `main` depois do merge do PR #15. Crie a branch `feat/phase-9e-final-evidence`.
2. Instale o ZIP da Fase 9E com `node aplicar-fase9e-kurio.mjs`.
3. Execute `npm ci` se o repositório ainda não possui as dependências instaladas.
4. Confira o deploy de produção na Vercel; o check verde no GitHub não substitui uma visita ao domínio.

## Fluxo de validação

```powershell
node .\scripts\phase9e-validate.mjs
```

Esse comando executa lint, build, Playwright funcional, regressão visual Windows e smoke no domínio público. Os resultados são registrados em `reports/phase9e/` com a versão do commit e os contadores reais, sem inventar números.

Para executar também Lighthouse mobile/desktop (3 execuções em 2 páginas por perfil, 12 medições):

```powershell
node .\scripts\phase9e-validate.mjs --lighthouse
```

A opção Lighthouse preserva relatórios anteriores em pastas `lighthouse-reports-backup-*` antes de gerar as novas execuções. O Lighthouse precisa de Chrome funcional e do build de produção. O resumo existente `scripts/lighthouse-summary.mjs` calcula medianas e exige exatamente 3 medições por página/perfil. A auditoria de Lighthouse é **opcional para a primeira rodada de diagnóstico**, mas deve ser executada para concluir a entrega completa.

O relatório fica em `reports/phase9e/ENTREGA-FINAL.md`. Para regenerá-lo sem rodar testes:

```powershell
node .\scripts\phase9e-report.mjs
```

## Interpretação

- `functional` executa todas as suítes em `tests/`, desktop e mobile, inclusive os novos smoke tests. Testes ignorados são registrados como tal; eles não são falhas nem aprovações.
- `visual` valida 12 baselines Windows (390, 768, 1440 px) sem usar `--update-snapshots`. Não aprova fidelidade ao Figma.
- `public` utiliza a configuração existente `playwright.public.config.ts`, que aponta para a demo na Vercel. Os endpoints API continuam simulados no navegador com MSW.
- `lighthouse-reports/RESUMO-LIGHTHOUSE.md` contém métricas e metas; se houver pontuações abaixo de 90/95/95/90, investigar antes de aprovar.
- A revisão visual humana das 8 imagens, através de `reports/fase9d-revisao-figma.html`, continua pendente até ser documentada.
- Execuções feitas sobre uma branch local provam o código daquela branch/commit. Após merge, confirme o deploy e, quando necessário, rode novamente contra a `main` publicada.

## GitHub Actions

`.github/workflows/kurio-quality.yml` realiza `npm ci`, lint, build e Playwright em PRs. Não roda os baselines visuais do Windows no Linux, e não depende do domínio público. As verificações locais continuam obrigatórias para as evidências visuais e Lighthouse.

## O que NÃO deve ser comitado

`reports/`, `lighthouse-reports/`, `playwright-report/`, `test-results/`, `.vercel/`, `*.bak-fase9e` e arquivos instaladores `.mjs` na raiz. Os dados de contas/demonstração e tokens locais não são evidências para subir ao Git.

## Critérios para encerrar

- PR revisado, sem conflitos, CI aprovado.
- Deploy Vercel verde, rotas e worker acessíveis no navegador.
- `npm run lint` e `npm run build` aprovados.
- Suite E2E, smoke público e regressão visual executados e aprovados.
- Lighthouse 3x por página/perfil auditado; medianas verificadas.
- Revisão manual do comparativo Figma realizada e diferenças relevantes registradas/resolvidas.
- README e arquitetura atualizados; nenhum segredo ou backup versionado.

**Escopo:** apenas demonstração frontend. Não existe pagamento, blockchain, backend ou autenticação de produção.

## Evidências locais da Fase 9E — 03/11/2026

Resultados **reportados nos logs locais do Windows** para a branch de entrega; não são resultados do CI após merge:

- ESLint e build TypeScript/Vite: aprovados.
- Playwright funcional: **113 aprovados e 3 ignorados** de 116.
- Regressão visual Playwright: **12/12 aprovados** nas baselines de 390, 768 e 1440 px.
- Smoke test no domínio público: **6/6 aprovados**.
- Lighthouse 12.6.1, Chrome 156: 3 medições por combinação (12 execuções). Medianas:

| Dispositivo | Página | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Mobile | Início | 90 | 98 | 96 | 92 | 3236 ms | 0.027 | 33 ms |
| Mobile | Detalhe | 90 | 96 | 96 | 92 | 3231 ms | 0.000 | 14 ms |
| Desktop | Início | 99 | 100 | 96 | 92 | 770 ms | 0.000 | 0 ms |
| Desktop | Detalhe | 99 | 99 | 96 | 92 | 748 ms | 0.000 | 0 ms |

**Ressalvas:** o Lighthouse registrou aviso de timeout aguardando o servidor mostrar `Local:`; apesar disso as 12 medições foram gravadas e consolidadas. Não foi comprovado por esse log qual processo respondeu na porta 4175. A recuperação do resumo foi executada separadamente por causa de um problema do shell no Windows. A fidelidade manual ao Figma permanece pendente; CI e deploy precisam ser reconfirmados após o merge. O backend, as carteiras e os pagamentos continuam simulados.
