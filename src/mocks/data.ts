import type {Cart, Nft,Order,Quote,User,Wallet} from '../contracts';
export type UserRecord=User&{passwordHash:string};
export type DB={users:UserRecord[];sessions:Record<string,{userId:string;expiresAt:number}>;nfts:Nft[];guestCart:Cart;carts:Record<string,Cart>;favorites:Record<string,string[]>;wallets:Record<string,Wallet[]>;orders:Record<string,Order>;idempotency:Record<string,{signature:string;orderId:string}>;quotes:Record<string,Quote>};
export const emptyCart=():Cart=>({items:[],coupon:null});
const featured: Array<[string,string,string,string,string]> = [
 ['Emerald Ape #042','1.19','emerald','Arte digital','Uma obra digital 1/50 finalizada à mão da coleção Kurio Editions, verificada na Ethereum.'],
 ['Sage Nomad #009','1.69','sage','Arte digital','Exploração visual da cultura digital com edição limitada.'],
 ['Neon Vessel #552','1.99','ivory','Colecionáveis','Arte digital exclusiva com traços e materiais singulares.'],
 ['Cosmic Bloom #118','1.29','cosmic','Fotografia','Coleção de retratos experimentais da Kurio.'],
 ['Violet Nomad #314','1.39','violet','Arte 3D','Retrato colecionável de edição especial.'],
 ['Ivory Baron #088','1.79','ivory','Colecionáveis','Arte original com personalidade marcante.'],
 ['Golden Beat #207','0.99','golden','Música','A cultura digital encontra o ritmo e a expressão artística.'],
 ['Golden Signal #160','0.39','signal','Generativa','Um novo sinal no universo de arte digital.'],
 ['Golden Frequency #071','0.59','golden','Música','Arte e som em sintonia para colecionadores.']
];
const categories=['Arte digital','Fotografia','Música','Arte 3D','Colecionáveis','Generativa','Jogos','Assinaturas','Utilidade'];
const seededNfts:Nft[]=Array.from({length:36},(_,i)=>{
 const [title,price,image,category,description]=featured[i%featured.length];
 const extra=i>=featured.length;
 return {id:`nft-${i+1}`,title:extra?`${title.split(' #')[0]} #${String(400+i).padStart(3,'0')}`:title,creator:'Kurio Editions',category:extra?categories[i%categories.length]:category,network:i%7===5?'Polygon':i%7===6?'Solana':'Ethereum',edition:i===2?'Rare':i%4===0?'Legendary':'Standard',priceEth:extra?(Number(price)+(i%5)*0.07).toFixed(2):price,stock:i===0?50:i===2?7:Math.max(3,50-i%36),image:`/assets/${image}.webp`,description,version:1};
});
const hashSeed1='63abea7904dd34045d7d2312aa6f32809bc3d2f33fb4f6ba3edabe1377e1bd7d';
const hashSeed2='f77894c5ac403c5f453d544a61b73dad3e8492e59638767b253a45849980a862';
export function seed():DB{return {users:[{id:'user-1',name:'Alex Collector',email:'alex@example.test',avatar:'',passwordHash:hashSeed1},{id:'user-2',name:'Sam Collector',email:'sam@example.test',avatar:'',passwordHash:hashSeed2}],sessions:{},nfts:seededNfts,guestCart:emptyCart(),carts:{},favorites:{},wallets:{'user-1':[{id:'wallet-1',label:'Principal',network:'Ethereum',address:'0x1111111111111111111111111111111111111111',primary:true}]},orders:{},idempotency:{},quotes:{}};}
const DB_KEY='kurio-marketplace-demo-v2';
let db:DB;
export function getDB(){if(!db){try{db=JSON.parse(localStorage.getItem(DB_KEY)||'null')||seed();}catch{db=seed();}}return db;}
export function persist(){localStorage.setItem(DB_KEY,JSON.stringify(getDB()));}
export function reset(){db=seed();persist();localStorage.removeItem('nft-token');}
export function userSafe(record:UserRecord):User {const {id,email,name,avatar}=record;return {id,email,name,avatar,username:record.username,ens:record.ens,walletAlias:record.walletAlias};}
export async function hashPassword(password:string){const bytes=new TextEncoder().encode(`${password}|kurio-demo-v1`);const digest=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');}
