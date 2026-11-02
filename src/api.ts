import type {
  Cart,CatalogFilters,CatalogResult,EditionId,Nft,Order,Quote,User,Wallet
} from './contracts';

type RequestOptions = {
  params?: object;
  signal?: AbortSignal;
  headers?: Record<string,string>;
};

type HttpResult<T> = {data:T};

type HttpError = Error & {
  response?: {status:number;data:unknown};
};

async function request<T>(
  method:string,
  path:string,
  body?:unknown,
  options:RequestOptions={}
):Promise<HttpResult<T>> {
  const params = new URLSearchParams();

  for (const [key,value] of Object.entries(options.params??{})) {
    if (value !== null && value !== undefined) {
      params.append(key,String(value));
    }
  }

  const query = params.toString();
  const url = '/api' + path + (query ? '?' + query : '');

  const controller = new AbortController();
  const onAbort = () => controller.abort();

  if (options.signal?.aborted) controller.abort();
  options.signal?.addEventListener('abort',onAbort,{once:true});

  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  },8000);

  const token = localStorage.getItem('nft-token');
  const sentAuth = token ? 'Bearer ' + token : null;
  const headers:Record<string,string> = {...options.headers};

  if (sentAuth) headers.Authorization = sentAuth;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  try {
    const response = await fetch(url,{
      method,
      headers,
      signal:controller.signal,
      ...(body === undefined ? {} : {body:JSON.stringify(body)})
    });

    const raw = await response.text();
    let payload:unknown = raw;

    if (raw) {
      try {
        payload = JSON.parse(raw);
      } catch {
        payload = raw;
      }
    }

    if (!response.ok) {
      if (
        response.status === 401 &&
        sentAuth &&
        sentAuth === 'Bearer ' + localStorage.getItem('nft-token') &&
        path !== '/login' &&
        path !== '/register'
      ) {
        const current = window.location.pathname+window.location.search;

        if (
          (window.location.pathname === '/checkout' ||
           window.location.pathname.startsWith('/orders/')) &&
          !sessionStorage.getItem('kurio-return')
        ) {
          sessionStorage.setItem('kurio-return',current);
        }

        sessionStorage.setItem('kurio-session-expired','1');
        localStorage.removeItem('nft-token');
        window.dispatchEvent(new Event('kurio-session-expired'));

        if (
          window.location.pathname === '/checkout' ||
          window.location.pathname.startsWith('/orders/')
        ) {
          window.location.replace(current);
        }
      }

      const error = new Error(
        'Request failed with status code ' + response.status
      ) as HttpError;

      error.response = {
        status:response.status,
        data:payload
      };

      throw error;
    }

    return {data:payload as T};
  } catch (error) {
    if (timedOut) {
      throw new Error('timeout of 8000ms exceeded');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort',onAbort);
  }
}

export const httpClient = {
  get:<T>(path:string,options?:RequestOptions)=>
    request<T>('GET',path,undefined,options),

  post:<T>(path:string,body?:unknown,options?:RequestOptions)=>
    request<T>('POST',path,body,options),

  put:<T>(path:string,body?:unknown,options?:RequestOptions)=>
    request<T>('PUT',path,body,options),

  patch:<T>(path:string,body?:unknown,options?:RequestOptions)=>
    request<T>('PATCH',path,body,options),

  delete:<T>(path:string,options?:RequestOptions)=>
    request<T>('DELETE',path,undefined,options)
};

const data = <T,>(p:Promise<HttpResult<T>>):Promise<T> =>
  p.then(result=>result.data);

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
