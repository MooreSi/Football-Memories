import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, type ReactNode } from "react";
import { FlaskConical } from "lucide-react";
import { Link } from "react-router-dom";
import { HOSTED } from "../api/hostedFlag";
import { Spinner } from "./ui/Spinner";
const PlayerLabPage=lazy(()=>import("../pages/PlayerLabPage"));
export function allowedLabIdentity(me:unknown,hosted:boolean):string|null {
  if(!hosted||!me||typeof me!=="object")return null;
  const m=me as {role?:unknown;stage?:unknown;email?:unknown};
  return m.role==="admin"&&m.stage==="full"&&typeof m.email==="string"&&m.email.length>0?m.email.toLowerCase():null;
}
/** Feature presentation gate; no new privileged API, library or cross-user capability. */
export function PlayerLabAccess({children,quiet=false}:{children:(account:string)=>ReactNode;quiet?:boolean}) {
  const identity=useQuery({queryKey:["player-lab-admin"],enabled:HOSTED,retry:false,staleTime:0,refetchOnMount:"always",refetchInterval:60_000,
    queryFn:async()=>{const r=await fetch("/_portal/api/me",{credentials:"same-origin",cache:"no-store",headers:{Accept:"application/json"}});
      if(!r.ok)throw new Error("Admin check unavailable");
      return allowedLabIdentity(await r.json(),HOSTED);}});
  if(HOSTED&&identity.isPending)return quiet?null:<Spinner label="Checking admin access"/>;
  if(!HOSTED||identity.isError||!identity.data)return quiet?null:<div className="panel p-6"><h1 className="text-xl font-semibold">Admin testing area</h1><p className="mt-2 text-fg-muted">Only the signed-in admin with completed verification can open the player lab.</p><Link className="mt-4 inline-block text-accent" to="/player">Back to My Player</Link></div>;
  return children(identity.data);
}
export function PlayerLabLink(){return <PlayerLabAccess quiet>{()=> <Link to="/player/lab" className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-2 text-xs text-accent" aria-label="Player lab · admin testing"><FlaskConical size={18} aria-hidden/><span aria-hidden>Player lab · Admin testing</span></Link>}</PlayerLabAccess>;}
export function PlayerLabRoute(){return <PlayerLabAccess>{account=><Suspense fallback={<Spinner label="Loading player lab"/>}><PlayerLabPage key={account} account={account}/></Suspense>}</PlayerLabAccess>;}
