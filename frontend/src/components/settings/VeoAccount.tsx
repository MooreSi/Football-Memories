import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { type FormEvent, useState } from "react";
import { type VeoStatus, veoRequest } from "../../api/veo";
import { Button } from "../ui/Button";

const KEY = ["veo-account"];

/** Spec 250 (D-035): save the Veo account in the OS secret store through the desktop
 *  helper, test the sign-in, and read the account's matches. */
export function VeoAccount() {
  const client = useQueryClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saved, setSaved] = useState(false);
  const q = useQuery<VeoStatus>({ queryKey: KEY, queryFn: () => veoRequest("/account"), retry: false,
    refetchInterval: (query) => (query.state.data?.busy ? 1500 : false) });
  const save = useMutation({ mutationFn: () => veoRequest("/credentials", { username, password }),
    onSuccess: () => { setPassword(""); setSaved(true); void client.invalidateQueries({ queryKey: KEY }); } });
  const action = useMutation({ mutationFn: (name: "test" | "refresh") => veoRequest("/action", { action: name }),
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }) });
  if (q.isPending) return <p className="text-xs text-fg-muted">Checking saved Veo connection…</p>;
  if (q.isError) return <p className="text-sm text-fg-muted">Start the desktop helper (the same one Hudl uses) to connect Veo.</p>;
  const busy = q.data.busy || save.isPending || action.isPending;
  const windows = q.data.secret_store === "Windows Credential Manager";
  const where = windows ? "Windows Credential Manager" : "this Mac’s Keychain";
  const s = q.data.summary;
  function submit(event: FormEvent) { event.preventDefault(); setSaved(false); save.mutate(); }
  return <section aria-label="Veo account connection" className="space-y-4 border-t border-line pt-4">
    <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={17} /> Your Veo account</div>
    <form onSubmit={submit} className="space-y-3">
      <label className="block space-y-1 text-sm"><span>Veo email</span>
        <input aria-label="Veo email" type="email" autoComplete="username" required disabled={busy}
          className="field" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Email address" /></label>
      <label className="block space-y-1 text-sm"><span>Veo password</span>
        <input aria-label="Veo password" type="password" autoComplete="off" required disabled={busy}
          className="field" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder={q.data.configured ? `Saved in ${windows ? "Credential Manager" : "Keychain"} — enter to replace` : "Password"} /></label>
      <p className="text-xs text-fg-subtle">Saved only in {where}. Test signs in to Veo in a hidden browser and reads your match list; nothing on Veo is changed.</p>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" disabled={busy}>{save.isPending ? "Saving…" : "Save"}</Button>
        <Button type="button" disabled={busy || !q.data.configured} onClick={() => action.mutate("test")}>Test</Button>
        <Button type="button" disabled={busy || !q.data.configured} onClick={() => action.mutate("refresh")}><RefreshCw size={14} /> Refresh matches</Button>
      </div>
    </form>
    {saved && <p className="text-xs text-ok" role="status">Saved in {where}. Select Test to connect.</p>}
    {q.data.message && <p role="status" className={`text-xs ${q.data.state === "error" ? "text-danger" : "text-fg-muted"}`}>{q.data.message}</p>}
    {q.data.progress && <div role="progressbar" aria-label="Reading Veo matches" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(q.data.progress.fraction * 100)} className="h-1.5 overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(2, q.data.progress.fraction * 100)}%` }} /></div>}
    {s && <ul aria-label="What the Veo account has" className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
      <li className="tile p-3"><span className="block text-lg font-semibold tabular-nums">{s.matches}</span> matches</li>
      <li className="tile p-3"><span className="block text-lg font-semibold tabular-nums text-ok">{s.with_video}</span> with video</li>
      <li className="tile p-3"><span className="block text-lg font-semibold tabular-nums text-fg-muted">{s.expired}</span> expired</li>
      {s.expiring > 0 && <li className="tile p-3"><span className="block text-lg font-semibold tabular-nums text-warn">{s.expiring}</span> expiring soon</li>}
      {s.moments !== undefined && <li className="tile p-3"><span className="block text-lg font-semibold tabular-nums">{s.moments}</span> highlights</li>}
    </ul>}
    {(save.isError || action.isError) && <p role="alert" className="text-sm text-danger">{(save.error ?? action.error)?.message}</p>}
  </section>;
}
