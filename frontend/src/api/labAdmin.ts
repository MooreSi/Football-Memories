import { useCallback, useEffect, useState } from "react";
import { HOSTED } from "./hostedFlag";

type Identity={admin:boolean;csrf?:string};

export function useLabAdmin() {
  const [data,setData]=useState<Identity>();
  const [isPending,setPending]=useState(HOSTED);
  const refetch=useCallback(async()=>{
    try{
      const response=await fetch("/_portal/api/me",{credentials:"same-origin",cache:"no-store"});
      if(!response.ok)throw new Error("Please sign in again.");
      const me=await response.json() as {role?:string;stage?:string;csrf_token?:string};
      const identity={admin:me.role==="admin"&&me.stage==="full",csrf:me.csrf_token};
      setData(identity);
      return {data:identity};
    }catch{
      setData(undefined);
      return {data:undefined};
    }finally{setPending(false);}
  },[]);
  useEffect(()=>{if(HOSTED)void refetch();},[refetch]);
  return {data,isPending,refetch};
}
