import { expect, test, type Page } from '@playwright/test';

/**
 * Kurio: REST contract, checkout recovery, and collector isolation tests.
 *
 * These requests run in the actual browser, so MSW's network handlers
 * (not mock implementation imports or direct state mutations) handle them.
 * Both desktop and mobile projects in playwright.config.ts run this file.
 */

type CheckoutSeed = { token: string; quoteId: string; walletId: string };
type OrderResult = {
  status: number;
  body: { id?: string; status?: string; message?: string; quote?: { totalEth?: string } };
};

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /SEJA DONO DO FUTURO/ })).toBeVisible();

  // Confirmar que as chamadas REST estão sendo interceptadas pelo MSW
  // ANTES de iniciar o cenário. Um 404 aqui é o servidor Vite, não a API simulada.
  await expect.poll(async () => page.evaluate(async () => {
    const response = await fetch('/api/session', { cache: 'no-store' });
    return response.status;
  }), { timeout: 10_000, intervals: [200, 400, 800] }).toBe(401);

  // Resetar os dados sem um reload adicional: navegar imediatamente após o
  // reset criava uma disputa com a ativação do service worker, causando
  // respostas 404 intermitentes nas chamadas /api/login dos testes.
  await page.evaluate(async () => {
    localStorage.removeItem('nft-scenario');
    localStorage.removeItem('nft-token');
    sessionStorage.clear();
    const reset = await fetch('/api/demo/reset', { method: 'POST' });
    if (!reset.ok) throw new Error(`MSW reset failed: ${reset.status}`);
  });
});

async function prepareCheckout(page: Page): Promise<CheckoutSeed> {
  return page.evaluate(async () => {
    const login = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alex@example.test', password: 'Demo123!' }),
    });
    if (!login.ok) throw new Error(`Login failed: ${login.status}`);
    const { token } = (await login.json()) as { token: string };
    localStorage.setItem('nft-token', token);
    const authorization = { Authorization: `Bearer ${token}` };

    const cart = await fetch('/api/cart/items', {
      method: 'POST',
      headers: { ...authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify({ nftId: 'nft-1', quantity: 1 }),
    });
    if (!cart.ok) throw new Error(`Add to cart failed: ${cart.status}`);

    const quoteResponse = await fetch('/api/quote', { method: 'POST', headers: authorization });
    if (!quoteResponse.ok) throw new Error(`Quote failed: ${quoteResponse.status}`);
    const quote = (await quoteResponse.json()) as { id: string };

    const walletResponse = await fetch('/api/wallets', { headers: authorization });
    if (!walletResponse.ok) throw new Error(`Wallet lookup failed: ${walletResponse.status}`);
    const wallets = (await walletResponse.json()) as Array<{ id: string }>;
    if (!wallets[0]) throw new Error('Fixture missing a collector wallet');
    return { token, quoteId: quote.id, walletId: wallets[0].id };
  });
}

async function createOrder(page: Page, input: CheckoutSeed & { key: string; walletIdOverride?: string }): Promise<OrderResult> {
  return page.evaluate(async ({ token, quoteId, walletId, walletIdOverride, key }) => {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'Idempotency-Key': key,
      },
      body: JSON.stringify({ quoteId, walletId: walletIdOverride ?? walletId }),
    });
    return { status: response.status, body: await response.json() };
  }, input);
}

async function getOrderByKey(page: Page, token: string, key: string): Promise<OrderResult> {
  return page.evaluate(async ({ token, key }) => {
    const response = await fetch(`/api/orders/by-key/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { status: response.status, body: await response.json() };
  }, { token, key });
}

async function getCartCount(page: Page, token: string): Promise<number> {
  return page.evaluate(async token => {
    const response = await fetch('/api/cart', { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`Cart lookup failed: ${response.status}`);
    const cart = (await response.json()) as { items: Array<{ quantity: number }> };
    return cart.items.reduce((total, item) => total + item.quantity, 0);
  }, token);
}

test('pedidos são idempotentes e chave reutilizada com conteúdo diferente gera conflito', async ({ page }) => {
  const input = await prepareCheckout(page);
  const key = 'kurio-idempotency-check';
  const first = await createOrder(page, { ...input, key });
  expect(first.status).toBe(202);
  expect(first.body.id).toBeTruthy();

  const again = await createOrder(page, { ...input, key });
  expect(again.status).toBe(200);
  expect(again.body.id).toBe(first.body.id);

  const changed = await createOrder(page, { ...input, key, walletIdOverride: 'different-wallet' });
  expect(changed.status).toBe(409);
  expect(changed.body.message).toMatch(/chave|conteúdo/i);
});

test('timeout após criação pode recuperar o mesmo pedido e recibo após refresh', async ({ page }) => {
  const input = await prepareCheckout(page);
  await page.evaluate(() => localStorage.setItem('nft-scenario', 'timeout'));
  const key = 'kurio-timeout-recovery';
  const first = await createOrder(page, { ...input, key });
  expect(first.status).toBe(504);

  const recovered = await getOrderByKey(page, input.token, key);
  expect(recovered.status).toBe(200);
  const id = recovered.body.id;
  expect(id).toBeTruthy();

  const retry = await createOrder(page, { ...input, key });
  expect(retry.status).toBe(200);
  expect(retry.body.id).toBe(id);

  await expect.poll(async () => (await getOrderByKey(page, input.token, key)).body.status, {
    timeout: 10_000,
    intervals: [300, 500, 1_000],
  }).toBe('confirmed');
  expect(await getCartCount(page, input.token)).toBe(0);

  await page.goto(`/orders/${id}`);
  await expect(page.getByRole('heading', { name: /Seus NFTs agora estão na sua carteira/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: /Seus NFTs agora estão na sua carteira/ })).toBeVisible();
});

test('pagamento recusado permanece terminal e preserva os NFTs no carrinho', async ({ page }) => {
  const input = await prepareCheckout(page);
  await page.evaluate(() => localStorage.setItem('nft-scenario', 'declined'));
  const key = 'kurio-declined-payment';
  const first = await createOrder(page, { ...input, key });
  expect(first.status).toBe(202);

  await expect.poll(async () => (await getOrderByKey(page, input.token, key)).body.status, {
    timeout: 10_000,
    intervals: [300, 500, 1_000],
  }).toBe('declined');
  expect(await getCartCount(page, input.token)).toBe(1);

  await page.goto(`/orders/${first.body.id}`);
  await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible();
  await expect(page.getByText(/itens foram preservados no carrinho/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible();
  expect((await getOrderByKey(page, input.token, key)).body.status).toBe('declined');
});

test('mudança de preço invalida cotação antiga sem perder itens', async ({ page }) => {
  const input = await prepareCheckout(page);
  const changed = await page.evaluate(async () => {
    const response = await fetch('/api/demo/price/nft-1', { method: 'POST' });
    return { status: response.status, data: await response.json() as { priceEth: string } };
  });
  expect(changed.status).toBe(200);
  expect(changed.data.priceEth).toBe('1.2');

  const rejected = await createOrder(page, { ...input, key: 'kurio-stale-quote' });
  expect(rejected.status).toBe(409);
  expect(rejected.body.message).toMatch(/preço|disponibilidade|cotação/i);
  expect(await getCartCount(page, input.token)).toBe(1);
});

test('outro usuário não consegue consultar um pedido ou o carrinho do colecionador', async ({ page }) => {
  const firstUser = await prepareCheckout(page);
  const placed = await createOrder(page, { ...firstUser, key: 'kurio-private-order' });
  expect(placed.status).toBe(202);
  expect(placed.body.id).toBeTruthy();

  const isolation = await page.evaluate(async orderId => {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Second Collector', email: 'second@example.test', password: 'Demo12345!' }),
    });
    if (!response.ok) throw new Error(`Second account signup failed: ${response.status}`);
    const { token } = (await response.json()) as { token: string };
    const auth = { Authorization: `Bearer ${token}` };
    const otherOrder = await fetch(`/api/orders/${orderId}`, { headers: auth });
    const otherCart = await fetch('/api/cart', { headers: auth });
    const items = (await otherCart.json()) as { items: unknown[] };
    return { orderStatus: otherOrder.status, cartStatus: otherCart.status, otherItems: items.items.length };
  }, placed.body.id);

  expect(isolation.orderStatus).toBe(404);
  expect(isolation.cartStatus).toBe(200);
  expect(isolation.otherItems).toBe(0);
  expect(await getCartCount(page, firstUser.token)).toBe(1);
});

test('logout invalida sessão anterior e bloqueia consulta privada', async ({ page }) => {
  const input = await prepareCheckout(page);
  const statuses = await page.evaluate(async token => {
    const headers = { Authorization: `Bearer ${token}` };
    const before = await fetch('/api/session', { headers });
    const logout = await fetch('/api/logout', { method: 'POST', headers });
    const after = await fetch('/api/session', { headers });
    const privateWallets = await fetch('/api/wallets', { headers });
    return [before.status, logout.status, after.status, privateWallets.status];
  }, input.token);
  expect(statuses).toEqual([200, 200, 401, 401]);
});
