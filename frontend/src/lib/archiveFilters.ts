import { useSyncExternalStore } from 'react';
const EVENT = 'fm-archive-filters';
function subscribe(callback:()=>void) {
 window.addEventListener('storage',callback);window.addEventListener(EVENT,callback);
 return ()=>{window.removeEventListener('storage',callback);window.removeEventListener(EVENT,callback);};
}
function useSaved(key:string) {
 const value=useSyncExternalStore(subscribe,()=>localStorage.getItem(key)||'',()=> '');
 const set=(next:string)=>{localStorage.setItem(key,next);window.dispatchEvent(new Event(EVENT));};
 return [value,set] as const;
}
export function useArchiveFilters(){
 const [age,setAge]=useSaved('fm.hudl.age');const [season,setSeason]=useSaved('fm.library.season');
 return {age,setAge,season,setSeason};
}
/** Include scope only for discovery/indexing; streaming a specific match is unchanged. */
export function scopedHudlAction(body:unknown):unknown {
 if(body&&typeof body==='object'&&'action' in body&&['refresh','test','sync_tags'].includes(String(body.action))){
  const age=localStorage.getItem('fm.hudl.age');
  if(age)return {...body,age_group:age};
 }
 return body;
}
