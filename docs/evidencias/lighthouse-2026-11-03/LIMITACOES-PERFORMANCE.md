# Kurio — Limitação conhecida de Performance Mobile

Data da auditoria: 03/11/2026
Commit avaliado: e248086
Lighthouse: 12.6.1
Ambiente: Windows, Chrome 156, build de produção com MSW.

## Resultados

| Página | Performance | Meta | LCP | CLS | TBT |
|---|---:|---:|---:|---:|---:|
| Mobile — Início | 88 | 90 | 3123 ms | 0.029 | 32 ms |
| Mobile — Detalhe NFT | 89 | 90 | 3089 ms | 0.000 | 37 ms |
| Desktop — Início | 99 | 90 | 784 ms | 0.000 | 0 ms |
| Desktop — Detalhe NFT | 99 | 90 | 829 ms | 0.000 | 0 ms |

## Justificativa e limitação

A Performance Mobile ficou ligeiramente abaixo da meta de
90 pontos, com medianas de 88 na página inicial e 89 no
detalhe do NFT, considerando três medições por página.

O LCP próximo de 3,1 segundos é um indicador relevante
associado ao desempenho mobile inferior ao desktop.
A causa técnica específica não foi confirmada por uma
investigação detalhada.

As metas de Acessibilidade, Best Practices e SEO foram
atingidas em todas as páginas e perfis avaliados.

## Decisão de entrega

A limitação de Performance Mobile é conhecida e aceita
nesta entrega demonstrativa.

Não serão realizadas otimizações adicionais, para preservar
o escopo finalizado na Fase 9F.

Os resultados apresentados correspondem às medições
efetivamente executadas, sem alteração artificial
das pontuações ou dos relatórios Lighthouse.
