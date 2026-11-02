import {DetailSkeleton} from './detail-skeleton';
import React from 'react';
import {createRoot} from 'react-dom/client';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {createRootRoute,createRoute,createRouter,RouterProvider} from '@tanstack/react-router';
import {Home,Market,Layout,NotFound} from './pages';
import './styles.css';
const LoginPage = React.lazy(() => import('./auth-pages').then(m => ({default: m.LoginPage})));
const RegisterPage = React.lazy(() => import('./auth-pages').then(m => ({default: m.RegisterPage})));
function LoginRoute(){return <React.Suspense fallback={<div role="status" className="panel">Carregando...</div>}><LoginPage/></React.Suspense>}
function RegisterRoute(){return <React.Suspense fallback={<div role="status" className="panel">Carregando...</div>}><RegisterPage/></React.Suspense>}

const ProfilePage = React.lazy(() => import('./account-pages').then(m => ({default: m.ProfilePage})));
const WalletsPage = React.lazy(() => import('./account-pages').then(m => ({default: m.WalletsPage})));
function ProfileRoute(){return <React.Suspense fallback={<div role="status" className="panel">Carregando...</div>}><ProfilePage/></React.Suspense>}
function WalletsRoute(){return <React.Suspense fallback={<div role="status" className="panel">Carregando...</div>}><WalletsPage/></React.Suspense>}

const CartPage = React.lazy(() => import('./commerce-pages').then(m => ({default: m.CartPage})));
const CheckoutPage = React.lazy(() => import('./commerce-pages').then(m => ({default: m.CheckoutPage})));
const OrderPage = React.lazy(() => import('./commerce-pages').then(m => ({default: m.OrderPage})));
function CartRoute(){return <React.Suspense fallback={<div role="status" className="panel">Carregando...</div>}><CartPage/></React.Suspense>}
function CheckoutRoute(){return <React.Suspense fallback={<div role="status" className="panel">Carregando...</div>}><CheckoutPage/></React.Suspense>}
function OrderRoute(){return <React.Suspense fallback={<div role="status" className="panel">Carregando...</div>}><OrderPage/></React.Suspense>}

const Detail = React.lazy(() =>
  import('./detail-pages').then(m => ({default: m.Detail}))
);

function DetailRoute(){
  return <React.Suspense
    fallback={<DetailSkeleton/>}
  >
    <Detail/>
  </React.Suspense>;
}

const root=createRootRoute({component:Layout,notFoundComponent:NotFound});
const index=createRoute({getParentRoute:()=>root,path:'/',component:Home,validateSearch:(s:Record<string,unknown>)=>({q:typeof s.q==='string'?s.q:'',category:typeof s.category==='string'?s.category:'all',sort:s.sort==='price_asc'||s.sort==='price_desc'||s.sort==='newest'?s.sort:'popular',page:Math.max(1,Number(s.page)||1),maxPrice:typeof s.maxPrice==='string'?s.maxPrice:'',network:typeof s.network==='string'?s.network:'all'})});
const market=createRoute({getParentRoute:()=>root,path:'/market',component:Market,validateSearch:(s:Record<string,unknown>)=>({q:typeof s.q==='string'?s.q:'',category:typeof s.category==='string'?s.category:'all',sort:s.sort==='price_asc'||s.sort==='price_desc'||s.sort==='newest'?s.sort:'popular',page:Math.max(1,Number(s.page)||1),maxPrice:typeof s.maxPrice==='string'?s.maxPrice:'',network:typeof s.network==='string'?s.network:'all'})});
const detail=createRoute({getParentRoute:()=>root,path:'/nfts/$nftId',component:DetailRoute});
const cart=createRoute({getParentRoute:()=>root,path:'/cart',component:CartRoute});
const checkout=createRoute({getParentRoute:()=>root,path:'/checkout',component:CheckoutRoute});
const order=createRoute({getParentRoute:()=>root,path:'/orders/$orderId',component:OrderRoute});
const login=createRoute({getParentRoute:()=>root,path:'/login',component:LoginRoute});
const register=createRoute({getParentRoute:()=>root,path:'/register',component:RegisterRoute});
const profile=createRoute({getParentRoute:()=>root,path:'/profile',component:ProfileRoute});
const wallets=createRoute({getParentRoute:()=>root,path:'/wallets',component:WalletsRoute});
const routeTree=root.addChildren([index,market,detail,cart,checkout,order,login,register,profile,wallets]);
const router=createRouter({routeTree,defaultPreload:'intent'});
declare module '@tanstack/react-router'{interface Register{router:typeof router}}
const qc=new QueryClient({defaultOptions:{queries:{staleTime:15000,retry:(count,error)=>count<1 && ![400,401,403,404,409,422].includes((error as {response?:{status:number}}).response?.status??0)}}});
// Never leave a silent blank page when the MSW initialization fails.
function showStartupError(error: unknown) {
  console.error('[Kurio] Falha ao inicializar a aplicação:', error);
  const target = document.getElementById('root');
  if (!target) return;
  const panel = document.createElement('main');
  panel.style.cssText = 'max-width:650px;margin:12vh auto;padding:28px;color:#f4e6dc;background:#271712;font:16px monospace;border:1px solid #d38c4a;border-radius:12px';
  const heading = document.createElement('h1');
  heading.textContent = 'Não foi possível iniciar o Kurio';
  const detail = document.createElement('p');
  detail.textContent = 'Abra F12 > Console para ver o erro. Confira também public/mockServiceWorker.js e a configuração VITE_ENABLE_MSW.';
  const message = document.createElement('pre');
  message.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;color:#e8a35c';
  message.textContent = error instanceof Error ? error.message : String(error);
  panel.append(heading,detail,message);
  target.replaceChildren(panel);
}

async function boot() {
  if (import.meta.env.VITE_ENABLE_MSW !== 'false') {
    const { worker } = await import('./mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
  }
  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={qc}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </React.StrictMode>
  );
}
void boot().catch(showStartupError);
