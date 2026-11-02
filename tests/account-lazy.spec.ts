
import { test, expect } from '@playwright/test';

test('perfil e carteiras carregam corretamente com autenticação', async ({ page }) => {
  await page.goto('/');

  // Espera o serviço de API simulada ficar disponível.
  await expect.poll(async () =>
    page.evaluate(async () =>
      (await fetch('/api/session', { cache: 'no-store' })).status
    ),
    { timeout: 10000 }
  ).toBe(401);

  await page.evaluate(async () => {
    localStorage.removeItem('nft-token');
    localStorage.removeItem('nft-scenario');

    const reset = await fetch('/api/demo/reset', { method: 'POST' });
    if (!reset.ok) throw new Error(`Erro ao reiniciar dados: ${reset.status}`);
  });

  // Visitantes não podem acessar as páginas privadas.
  await page.goto('/profile');
  await expect(
    page.getByRole('heading', { name: 'Entre para continuar' })
  ).toBeVisible();

  await page.goto('/wallets');
  await expect(
    page.getByRole('heading', { name: 'Entre para continuar' })
  ).toBeVisible();

  // Autentica usando a API simulada.
  await page.evaluate(async () => {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alex@example.test',
        password: 'Demo123!'
      })
    });

    if (!response.ok) throw new Error(`Erro no login: ${response.status}`);

    const data = await response.json() as { token: string };
    localStorage.setItem('nft-token', data.token);
  });

  // Perfil autenticado.
  await page.goto('/profile');

  await expect(
    page.getByRole('heading', { name: 'Perfil do colecionador' })
  ).toBeVisible();

  // Navegação para Carteiras.
  await page.getByRole('link', { name: 'Carteiras', exact: true }).click();

  await expect(page).toHaveURL(/\/wallets/);

  await expect(
    page.getByRole('heading', { name: 'Carteira principal' })
  ).toBeVisible();

  // Retorno ao Perfil.
  await page.getByRole('link', { name: 'Dados do perfil' }).click();

  await expect(
    page.getByRole('heading', { name: 'Perfil do colecionador' })
  ).toBeVisible();
});
