import {expect, test, type Page} from '@playwright/test';

/** Kurio / Fase 9A — perfil, avatar, senha e erros via interface + API MSW. */
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

test.beforeEach(async ({page}) => {
  await resetDemo(page);
  await loginViaUI(page);
  await page.goto('/profile');
  await expect(page.getByRole('heading', {name: 'Perfil do colecionador'})).toBeVisible();
});

test('perfil e avatar persistem após refresh e refletem a sessão REST', async ({page}) => {
  await page.getByLabel('Nome de exibição *').fill('Alex Atualizado');
  await page.getByLabel('Nome de usuário *').fill('alex9a');
  await page.getByLabel('Nome ENS').fill('alex9a.eth');
  await page.getByLabel('Apelido da carteira').fill('Minha Principal');
  await page.getByLabel('URL do avatar').fill('/assets/sage.webp');
  await page.getByRole('button', {name: 'Salvar perfil'}).click();
  await expect(page.getByRole('status')).toContainText('Perfil atualizado com sucesso.');
  await page.reload();
  await expect(page.getByLabel('Nome de exibição *')).toHaveValue('Alex Atualizado');
  await expect(page.getByLabel('Nome de usuário *')).toHaveValue('alex9a');
  await expect(page.getByLabel('Nome ENS')).toHaveValue('alex9a.eth');
  await expect(page.getByLabel('Apelido da carteira')).toHaveValue('Minha Principal');
  await expect(page.getByLabel('URL do avatar')).toHaveValue('/assets/sage.webp');
  await expect(page.getByRole('img', {name: 'Seu avatar'})).toHaveAttribute('src', '/assets/sage.webp');

  const persisted = await page.evaluate(async () => {
    const token = localStorage.getItem('nft-token');
    const response = await fetch('/api/session', {headers: {Authorization: `Bearer ${token}`}});
    if (!response.ok) throw new Error(`Sessão REST: HTTP ${response.status}`);
    return response.json() as Promise<{name: string; username: string; avatar: string}>;
  });
  expect(persisted).toMatchObject({
    name: 'Alex Atualizado', username: 'alex9a', avatar: '/assets/sage.webp'
  });
});

test('validação HTML e conflito 409 não sobrescrevem o e-mail do perfil', async ({page}) => {
  // A fixture Alex não tem username inicial; sem ele, o HTML bloqueia o POST.
  await page.getByLabel('Nome de usuário *').fill('alex9a');
  const email = page.getByLabel('E-mail *');
  await email.fill('email-invalido');
  await page.getByRole('button', {name: 'Salvar perfil'}).click();
  expect(await email.evaluate(input => (input as HTMLInputElement).validity.typeMismatch)).toBe(true);
  await email.fill('sam@example.test');
  await page.getByRole('button', {name: 'Salvar perfil'}).click();
  await expect(page.getByRole('alert')).toContainText('E-mail já cadastrado');
  await page.reload();
  await expect(page.getByLabel('E-mail *')).toHaveValue('alex@example.test');
});

test('senha incorreta, divergência e alteração válida com novo login', async ({page}) => {
  const current = page.getByLabel('Senha atual');
  const next = page.getByLabel('Nova senha', {exact: true});
  const confirm = page.getByLabel('Confirmar nova senha');
  const change = page.getByRole('button', {name: 'Alterar senha'});

  await current.fill('SenhaIncorreta!');
  await next.fill('NovaSenha9A!');
  await confirm.fill('NovaSenha9A!');
  await change.click();
  await expect(page.getByRole('alert')).toContainText('Senha atual incorreta');

  await current.fill('Demo123!');
  await next.fill('NovaSenha9A!');
  await confirm.fill('OutraSenha9A!');
  await change.click();
  await expect(page.getByRole('alert').filter({hasText: 'Confirmação de senha diferente.'})).toBeVisible();

  await confirm.fill('NovaSenha9A!');
  await change.click();
  await expect(page.getByRole('status')).toContainText('Senha alterada.');
  await page.reload();
  await expect(page.getByRole('heading', {name: 'Perfil do colecionador'})).toBeVisible();
  await page.getByRole('button', {name: 'Sair', exact: true}).click();
  await expect(page).toHaveURL(/\/(?:\?.*)?$/);

  await page.goto('/login');
  await page.locator('.auth-modal input[type="email"]').fill('alex@example.test');
  await page.getByPlaceholder('Senha', {exact: true}).fill('Demo123!');
  await page.getByRole('button', {name: 'Entrar', exact: true}).click();
  await expect(page.getByRole('alert')).toContainText('Credenciais incorretas');

  await page.getByPlaceholder('Senha', {exact: true}).fill('NovaSenha9A!');
  await page.getByRole('button', {name: 'Entrar', exact: true}).click();
  await expect(page).toHaveURL(/\/cart(?:\?|$)/, {timeout: 15000});
  await page.goto('/profile');
  await expect(page.getByRole('heading', {name: 'Perfil do colecionador'})).toBeVisible();
});
