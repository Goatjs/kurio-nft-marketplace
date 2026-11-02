import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useEffect} from 'react';
import {api} from './api';
import {subscribeLive} from './live';
export function useSession(){const token=localStorage.getItem('nft-token');return useQuery({queryKey:['session',token],queryFn:async()=>{if(!token)return null;try{return await api.session();}catch{return null;}},staleTime:30000,retry:false});}
export function LiveState(){const qc=useQueryClient();const {data:user}=useSession();useEffect(()=>subscribeLive(qc,user?.id??null),[qc,user?.id]);return null;}
export function errorMessage(e:unknown){return (e as {response?:{data?:{message?:string}}})?.response?.data?.message??'Não foi possível concluir. Tente novamente.';}
