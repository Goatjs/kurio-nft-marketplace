import {expect, test, type Page} from '@playwright/test';

type SocketScenario = {scenario: string; clients: number; versions: number[]};

async function prepare(page: Page) {
  await page.goto('/');
  // The first page load starts the MSW service worker asynchronously.
  await expect.poll(async () => page.evaluate(async () => {
    const response = await fetch('/api/session', {cache: 'no-store'});
    return response.status;
  }), {timeout: 10000, intervals: [200, 400, 800]}).toBe(401);
  await page.evaluate(async () => {
    localStorage.removeItem('nft-token');
    localStorage.removeItem('nft-scenario');
    sessionStorage.clear();
    const response = await fetch('/api/demo/reset', {method: 'POST'});
    if (!response.ok) throw new Error(`Falha ao resetar MSW: ${response.status}`);
  });
  await page.goto('/nfts/nft-1');
  await expect(page.locator('.detail-price')).toContainText('1.19 ETH');
  // This is an actual Socket.IO client captured by the MSW WS adapter.
  await expect.poll(async () => page.evaluate(async () => {
    const response = await fetch('/api/demo/socket/status', {cache: 'no-store'});
    if (!response.ok) return -1;
    const body = await response.json() as {clients: number};
    return body.clients;
  }), {timeout: 12000, intervals: [200, 500, 800]}).toBeGreaterThan(0);
}

async function increasePrice(page: Page) {
  const result = await page.evaluate(async () => {
    const response = await fetch('/api/demo/price/nft-1', {method: 'POST'});
    return {status: response.status, body: await response.json() as {priceEth: string; version: number}};
  });
  expect(result.status).toBe(200);
  expect(result.body.priceEth).toBe('1.2');
  expect(result.body.version).toBe(2);
  // No direct component state setter: only REST mutation + Socket.IO update.
  await expect(page.locator('.detail-price')).toContainText('1.2 ETH', {timeout: 12000});
}

async function emitScenario(page: Page, scenario: 'duplicate' | 'out-of-order'): Promise<SocketScenario> {
  return page.evaluate(async scenario => {
    const response = await fetch('/api/demo/socket/nft/nft-1', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({scenario}),
    });
    const body = await response.json() as SocketScenario & {message?: string};
    if (!response.ok) throw new Error(`Cenário Socket.IO: HTTP ${response.status}: ${body.message ?? ''}`);
    return body;
  }, scenario);
}

test.beforeEach(async ({page}) => {await prepare(page);});

test('Socket.IO: evento duplicado mantém a atualização válida', async ({page}) => {
  await increasePrice(page);
  const delivery = await emitScenario(page, 'duplicate');
  expect(delivery.clients).toBeGreaterThan(0);
  expect(delivery.versions).toEqual([2, 2]);
  await expect(page.locator('.detail-price')).toContainText('1.2 ETH');
  await expect(page.locator('.detail-price')).not.toContainText('0.01 ETH');
});

test('Socket.IO: evento atrasado não regride o preço nem a versão', async ({page}) => {
  await increasePrice(page);
  const delivery = await emitScenario(page, 'out-of-order');
  expect(delivery.clients).toBeGreaterThan(0);
  expect(delivery.versions).toEqual([2, 1]);
  // Let both events be delivered. A stale event deliberately contains 0.01 ETH.
  await page.waitForTimeout(300);
  await expect(page.locator('.detail-price')).toContainText('1.2 ETH');
  await expect(page.locator('.detail-price')).not.toContainText('0.01 ETH');
  await page.reload();
  await expect(page.locator('.detail-price')).toContainText('1.2 ETH');
});
