import {expect,test,type Page} from '@playwright/test';

/** Fase 9C: real GET /api/profile through MSW + UI order state semantics. */
async function resetDemo(page:Page){
  // O Vite devolve index.html para /api/* antes de o MSW controlar a página.
  // A montagem do React ocorre após worker.start(); por isso esperamos o app.
  await page.goto('/');
  await expect(page.getByRole('heading',{name:/SEJA DONO DO FUTURO/})).toBeVisible({timeout:15000});
  await expect.poll(async()=>{
    try{
      return await page.evaluate(async()=>{
        const r=await fetch('/api/session',{cache:'no-store'});
        return {status:r.status,isJson:(r.headers.get('content-type')??'').includes('json')};
      });
    }catch{return {status:0,isJson:false};}
  },{timeout:15000,intervals:[200,400,800]}).toEqual({status:401,isJson:true});
  await page.evaluate(async()=>{
    localStorage.removeItem('nft-token');localStorage.removeItem('nft-scenario');sessionStorage.clear();
    const response=await fetch('/api/demo/reset',{method:'POST'});
    if(!response.ok)throw new Error(`Reset MSW ${response.status}`);
  });
  // Recarrega após limpar tokens, garantindo instância nova de Router/Query.
  await page.goto('/');
  await expect(page.getByRole('heading',{name:/SEJA DONO DO FUTURO/})).toBeVisible({timeout:15000});
}
async function login(page:Page,email='alex@example.test',password='Demo123!'){
  await page.goto('/login');
  await page.locator('.auth-modal input[type="email"]').fill(email);
  await page.getByPlaceholder('Senha',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await expect(page).toHaveURL(/\/cart(?:\?|$)/,{timeout:15000});
  // A URL pode mudar antes de CartPage renderizar e registrar o MSW.
  await expect(page.getByRole('heading',{name:'Seu carrinho está vazio'})).toBeVisible({timeout:15000});
}
async function currentProfile(page:Page){
  return page.evaluate(async()=>{
    const token=localStorage.getItem('nft-token');
    const r=await fetch('/api/profile',{headers:{Authorization:`Bearer ${token}`}});
    if(!(r.headers.get('content-type')??'').includes('json'))throw new Error(`GET /api/profile sem MSW (HTTP ${r.status}, content-type ${r.headers.get('content-type')})`);
    return {status:r.status,profile:await r.json() as {id?:string;name?:string;avatar?:string;email?:string;message?:string}};
  });
}
async function seedOrder(page:Page){
  return page.evaluate(async()=>{
    const token=localStorage.getItem('nft-token');
    if(!token)throw new Error('Faça login antes de criar o pedido de teste');
    const auth={Authorization:`Bearer ${token}`};
    const cart=await fetch('/api/cart/items',{method:'POST',headers:{...auth,'Content-Type':'application/json'},body:JSON.stringify({nftId:'nft-1',quantity:1})});
    if(!cart.ok)throw new Error(`Cart ${cart.status}, content-type ${cart.headers.get('content-type')}`);
    const quoteResponse=await fetch('/api/quote',{method:'POST',headers:auth});
    if(!quoteResponse.ok)throw new Error(`Quote ${quoteResponse.status}`);
    const quote=await quoteResponse.json() as {id:string};
    const walletsResponse=await fetch('/api/wallets',{headers:auth});
    const wallets=await walletsResponse.json() as Array<{id:string}>;
    if(!walletsResponse.ok||!wallets[0])throw new Error(`Wallet ${walletsResponse.status}`);
    const orderResponse=await fetch('/api/orders',{method:'POST',headers:{...auth,'Content-Type':'application/json','Idempotency-Key':crypto.randomUUID()},body:JSON.stringify({quoteId:quote.id,walletId:wallets[0].id})});
    if(orderResponse.status!==202)throw new Error(`Order ${orderResponse.status}`);
    return (await orderResponse.json() as {id:string}).id;
  });
}

test.beforeEach(async({page})=>{await resetDemo(page)});

test('GET /api/profile protege dados e alimenta a tela via MSW',async({page})=>{
  const anonymous=await page.evaluate(async()=>fetch('/api/profile').then(r=>r.status));
  expect(anonymous).toBe(401);
  await login(page);
  const profileRequest=page.waitForResponse(r=>r.url().endsWith('/api/profile')&&r.request().method()==='GET');
  await page.goto('/profile');
  expect((await profileRequest).status()).toBe(200);
  await expect(page.getByLabel('Nome de exibição *')).toHaveValue('Alex Collector');
  const name=page.getByLabel('Nome de exibição *');
  await name.fill('Alex Fase 9C');
  await page.getByLabel('Nome de usuário *').fill('alex9c');
  await page.getByRole('button',{name:'Salvar perfil'}).click();
  await expect(page.getByRole('status')).toContainText('Perfil atualizado com sucesso');
  const updated=await currentProfile(page);
  expect(updated.status).toBe(200);
  expect(updated.profile).toMatchObject({name:'Alex Fase 9C',email:'alex@example.test'});
  await page.reload();
  await expect(name).toHaveValue('Alex Fase 9C');
  await expect(name).toHaveClass(/focus-visible:ring-2/);
  await expect(page.getByRole('button',{name:'Salvar perfil'})).toHaveClass(/focus-visible:ring-2/);
});

test('GET /api/profile isola colecionadores em sessões diferentes',async({page})=>{
  await login(page);
  const alex=await currentProfile(page);
  expect(alex.status).toBe(200);
  expect(alex.profile.email).toBe('alex@example.test');
  await page.goto('/profile');
  await page.getByRole('button',{name:'Sair',exact:true}).click();
  await login(page,'sam@example.test','Demo456!');
  const sam=await currentProfile(page);
  expect(sam.status).toBe(200);
  expect(sam.profile.email).toBe('sam@example.test');
  expect(sam.profile.id).not.toBe(alex.profile.id);
  await page.goto('/profile');
  await expect(page.getByLabel('Nome de exibição *')).toHaveValue('Sam Collector');
});

test('recibo confirmado usa semântica visual de sucesso',async({page})=>{
  await login(page);
  const id=await seedOrder(page);
  await page.goto(`/orders/${id}`);
  const status=page.getByTestId('order-status-icon');
  await expect(status).toHaveAttribute('data-status','confirmed',{timeout:15000});
  await expect(page.getByRole('img',{name:'Pedido confirmado'})).toBeVisible();
  await expect(page.getByRole('heading',{name:/Seus NFTs agora estão na sua carteira/})).toBeVisible();
});

test('recibo recusado não exibe ícone de confirmação',async({page})=>{
  await login(page);
  await page.evaluate(()=>localStorage.setItem('nft-scenario','declined'));
  const id=await seedOrder(page);
  await page.goto(`/orders/${id}`);
  const status=page.getByTestId('order-status-icon');
  await expect(status).toHaveAttribute('data-status','declined',{timeout:15000});
  await expect(page.getByRole('img',{name:'Pedido recusado'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Pagamento recusado'})).toBeVisible();
});
