
import { test, expect } from '@playwright/test';

test('cadastro lazy cria conta e permite acessar o perfil', async ({ page }, testInfo) => {
  await page.goto('/');

  await expect.poll(
    async () => page.evaluate(async () =>
      (await fetch('/api/session', { cache: 'no-store' })).status
    ),
    { timeout: 10000 }
  ).toBe(401);

  await page.evaluate(async () => {
    localStorage.removeItem('nft-token');
    localStorage.removeItem('nft-scenario');
    sessionStorage.clear();

    const response = await fetch('/api/demo/reset', { method: 'POST' });
    if (!response.ok) {
      throw new Error(`Falha ao reiniciar os mocks: ${response.status}`);
    }
  });

  await page.goto('/register');

  await expect(
    page.getByRole('heading', { name: 'Criar perfil de colecionador' })
  ).toBeVisible();

  const suffix = testInfo.project.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();

  await page.getByPlaceholder('Nome de usuário').fill('Teste Lazy');
  await page.getByPlaceholder('Digite seu e-mail', { exact: true }).fill(`lazy-${suffix}@example.test`);
  await page.getByPlaceholder('Senha', { exact: true }).fill('Demo123!');
  await page.getByPlaceholder('Confirmar senha').fill('Demo123!');
  await page.getByRole('button', { name: 'Criar perfil', exact: true }).click();

  await expect(page).toHaveURL(/\/cart(?:\?|$)/, { timeout: 15000 });

  await expect(
    page.getByRole('heading', { name: 'Seu carrinho está vazio' })
  ).toBeVisible({ timeout: 15000 });

  await page.goto('/profile');

  await expect(
    page.getByRole('heading', { name: 'Perfil do colecionador' })
  ).toBeVisible();
});
