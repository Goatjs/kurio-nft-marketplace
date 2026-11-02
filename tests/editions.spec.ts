import {expect,test} from '@playwright/test';

test.beforeEach(async({page})=>{
 await page.goto('/');
 // The app awaits worker.start() asynchronously: wait for the UI before using the API.
 await expect(page.getByRole('heading',{name:/SEJA DONO DO FUTURO/})).toBeVisible({timeout:15000});
 await page.evaluate(async()=>{
  localStorage.clear();
  sessionStorage.clear();
  const r=await fetch('/api/demo/reset',{method:'POST'});
  if(!r.ok)throw new Error(`Falha ao resetar MSW: HTTP ${r.status}`);
 });
 await page.reload();
 // Recarregar a página reinicia o boot assíncrono do MSW.
 // Aguarde o React renderizar após worker.start() antes de usar fetch('/api/...').
 await expect(page.getByRole('heading',{name:/SEJA DONO DO FUTURO/})).toBeVisible({timeout:15000});
 await expect.poll(async()=>page.evaluate(async()=>{
  try{
   const r=await fetch('/api/nfts/nft-1',{cache:'no-store'});
   return r.ok && (r.headers.get('content-type')||'').includes('application/json');
  }catch{return false;}
 }),{timeout:15000}).toBe(true);
});

test('seleciona edição com preço e estoque, preserva variantes no carrinho após refresh',async({page})=>{
 await page.goto('/nfts/nft-1');
 const group=page.getByRole('group',{name:'Selecionar edição'});
 const one=group.getByRole('button',{name:/^Edição 1\/1(?:\s|$)/});
 const ten=group.getByRole('button',{name:/^Edição 1\/10(?:\s|$)/});
 const add=page.getByRole('button',{name:test.info().project.name.includes('mobile')?'Adicionar ao carrinho':'Adicionar',exact:true});

 // A mensagem de sucesso pode continuar visível durante a segunda adição.
 // Conferir os dados persistidos na API evita navegar antes de terminar a mutação.
 const editionsInCart=()=>page.evaluate(async()=>{
  const response=await fetch('/api/cart',{cache:'no-store'});
  if(!response.ok)throw new Error(`Falha ao ler carrinho: HTTP ${response.status}`);
  const cart=await response.json() as {items:Array<{nftId:string;editionId:string}>};
  return cart.items.filter(item=>item.nftId==='nft-1').map(item=>item.editionId).sort();
 });

 await expect(page.locator('.detail-price')).toContainText('1.19 ETH');
 await one.click();
 await expect(page.locator('.detail-price')).toContainText('3.57 ETH');
 await expect(one).toHaveAttribute('aria-pressed','true');
 await add.click();
 await expect.poll(editionsInCart,{timeout:10000}).toEqual(['1/1']);

 await ten.click();
 await expect(page.locator('.detail-price')).toContainText('2.0825 ETH');
 await expect(ten).toHaveAttribute('aria-pressed','true');
 await add.click();
 await expect.poll(editionsInCart,{timeout:10000}).toEqual(['1/1','1/10']);

 await page.goto('/cart');
 await expect(page.locator('.cart-row')).toHaveCount(2);
 // O texto de '1/1' também é prefixo de '1/10'. Filtrar apenas o parágrafo
 // cujo conteúdo termina com a edição evita selecionar duas linhas.
 const rowOne=page.locator('.cart-row').filter({has:page.locator('p').filter({hasText:/Edição 1\/1$/})});
 const rowTen=page.locator('.cart-row').filter({has:page.locator('p').filter({hasText:/Edição 1\/10$/})});
 await expect(rowOne).toHaveCount(1);
 await expect(rowTen).toHaveCount(1);
 await expect(rowOne).toContainText('3.57 ETH');
 await expect(rowTen).toContainText('2.0825 ETH');
 await page.reload();
 await expect(page.locator('.cart-row')).toHaveCount(2);
 await expect(rowOne).toContainText('3.57 ETH');
 await expect(rowTen).toContainText('2.0825 ETH');
});

test('mocks validam estoque por edição, linhas separadas e cotação em wei',async({page})=>{
 const result=await page.evaluate(async()=>{
  const json=async(r:Response)=>{
   const content=await r.text();
   try{return JSON.parse(content) as {items:Array<{editionId:string}>;subtotalEth:string};}
   catch{throw new Error(`Resposta inválida de ${new URL(r.url).pathname}: HTTP ${r.status}, content-type=${r.headers.get('content-type')||'nenhum'}, conteúdo=${content.slice(0,160)||'(vazio)'}`);}
  };
  const post=async (body:object)=>{const r=await fetch('/api/cart/items',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await json(r)};};
  const rare=await post({nftId:'nft-1',quantity:1,editionId:'1/1'});
  const overflow=await post({nftId:'nft-1',quantity:1,editionId:'1/1'});
  const limited=await post({nftId:'nft-1',quantity:2,editionId:'1/10'});
  const invalid=await post({nftId:'nft-1',quantity:1,editionId:'INVALIDA'});
  const q=await fetch('/api/quote',{method:'POST'});return {rare,overflow,limited,invalid,quote:await json(q)};
 });
 expect(result.rare.status).toBe(200);
 expect(result.overflow.status).toBe(409);
 expect(result.limited.status).toBe(200);
 expect(result.invalid.status).toBe(422);
 expect(result.quote.items).toHaveLength(2);
 expect(result.quote.items.map((i:{editionId:string})=>i.editionId).sort()).toEqual(['1/1','1/10']);
 expect(result.quote.subtotalEth).toBe('7.735'); // 3.57 + 2 x 2.0825
});
