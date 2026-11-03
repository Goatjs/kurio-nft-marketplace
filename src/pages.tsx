import {useRef,useState} from 'react';
import {Link,Outlet,useNavigate,useRouterState,useSearch} from '@tanstack/react-router';
import {useMutation,useQueries,useQuery,useQueryClient} from '@tanstack/react-query';
import {Heart,Home as HomeIcon,Search,ShoppingCart,SlidersHorizontal,UserRound,LogOut} from 'lucide-react';
import {api} from './api';
import type {Cart,CatalogFilters,EditionId,Nft} from './contracts';
import {formatEth} from './lib/money';
import {Button} from './components/ui/button';
import {LiveState,useSession} from './state';

// TanStack Router requires complete validated search params for links to catalogue routes.
export const defaultCatalogSearch = {q:'',category:'all',sort:'popular',page:1,maxPrice:'',network:'all'} as const;
const categories=[['Arte digital',33],['Fotografia',12],['Música',65],['Arte 3D',39],['Colecionáveis',23],['Generativa',17],['Jogos',19],['Assinaturas',13],['Utilidade',18]] as const;
const networks=[['Ethereum',119],['Polygon',78],['Solana',86]] as const;
export function Loading({count=3}:{count?:number}){return <div className="grid-nfts" aria-label="Carregando conteúdo" role="status">{Array.from({length:count},(_,i)=><div className="skeleton" key={i} aria-hidden="true"/>)}</div>}
export function Feedback({message}:{message:string}){return <p role="alert" className="error">{message}</p>}
export function useCart(){const {data:user}=useSession();return useQuery({queryKey:['cart',user?.id??'guest'],queryFn:api.cart});}
export function priceFor(nft:Nft|undefined,editionId:EditionId|undefined){return nft?.editions.find(e=>e.id===(editionId??'1/50'))?.priceEth??nft?.priceEth;}
export function useCartNfts(cart:Cart|undefined){return useQueries({queries:(cart?.items??[]).map(item=>({queryKey:['nft',item.nftId],queryFn:()=>api.nft(item.nftId),retry:false,staleTime:20000}))});}
export function Required({children}:{children:React.ReactNode}){const {data:user,isPending}=useSession();if(isPending)return <Loading count={1}/>;if(!user)return <section className="panel" style={{margin:'70px auto',maxWidth:500,textAlign:'center'}}><h1 className="section-title">Entre para continuar</h1><p className="note" style={{margin:'16px 0'}}>{sessionStorage.getItem('kurio-session-expired')==='1'?'Sua sessão expirou. Entre novamente para continuar de onde parou. Seu carrinho permanece salvo na sua conta.':'Para acessar essa área, faça login. Seu carrinho será preservado.'}</p><Link className="btn" to="/login" onClick={()=>sessionStorage.setItem('kurio-return',window.location.pathname+window.location.search)}>Entrar</Link></section>;return <>{children}</>}

function Footer(){return <footer className="site-footer"><div className="shell footer-feature"><div><div className="footer-disc">W</div><h3>Segurança da carteira</h3><p>Proteja sua carteira e colecione arte digital verificada com confiança.</p></div><div><div className="footer-disc">C</div><h3>Criadores em destaque</h3><p>Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.</p></div><div><div className="footer-disc">D</div><h3>Alertas de lançamentos</h3><p>Receba calendários de cunhagem, novidades de listas de acesso e análises de mercado.</p></div><div><h3>Antecipe-se ao próximo lançamento</h3><div className="newsletter-input"><input aria-label="E-mail para newsletter" placeholder="digite seu e-mail..." disabled/><button disabled title="Fora do escopo do challenge">Enviar</button></div><p>Receba lançamentos selecionados, histórias de criadores e novidades do mercado.</p></div></div><div className="footer-band"><div className="shell"><b>KURIO</b><span>Feito para colecionadores,<br/>criadores e cultura</span><span>contato@email.com</span><span>+55 11 4002 8922</span></div></div><div className="shell footer-grid"><div><h3>Meu perfil</h3><p><Link to="/profile">Meu perfil</Link></p><p>Minha coleção</p><p>Atividade</p><p>Estúdio do criador</p><p>Lista de interesse</p></div><div><h3>Central de ajuda</h3><p>Central de ajuda</p><p>Como comprar NFTs</p><p>Carteira e segurança</p><p>Política do mercado</p></div><div><h3>Coleções</h3>{categories.slice(0,5).map(([c])=><p key={c}>{c}</p>)}</div><div><h3>Redes sociais</h3><p>Instagram · X · YouTube</p><h3 style={{marginTop:20}}>Carteiras compatíveis</h3><p>METAMASK · WALLETCONNECT · COINBASE</p></div></div><p className="copyright">© 2026 Kurio. Propriedade digital para todos.</p></footer>}
function Header(){const {data:user}=useSession();const cart=useCart();const navigate=useNavigate();const pathname=useRouterState({select:s=>s.location.pathname});const [showSearch,setShowSearch]=useState(false);const [term,setTerm]=useState('');const searchTrigger=useRef<HTMLButtonElement>(null);const count=cart.data?.items.reduce((s,i)=>s+i.quantity,0)??0;return <><header className="site-header"><div className="site-header-inner shell"><Link className="brand" to="/" search={defaultCatalogSearch}>KURIO</Link><nav className="top-nav" aria-label="Menu principal"><Link
  to="/"
  className={pathname === '/' ? 'active' : ''}
  aria-current={pathname === '/' ? 'page' : undefined}
  search={defaultCatalogSearch}
>
  Início
</Link><Link
  to="/market"
  className={
    pathname.includes('market') || pathname.includes('nfts')
      ? 'active'
      : ''
  }
  aria-current={
    pathname.includes('market') || pathname.includes('nfts')
      ? 'page'
      : undefined
  }
  search={defaultCatalogSearch}
>
  Mercado
</Link><span aria-disabled="true">Criadores</span><span aria-disabled="true">Aprenda</span></nav><div className="header-actions"><button ref={searchTrigger} type="button" aria-label="Pesquisar NFTs" aria-expanded={showSearch} aria-controls={showSearch?"kurio-header-search":undefined} className="icon-btn" onClick={()=>setShowSearch(v=>!v)}><Search size={21}/></button><Link aria-label={`Carrinho com ${count} NFTs`} className="icon-link" to="/cart"><ShoppingCart size={21}/>{count>0&&<span className="cart-bubble">{count}</span>}</Link>{user?<Link to="/profile" className="btn small"><UserRound size={15}/> Perfil</Link>:<Link to="/login" className="btn small"><LogOut size={15}/> Entrar</Link>}</div></div></header>{showSearch&&<form id="kurio-header-search" role="search" aria-label="Busca rápida de NFTs" className="shell search-inline" onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();setShowSearch(false);searchTrigger.current?.focus()}}} onSubmit={e=>{e.preventDefault();void navigate({to:'/',search:{...defaultCatalogSearch,q:term}});setShowSearch(false)}}><Search size={18}/><input autoFocus type="search" value={term} onChange={e=>setTerm(e.target.value)} placeholder="Explore os NFTs..." aria-label="Pesquisar no catálogo"/><Button type="submit" className="small">Buscar</Button></form>}</>}
function MobileBar(){const pathname=useRouterState({select:s=>s.location.pathname});const cart=useCart();const count=cart.data?.items.reduce((s,i)=>s+i.quantity,0)??0;return <nav className="mobile-bar" aria-label="Navegação mobile"><Link aria-label="Início" aria-current={pathname==='/'?'page':undefined} className={pathname==='/'?'active':''} to="/" search={defaultCatalogSearch}><HomeIcon size={23} fill={pathname==='/'?'currentColor':'none'}/></Link><Link aria-label="Mercado e favoritos" aria-current={pathname==='/market'||pathname.startsWith('/nfts/')?'page':undefined} to="/market" search={defaultCatalogSearch}><Heart size={23}/></Link><Link aria-label={`Carrinho com ${count} NFTs`} aria-current={pathname==='/cart'?'page':undefined} className={pathname==='/cart'?'active':''} to="/cart"><ShoppingCart size={23}/>{count>0&&<span className="cart-bubble">{count}</span>}</Link><Link aria-label="Perfil" aria-current={pathname==='/profile'?'page':undefined} className={pathname.includes('profile')?'active':''} to="/profile"><UserRound size={23}/></Link></nav>}

export function Layout() {
  return (
    <>
      <LiveState />
      <a className="skip-link" href="#conteudo-principal">
        Pular para o conteúdo
      </a>
      <Header />
      <main
        id="conteudo-principal"
        className="shell page"
        tabIndex={-1}
      >
        <Outlet />
      </main>
      <Footer />
      <MobileBar />
    </>
  );
}


export function Favorite({id,className=''}:{id:string;className?:string}){const {data:user}=useSession();const qc=useQueryClient();const navigate=useNavigate();const key=['favorites',user?.id];const {data:favs=[]}=useQuery({queryKey:key,queryFn:api.favorites,enabled:!!user});const liked=favs.includes(id);const m=useMutation({mutationFn:()=>api.favorite(id,!liked),onMutate:async()=>{await qc.cancelQueries({queryKey:key});const before=qc.getQueryData<string[]>(key);qc.setQueryData<string[]>(key,(v=[])=>liked?v.filter(x=>x!==id):[...v,id]);return {before}},onError:(_e,_v,ctx)=>{qc.setQueryData(key,ctx?.before)},onSettled:()=>qc.invalidateQueries({queryKey:key})});return <button className={`card-fav ${className}`} aria-label={liked?'Remover dos favoritos':'Adicionar aos favoritos'} aria-pressed={liked} disabled={m.isPending} onClick={e=>{e.preventDefault();e.stopPropagation();if(user){m.mutate()}else{sessionStorage.setItem('kurio-return',window.location.pathname+window.location.search);void navigate({to:'/login'})}}}><Heart size={18} fill={liked?'currentColor':'none'}/></button>}
function NftCard({nft}:{nft:Nft}){return <article className="nft-card"><div className="art-wrap"><Link to="/nfts/$nftId" params={{nftId:nft.id}} aria-label={`Ver ${nft.title}`}><img className="art" src={nft.image} alt={`Retrato do NFT ${nft.title}`} loading="lazy" decoding="async" width="300" height="300"/></Link>{nft.edition==='Rare'&&<span className="tag-rare">RARO</span>}<Favorite id={nft.id}/></div><Link to="/nfts/$nftId" params={{nftId:nft.id}}><h3>{nft.title}</h3></Link><p className="price">{formatEth(nft.priceEth)}</p></article>}
function Catalog({mode='home'}:{mode?:'home'|'market'}){const route=mode==='home'?'/':'/market';const search=useSearch({strict:false}) as CatalogFilters;const navigate=useNavigate();const filters:Required<CatalogFilters>={q:search.q||'',category:search.category||'all',sort:search.sort||'popular',page:search.page||1,maxPrice:search.maxPrice||'',network:search.network||'all'};const [localPrice,setLocalPrice]=useState(12.3);const [mobileFilters,setMobileFilters]=useState(false);const [showSearch,setShowSearch]=useState(false);const filtersTrigger=useRef<HTMLButtonElement>(null);const {data,isPending,isFetching,isError,refetch}=useQuery({queryKey:['catalog',filters],queryFn:({signal})=>api.catalog(filters,signal),placeholderData:prev=>prev});const update=(next:Partial<CatalogFilters>)=>void navigate({to:route,search:{...filters,...next,page:next.page??1}});const category=(name:string)=>update({category:name});return <>
<div className="mobile-search"><div className="search-inline"><Search size={17} color="#b99a75"/><input type="search" aria-label="Explorar coleções" placeholder="Explorar coleções" value={filters.q} onChange={e=>update({q:e.target.value})}/></div><button ref={filtersTrigger} type="button" aria-label="Abrir filtros" aria-expanded={mobileFilters} aria-controls={mobileFilters?"mobile-filter-panel":undefined} className="icon-btn" onClick={()=>setMobileFilters(v=>!v)}><SlidersHorizontal size={20}/></button></div>
{mode==='home'&&<section className="hero" aria-label="Destaque Kurio"><div className="hero-text"><span className="kicker">Bem-vindo à Kurio</span><h1><span className="phase9f-desktop-heading">SEJA DONO DO FUTURO<br/>DA ARTE DIGITAL</span><span className="phase9f-mobile-heading">SEJA DONO DA<br/>CULTURA DIGITAL</span></h1><p><span className="phase9f-desktop-summary">Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.</span><span className="phase9f-mobile-summary">Descubra NFTs selecionados de criadores do mundo todo.</span></p><a className="btn" href="#catalogo">EXPLORAR</a></div><div className="phase9f-hero-art"><img className="hero-figure" src="/assets/emerald.webp" alt="NFT Emerald Ape com óculos verdes"/><img className="phase9f-hero-overlay" src="/assets/sage.webp" alt="" aria-hidden="true"/><div className="hero-dots">●●●</div></div></section>}
<section className="catalog-shell" id="catalogo"><aside className="filter-column"><div className="filter-block"><h2>Coleções</h2>{categories.map(([label, count]) => (
  <button
    key={label}
    type="button"
    className={`filter-option ${filters.category === label ? 'selected' : ''}`}
    aria-pressed={filters.category === label}
    onClick={() => category(filters.category === label ? 'all' : label)}
  >
    <span>{label}</span>
    <span>({count})</span>
  </button>
))}<h3>Faixa de preço</h3><input className="filter-range" aria-label="Preço máximo" type="range" min="0.02" max="12.30" step="0.01" value={localPrice} onChange={e=>setLocalPrice(+e.target.value)}/><p className="small-copy muted">Preço: 0,02 – {localPrice.toFixed(2).replace('.',',')} ETH</p><button className="btn small" type="button" onClick={()=>update({maxPrice:localPrice>=12.3?'':localPrice.toFixed(2)})}>Aplicar</button><h3>Rede</h3>
{networks.map(([network, count]) => (
  <button
    key={network}
    type="button"
    className={`filter-option ${filters.network === network ? 'selected' : ''}`}
    aria-pressed={filters.network === network}
    onClick={() =>
      update({
        network: filters.network === network ? 'all' : network,
      })
    }
  >
    <span>{network}</span>
    <span>({count})</span>
  </button>
))}</div><div className="feature-tile"><strong>NFT EM DESTAQUE</strong><p style={{fontWeight:700,fontSize:13}}>OFERTA LIMITADA</p><img src="/assets/sage.webp" alt="Sage Nomad, NFT em destaque" loading="lazy" decoding="async"/></div></aside>
<div className="catalog-main">{mode==='market'&&<div className="crumb">Início / Mercado</div>}
<div className="catalog-bar"><div className="catalog-tabs">
  <button type="button" className={`catalog-tab ${filters.sort==='popular'?'on':''}`} aria-pressed={filters.sort==='popular'} onClick={()=>update({sort:'popular'})}>Todos os NFTs</button>
  <button type="button" className={`catalog-tab ${filters.sort==='newest'?'on':''}`} aria-pressed={filters.sort==='newest'} onClick={()=>update({sort:'newest'})}>Novos lançamentos</button>
  <button type="button" className={`catalog-tab ${filters.sort==='price_desc'?'on':''}`} aria-pressed={filters.sort==='price_desc'} onClick={()=>update({sort:'price_desc'})}>Em alta</button>
</div><label className="sort-control">Ordenar por:<select aria-label="Ordenar NFTs" value={filters.sort} onChange={e=>update({sort:e.target.value as CatalogFilters['sort']})}><option value="popular">Listados recentemente</option><option value="newest">Novos lançamentos</option><option value="price_asc">Menor preço</option><option value="price_desc">Maior preço</option></select></label></div>
{(mobileFilters || showSearch) && (
  <div className="mobile-filter-panel" id="mobile-filter-panel" role="region" aria-label="Filtros do catálogo" onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();setShowSearch(false);setMobileFilters(false);filtersTrigger.current?.focus()}}}>
    <div className="search-inline">
      <input
        aria-label="Buscar NFT"
        type="search"
        placeholder="Buscar NFT ou criador"
        value={filters.q}
        onChange={e => update({q: e.target.value})}
      />
    </div>

    <div className="mobile-filter-fields">
      <label>
        Coleção
        <select
          aria-label="Filtrar categoria"
          value={filters.category}
          onChange={e => category(e.target.value)}
        >
          <option value="all">Todas as coleções</option>
          {categories.map(([name]) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </label>

      <label>
        Rede
        <select
          aria-label="Filtrar rede"
          value={filters.network}
          onChange={e => update({network: e.target.value})}
        >
          <option value="all">Todas as redes</option>
          {networks.map(([name]) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </label>

      <label>
        Ordenação
        <select
          aria-label="Ordenar NFTs no mobile"
          value={filters.sort}
          onChange={e => update({
            sort: e.target.value as CatalogFilters['sort']
          })}
        >
          <option value="popular">Populares</option>
          <option value="newest">Novos lançamentos</option>
          <option value="price_asc">Menor preço</option>
          <option value="price_desc">Maior preço</option>
        </select>
      </label>
    </div>

    <button
      type="button"
      className="btn small"
      aria-label="Fechar filtros e pesquisa"
      onClick={() => {
        setShowSearch(false);
        setMobileFilters(false);
        filtersTrigger.current?.focus();
      }}
    >
      Fechar filtros
    </button>
  </div>
)}
<div role="status" aria-live="polite" className="small-copy muted" style={{margin:'-2px 0 12px'}}>{isFetching?'Atualizando catálogo…':data?`${data.total} NFTs encontrados`:''}</div>
{isError?<div className="panel"><Feedback message="Não foi possível carregar o catálogo."/><Button onClick={()=>void refetch()}>Tentar novamente</Button></div>:isPending?<Loading count={8}/>:data?.items.length?<div className="grid-nfts">{data.items.map(nft=><NftCard key={nft.id} nft={nft}/>)}</div>:<p className="panel">Nenhum NFT encontrado. Ajuste os filtros ou tente outro termo.</p>}
<nav className="page-numbers" aria-label="Paginação do catálogo"><button disabled={filters.page<=1} onClick={()=>update({page:filters.page-1})}>‹</button>{Array.from({length:Math.min(4,Math.max(1,Math.ceil((data?.total??0)/9)))},(_,i)=><button key={i} className={filters.page===i+1?'current':''} onClick={()=>update({page:i+1})}>{i+1}</button>)}<button disabled={!data||filters.page*9>=data.total} onClick={()=>update({page:filters.page+1})}>›</button></nav>
</div></section>{mode==='home'&&<><section className="promo-grid"><div className="promo-card"><img alt="Emerald Ape" src="/assets/emerald.webp" loading="lazy" decoding="async"/><div><strong>Lançamentos gênesis<br/>de edição limitada</strong><p>Colecione edições escassas diretamente dos criadores antes da revelação pública.</p><Link to="/market" className="btn small" search={defaultCatalogSearch}>Explorar →</Link></div></div><div className="promo-card"><img alt="Ivory Baron" src="/assets/ivory.webp" loading="lazy" decoding="async"/><div><strong>Arte digital selecionada<br/>e muito mais</strong><p>Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.</p><Link to="/market" className="btn small" search={defaultCatalogSearch}>Explorar →</Link></div></div></section><section className="editorial"><h2>Diário da Cunhagem</h2><p>Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.</p><div className="article-grid">{[['ivory','Como funciona a propriedade de NFTs'],['emerald','10 artistas digitais para acompanhar'],['sage','Raridade, atributos e procedência'],['golden','Como proteger sua carteira']].map(([image,title])=><article className="article-card" key={title}><img alt={`Arte de ${title}`} loading="lazy" decoding="async" src={`/assets/${image}.webp`}/><div className="article-body"><small>12 de setembro | Leitura de 6 min</small><h3>{title}</h3><p>Descubra mais sobre a cultura digital.</p></div></article>)}</div></section></>}
</>}
export function Home(){return <Catalog mode="home"/>}
export function Market(){return <Catalog mode="market"/>}

export function Related({exclude}:{exclude?:string}){const {data}=useQuery({queryKey:['related'],queryFn:()=>api.catalog({q:'',category:'all',sort:'popular',page:1})});return <div className="related-grid">{data?.items.filter(n=>n.id!==exclude).slice(0,5).map(n=><NftCard key={n.id} nft={n}/>)}</div>}

export function NotFound(){return <section className="panel" style={{marginTop:70}}><h1 className="section-title">Página não encontrada</h1><Link className="btn" to="/" search={defaultCatalogSearch}>Voltar para início</Link></section>}
