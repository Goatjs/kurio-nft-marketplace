import React,{useEffect,useState} from 'react';
import {Link,useNavigate} from '@tanstack/react-router';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {UserRound,Wallet as WalletIcon,LogOut,ImageIcon} from 'lucide-react';
import {api} from './api';
import type {Wallet} from './contracts';
import {Button} from './components/ui/button';
import {Input} from './components/ui/input';
import {useSession,errorMessage} from './state';
import {clearIdentity} from './live';


const defaultCatalogSearch = {q:'',category:'all',sort:'popular',page:1,maxPrice:'',network:'all'} as const;

function Loading({count=3}:{count?:number}){return <div className="grid-nfts" aria-label="Carregando conteúdo" role="status">{Array.from({length:count},(_,i)=><div className="skeleton" key={i} aria-hidden="true"/>)}</div>}

function Feedback({message}:{message:string}){return <p role="alert" className="error">{message}</p>}

function Required({children}:{children:React.ReactNode}){const {data:user,isPending}=useSession();if(isPending)return <Loading count={1}/>;if(!user)return <section className="panel" style={{margin:'70px auto',maxWidth:500,textAlign:'center'}}><h1 className="section-title">Entre para continuar</h1><p className="note" style={{margin:'16px 0'}}>{sessionStorage.getItem('kurio-session-expired')==='1'?'Sua sessão expirou. Entre novamente para continuar de onde parou. Seu carrinho permanece salvo na sua conta.':'Para acessar essa área, faça login. Seu carrinho será preservado.'}</p><Link className="btn" to="/login" onClick={()=>sessionStorage.setItem('kurio-return',window.location.pathname+window.location.search)}>Entrar</Link></section>;return <>{children}</>}

function AccountShell({section,children}:{section:'profile'|'wallets';children:React.ReactNode}){const qc=useQueryClient();const navigate=useNavigate();return <div className="account-grid"><aside className="account-menu"><h2>Meu perfil</h2><Link className={section==='profile'?'active':''} to="/profile"><UserRound size={17}/>Dados do perfil</Link><Link className={section==='wallets'?'active':''} to="/wallets"><WalletIcon size={17}/>Carteiras</Link><span className="disabled-menu">Atividade</span><span className="disabled-menu">Lista de interesse</span><span className="disabled-menu">Ofertas</span><span className="disabled-menu">Arquivos baixados</span><button onClick={async()=>{await clearIdentity(qc);await navigate({to:'/',search:defaultCatalogSearch})}}><LogOut size={16}/>Sair</button></aside><section className="account-content">{children}</section></div>}
export function ProfilePage(){return <Required><Profile/></Required>}
function Profile(){
 const {data:user}=useSession();const qc=useQueryClient();
 const {data:profileData}=useQuery({queryKey:['profile',user?.id],queryFn:api.profileDetail,enabled:!!user,retry:false});
 const [name,setName]=useState(user?.name??'');const [email,setEmail]=useState(user?.email??'');
 const [username,setUsername]=useState(user?.username??'');const [ens,setEns]=useState(user?.ens??'');
 const [walletAlias,setWalletAlias]=useState(user?.walletAlias??'');const [avatar,setAvatar]=useState(user?.avatar??'');
 const [current,setCurrent]=useState('');const [next,setNext]=useState('');const [confirm,setConfirm]=useState('');
 const [passError,setPassError]=useState('');
 useEffect(()=>{const record=profileData??user;setName(record?.name??'');setEmail(record?.email??'');setUsername(record?.username??'');setEns(record?.ens??'');setWalletAlias(record?.walletAlias??'');setAvatar(record?.avatar??'')},[profileData,user]);
 const m=useMutation({mutationFn:()=>api.profile({name,email,username,ens,walletAlias,avatar}),onSuccess:updated=>{qc.setQueryData(['profile',updated.id],updated);void qc.invalidateQueries({queryKey:['session']})}});
 const pass=useMutation({mutationFn:()=>api.changePassword(current,next),onSuccess:()=>{setCurrent('');setNext('');setConfirm('')}});
 return <AccountShell section="profile"><h1>Perfil do colecionador</h1>
 <form onSubmit={e=>{e.preventDefault();m.mutate()}}>
  <div className="field-grid">
   <label className="field"><span>Nome de exibição *</span><Input required value={name} onChange={e=>setName(e.target.value)}/></label>
   <label className="field"><span>Nome de usuário *</span><Input required value={username} onChange={e=>setUsername(e.target.value)} placeholder="colecionador"/></label>
   <label className="field"><span>E-mail *</span><Input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
   <label className="field"><span>Nome ENS</span><Input value={ens} onChange={e=>setEns(e.target.value)} placeholder=".eth"/></label>
   <label className="field"><span>Apelido da carteira</span><Input value={walletAlias} onChange={e=>setWalletAlias(e.target.value)} placeholder="Principal"/></label>
   <label className="field"><span>Avatar</span><span className="row" style={{gap:12}}>{avatar?<img src={avatar} alt="Seu avatar" style={{width:45,height:45,objectFit:'cover',borderRadius:'50%'}}/>:<span className="footer-disc" style={{width:42,height:42,margin:0}}><ImageIcon size={16}/></span>}
    <Input aria-label="URL do avatar" value={avatar} onChange={e=>setAvatar(e.target.value)} placeholder="URL da imagem"/></span></label>
  </div>
  <Button type="submit" style={{marginTop:25}} disabled={m.isPending}>Salvar perfil</Button>
  {m.isSuccess&&<p role="status" className="success">Perfil atualizado com sucesso.</p>}{m.isError&&<Feedback message={errorMessage(m.error)}/>}
 </form>
 <form onSubmit={e=>{e.preventDefault();setPassError('');if(next!==confirm){setPassError('Confirmação de senha diferente.');return}pass.mutate()}}>
  <h2>Alterar senha</h2><div className="field-grid">
   <label className="field"><span>Senha atual</span><Input type="password" autoComplete="current-password" required value={current} onChange={e=>setCurrent(e.target.value)}/></label><span/>
   <label className="field"><span>Nova senha</span><Input type="password" autoComplete="new-password" required minLength={8} value={next} onChange={e=>setNext(e.target.value)}/></label><span/>
   <label className="field"><span>Confirmar nova senha</span><Input type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
  </div><Button type="submit" style={{marginTop:25}} disabled={pass.isPending}>Alterar senha</Button>
  {passError&&<Feedback message={passError}/>} {pass.isError&&<Feedback message={errorMessage(pass.error)}/>} {pass.isSuccess&&<p className="success" role="status">Senha alterada.</p>}
 </form>
 </AccountShell>
}
export function WalletsPage(){return <Required><Wallets/></Required>}
function Wallets(){
 const qc=useQueryClient();const {data:profileUser}=useSession();const {data:wallets=[],isPending}=useQuery({queryKey:['wallets'],queryFn:api.wallets});
 const [editId,setEditId]=useState<string|null>(null);const [label,setLabel]=useState('');const [address,setAddress]=useState('');const [network,setNetwork]=useState<Wallet['network']>('Ethereum');const [primary,setPrimary]=useState(false);
 const reset=()=>{setEditId(null);setLabel('');setAddress('');setNetwork('Ethereum');setPrimary(false)};
 const m=useMutation({mutationFn:()=>editId?api.updateWallet(editId,{label,address,network,primary}):api.addWallet({label,address,network,primary}),onSuccess:()=>{reset();void qc.invalidateQueries({queryKey:['wallets']})}});
 return <AccountShell section="wallets"><div className="phase9f-wallets-page"><div className="row phase9f-wallets-heading" style={{justifyContent:'space-between'}}><h1>Carteira principal</h1><button className="text-link" type="button" onClick={reset}>Adicionar</button></div>
 <p className="note phase9f-wallets-description">Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p>
 <form className="phase9f-wallets-form" onSubmit={e=>{e.preventDefault();m.mutate()}}>
 <p className="note phase9f-wallet-readonly-help" id="phase9f-wallet-help">Os dados do perfil são apenas informativos nesta tela. Para alterá-los, acesse Dados do perfil.</p>
 <div className="field-grid">
 <div className="field phase9f-profile-info"><span>Nome de exibição</span><div className="phase9f-profile-value">{profileUser?.name || 'Não informado'}</div></div>
 <label className="field"><span>Apelido da carteira *</span><Input required value={label} onChange={e=>setLabel(e.target.value)} placeholder="Minha carteira"/></label>
 <label className="field"><span>Rede *</span><select value={network} onChange={e=>setNetwork(e.target.value as Wallet['network'])}><option>Ethereum</option><option>Polygon</option></select></label>
 <div className="field phase9f-profile-info"><span>Nome do perfil</span><div className="phase9f-profile-value">{profileUser?.username || 'Não informado'}</div></div>
 <label className="field"><span>Endereço da carteira *</span><Input required pattern="0x[a-fA-F0-9]{40}" value={address} onChange={e=>setAddress(e.target.value)} placeholder="Endereço 0x da carteira"/></label>
 <div className="field phase9f-profile-info"><span>ENS do perfil</span><div className="phase9f-profile-value">{profileUser?.ens || 'Não informado'}</div></div>
 <div className="field phase9f-profile-info"><span>Tipo de carteira</span><div className="phase9f-profile-value">Carteira de teste</div></div>
 <div className="field phase9f-profile-info"><span>E-mail do perfil</span><div className="phase9f-profile-value">{profileUser?.email || 'Não informado'}</div></div>
 </div>
 <label className="row phase9f-wallet-primary" style={{margin:'20px 0'}}><input type="checkbox" checked={primary} onChange={e=>setPrimary(e.target.checked)}/> Definir como carteira principal</label>
 <div className="row"><Button type="submit" disabled={m.isPending}>{editId?'Atualizar carteira':'Salvar carteira'}</Button>{editId&&<Button type="button" variant="secondary" onClick={reset}>Cancelar</Button>}</div>
 {m.isError&&<Feedback message={errorMessage(m.error)}/>} {m.isSuccess&&<p role="status" className="success">Carteira salva.</p>}
 </form>
 <h2 className="phase9f-wallet-list-heading">Carteiras cadastradas</h2>
 {isPending?<Loading count={1}/>:wallets.map(w=><div key={w.id} className="panel phase9f-wallet-saved" style={{marginBottom:12}}><div className="row" style={{justifyContent:'space-between'}}><b>{w.label} · {w.network} {w.primary?'· Principal':'· Secundária'}</b><button type="button" className="text-link" onClick={()=>{setEditId(w.id);setLabel(w.label);setAddress(w.address);setNetwork(w.network);setPrimary(w.primary)}}>Editar</button></div><p className="note" style={{wordBreak:'break-all'}}>{w.address}</p></div>)}
 <h2>Carteira secundária</h2><p className="note">{wallets.some(w=>!w.primary)?'As carteiras secundárias estão listadas acima.':'Você ainda não adicionou uma carteira secundária.'}</p></div></AccountShell>
}
