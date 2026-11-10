import { useQuery } from '@tanstack/react-query';
export const HUDL = 'http://127.0.0.1:8766';
export type HudlMoment = {id:string; category:string; time_s:number; duration_s:number};
export type HudlMatch = {id:string; title:string; age_group:string; capture_key:string; thumbnail_url?:string|null; moments?:HudlMoment[]; duration_s?:number};
export type HudlStatus = {state:string; message:string; busy:boolean; configured:boolean; match_id?:string; filename?:string; download_url?:string; stream_url?:string};
export async function hudlRequest<T>(path:string,body?:unknown):Promise<T> {
 const response=await fetch(HUDL+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const data=await response.json(); if(!response.ok)throw new Error(data.detail||'Hudl helper unavailable');return data;
}
export function useHudlStatus(){return useQuery<HudlStatus>({queryKey:['hudl-account'],queryFn:()=>hudlRequest('/account'),retry:false,refetchInterval:q=>q.state.data?.busy?1500:false});}
export function useHudlLibrary(){return useQuery<HudlMatch[]>({queryKey:['hudl-library'],queryFn:()=>hudlRequest('/library'),retry:false});}
