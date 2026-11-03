import {expect, test, type Page, type TestInfo} from '@playwright/test';

/**
 * Kurio / Fase 9A — fluxos de compra pela interface, sem importar os mocks.
 * Dados são preparados pela própria UI; observações complementares usam a API
 * REST interceptada pelo MSW e o transporte Socket.IO do aplicativo.
 */
async function resetDemo(page: Page) {
  await page.goto('/');
  await expect.poll(async () => page.evaluate(async () => {
    try { return (await fetch('/api/session', {cache: 'no-store'})).status; }
    catch { return -1; }
  }), {timeout: 12000, intervals: [200, 400, 800]}).toBe(401);
  await page.evaluate(async () => {
    localStorage.removeItem('nft-token');
    localStorage.removeItem('nft-scenario');
    sessionStorage.clear();
    const response = await fetch('/api/demo/reset', {method: 'POST'});
    if (!response.ok) throw new Error(`Falha ao reiniciar o MSW: ${response.status}`);
  });
  await page.goto('/');
  await expect(page.getByRole('heading', {name: /SEJA DONO (?:DO FUTURO|DA CULTURA DIGITAL)/})).toBeVisible();
}

async function loginViaUI(page: Page, password = 'Demo123!') {
  await page.goto('/login');
  await page.locator('.auth-modal input[type="email"]').fill('alex@example.test');
  await page.getByPlaceholder('Senha', {exact: true}).fill(password);
  await page.getByRole('button', {name: 'Entrar', exact: true}).click();
  await expect(page).toHaveURL(/\/cart(?:\?|$)/, {timeout: 15000});
}

async function buyNftViaUI(page: Page, info: TestInfo) {
  await page.goto('/market');
  await page.getByRole('link', {name: 'Ver Emerald Ape #042'}).click();
  await expect(page.getByRole('heading', {name: 'Emerald Ape #042'})).toBeVisible();
  if (info.project.name.includes('mobile')) {
    await page.getByRole('button', {name: /Comprar NFT/}).click();
  } else {
    await page.getByRole('button', {name: 'COMPRAR', exact: true}).click();
  }
  await expect(page).toHaveURL(/\/cart(?:\?|$)/);
  await expect(page.locator('.cart-row')).toContainText('Emerald Ape #042');
  await expect(page.locator('.summary-total')).toContainText('1.206 ETH');
}

async function reviewCheckout(page: Page, info: TestInfo) {
  await expect(page.locator('.checkout-layout')).toBeVisible();
  const form = page.locator('#checkout-form');
  const action = page.locator('.checkout-summary').getByRole('button', {name: 'Revisar e confirmar'});
  await expect(action).toBeEnabled();
  if (info.project.name.includes('mobile')) {
    await action.click();
    await expect(form).toBeVisible();
  }
  await form.getByLabel('Nome de exibição *').fill('Alex Collector');
  await form.getByLabel('Nome de usuário *').fill('alexcollector');
  await form.getByLabel('Nome do perfil *').fill('Alex Collector');
  await form.getByLabel('Endereço da carteira *').fill('0x1111111111111111111111111111111111111111');
  await form.getByLabel('E-mail *').fill('alex@example.test');
  await expect(form.getByLabel('Rede *')).toHaveValue('wallet-1');
  await action.click();
  const confirm = page.locator('.checkout-summary').getByRole('button', {name: 'Confirmar compra'});
  await expect(confirm).toBeVisible();
  return confirm;
}

async function orderSnapshot(page: Page, orderId: string) {
  return page.evaluate(async id => {
    const token = localStorage.getItem('nft-token');
    if (!token) throw new Error('Sessão ausente ao conferir pedido');
    const auth = {Authorization: `Bearer ${token}`};
    const [orderResponse, cartResponse] = await Promise.all([
      fetch(`/api/orders/${id}`, {headers: auth}),
      fetch('/api/cart', {headers: auth})
    ]);
    if (!orderResponse.ok || !cartResponse.ok) {
      throw new Error(`Falha REST: pedido ${orderResponse.status}, carrinho ${cartResponse.status}`);
    }
    const order = await orderResponse.json() as {
      id: string; status: string;
      quote: {totalEth: string; items: Array<{nftId: string; unitPriceEth: string; quantity: number}>};
    };
    const cart = await cartResponse.json() as {items: Array<{nftId: string; quantity: number}>};
    return {order, cart};
  }, orderId);
}

async function socketConnections(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch('/api/demo/socket/status', {cache: 'no-store'});
    if (!response.ok) throw new Error(`MSW Socket: HTTP ${response.status}`);
    return response.json() as Promise<{paused: boolean; clients: number}>;
  });
}

test.beforeEach(async ({page}) => { await resetDemo(page); });

test('compra E2E: catálogo, login, checkout, confirmação e recibo imutável', async ({page}, info) => {
  await buyNftViaUI(page, info);
  await page.getByRole('link', {name: 'Conectar e finalizar'}).click();
  await expect(page.getByRole('heading', {name: 'Entre para continuar'})).toBeVisible();
  await page.locator('.panel').getByRole('link', {name: 'Entrar', exact: true}).click();
  await page.locator('.auth-modal input[type="email"]').fill('alex@example.test');
  await page.getByPlaceholder('Senha', {exact: true}).fill('Demo123!');
  await page.getByRole('button', {name: 'Entrar', exact: true}).click();
  await expect(page).toHaveURL(/\/checkout(?:\?|$)/, {timeout: 15000});

  const confirm = await reviewCheckout(page, info);
  await confirm.click();
  await expect(page).toHaveURL(/\/orders\/[^/?]+/, {timeout: 15000});
  await expect(page.getByRole('heading', {name: 'Seus NFTs agora estão na sua carteira'}))
    .toBeVisible({timeout: 15000});
  const orderId = new URL(page.url()).pathname.split('/').pop()!;
  const result = await orderSnapshot(page, orderId);
  expect(result.order.id).toBe(orderId);
  expect(result.order.status).toBe('confirmed');
  expect(result.order.quote.items).toEqual(expect.arrayContaining([
    expect.objectContaining({nftId: 'nft-1', unitPriceEth: '1.19', quantity: 1})
  ]));
  expect(result.order.quote.totalEth).toBe('1.206');
  expect(result.cart.items).toHaveLength(0);
  await expect(page.locator('.receipt-total')).toContainText('1.206 ETH');

  // Depois de confirmado, o catálogo pode mudar sem alterar o recibo.
  await page.evaluate(async () => {
    const response = await fetch('/api/demo/price/nft-1', {method: 'POST'});
    if (!response.ok) throw new Error('Falha na alteração do catálogo');
  });
  await page.reload();
  await expect(page.getByRole('heading', {name: 'Seus NFTs agora estão na sua carteira'})).toBeVisible();
  await expect(page.locator('.receipt-total')).toContainText('1.206 ETH');
  const saved = await orderSnapshot(page, orderId);
  expect(saved.order.quote.totalEth).toBe('1.206');
});

test('pagamento recusado pela UI preserva o carrinho após refresh', async ({page}, info) => {
  await loginViaUI(page);
  await buyNftViaUI(page, info);
  await page.getByRole('link', {name: 'Conectar e finalizar'}).click();
  await page.evaluate(() => localStorage.setItem('nft-scenario', 'declined'));
  const confirm = await reviewCheckout(page, info);
  await confirm.click();
  await expect(page).toHaveURL(/\/orders\/[^/?]+/, {timeout: 15000});
  await expect(page.getByRole('heading', {name: 'Pagamento recusado'})).toBeVisible({timeout: 15000});
  const orderId = new URL(page.url()).pathname.split('/').pop()!;
  const result = await orderSnapshot(page, orderId);
  expect(result.order.status).toBe('declined');
  expect(result.cart.items).toEqual(expect.arrayContaining([
    expect.objectContaining({nftId: 'nft-1', quantity: 1})
  ]));
  await page.reload();
  await expect(page.getByRole('heading', {name: 'Pagamento recusado'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Seus NFTs agora estão na sua carteira'})).toHaveCount(0);
});

test('pedido com timeout e Socket.IO desconectado é recuperado uma só vez', async ({page}, info) => {
  await loginViaUI(page);
  await buyNftViaUI(page, info);
  await page.getByRole('link', {name: 'Conectar e finalizar'}).click();
  const confirm = await reviewCheckout(page, info);

  await expect.poll(async () => (await socketConnections(page)).clients,
    {timeout: 15000, intervals: [200, 500, 1000]}).toBeGreaterThan(0);
  await page.evaluate(async () => {
    const response = await fetch('/api/demo/socket/disconnect', {method: 'POST'});
    if (!response.ok) throw new Error('Não foi possível desconectar Socket.IO');
    localStorage.setItem('nft-scenario', 'timeout');
  });
  await expect.poll(async () => await socketConnections(page), {timeout: 10000})
    .toEqual({paused: true, clients: 0});

  await confirm.click();
  await expect(page.getByRole('alert')).toContainText(/Timeout após criação do pedido/i, {timeout: 12000});
  const pending = await page.evaluate(() => {
    const raw = sessionStorage.getItem('kurio-pending-checkout');
    return raw ? JSON.parse(raw) as {key: string; quoteId: string; walletId: string; userId: string} : null;
  });
  expect(pending?.key).toBeTruthy();
  expect(pending?.userId).toBe('user-1');

  // A reconexão deve ocorrer no cliente socket.io-client, não em setters de UI.
  await page.evaluate(async () => {
    const response = await fetch('/api/demo/socket/resume', {method: 'POST'});
    if (!response.ok) throw new Error('Não foi possível restaurar o Socket.IO');
  });
  await expect.poll(async () => (await socketConnections(page)).clients,
    {timeout: 15000, intervals: [200, 500, 1000]}).toBeGreaterThan(0);

  // Recarregar com tentativa pendente força recuperação pela chave REST.
  await page.reload();
  await expect(page).toHaveURL(/\/orders\/[^/?]+/, {timeout: 15000});
  await expect(page.getByRole('heading', {name: 'Seus NFTs agora estão na sua carteira'}))
    .toBeVisible({timeout: 15000});
  const orderId = new URL(page.url()).pathname.split('/').pop()!;
  const recovered = await orderSnapshot(page, orderId);
  expect(recovered.order.status).toBe('confirmed');
  expect(recovered.cart.items).toHaveLength(0);

  const recoveredByKey = await page.evaluate(async key => {
    const token = localStorage.getItem('nft-token');
    const response = await fetch(`/api/orders/by-key/${encodeURIComponent(key)}`,
      {headers: {Authorization: `Bearer ${token}`}});
    if (!response.ok) throw new Error(`Recuperação por chave: HTTP ${response.status}`);
    const order = await response.json() as {id: string; status: string};
    // Prova complementar no armazenamento exclusivamente fictício do MSW.
    const mock = JSON.parse(localStorage.getItem('kurio-marketplace-demo-v2') || '{}') as {
      orders?: Record<string, unknown>;
    };
    return {order, count: Object.keys(mock.orders ?? {}).length};
  }, pending!.key);
  expect(recoveredByKey.order.id).toBe(orderId);
  expect(recoveredByKey.order.status).toBe('confirmed');
  expect(recoveredByKey.count).toBe(1);
  expect(await page.evaluate(() => sessionStorage.getItem('kurio-pending-checkout'))).toBeNull();
});

test('erro HTTP 503 no catálogo permite recuperação pela interface', async ({page}) => {
  await page.evaluate(() => localStorage.setItem('nft-scenario', 'http500'));
  await page.goto('/market');
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar o catálogo.',
    {timeout: 15000});
  await page.evaluate(() => localStorage.removeItem('nft-scenario'));
  await page.getByRole('button', {name: 'Tentar novamente'}).click();
  await expect(page.getByRole('link', {name: 'Ver Emerald Ape #042'})).toBeVisible({timeout: 12000});
});
