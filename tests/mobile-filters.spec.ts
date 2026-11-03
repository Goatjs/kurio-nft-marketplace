import { test, expect } from '@playwright/test';

test(
  'mobile: filtros de categoria, rede e ordenação persistem na URL',
  async ({ page }, testInfo) => {
    test.skip(
      !testInfo.project.name.includes('mobile'),
      'Teste exclusivo do layout mobile'
    );

    await page.goto('/', {
      waitUntil: 'domcontentloaded'
    });

    const toggle = page.getByRole('button', {
      name: 'Abrir filtros'
    });

    await toggle.click();

    await expect(toggle).toHaveAttribute(
      'aria-expanded',
      'true'
    );

    const panel = page.locator('#mobile-filter-panel');

    await expect(panel).toBeVisible();

    const category = panel.getByRole('combobox', {
      name: 'Filtrar categoria'
    });

    const network = panel.getByRole('combobox', {
      name: 'Filtrar rede'
    });

    const sort = panel.getByRole('combobox', {
      name: 'Ordenar NFTs no mobile'
    });

    await category.selectOption({
      label: 'Arte digital'
    });

    await network.selectOption({
      label: 'Ethereum'
    });

    await sort.selectOption('price_asc');

    await expect(category).toHaveValue('Arte digital');
    await expect(network).toHaveValue('Ethereum');
    await expect(sort).toHaveValue('price_asc');

    await expect.poll(
      () => new URL(page.url()).searchParams.get('category')
    ).toBe('Arte digital');

    await expect.poll(
      () => new URL(page.url()).searchParams.get('network')
    ).toBe('Ethereum');

    await expect.poll(
      () => new URL(page.url()).searchParams.get('sort')
    ).toBe('price_asc');

    await panel.getByRole('button', {
      name: 'Fechar filtros e pesquisa'
    }).click();

    await expect(panel).toHaveCount(0);

    await expect(toggle).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  }
);
