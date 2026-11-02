import {delay,http,HttpResponse} from 'msw';
import type {Cart,EditionId,Order,Quote,User,Wallet} from '../contracts';
import {emptyCart,getDB,hashPassword,persist,reset,userSafe} from './data';
import {fromWei,toWei} from '../lib/money';
import {publishNft,publishOrder,socketHandler} from './socket';
const fail=(status:number,message:string)=>HttpResponse.json({message},{status});
const db=getDB;
function auth(req:Request):User|null{
 const token=req.headers.get('Authorization')?.replace(/^Bearer /,'');
 const session=token?db().sessions[token]:undefined;
 if(!session || session.expiresAt<Date.now())return null;
 const record=db().users.find(u=>u.id===session.userId);return record?userSafe(record):null;
}
function cartFor(req:Request):Cart{
 const user=auth(req);return user?(db().carts[user.id]??=emptyCart()):db().guestCart;
}
function findNft(id:string){return db().nfts.find(n=>n.id===id);}
const defaultEdition:EditionId='1/50';
function findEdition(nftId:string,editionId:EditionId){return findNft(nftId)?.editions.find(e=>e.id===editionId);}

function quoteFor(cart:Cart):Quote|ReturnType<typeof fail>{
 const items:Quote['items']=[];let subtotal=0n;
 for(const item of cart.items){const nft=findNft(item.nftId);
  if(!nft)return fail(404,'NFT não encontrado');
  const offer=findEdition(item.nftId,item.editionId??defaultEdition);
  if(!offer)return fail(422,'Edição inválida');
  if(!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>offer.stock)return fail(409,`Estoque alterado: ${nft.title} (${offer.id})`);
  const line=toWei(offer.priceEth)*BigInt(item.quantity);subtotal+=line;
  items.push({...item,editionId:offer.id,unitPriceEth:offer.priceEth,lineEth:fromWei(line),version:nft.version,title:nft.title,image:nft.image});
 }
 if(cart.coupon && cart.coupon!=='SAVE10')return fail(422,'Cupom inválido ou expirado');
 const discount=cart.coupon==='SAVE10'?subtotal/10n:0n;
 const fee=items.length?toWei('0.016'):0n;
 const signature=JSON.stringify({items,coupon:cart.coupon});
 const result:Quote={id:crypto.randomUUID(),items,subtotalEth:fromWei(subtotal),discountEth:fromWei(discount),networkFeeEth:fromWei(fee),totalEth:fromWei(subtotal-discount+fee),coupon:cart.coupon,expiresAt:Date.now()+60000,signature};
 db().quotes[result.id]=result;persist();return result;
}
function errorForQuote(q:Quote):string|null{
 if(Date.now()>q.expiresAt)return 'Cotação expirada';
 const current=quoteFor({items:q.items.map(({nftId,editionId,quantity})=>({nftId,editionId:editionId??defaultEdition,quantity})),coupon:q.coupon});
 if(current instanceof HttpResponse)return 'Item esgotado ou indisponível';
 return q.signature===current.signature?null:'Preço ou disponibilidade alterados';
}
async function network(){const scenario=localStorage.getItem('nft-scenario');if(scenario==='slow')await delay(1500);if(scenario==='offline')throw new TypeError('Conexão indisponível');}
function reconcile(order:Order){
 if(order.status==='pending'&&Date.now()-order.createdAt>2200){
  order.status=localStorage.getItem('nft-scenario')==='declined'?'declined':'confirmed';
  if(order.status==='confirmed'){
   order.txRef=`0x${order.id.replace(/-/g,'').padEnd(64,'0').slice(0,64)}`;
   const cart=db().carts[order.userId]??emptyCart();
   for(const paid of order.quote.items){const item=cart.items.find(i=>i.nftId===paid.nftId&&(i.editionId??defaultEdition)===(paid.editionId??defaultEdition));if(item)item.quantity-=paid.quantity;}
   cart.items=cart.items.filter(i=>i.quantity>0);
   for(const paid of order.quote.items){const nft=findNft(paid.nftId);const offer=findEdition(paid.nftId,paid.editionId??defaultEdition);if(nft&&offer){offer.stock=Math.max(0,offer.stock-paid.quantity);nft.stock=nft.editions.find(e=>e.id===defaultEdition)?.stock??nft.stock;nft.version++;publishNft(nft);}}
  }
  persist();publishOrder(order);
 }
 return order;
}
export const handlers=[
 socketHandler,
 http.get('/api/session',({request})=>{const user=auth(request);return user?HttpResponse.json(user):fail(401,'Sessão inválida');}),
 http.post('/api/login',async({request})=>{await network();const body=await request.json() as {email:string;password:string};const record=db().users.find(u=>u.email.toLowerCase()===body.email?.toLowerCase());
  if(!record || record.passwordHash!==await hashPassword(body.password??''))return fail(401,'Credenciais incorretas');
  const token=crypto.randomUUID();db().sessions[token]={userId:record.id,expiresAt:Date.now()+1000*60*30};
  const target=db().carts[record.id]??=emptyCart();for(const item of db().guestCart.items){const editionId=item.editionId??defaultEdition;const offer=findEdition(item.nftId,editionId);const existing=target.items.find(i=>i.nftId===item.nftId&&(i.editionId??defaultEdition)===editionId);if(existing)existing.quantity=Math.min(offer?.stock??0,existing.quantity+item.quantity);else target.items.push({...item,editionId,quantity:Math.min(item.quantity,offer?.stock??0)});}target.items=target.items.filter(i=>i.quantity>0);db().guestCart=emptyCart();persist();return HttpResponse.json({token,user:userSafe(record)});
 }),
 http.post('/api/register',async({request})=>{const body=await request.json() as {email:string;name:string;password:string};if(!body.email?.includes('@')||!body.name?.trim()||body.password?.length<8)return fail(422,'Dados de cadastro inválidos');if(db().users.some(u=>u.email.toLowerCase()===body.email.toLowerCase()))return fail(409,'E-mail já cadastrado');const user={id:crypto.randomUUID(),name:body.name,email:body.email,avatar:'',passwordHash:await hashPassword(body.password)};db().users.push(user);const token=crypto.randomUUID();db().sessions[token]={userId:user.id,expiresAt:Date.now()+1000*60*30};db().carts[user.id]=db().guestCart;db().guestCart=emptyCart();persist();return HttpResponse.json({user:userSafe(user),token},{status:201});}),
 http.post('/api/logout',({request})=>{const token=request.headers.get('Authorization')?.replace(/^Bearer /,'');if(token)delete db().sessions[token];persist();return HttpResponse.json({ok:true});}),
 http.get('/api/nfts',async({request})=>{await network();if(localStorage.getItem('nft-scenario')==='http500')return fail(503,'Serviço temporariamente indisponível');const p=new URL(request.url).searchParams;let items=[...db().nfts];const q=(p.get('q')||'').toLowerCase();const category=p.get('category')||'all';const sort=p.get('sort')||'popular';const page=Math.max(1,Number(p.get('page'))||1);if(q)items=items.filter(n=>(n.title+' '+n.creator).toLowerCase().includes(q));if(category!=='all')items=items.filter(n=>n.category===category);const selectedNetwork=p.get('network')||'all';if(selectedNetwork!=='all')items=items.filter(n=>n.network===selectedNetwork);const maxPrice=p.get('maxPrice');if(maxPrice&&/^\d+(?:\.\d{1,18})?$/.test(maxPrice))items=items.filter(n=>toWei(n.priceEth)<=toWei(maxPrice));if(sort==='price_asc')items.sort((a,b)=>Number(a.priceEth)-Number(b.priceEth));if(sort==='price_desc')items.sort((a,b)=>Number(b.priceEth)-Number(a.priceEth));if(sort==='newest')items.reverse();return HttpResponse.json({items:items.slice((page-1)*9,page*9),total:items.length,page,pageSize:9});}),
 http.get('/api/nfts/:id',({params})=>{const item=findNft(String(params.id));return item?HttpResponse.json(item):fail(404,'NFT não encontrado');}),
 http.get('/api/favorites',({request})=>{const user=auth(request);return user?HttpResponse.json(db().favorites[user.id]||[]):fail(401,'Faça login');}),
 http.post('/api/favorites/:id',({request,params})=>{const user=auth(request);if(!user)return fail(401,'Faça login');const id=String(params.id);if(!findNft(id))return fail(404,'NFT não encontrado');const favs=db().favorites[user.id]??=[];if(!favs.includes(id))favs.push(id);persist();return HttpResponse.json(favs);}),
 http.delete('/api/favorites/:id',({request,params})=>{const user=auth(request);if(!user)return fail(401,'Faça login');db().favorites[user.id]=(db().favorites[user.id]??[]).filter(id=>id!==params.id);persist();return HttpResponse.json(db().favorites[user.id]);}),
 http.get('/api/cart',({request})=>HttpResponse.json(cartFor(request))),
 http.post('/api/cart/items',async({request})=>{const {nftId,quantity,editionId=defaultEdition}=await request.json() as {nftId:string;quantity:number;editionId?:EditionId};const nft=findNft(nftId);if(!nft)return fail(404,'NFT não encontrado');const offer=findEdition(nftId,editionId);if(!offer)return fail(422,'Edição inválida');if(!Number.isInteger(quantity)||quantity<1)return fail(422,'Quantidade inválida');const cart=cartFor(request);const item=cart.items.find(i=>i.nftId===nftId&&(i.editionId??defaultEdition)===editionId);if((item?.quantity??0)+quantity>offer.stock)return fail(409,'Quantidade indisponível');if(item)item.quantity+=quantity;else cart.items.push({nftId,editionId,quantity});persist();return HttpResponse.json(cart);}),
 http.patch('/api/cart/items/:id',async({request,params})=>{const {quantity,editionId=defaultEdition}=await request.json() as {quantity:number;editionId?:EditionId};const cart=cartFor(request);const item=cart.items.find(i=>i.nftId===params.id&&(i.editionId??defaultEdition)===editionId);if(!item)return fail(404,'Item não encontrado');if(!Number.isInteger(quantity)||quantity<1)return fail(422,'Quantidade inválida');if(quantity>(findEdition(item.nftId,editionId)?.stock??0))return fail(409,'Estoque insuficiente');item.quantity=quantity;persist();return HttpResponse.json(cart);}),
 http.delete('/api/cart/items/:id',({request,params})=>{const editionId=new URL(request.url).searchParams.get('editionId')??defaultEdition;const cart=cartFor(request);cart.items=cart.items.filter(i=>!(i.nftId===params.id&&(i.editionId??defaultEdition)===editionId));persist();return HttpResponse.json(cart);}),
 http.put('/api/cart/coupon',async({request})=>{const {coupon}=await request.json() as {coupon:string|null};if(coupon&&coupon!=='SAVE10')return fail(422,'Cupom inválido ou expirado');const cart=cartFor(request);cart.coupon=coupon;persist();return HttpResponse.json(cart);}),
 http.post('/api/quote',({request})=>{const q=quoteFor(cartFor(request));return q instanceof HttpResponse?q:HttpResponse.json(q);}),
 http.get('/api/wallets',({request})=>{const user=auth(request);return user?HttpResponse.json(db().wallets[user.id]||[]):fail(401,'Faça login');}),
 http.post('/api/wallets',async({request})=>{const user=auth(request);if(!user)return fail(401,'Faça login');const body=await request.json() as Omit<Wallet,'id'>;if(!/^0x[a-fA-F0-9]{40}$/.test(body.address)||!body.label?.trim()||!['Ethereum','Polygon'].includes(body.network))return fail(422,'Carteira inválida');const wallets=db().wallets[user.id]??=[];if(wallets.some(w=>w.address.toLowerCase()===body.address.toLowerCase()))return fail(409,'Carteira já cadastrada');if(body.primary)wallets.forEach(w=>w.primary=false);const result={...body,id:crypto.randomUUID(),primary:wallets.length===0||body.primary};wallets.push(result);db().wallets[user.id]=wallets;persist();return HttpResponse.json(result,{status:201});}),
 http.put('/api/wallets/:id',async({request,params})=>{const user=auth(request);if(!user)return fail(401,'Faça login');const wallets=db().wallets[user.id]??[];const target=wallets.find(w=>w.id===params.id);if(!target)return fail(404,'Carteira não encontrada');const body=await request.json() as Omit<Wallet,'id'>;if(!/^0x[a-fA-F0-9]{40}$/.test(body.address)||!body.label?.trim()||!['Ethereum','Polygon'].includes(body.network))return fail(422,'Carteira inválida');if(wallets.some(w=>w.id!==target.id&&w.address.toLowerCase()===body.address.toLowerCase()))return fail(409,'Endereço já cadastrado');if(body.primary)wallets.forEach(w=>w.primary=false);Object.assign(target,body);if(!wallets.some(w=>w.primary))target.primary=true;persist();return HttpResponse.json(target);}),
 http.put('/api/profile',async({request})=>{const user=auth(request);if(!user)return fail(401,'Faça login');const body=await request.json() as {name:string;avatar:string;email?:string;username?:string;ens?:string;walletAlias?:string};if(!body.name?.trim())return fail(422,'Nome obrigatório');if(body.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))return fail(422,'E-mail inválido');if(body.email&&db().users.some(u=>u.id!==user.id&&u.email.toLowerCase()===body.email?.toLowerCase()))return fail(409,'E-mail já cadastrado');const record=db().users.find(u=>u.id===user.id)!;record.name=body.name.trim();record.avatar=body.avatar||'';if(body.email)record.email=body.email.trim();record.username=body.username?.trim()??record.username;record.ens=body.ens?.trim()??record.ens;record.walletAlias=body.walletAlias?.trim()??record.walletAlias;persist();return HttpResponse.json(userSafe(record));}),
 http.post('/api/profile/password',async({request})=>{const user=auth(request);if(!user)return fail(401,'Faça login');const body=await request.json() as {current:string;next:string};const record=db().users.find(u=>u.id===user.id)!;if(record.passwordHash!==await hashPassword(body.current??''))return fail(422,'Senha atual incorreta');if(!body.next||body.next.length<8)return fail(422,'Nova senha deve ter ao menos 8 caracteres');record.passwordHash=await hashPassword(body.next);persist();return HttpResponse.json({ok:true});}),
 http.post('/api/orders',async({request})=>{const user=auth(request);if(!user)return fail(401,'Faça login');const key=request.headers.get('Idempotency-Key');if(!key)return fail(422,'Chave de idempotência obrigatória');const {quoteId,walletId}=await request.json() as {quoteId:string;walletId:string};const signature=JSON.stringify({quoteId,walletId});const scope=`${user.id}:${key}`;const existing=db().idempotency[scope];if(existing){if(existing.signature!==signature)return fail(409,'Chave reutilizada com conteúdo diferente');return HttpResponse.json(reconcile(db().orders[existing.orderId]));}
  const quote=db().quotes[quoteId];if(!quote)return fail(404,'Cotação inexistente');if(!db().wallets[user.id]?.some(w=>w.id===walletId))return fail(422,'Selecione uma carteira cadastrada');const invalid=errorForQuote(quote);if(invalid)return fail(409,invalid);
  const order:Order={id:crypto.randomUUID(),userId:user.id,status:'pending',createdAt:Date.now(),quote,walletId,key,signature};db().orders[order.id]=order;db().idempotency[scope]={signature,orderId:order.id};persist();setTimeout(()=>reconcile(order),2400);
  if(localStorage.getItem('nft-scenario')==='timeout')return fail(504,'Timeout após criação do pedido. Recupere usando a mesma chave.');return HttpResponse.json(order,{status:202});
 }),
 http.get('/api/orders/by-key/:key',({request,params})=>{const user=auth(request);if(!user)return fail(401,'Faça login');const recorded=db().idempotency[`${user.id}:${params.key}`];if(!recorded)return fail(404,'Tentativa não encontrada');return HttpResponse.json(reconcile(db().orders[recorded.orderId]));}),
 http.get('/api/orders/:id',({request,params})=>{const user=auth(request);if(!user)return fail(401,'Faça login');const order=db().orders[String(params.id)];return order&&order.userId===user.id?HttpResponse.json(reconcile(order)):fail(404,'Pedido inexistente');}),
 http.post('/api/demo/price/:id',({params})=>{const item=findNft(String(params.id));if(!item)return fail(404,'NFT não encontrado');item.priceEth=fromWei(toWei(item.priceEth)+toWei('0.01'));const standard=item.editions.find(e=>e.id===defaultEdition);if(standard)standard.priceEth=item.priceEth;item.version++;persist();publishNft(item);return HttpResponse.json(item);}),
 // Deterministic MSW scenario used to exercise token expiry during checkout.
 http.post('/api/demo/expire-session',({request})=>{
  const token=request.headers.get('Authorization')?.replace(/^Bearer /,'');
  if(!token||!db().sessions[token])return fail(401,'Sessão inexistente');
  db().sessions[token].expiresAt=Date.now()-1000;
  persist();
  return HttpResponse.json({ok:true});
 }),
 http.post('/api/demo/reset',()=>{reset();return HttpResponse.json({ok:true});})
];
