import { useQuery } from '@tanstack/react-query';
export const HUDL = 'http://127.0.0.1:8766';
export type HudlMoment = {id:string; category:string; time_s:number; duration_s:number};
export type HudlMatch = {id:string; title:string; age_group:string; age_groups?:string[]; capture_key:string; season_label?:string; tag_status?:"synced"|"unsynced"|"none"; thumbnail_url?:string|null; moments?:HudlMoment[]; duration_s?:number};
export type HudlStatus = {state:string; message:string; busy:boolean; syncing?:boolean; configured:boolean; match_id?:string; filename?:string; download_url?:string; stream_url?:string};
export async function hudlRequest<T>(path:string,body?:unknown):Promise<T> {
 const response=await fetch(HUDL+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const data=await response.json(); if(!response.ok)throw new Error(data.detail||'Hudl helper unavailable');return data;
}
export function useHudlStatus(){return useQuery<HudlStatus>({queryKey:['hudl-account'],queryFn:()=>hudlRequest('/account'),retry:false,refetchInterval:q=>q.state.data?.busy?1500:10000});}
export function useHudlLibrary(){return useQuery<HudlMatch[]>({queryKey:['hudl-library'],queryFn:()=>hudlRequest('/library'),retry:false,refetchInterval:15000,refetchOnWindowFocus:'always',refetchOnReconnect:'always'});}

/** Actual Hudl library memberships take precedence over legacy title-derived ages. */
export function hudlAgeGroups(match: HudlMatch): string[] {
 return match.age_groups?.length ? match.age_groups : [match.age_group];
}

/** Background tag indexing yields to any user action, so it never blocks the UI. */
export function hudlBlocked(status?: HudlStatus): boolean {
 return Boolean(status?.busy && !status.syncing);
}

export type DownloadFile = {name:string; size:number; modified:number};
export type DownloadFolderInfo = {folder:string; default_folder:string; is_default:boolean; free_bytes:number|null; files:DownloadFile[]};
export function useDownloadFolder(){return useQuery<DownloadFolderInfo>({queryKey:['hudl-downloads'],queryFn:()=>hudlRequest('/downloads'),retry:false});}
