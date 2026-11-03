import {test, expect} from '@playwright/test';

test('wallet form supports create, edit and persistence', async ({page}) => {
  await page.goto('/');

  // Wait until MSW is intercepting REST requests.
  await expect.poll(async () => page.evaluate(async () => {
    try {
      return (await fetch('/api/session', {cache: 'no-store'})).status;
    } catch {
      return -1;
    }
  }), {timeout: 10000}).toBe(401);

  // Reset demo data and authenticate using the mock API.
  await page.evaluate(async () => {
    localStorage.removeItem('nft-token');
    localStorage.removeItem('nft-scenario');
    sessionStorage.clear();

    const reset = await fetch('/api/demo/reset', {method: 'POST'});
    if (!reset.ok) throw new Error('Demo reset failed');

    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        email: 'alex@example.test',
        password: 'Demo123!'
      })
    });

    if (!response.ok) throw new Error('Demo login failed');

    const data = await response.json() as {token: string};
    localStorage.setItem('nft-token', data.token);
  });

  await page.goto('/wallets');

  await expect(
    page.getByRole('heading', {name: 'Carteira principal'})
  ).toBeVisible();

  const alias = page.getByRole('textbox', {name: /Apelido da carteira/});
  const network = page.getByRole('combobox', {name: /Rede/});
  const address = page.getByRole('textbox', {
    name: /Endere.o da carteira/
  });

  // The duplicate form fields must not exist.
  await expect(alias).toHaveCount(1);
  await expect(
    page.getByRole('textbox', {name: /Nome de exibi/})
  ).toHaveCount(0);
  await expect(
    page.getByRole('textbox', {name: /Nome do perfil/})
  ).toHaveCount(0);

  const walletAddress = '0x2222222222222222222222222222222222222222';

  // Create a secondary wallet.
  await alias.fill('Carteira secundaria 6B');
  await network.selectOption('Polygon');
  await address.fill(walletAddress);

  await page.getByRole('button', {
    name: 'Salvar carteira'
  }).click();

  const created = page.locator('.panel').filter({
    hasText: 'Carteira secundaria 6B'
  });

  await expect(created).toBeVisible();
  await expect(created).toContainText('Polygon');
  await expect(created).toContainText(walletAddress);

  // Edit the wallet.
  await created.getByRole('button', {name: 'Editar'}).click();

  await expect(alias).toHaveValue('Carteira secundaria 6B');
  await expect(network).toHaveValue('Polygon');

  await alias.fill('Carteira principal 6B');
  await network.selectOption('Ethereum');

  await page.getByRole('checkbox', {
    name: /Definir como carteira principal/
  }).check();

  await page.getByRole('button', {
    name: 'Atualizar carteira'
  }).click();

  const updated = page.locator('.panel').filter({
    hasText: 'Carteira principal 6B'
  });

  await expect(updated).toBeVisible();
  await expect(updated).toContainText('Ethereum');
  await expect(updated).toContainText('Principal');

  // Reload and validate persistent data.
  await page.reload();

  await expect(
    page.locator('.panel').filter({
      hasText: 'Carteira principal 6B'
    })
  ).toBeVisible();

  const wallets = await page.evaluate(async () => {
    const token = localStorage.getItem('nft-token');

    const response = await fetch('/api/wallets', {
      headers: {Authorization: 'Bearer ' + token},
      cache: 'no-store'
    });

    if (!response.ok) throw new Error('Wallet API failed');

    return await response.json() as Array<{
      label: string;
      address: string;
      network: string;
      primary: boolean;
    }>;
  });

  expect(wallets).toHaveLength(2);

  expect(wallets).toEqual(expect.arrayContaining([
    expect.objectContaining({
      label: 'Carteira principal 6B',
      address: walletAddress,
      network: 'Ethereum',
      primary: true
    }),
    expect.objectContaining({
      label: 'Principal',
      primary: false
    })
  ]));
});
