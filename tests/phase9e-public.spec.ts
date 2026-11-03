import {expect,test} from '@playwright/test';

/** Fase 9E: smoke seguro para execução local e no deploy público com MSW. */
test('smoke: home, catálogo e detalhe de NFT respondem pela interface',async({page})=>{
  await page.goto('/');
  await expect(page.getByRole('heading',{name:/SEJA DONO (?:DO FUTURO|DA CULTURA DIGITAL)/})).toBeVisible({timeout:20000});
  await page.goto('/market');
  await expect(page.getByRole('link',{name:'Ver Emerald Ape #042'})).toBeVisible({timeout:20000});
  await page.goto('/nfts/nft-1');
  await expect(page.getByRole('heading',{name:'Emerald Ape #042'})).toBeVisible({timeout:20000});
});

test('smoke: MSW serve JSON para API e restringe perfil não autenticado',async({page})=>{
  await page.goto('/');
  await expect(page.getByRole('heading',{name:/SEJA DONO (?:DO FUTURO|DA CULTURA DIGITAL)/})).toBeVisible({timeout:20000});
  const result=await page.evaluate(async()=>{
    const response=await fetch('/api/profile',{cache:'no-store'});
    return {status:response.status,contentType:response.headers.get('content-type')??''};
  });
  expect(result.status).toBe(401);
  expect(result.contentType).toContain('application/json');
});

test('smoke: login demonstrativo acessa carrinho sem backend real',async({page})=>{
  await page.goto('/login');
  await expect(page.getByRole('heading',{name:'Entrar',exact:true})).toBeVisible({timeout:20000});
  await page.locator('.auth-modal input[type="email"]').fill('alex@example.test');
  await page.getByPlaceholder('Senha',{exact:true}).fill('Demo123!');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await expect(page).toHaveURL(/\/cart(?:\?|$)/,{timeout:20000});
  await expect(page.getByRole('heading',{name:'Seu carrinho está vazio'})).toBeVisible({timeout:20000});
});
