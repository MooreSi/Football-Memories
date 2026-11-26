import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, type ReactNode } from "react";
import { FlaskConical } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { selectVideoLabEndpoint } from "../api/videoLabEndpoint";
import { HOSTED } from "../api/hostedFlag";
import { Spinner } from "./ui/Spinner";
const PlayerLabPage=lazy(()=>import("../pages/PlayerLabPage"));
export function allowedLabIdentity(me:unknown,hosted:boolean,feature:"player_lab"|"video_lab"="player_lab"):string|null {
  if(!hosted||!me||typeof me!=="object")return null;
  const m=me as {role?:unknown;stage?:unknown;email?:unknown;labs?:Record<string,unknown>};
  const allowed=m.labs ? m.labs[feature]===true : m.role==="admin";
  return allowed&&m.stage==="full"&&typeof m.email==="string"&&m.email.length>0?m.email.toLowerCase():null;
}
/** Feature presentation gate; no new privileged API, library or cross-user capability. */
export function PlayerLabAccess({children,quiet=false,feature="player_lab"}:{children:(account:string)=>ReactNode;quiet?:boolean;feature?:"player_lab"|"video_lab"}) {
  const identity=useQuery({queryKey:["lab-access",feature],enabled:HOSTED,retry:false,staleTime:0,refetchOnMount:"always",refetchInterval:60_000,
    queryFn:async()=>{const r=await fetch("/_portal/api/me",{credentials:"same-origin",cache:"no-store",headers:{Accept:"application/json"}});
      if(!r.ok)throw new Error("Admin check unavailable");
      const me=await r.json();
      if(feature==="video_lab")selectVideoLabEndpoint(me.role);
      return allowedLabIdentity(me,HOSTED,feature);}});
  if(HOSTED&&identity.isPending)return quiet?null:<Spinner label="Checking admin access"/>;
  if(!HOSTED||identity.isError||!identity.data)return quiet?null:<div className="panel p-6"><h1 className="text-xl font-semibold">Admin testing area</h1><p className="mt-2 text-fg-muted">Only the signed-in admin or a user granted access with completed verification can open this lab. Enable it in Advanced settings.</p><Link className="mt-4 inline-block text-accent" to="/player">Back to My Player</Link></div>;
  return children(identity.data);
}
export function PlayerLabLink(){
  return <PlayerLabAccess quiet>{()=> <NavLink to="/player-lab" end title="Player Lab · Private preview" aria-label="Player Lab · private preview"
    className={({isActive})=>`screen-link player-lab-tab ${isActive?"is-active":""}`}>
    {({isActive})=><><FlaskConical size={18} aria-hidden/><span className={isActive?"nav-label active-label":"nav-label"} aria-hidden>Player Lab</span></>}
  </NavLink>}</PlayerLabAccess>;
}
export function PlayerLabRoute(){return <PlayerLabAccess>{account=><Suspense fallback={<Spinner label="Loading player lab"/>}><PlayerLabPage key={account} account={account}/></Suspense>}</PlayerLabAccess>;}
