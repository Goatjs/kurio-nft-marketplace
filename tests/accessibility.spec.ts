
import { test, expect } from '@playwright/test';

// Fase 7C: verifica os controles que estão acessíveis em cada layout.
test.beforeEach(async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main#conteudo-principal')).toBeAttached();
});

test('link para o conteúdo principal funciona pelo teclado', async ({ page }) => {
  const skip = page.getByRole('link', { name: 'Pular para o conteúdo' });

  // Define ponto inicial do teclado sem focar artificialmente o link testado.
  await page.evaluate(() => {
    document.body.tabIndex = -1;
    document.body.focus();
  });

  await page.keyboard.press('Tab');
  await expect(skip).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#conteudo-principal$/);
  await expect(page.locator('main#conteudo-principal')).toBeFocused();
});

test('navegação indica a página atual aos leitores de tela', async ({ page }, testInfo) => {
  const mobile = testInfo.project.name.includes('mobile');
  const menu = page.locator(mobile ? '.mobile-bar' : '.top-nav');

  const home = menu.getByRole('link', { name: 'Início' });
  const market = menu.getByRole('link', {
    name: mobile ? 'Mercado e favoritos' : 'Mercado',
  });

  await expect(home).toHaveAttribute('aria-current', 'page');
  await expect(market).not.toHaveAttribute('aria-current', 'page');

  await page.goto('/market', { waitUntil: 'domcontentloaded' });

  await expect(market).toHaveAttribute('aria-current', 'page');
  await expect(home).not.toHaveAttribute('aria-current', 'page');
});

test('filtros informam a seleção no layout disponível', async ({ page }, testInfo) => {
  if (testInfo.project.name.includes('mobile')) {
    await page.getByRole('button', { name: 'Abrir filtros' }).click();

    const category = page.getByRole('combobox', { name: 'Filtrar categoria' });

    await expect(category).toBeVisible();
    await category.selectOption({ label: 'Arte digital' });
    await expect(category).toHaveValue('Arte digital');

    // O filtro de rede lateral não está exposto no layout mobile atual.
    return;
  }

  const category = page
    .locator('.filter-column')
    .getByRole('button', { name: /Arte digital/ });

  const network = page
    .locator('.filter-column')
    .getByRole('button', { name: /Ethereum/ });

  await expect(category).toHaveAttribute('aria-pressed', 'false');
  await expect(network).toHaveAttribute('aria-pressed', 'false');

  await category.click();
  await expect(category).toHaveAttribute('aria-pressed', 'true');

  await network.click();
  await expect(network).toHaveAttribute('aria-pressed', 'true');
});

test('ordenação selecionada usa aria-pressed', async ({ page }) => {
  const all = page
    .locator('.catalog-tabs')
    .getByRole('button', { name: 'Todos os NFTs' });

  const newest = page
    .locator('.catalog-tabs')
    .getByRole('button', { name: 'Novos lançamentos' });

  await expect(all).toHaveAttribute('aria-pressed', 'true');
  await expect(newest).toHaveAttribute('aria-pressed', 'false');

  await newest.click();

  await expect(newest).toHaveAttribute('aria-pressed', 'true');
  await expect(all).toHaveAttribute('aria-pressed', 'false');
});
