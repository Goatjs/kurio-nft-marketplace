import axios from 'axios';
import type {Cart, CatalogFilters,CatalogResult,EditionId,Nft,Order,Quote,User,Wallet} from './contracts';
export const httpClient=axios.create({baseURL:'/api',timeout:8000});
httpClient.interceptors.request.use(config=>{const token=localStorage.getItem('nft-token');if(token)config.headers.Authorization=`Bearer ${token}`;return config;});
// A 401 for the active token invalidates the session immediately, even if the session query is cached.
httpClient.interceptors.response.use(response=>response,(error:unknown)=>{
 if(axios.isAxiosError(error)&&error.response?.status===401){
  const path=error.config?.url??'';
  const token=localStorage.getItem('nft-token');
  const sentAuth=String(error.config?.headers?.Authorization??'');
  if(token&&sentAuth===`Bearer ${token}`&&path!=='/login'&&path!=='/register'){
   const current=window.location.pathname+window.location.search;
   if((window.location.pathname==='/checkout'||window.location.pathname.startsWith('/orders/'))&&!sessionStorage.getItem('kurio-return')){
    sessionStorage.setItem('kurio-return',current);
   }
   sessionStorage.setItem('kurio-session-expired','1');
   localStorage.removeItem('nft-token');
   window.dispatchEvent(new Event('kurio-session-expired'));
   // A checkout 401 must leave the sensitive payment screen, even when
   // React Query still holds a cached session for this render.
   if(window.location.pathname==='/checkout'||window.location.pathname.startsWith('/orders/')){
    window.location.replace(current);
   }
  }
 }
 return Promise.reject(error);
});
const data=<T,>(p:Promise<{data:T}>):Promise<T>=>p.then(r=>r.data);
export const api={
 session:()=>data(httpClient.get<User>('/session')),
 login:(email:string,password:string)=>data(httpClient.post<{token:string;user:User}>('/login',{email,password})),
 register:(name:string,email:string,password:string)=>data(httpClient.post<{token:string;user:User}>('/register',{name,email,password})),
 logout:()=>data(httpClient.post('/logout')),
 catalog:(filters:CatalogFilters,signal?:AbortSignal)=>data(httpClient.get<CatalogResult>('/nfts',{params:filters,signal})),
 nft:(id:string)=>data(httpClient.get<Nft>(`/nfts/${id}`)),
 favorites:()=>data(httpClient.get<string[]>('/favorites')),
 favorite:(id:string,active:boolean)=>data(active?httpClient.post(`/favorites/${id}`):httpClient.delete(`/favorites/${id}`)),
 cart:()=>data(httpClient.get<Cart>('/cart')),
 add:(nftId:string,quantity=1,editionId:EditionId='1/50')=>data(httpClient.post<Cart>('/cart/items',{nftId,quantity,editionId})),
 setQuantity:(nftId:string,quantity:number,editionId:EditionId='1/50')=>data(httpClient.patch<Cart>(`/cart/items/${nftId}`,{quantity,editionId})),
 remove:(nftId:string,editionId:EditionId='1/50')=>data(httpClient.delete<Cart>(`/cart/items/${nftId}`,{params:{editionId}})),
 coupon:(coupon:string|null)=>data(httpClient.put<Cart>('/cart/coupon',{coupon})),
 quote:()=>data(httpClient.post<Quote>('/quote')),
 placeOrder:(quoteId:string,walletId:string,key:string)=>data(httpClient.post<Order>('/orders',{quoteId,walletId},{headers:{'Idempotency-Key':key}})),
 order:(id:string)=>data(httpClient.get<Order>(`/orders/${id}`)),
 orderByKey:(key:string)=>data(httpClient.get<Order>(`/orders/by-key/${encodeURIComponent(key)}`)),
 profile:(dataIn:Partial<Pick<User,'name'|'avatar'|'username'|'email'|'ens'|'walletAlias'>>)=>data(httpClient.put<User>('/profile',dataIn)),
 changePassword:(current:string,next:string)=>data(httpClient.post('/profile/password',{current,next})),
 wallets:()=>data(httpClient.get<Wallet[]>('/wallets')),
 addWallet:(wallet:Omit<Wallet,'id'>)=>data(httpClient.post<Wallet>('/wallets',wallet)),
 updateWallet:(id:string,wallet:Omit<Wallet,'id'>)=>data(httpClient.put<Wallet>(`/wallets/${id}`,wallet)),
 demoChange:(id:string)=>data(httpClient.post<Nft>(`/demo/price/${id}`))
};
