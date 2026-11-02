import {expect, test, type Page} from '@playwright/test';

type Status = {clients:number;paused:boolean};

async function socketStatus(page:Page):Promise<Status>{
 return page.evaluate(async()=>{
  const response=await fetch('/api/demo/socket/status',{cache:'no-store'});
  if(!response.ok)throw new Error(`Socket status HTTP ${response.status}`);
  const type=response.headers.get('content-type')??'';
  if(!type.includes('json'))throw new Error(`Socket status não é JSON: ${type}`);
  return response.json() as Promise<Status>;
 });
}

async function postDemo(page:Page,url:string,body?:unknown){
 return page.evaluate(async({url,body})=>{
  const response=await fetch(url,{method:'POST',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
  const type=response.headers.get('content-type')??'';
  if(!type.includes('json'))throw new Error(`${url}: HTTP ${response.status}; esperado JSON, recebido ${type}`);
  const result=await response.json() as Record<string,unknown>;
  if(!response.ok)throw new Error(`${url}: HTTP ${response.status}, ${JSON.stringify(result)}`);
  return result;
 },{url,body});
}

async function prepare(page:Page){
 await page.goto('/');
 await expect.poll(async()=>page.evaluate(async()=>{
  const response=await fetch('/api/session',{cache:'no-store'});
  return response.status;
 }),{timeout:10000,intervals:[200,400,800]}).toBe(401);
 await page.evaluate(async()=>{
  localStorage.removeItem('nft-token');localStorage.removeItem('nft-scenario');sessionStorage.clear();
  const response=await fetch('/api/demo/reset',{method:'POST'});
  if(!response.ok)throw new Error(`Falha ao resetar MSW: ${response.status}`);
 });
 await page.goto('/nfts/nft-1');
 await expect(page.locator('.detail-price')).toContainText('1.19 ETH');
 await expect.poll(async()=> (await socketStatus(page)).clients,{timeout:12000,intervals:[200,500,800]}).toBeGreaterThan(0);
}

async function disconnect(page:Page){
 const result=await postDemo(page,'/api/demo/socket/disconnect');
 expect(result.paused).toBe(true);
 expect(Number(result.closed)).toBeGreaterThan(0);
 await expect.poll(async()=>socketStatus(page),{timeout:10000}).toEqual({paused:true,clients:0});
}

async function resume(page:Page){
 const result=await postDemo(page,'/api/demo/socket/resume');
 expect(result.paused).toBe(false);
 await expect.poll(async()=> (await socketStatus(page)).clients,{timeout:15000,intervals:[200,400,800]}).toBeGreaterThan(0);
}

test.beforeEach(async({page})=>{await prepare(page)});

test('Socket.IO reconecta e sincroniza preço e estoque perdidos durante a queda',async({page})=>{
 await expect(page.locator('.details-meta')).toContainText('Disponíveis: 50');
 await disconnect(page);
 const price=await postDemo(page,'/api/demo/price/nft-1');
 expect(price.priceEth).toBe('1.2');
 const stock=await postDemo(page,'/api/demo/stock/nft-1',{stock:17});
 expect(stock.stock).toBe(17);
 await page.waitForTimeout(200);
 // REST state changed while WebSocket was disconnected; no event could reach the UI.
 await expect(page.locator('.detail-price')).toContainText('1.19 ETH');
 await expect(page.locator('.details-meta')).toContainText('Disponíveis: 50');
 await resume(page);
 await expect(page.locator('.detail-price')).toContainText('1.2 ETH',{timeout:15000});
 await expect(page.locator('.details-meta')).toContainText('Disponíveis: 17');
 const current=await page.evaluate(async()=>{
  const response=await fetch('/api/nfts/nft-1');return response.json() as Promise<{version:number}>;
 });
 expect(current.version).toBe(3);
});

test('Socket.IO reconecta e atualiza preços e cotação de itens no carrinho',async({page})=>{
 if(test.info().project.name.includes('mobile')){
  await page.getByRole('button',{name:/Comprar NFT/}).click();
 }else{
  await page.getByRole('button',{name:'COMPRAR',exact:true}).click();
 }
 await expect(page).toHaveURL(/\/cart/);
 await expect(page.locator('.cart-unit')).toContainText('1.19 ETH');
 await expect(page.locator('.summary-total')).toContainText('1.206 ETH');
 await disconnect(page);
 await postDemo(page,'/api/demo/price/nft-1');
 await page.waitForTimeout(200);
 await expect(page.locator('.cart-unit')).toContainText('1.19 ETH');
 await resume(page);
 await expect(page.locator('.cart-unit')).toContainText('1.2 ETH',{timeout:15000});
 await expect(page.locator('.summary-total')).toContainText('1.216 ETH',{timeout:15000});
});
