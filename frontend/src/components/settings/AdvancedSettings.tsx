import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLabAdmin } from "../../api/labAdmin";
import { Button } from "../ui/Button";
import { Spinner } from "../ui/Spinner";
import { VideoNodeSettings } from "./VideoNodeSettings";

type Account={id:string;display_name:string;email:string;self:boolean;player_lab:boolean;video_lab:boolean};
const BASE="/_admin/api/labs";
const KEY=["lab-settings"];

/** Settings uses the shared charcoal panels and controls from reference 01. */
export function AdvancedSettings(){
  const admin=useLabAdmin();
  const qc=useQueryClient();
  const users=useQuery<Account[]>({queryKey:KEY,enabled:admin.data?.admin===true,retry:false,
    queryFn:async()=>{
      const r=await fetch(BASE,{credentials:"same-origin",cache:"no-store"});
      if(!r.ok)throw new Error("Lab access could not be loaded.");
      return r.json() as Promise<Account[]>;
    }});
  const updateAll=useMutation({mutationFn:async()=>{
    const me=await admin.refetch();
    if(!me.data?.admin||!me.data.csrf)throw new Error("Please sign in again.");
    const r=await fetch("/_admin/api/update/all",{method:"POST",credentials:"same-origin",headers:{"X-CSRF-Token":me.data.csrf}});
    if(!r.ok)throw new Error("Updates could not be started. Try again.");
    return r.json() as Promise<{updated:number;unchanged:number;failed:number}>;
  }});
  const save=useMutation({mutationFn:async({id,feature,enabled}:{id:string;feature:"player_lab"|"video_lab";enabled:boolean})=>{
    // Obtain the current CSRF token for every write; never persist it.
    const me=await admin.refetch();
    if(!me.data?.admin||!me.data.csrf)throw new Error("Please sign in again.");
    const r=await fetch(`${BASE}/${encodeURIComponent(id)}`,{method:"PATCH",credentials:"same-origin",
      headers:{"Content-Type":"application/json","X-CSRF-Token":me.data.csrf},body:JSON.stringify({[feature]:enabled})});
    if(!r.ok)throw new Error("Lab access could not be saved. Try again.");
  },onSuccess:async()=>{
    await Promise.all([qc.invalidateQueries({queryKey:KEY}),qc.invalidateQueries({queryKey:["lab-access"]})]);
  }});
  if(admin.isPending)return <Spinner label="Checking admin access"/>;
  if(!admin.data?.admin)return <p className="text-sm text-fg-muted">Advanced settings are only available to the signed-in admin.</p>;
  return <section className="panel max-w-3xl space-y-5 p-5" aria-label="Advanced settings">
    <div><h2 className="text-lg font-semibold">Advanced</h2><p className="mt-2 text-sm text-fg-muted">Choose whether your account uses Player Lab and Video Lab. App updates are shared independently of these switches. Other users' lab access is under their Manage panel in the <a className="underline" href="/_portal/admin">Admin console</a>.</p></div>
    {users.isPending?<Spinner label="Loading lab access"/>:users.isError?<p role="alert">{users.error.message}</p>:
      // Owner request 2026-11-26: other users are managed in the gateway admin console.
      (users.data??[]).filter(user=>user.self).map(user=><fieldset key={user.id} className="min-w-0 space-y-3 rounded-xl border border-line p-4" disabled={save.isPending}>
        <legend className="max-w-full break-words px-1 text-sm font-semibold">{user.self?"Your admin account":user.display_name}</legend>
        <p className="break-all text-xs text-fg-muted">{user.email}</p>
        <div className="flex flex-wrap gap-x-8 gap-y-3">{(["player_lab","video_lab"] as const).map(feature=><label key={feature} className="flex items-center gap-3 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-[var(--color-accent)]" checked={user[feature]}
            aria-label={`${feature==="player_lab"?"Player Lab":"Video Lab"} for ${user.email}`}
            onChange={event=>save.mutate({id:user.id,feature,enabled:event.target.checked})}/>
          {feature==="player_lab"?"Player Lab":"Video Lab"}
        </label>)}</div>
      </fieldset>)}
    {save.isPending&&<p role="status" className="text-sm text-fg-muted">Saving lab access…</p>}
    {save.isError&&<p role="alert" className="text-sm text-danger">{save.error.message}</p>}
    <VideoNodeSettings admin={admin}/>
    <div className="space-y-3 border-t border-line pt-4">
      <h3 className="font-semibold">App updates for everyone</h3>
      <p className="text-sm text-fg-muted">Move running libraries to the latest prepared release. Their app containers restart; matches, settings and lab access are kept. Preview builds are kept until the release includes their work. Choose a time when no one is downloading or rendering.</p>
      <Button disabled={updateAll.isPending} onClick={()=>updateAll.mutate()}>{updateAll.isPending?"Updating libraries…":"Update all users"}</Button>
      {updateAll.data&&<p role="status" className="text-sm">Updated: {updateAll.data.updated}. Unchanged or protected: {updateAll.data.unchanged}. Failed: {updateAll.data.failed}.</p>}
      {updateAll.isError&&<p role="alert" className="text-sm text-danger">{updateAll.error.message}</p>}
    </div>
    <p className="text-xs text-fg-subtle">Each user can only access their own library and analysis. Turning a lab off keeps its saved work.</p>
  </section>;
}
