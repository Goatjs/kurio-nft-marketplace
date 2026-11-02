import {expect,test,type Page} from '@playwright/test';

// The MSW service worker must be ready before using the deterministic demo endpoint.
test.beforeEach(async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('heading',{name:/SEJA DONO DO FUTURO/})).toBeVisible({timeout:15000});
 await page.evaluate(async()=>{
  localStorage.removeItem('nft-scenario');
  localStorage.removeItem('nft-token');
  sessionStorage.clear();
  const r=await fetch('/api/demo/reset',{method:'POST'});
  if(!r.ok)throw new Error(`Falha ao resetar MSW: HTTP ${r.status}`);
 });
});

async function openCheckout(page:Page){
 await page.evaluate(async()=>{
  const login=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'alex@example.test',password:'Demo123!'})});
  if(!login.ok)throw new Error(`Login de cenário falhou: ${login.status}`);
  const {token}=await login.json() as {token:string};
  localStorage.setItem('nft-token',token);
  const cart=await fetch('/api/cart/items',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({nftId:'nft-1',editionId:'1/50',quantity:1})});
  if(!cart.ok)throw new Error(`Carrinho de cenário falhou: ${cart.status}`);
 });
 await page.goto('/checkout');
 await expect(page.locator('#checkout-form')).toBeAttached();
 await expect(page.locator('.summary-item')).toHaveCount(1);
}

async function expireSession(page:Page){
 const status=await page.evaluate(async()=>{
  const token=localStorage.getItem('nft-token');
  const r=await fetch('/api/demo/expire-session',{method:'POST',headers:{Authorization:`Bearer ${token}`}});
  return r.status;
 });
 expect(status).toBe(200);
}

async function loginAgain(page:Page){
 await page.locator('.panel').getByRole('link',{name:'Entrar',exact:true}).click();
 await expect(page).toHaveURL(/\/login(?:\?|$)/);
 await page.getByRole('textbox',{name:'E-mail',exact:true}).fill('alex@example.test');
 await page.getByPlaceholder('Senha').fill('Demo123!');
 await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await expect(page).toHaveURL(/\/checkout(?:\?|$)/,{timeout:15000});
 await expect(page.locator('.summary-item')).toHaveCount(1);
}

test('sessão expirada ao reabrir checkout pede login e preserva o carrinho',async({page})=>{
 await openCheckout(page);
 await expireSession(page);
 await page.reload();
 await expect(page.getByText(/Sua sessão expirou\. Entre novamente/)).toBeVisible();
 await expect(page.getByText(/Revise a cotação e clique para confirmar/)).toHaveCount(0);
 await loginAgain(page);
 await expect(page.getByRole('button',{name:'Revisar e confirmar'})).toBeVisible();
});

test('sessão expirada antes de confirmar não cria pedido e exige nova revisão',async({page},testInfo)=>{
 await openCheckout(page);
 const action=page.locator('.checkout-summary').getByRole('button',{name:'Revisar e confirmar'});
 if(testInfo.project.name.includes('mobile')){
  await action.click(); // mobile: primeiro toque revela os dados do colecionador
  await expect(page.locator('#checkout-form')).toBeVisible();
 }
 const fields=page.locator('#checkout-form input[required]');
 await fields.nth(0).fill('Alex');
 await fields.nth(1).fill('alexcollector');
 await fields.nth(2).fill('Alex Collector');
 await fields.nth(3).fill('0x1111111111111111111111111111111111111111');
 await fields.nth(4).fill('alex@example.test');
 await action.click();
 const confirm=page.locator('.checkout-summary').getByRole('button',{name:'Confirmar compra'});
 await expect(confirm).toBeVisible();
 await expireSession(page);
 // O Service Worker do MSW pode concluir a resposta e disparar reload antes
 // de Playwright observar o evento de rede. Teste a API protegida diretamente
 // (sem o interceptor Axios), e depois valide a reação real do checkout.
 const protectedStatus=await page.evaluate(async()=>{
  const token=localStorage.getItem('nft-token');
  const response=await fetch('/api/orders/by-key/check-expired-session',{headers:{Authorization:`Bearer ${token}`}});
  return response.status;
 });
 expect(protectedStatus,'O mock de pedidos deve rejeitar a sessão expirada').toBe(401);
 await confirm.click();
 // A confirmação precisa detectar 401 e exigir reautenticação antes de qualquer
 // pedido. O redirecionamento/reload pertence à UI, não ao observador de rede.
 await expect(page.getByText(/Sua sessão expirou\. Entre novamente/)).toBeVisible({timeout:15000});
 await expect(page).toHaveURL(/\/checkout(?:\?|$)/);
 // 401 must invalidate the active token and stop checkout, not create an order.
 expect(await page.evaluate(()=>localStorage.getItem('nft-token'))).toBeNull();
 await loginAgain(page);
 await expect(page.locator('.checkout-summary').getByRole('button',{name:'Revisar e confirmar'})).toBeVisible();
});
