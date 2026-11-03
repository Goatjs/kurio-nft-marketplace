import {expect, test, type Page} from '@playwright/test';

/** Fase 9B: todas as requisições passam pela rede e pelos handlers MSW. */
test.beforeEach(async ({page}) => {
  await page.goto('/');
  // Confirma que o worker controla a API antes do reset de fixtures.
  await expect.poll(async () => page.evaluate(async () => {
    try { return (await fetch('/api/session', {cache: 'no-store'})).status; }
    catch { return -1; }
  }), {timeout: 12000}).toBe(401);
  await page.evaluate(async () => {
    localStorage.removeItem('nft-scenario');
    localStorage.removeItem('nft-token');
    sessionStorage.clear();
    const result = await fetch('/api/demo/reset', {method: 'POST'});
    if (!result.ok) throw new Error('Falha no reset do mock: ' + result.status);
  });
});

async function chooseScenario(page: Page, scenario: 'variable-latency' | 'out-of-order') {
  await page.evaluate(value => localStorage.setItem('nft-scenario', value), scenario);
}

test('REST/MSW: latências variam de modo determinístico por filtro', async ({page}) => {
  await chooseScenario(page, 'variable-latency');
  const measurements = await page.evaluate(async () => {
    const queries = ['Sage', 'Ivory', 'Emerald'];
    return Promise.all(queries.map(async q => {
      const started = performance.now();
      const response = await fetch('/api/nfts?q=' + encodeURIComponent(q), {cache: 'no-store'});
      const result = await response.json() as {items: Array<{title: string}>};
      return {
        q, status: response.status, names: result.items.map(item => item.title),
        programmedMs: Number(response.headers.get('X-Kurio-Mock-Delay-Ms')),
        elapsedMs: performance.now() - started
      };
    }));
  });
  expect(measurements.map(m => m.status)).toEqual([200, 200, 200]);
  expect(measurements.map(m => m.programmedMs)).toEqual([120, 450, 900]);
  for (const m of measurements) {
    expect(m.names.length).toBeGreaterThan(0);
    expect(m.elapsedMs).toBeGreaterThanOrEqual(m.programmedMs - 40);
  }
});

test('REST/MSW: segunda resposta chega antes da primeira', async ({page}) => {
  await chooseScenario(page, 'out-of-order');
  const responses = await page.evaluate(async () => {
    const completed: string[] = [];
    const go = async (q: string) => {
      const response = await fetch('/api/nfts?q=' + q, {cache: 'no-store'});
      const payload = await response.json() as {items: Array<{title: string}>};
      completed.push(q);
      return {status: response.status, names: payload.items.map(item => item.title),
        delay: Number(response.headers.get('X-Kurio-Mock-Delay-Ms'))};
    };
    const slow = go('Emerald');
    await new Promise(resolve => setTimeout(resolve, 50));
    const fast = go('Sage');
    const [emerald, sage] = await Promise.all([slow, fast]);
    return {completed, emerald, sage};
  });
  expect(responses.completed).toEqual(['Sage', 'Emerald']);
  expect(responses.emerald.status).toBe(200);
  expect(responses.sage.status).toBe(200);
  expect(responses.emerald.delay).toBe(1800);
  expect(responses.sage.delay).toBe(80);
  expect(responses.emerald.names.some(name => name.includes('Emerald'))).toBe(true);
  expect(responses.sage.names.some(name => name.includes('Sage'))).toBe(true);
});

test('UI: busca mais recente permanece após resposta REST atrasada', async ({page}, testInfo) => {
  await chooseScenario(page, 'out-of-order');
  await page.goto('/market?q=Emerald');
  await expect(page.locator('.catalog-shell')).toBeVisible();
  if (testInfo.project.name.includes('mobile')) {
    await page.getByRole('searchbox', {name: 'Explorar coleções'}).fill('Sage');
  } else {
    await page.getByRole('button', {name: 'Pesquisar NFTs'}).click();
    await page.getByRole('searchbox', {name: 'Pesquisar no catálogo'}).fill('Sage');
    await page.getByRole('button', {name: 'Buscar', exact: true}).click();
  }
  await expect(page).toHaveURL(/q=Sage/);
  await expect(page.getByRole('link', {name: 'Ver Sage Nomad #009'})).toBeVisible({timeout: 12000});
  // Aguarda além da resposta lenta: busca antiga não pode sobrescrever a nova.
  await page.waitForTimeout(2050);
  await expect(page.locator('.grid-nfts').getByRole('link', {name: 'Ver Emerald Ape #042'})).toHaveCount(0);
  await expect(page.locator('.grid-nfts').getByRole('link', {name: 'Ver Sage Nomad #009'})).toBeVisible();
});
