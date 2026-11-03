import { expect, test, type Page } from '@playwright/test';

/**
 * KURIO — regressão visual de componentes e páginas obrigatórias.
 *
 * Os snapshots são gerados e aprovados NA MÁQUINA do desenvolvedor:
 *   npx playwright test --config=playwright.visual.config.ts --update-snapshots
 *
 * Aprovar a baseline NÃO significa automaticamente fidelidade ao Figma.
 * Compare as imagens com /referencias-figma antes de versionar.
 */

const DEMO_USER = { email: 'alex@example.test', password: 'Demo123!' };

// O cenário padrão é determinístico; reset é feito pelo handler de rede MSW.
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /SEJA DONO (?:DO FUTURO|DA CULTURA DIGITAL)/ })).toBeVisible();
  await expect.poll(async () => page.evaluate(async () => {
    return (await fetch('/api/session', { cache: 'no-store' })).status;
  }), { timeout: 10_000 }).toBe(401);

  await page.evaluate(async () => {
    localStorage.removeItem('nft-token');
    localStorage.removeItem('nft-scenario');
    sessionStorage.clear();
    const reset = await fetch('/api/demo/reset', { method: 'POST' });
    if (!reset.ok) throw new Error(`Falha ao resetar cenário MSW: ${reset.status}`);
  });
});

async function preloadImagesAndFonts(page: Page) {
  // Lazy images: visitar toda a página para carregar os assets, sem congelar
  // relógio/timers usados por Socket.IO e tanstack-query.
  await page.evaluate(async () => {
    const height = Math.max(1, window.innerHeight);
    const total = document.documentElement.scrollHeight;
    for (let top = 0; top < total; top += height) {
      window.scrollTo(0, top);
      await new Promise(resolve => setTimeout(resolve, 65));
    }
    window.scrollTo(0, 0);
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).map(image => {
      if (image.complete) return Promise.resolve();
      return new Promise<void>(resolve => {
        const done = () => { clearTimeout(timeout); resolve(); };
        const timeout = setTimeout(done, 4000);
        image.addEventListener('load', done, { once: true });
        image.addEventListener('error', done, { once: true });
      });
    }));
  });
}

async function capture(page: Page, name: string) {
  await preloadImagesAndFonts(page);
  await expect(page).toHaveScreenshot(name, {
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
    threshold: 0.2,
    maxDiffPixelRatio: 0.005,
    timeout: 20_000,
  });
}

async function addGuestNftToCart(page: Page) {
  const status = await page.evaluate(async () => {
    const response = await fetch('/api/cart/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nftId: 'nft-1', quantity: 1 }),
    });
    return response.status;
  });
  expect(status).toBe(200);
}

async function prepareAuthenticatedCart(page: Page) {
  await page.evaluate(async user => {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    if (!response.ok) throw new Error(`Falha no login de teste: ${response.status}`);
    const { token } = await response.json() as { token: string };
    localStorage.setItem('nft-token', token);
    const cart = await fetch('/api/cart/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ nftId: 'nft-1', quantity: 1 }),
    });
    if (!cart.ok) throw new Error(`Falha ao preparar carrinho: ${cart.status}`);
  }, DEMO_USER);
}

test('visual — início', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Ver Emerald Ape #042' })).toBeVisible();
  await capture(page, 'inicio.png');
});

test('visual — detalhe do NFT', async ({ page }) => {
  await page.goto('/nfts/nft-1');
  await expect(page.locator('.detail-price')).toContainText('1.19 ETH');
  await capture(page, 'detalhe-nft.png');
});

test('visual — carrinho de NFTs', async ({ page }) => {
  await addGuestNftToCart(page);
  await page.goto('/cart');
  await expect(page.locator('.cart-row')).toContainText('Emerald Ape #042');
  await capture(page, 'carrinho.png');
});

test('visual — pagamento', async ({ page }) => {
  await prepareAuthenticatedCart(page);
  await page.goto('/checkout');
  await expect(page.locator('.checkout-layout')).toBeVisible();

  // O NFT está nos dados do checkout, mas o Figma oculta os itens no mobile.
  const nftItem = page.locator('.checkout-summary .summary-item').first();
  await expect(nftItem).toContainText('Emerald Ape #042');
  const isMobile = (page.viewportSize()?.width ?? 1440) <= 640;
  if (isMobile) {
    await expect(page.getByRole('heading', { name: 'Pagamento com carteira' })).toBeVisible();
    await expect(nftItem).toBeHidden();
  } else {
    await expect(nftItem).toBeVisible();
  }

  // Esses controles devem continuar acessíveis em todas as resoluções.
  await expect(page.locator('.checkout-wallets')).toBeVisible();
  await expect(page.locator('.wallet-option').first()).toBeVisible();
  await expect(page.locator('.summary-total')).toContainText('ETH');
  await expect(page.getByRole('button', { name: 'Revisar e confirmar' })).toBeVisible();

  await capture(page, 'pagamento.png');
});
