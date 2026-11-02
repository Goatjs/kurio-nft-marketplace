import type {
  Cart,CatalogFilters,CatalogResult,EditionId,Nft,Order,Quote,User,Wallet
} from './contracts';
import axios, {
  type AxiosRequestConfig,
  type AxiosResponse
} from 'axios';

type RequestOptions = Pick<
  AxiosRequestConfig,
  'params' | 'signal' | 'headers'
>;

const client = axios.create({
  baseURL: '/api',
  timeout: 8000
});

client.interceptors.request.use(config => {
  const token = localStorage.getItem('nft-token');

  if (token) {
    config.headers.set('Authorization', 'Bearer ' + token);
  }

  return config;
});

client.interceptors.response.use(
  response => response,
  error => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const path = error.config?.url ?? '';
      const sentAuth = error.config?.headers?.get('Authorization');
      const currentToken = localStorage.getItem('nft-token');

      if (
        currentToken &&
        sentAuth === 'Bearer ' + currentToken &&
        path !== '/login' &&
        path !== '/register'
      ) {
        const current = window.location.pathname + window.location.search;

        if (
          (window.location.pathname === '/checkout' ||
           window.location.pathname.startsWith('/orders/')) &&
          !sessionStorage.getItem('kurio-return')
        ) {
          sessionStorage.setItem('kurio-return', current);
        }

        sessionStorage.setItem('kurio-session-expired', '1');
        localStorage.removeItem('nft-token');
        window.dispatchEvent(new Event('kurio-session-expired'));

        if (
          window.location.pathname === '/checkout' ||
          window.location.pathname.startsWith('/orders/')
        ) {
          window.location.replace(current);
        }
      }
    }

    return Promise.reject(error);
  }
);

export const httpClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    client.get<T>(path, options),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    client.post<T>(path, body, options),

  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    client.put<T>(path, body, options),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    client.patch<T>(path, body, options),

  delete: <T>(path: string, options?: RequestOptions) =>
    client.delete<T>(path, options)
};

const data = <T,>(p: Promise<AxiosResponse<T>>): Promise<T> =>
  p.then(result => result.data);

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
