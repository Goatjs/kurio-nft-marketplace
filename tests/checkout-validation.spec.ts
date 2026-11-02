import { expect, test, type Page } from '@playwright/test';

/**
 * Passo 1: o checkout nunca avança com campos obrigatórios em branco,
 * tanto no mobile quanto no desktop. Teste a UI, não apenas os handlers REST.
 */
async function prepareCheckout(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /SEJA DONO DO FUTURO/ })).toBeVisible();
  await expect.poll(async () => page.evaluate(async () => (
    await fetch('/api/session', { cache: 'no-store' })
  ).status), { timeout: 10000 }).toBe(401);

  await page.evaluate(async () => {
    localStorage.removeItem('nft-scenario');
    localStorage.removeItem('nft-token');
    const reset = await fetch('/api/demo/reset', { method: 'POST' });
    if (!reset.ok) throw new Error(`Falha no reset do MSW: ${reset.status}`);

    const login = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alex@example.test', password: 'Demo123!' }),
    });
    if (!login.ok) throw new Error(`Falha no login: ${login.status}`);
    const { token } = await login.json() as { token: string };
    localStorage.setItem('nft-token', token);

    const cart = await fetch('/api/cart/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ nftId: 'nft-1', quantity: 1 }),
    });
    if (!cart.ok) throw new Error(`Falha ao preparar o carrinho: ${cart.status}`);
  });
  await page.goto('/checkout');
  await expect(page.locator('.checkout-layout')).toBeVisible();
  await expect(page.locator('.wallet-option').first()).toBeVisible();
}

async function fillRequiredCollectorFields(page: Page) {
  const form = page.locator('#checkout-form');
  await form.getByLabel('Nome de exibição *').fill('Alex Collector');
  await form.getByLabel('Nome de usuário *').fill('alexcollector');
  await form.getByLabel('Nome do perfil *').fill('Alex Collector');
  await form.getByLabel('Endereço da carteira *').fill('0x1111111111111111111111111111111111111111');
  await form.getByLabel('E-mail *').fill('alex@example.test');
  await expect(form.getByLabel('Rede *')).toHaveValue('wallet-1');
}

test('mobile: solicita os dados e bloqueia revisão com campos em branco', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), 'Cenário para viewport mobile');
  await prepareCheckout(page);
  const form = page.locator('#checkout-form');
  const review = page.getByRole('button', { name: 'Revisar e confirmar' });

  await expect(form).toBeHidden();
  await review.click();
  await expect(form).toBeVisible();
  await expect(page.getByText('Preencha os dados obrigatórios para revisar a compra.')).toBeVisible();
  await expect(review).toBeVisible();

  // Repetir o clique sem preencher dados não pode ativar a confirmação.
  await review.click();
  await expect(review).toHaveText('Revisar e confirmar');
  await expect(page.getByText('Revise a cotação e clique para confirmar sua compra simulada.')).toHaveCount(0);

  await fillRequiredCollectorFields(page);
  await review.click();
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeVisible();
  await expect(page.getByText('Revise a cotação e clique para confirmar sua compra simulada.')).toBeVisible();

  // Ao trocar a carteira/rede, é obrigatório revisar outra vez.
  await form.getByLabel('Rede *').selectOption('');
  await expect(page.getByRole('button', { name: 'Revisar e confirmar' })).toBeVisible();
});

test('desktop: campos obrigatórios continuam bloqueando a revisão', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('desktop'), 'Cenário para viewport desktop');
  await prepareCheckout(page);
  const form = page.locator('#checkout-form');
  const review = page.getByRole('button', { name: 'Revisar e confirmar' });

  await expect(form).toBeVisible();
  await review.click();
  await expect(review).toHaveText('Revisar e confirmar');

  await fillRequiredCollectorFields(page);
  await review.click();
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeVisible();
});
