
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = [
  { name: 'Home', path: '/' },
  { name: 'Mercado', path: '/market' },
  { name: 'Login', path: '/login' },
  { name: 'Carrinho', path: '/cart' },
];

for (const target of pages) {
  test(`auditoria WCAG — ${target.name}`, async ({ page }, testInfo) => {
    await page.goto(target.path, {
      waitUntil: 'domcontentloaded',
    });

    await expect(page.locator('main')).toBeVisible();

    // Aguarda a conclusão de requisições iniciais da aplicação.
    await expect(page.locator('.skeleton')).toHaveCount(0, {
      timeout: 15000,
    });

    const results = await new AxeBuilder({ page })
      .withTags([
        'wcag2a',
        'wcag2aa',
        'wcag21a',
        'wcag21aa',
        'wcag22aa',
      ])
      .analyze();

    const report = results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      description: violation.help,
      nodes: violation.nodes.map((node) => ({
        target: node.target,
        summary: node.failureSummary,
      })),
    }));

    console.log(
      `\n[AUDITORIA] ${target.name} — ${testInfo.project.name}`
    );
    console.log(JSON.stringify(report, null, 2));

    await testInfo.attach('axe-audit.json', {
      body: JSON.stringify(report, null, 2),
      contentType: 'application/json',
    });

    // Reprova o teste se o axe-core detectar violações WCAG.
    expect(results.violations).toEqual([]);
  });
}
