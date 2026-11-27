import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, MessageSquare, Plus, Target } from "lucide-react";
import { sameCode } from "../../lib/codes";
import { clipHref, type LabBook, type LabRow, type LabRecord } from "../../lib/playerLab";
import { MANUAL_FIELDS, validateRecord } from "../../lib/playerLabBook";
import { Button } from "../ui/Button";
import { OURS_FILL } from "../match/statsUi";
import { LAB_CARD, LAB_TILE } from "./PlayerLabCharts";
export function LabMatchEditor({row,name,book,save,keeper=true}:{row:LabRow;name:string;book:LabBook;save:(next:LabBook)=>boolean;keeper?:boolean}){
 const existing=book.records.find(r=>r.match===row.match.id&&sameCode(r.player,name));
 const [draft,setDraft]=useState<LabRecord>(existing??{match:row.match.id,player:name,position:row.position,minutes:null,counts:{},note:""}),[message,setMessage]=useState("");
 return <section className={`${LAB_TILE} space-y-4`} aria-label="Manual match record"><div><h3 className="font-semibold">Match notebook</h3><p className="mt-1 text-xs text-fg-muted">{row.match.title}</p><p className="mt-2 text-xs text-fg-subtle">Optional experimental records. Blank means unknown; enter 0 only when verified. These records apply within the lab and do not edit the match’s saved statistics.</p></div>
  <form className="space-y-4" onSubmit={e=>{e.preventDefault();const error=validateRecord(draft);if(error){setMessage(error);return;}if(save({...book,records:[...book.records.filter(r=>!(r.match===row.match.id&&sameCode(r.player,name))),draft]}))setMessage("Match notebook saved in this browser.");}}>
   <div className="grid grid-cols-2 gap-3"><label className="text-xs text-fg-muted">Position this match<input className="field mt-1 w-full" maxLength={40} value={draft.position} onChange={e=>setDraft({...draft,position:e.target.value})}/></label>
   <label className="text-xs text-fg-muted">Confirmed minutes<input className="field mt-1 w-full" type="number" min={0} max={600} step="0.1" value={draft.minutes??""} onChange={e=>setDraft({...draft,minutes:e.target.value===""?null:Number(e.target.value)})}/></label></div>
   <details><summary className="cursor-pointer text-sm font-semibold text-accent">Record attempts and outcomes</summary><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{MANUAL_FIELDS.filter(([key])=>keeper||!["saves","conceded"].includes(key)||draft.counts[key]!==undefined).map(([key,label])=><label key={key} className="text-xs text-fg-muted">{label}<input className="field mt-1 w-full" type="number" min={0} max={10000} step={1} value={draft.counts[key]??""} onChange={e=>{const counts={...draft.counts};if(e.target.value==="")delete counts[key];else counts[key]=Number(e.target.value);setDraft({...draft,counts});}}/></label>)}</div></details>
   <label className="block text-xs text-fg-muted">Coach feedback / match notes<textarea className="field mt-1 min-h-24 w-full" maxLength={4000} placeholder="What went well? What would you review next?" value={draft.note} onChange={e=>setDraft({...draft,note:e.target.value})}/></label>
   <Button type="submit" variant="primary"><Check size={14} aria-hidden/>Save match notebook</Button>{message&&<p role="status" className="text-xs text-accent">{message}</p>}
  </form>
 </section>;
}
export function LabGoals({name,rows,book,save}:{name:string;rows:LabRow[];book:LabBook;save:(next:LabBook)=>boolean}){
 const [text,setText]=useState(""),[due,setDue]=useState(""),[match,setMatch]=useState(""),[moment,setMoment]=useState("");
 const row=rows.find(r=>r.match.id===match),clips=row?.match.moments?.filter(m=>sameCode(m.category,name))??[];
 const goals=book.goals.filter(g=>sameCode(g.player,name)),completed=goals.filter(g=>g.done).length;
 return <section className={`${LAB_CARD} space-y-4`} aria-label="Development goals"><div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-semibold"><Target size={18} className="text-accent" aria-hidden/>Development goals</h2><span className="text-xs text-fg-muted">{completed}/{goals.length} reviewed</span></div>
  <p className="text-xs text-fg-muted">Choose your own focus, add a review date and attach a moment. Completion is your assessment.</p>
  <div className="h-1.5 rounded-full bg-white/10" role="progressbar" aria-label="Goals reviewed" aria-valuemin={0} aria-valuemax={Math.max(1,goals.length)} aria-valuenow={completed}><div className="h-full rounded-full" style={{width:`${goals.length?completed/goals.length*100:0}%`,background:OURS_FILL}}/></div>
  <ul className="space-y-2">{goals.map(g=>{const linked=rows.find(r=>r.match.id===g.match);return <li className="flex items-start gap-3 rounded-xl border border-line bg-white/[0.02] p-3" key={g.id}><input type="checkbox" className="mt-1 accent-accent" checked={g.done} aria-label={`Reviewed: ${g.text}`} onChange={()=>save({...book,goals:book.goals.map(x=>x.id===g.id?{...x,done:!x.done}:x)})}/><div className="min-w-0 flex-1"><p className={`break-words text-sm ${g.done?"text-fg-muted line-through":""}`}>{g.text}</p>{g.due&&<p className="mt-1 text-xs text-fg-subtle">Review {g.due}</p>}{linked&&<Link className="mt-1 inline-block text-xs text-accent" to={clipHref(linked,name,linked.match.moments?.find(m=>m.id===g.moment))}>Review linked {g.moment?"moment":"match"}</Link>}</div></li>;})}</ul>
  {!goals.length&&<p className="text-sm text-fg-subtle">No development goals yet.</p>}
  <form className="grid gap-3 sm:grid-cols-2" onSubmit={e=>{e.preventDefault();if(!text.trim())return;if(save({...book,goals:[...book.goals,{id:crypto.randomUUID(),player:name,text:text.trim(),due,done:false,match,moment}]})){setText("");setDue("");setMatch("");setMoment("");}}}>
   <label className="text-xs text-fg-muted sm:col-span-2">Your next focus<input className="field mt-1 w-full" required maxLength={1000} value={text} placeholder="e.g. Review body position before receiving" onChange={e=>setText(e.target.value)}/></label>
   <label className="text-xs text-fg-muted">Review date<input className="field mt-1 w-full" type="date" value={due} onChange={e=>setDue(e.target.value)}/></label>
   <label className="text-xs text-fg-muted">Attach match<select className="field mt-1 w-full" value={match} onChange={e=>{setMatch(e.target.value);setMoment("");}}><option value="">No match</option>{rows.map(r=><option key={r.match.id} value={r.match.id}>{r.match.title}</option>)}</select></label>
   {clips.length>0&&<label className="text-xs text-fg-muted sm:col-span-2">Attach moment<select className="field mt-1 w-full" value={moment} onChange={e=>setMoment(e.target.value)}><option value="">Whole match</option>{clips.map(c=><option key={c.id} value={c.id}>{Math.floor(c.time_s/60)}:{String(Math.floor(c.time_s%60)).padStart(2,"0")}</option>)}</select></label>}
   <div className="sm:col-span-2"><Button type="submit" variant="subtle"><Plus size={14} aria-hidden/>Add development goal</Button></div>
  </form>
  <p className="flex items-start gap-2 text-xs text-fg-subtle"><MessageSquare size={14} className="shrink-0" aria-hidden/>Feedback is entered by you. No player data is sent to an external AI service.</p>
 </section>;
}
