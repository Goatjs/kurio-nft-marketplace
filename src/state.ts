import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useEffect,useState} from 'react';
import {api} from './api';
import {subscribeLive} from './live';
export function useSession(){
 const [token,setToken]=useState(()=>localStorage.getItem('nft-token'));
 useEffect(()=>{
  const update=()=>setToken(localStorage.getItem('nft-token'));
  window.addEventListener('kurio-session-expired',update);
  return ()=>window.removeEventListener('kurio-session-expired',update);
 },[]);
 return useQuery({queryKey:['session',token],queryFn:async()=>{if(!token)return null;try{return await api.session();}catch{return null;}},staleTime:30000,retry:false});
}
export function LiveState(){const qc=useQueryClient();const {data:user}=useSession();useEffect(()=>subscribeLive(qc,user?.id??null),[qc,user?.id]);return null;}
export function errorMessage(e:unknown){return (e as {response?:{data?:{message?:string}}})?.response?.data?.message??'Não foi possível concluir. Tente novamente.';}
