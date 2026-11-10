import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { hudlBlocked, hudlRequest, useHudlLibrary, useHudlStatus } from '../../api/hudl';
export function useConnectedMatch(filename:string){
 const library=useHudlLibrary();const status=useHudlStatus();const qc=useQueryClient();const started=useRef(false);
 const match=library.data?.find(m=>filename.includes(m.capture_key));
 const stream=useMutation({mutationFn:(id:string)=>hudlRequest('/account/action',{action:'stream',match_id:id}),onSuccess:()=>qc.invalidateQueries({queryKey:['hudl-account']})});
 useEffect(()=>{if(match&&status.data?.configured&&!hudlBlocked(status.data)&&!started.current){started.current=true;if(status.data.match_id!==match.id||!status.data.stream_url)stream.mutate(match.id);}},[match,status.data]);
 return {match,src:match&&status.data?.match_id===match.id?status.data.stream_url:undefined,busy:match&&hudlBlocked(status.data),message:match?status.data?.message:undefined};
}
