import type { HudlMatch } from "../api/hudl";
import { sameCode } from "./codes";
import { matchGoals, type GoalsEntries } from "./goals";
import { fixtureDate } from "./hudlFixture";
import { matchScore, type Corrections } from "./matchScore";
import { estimatePlayerMinutes } from "./estimatedMinutes";
import { goalkeeperPosition } from "./playerRecords";
import { performanceFromData } from "./playerPerformance";
import { PLAYER_METRICS, playerStats } from "./playerStats";
import { MANUAL_FIELDS, type LabBook } from "./playerLabBook";
export { EMPTY_BOOK, validateBook, validateRecord } from "./playerLabBook";
export type { LabBook, LabRecord, LabGoal } from "./playerLabBook";
export type LabSource = "action" | "overlap" | "confirmed" | "likely" | "manual" | "estimated" | "missing";
export type LabCell = { value: number | null; source: LabSource; clips: { id: string; time_s: number | null }[]; numerator?: number; denominator?: number };
export type LabRow = { match: HudlMatch; date: string; season: string; stats: Record<string, LabCell>; minutes: number | null; estimatedMinutes: number | null; position: string; note: string; score: { ours: number; theirs: number } | null };
export const LAB_METRICS = [...PLAYER_METRICS.map(m=>({key:m.key as string,label:m.label,percent:false})),
  ...MANUAL_FIELDS.filter(([key])=>![...PLAYER_METRICS.map(m=>m.key as string),"saves","conceded","shotOnTarget","dribbleWins","defensiveAttempts"].includes(key)).map(([key,label])=>({key:key as string,label:label as string,percent:false})),
  {key:"saves",label:"Saves",percent:false},{key:"conceded",label:"Goals conceded",percent:false},{key:"faced",label:"Shots faced",percent:false},
  {key:"cleanSheets",label:"Clean sheets",percent:false},{key:"penaltiesSaved",label:"Penalties stopped",percent:false},
  {key:"savePercentage",label:"Save percentage",percent:true},{key:"passAccuracy",label:"Pass accuracy",percent:true},
  {key:"shotAccuracy",label:"Shot accuracy",percent:true},{key:"conversion",label:"Shot conversion",percent:true},
  {key:"dribbleSuccess",label:"Dribble success",percent:true},{key:"defensiveSuccess",label:"Defensive 1v1 success",percent:true}];
export const SOURCE_LABELS: Record<LabSource,string> = {action:"Individual action",overlap:"Team-tag overlap · involvement",confirmed:"Saved assignment",likely:"Likely assignment",manual:"Manual lab record",estimated:"Estimated keeper assignment",missing:"Not recorded"};
const missing = (): LabCell => ({value:null,source:"missing",clips:[]});
const cell = (value:number|null,source:LabSource="manual"):LabCell=>({value,source:value===null?"missing":source,clips:[]});
function ratio(n:number|undefined,d:number|undefined,source:LabSource="manual"):LabCell {
  return n===undefined || d===undefined || !d ? missing() : {...cell(100*n/d,source),numerator:n,denominator:d};
}
/** Metadata-only view of the existing attribution. Experimental edits never flow upstream. */
export function labRows(matches: HudlMatch[], name: string, position: string | null, club: string | null, book: LabBook, entries:GoalsEntries={}, corrections:Corrections={}): LabRow[] {
  return [...new Map(matches.filter(m=>m.source!=="veo").map(m=>[m.id,m])).values()].flatMap(match=>{
    const manual=book.records.find(r=>r.match===match.id&&sameCode(r.player,name));
    const goals=matchGoals(match,club,entries[match.id]);
    const mine=match.moments?.filter(m=>sameCode(m.category,name))??[];
    const keeper=goals.keepers.find(k=>k.name&&sameCode(k.name,name));
    const assigned=goals.goals.filter(g=>g.side==="ours"&&g.scorer&&sameCode(g.scorer,name));
    if (!manual && !mine.length && !keeper && !assigned.length) return [];
    const player=playerStats(match,club,goals).find(p=>sameCode(p.name,name));
    const stats:Record<string,LabCell>=Object.fromEntries(LAB_METRICS.map(m=>[m.key,missing()]));
    for(const m of PLAYER_METRICS) {
      const clips=player?.events[m.key];
      if(clips!==null && clips!==undefined) stats[m.key]={value:clips.length,source:player!.sources[m.key]==="actions"?"action":"overlap",clips};
    }
    // A name tag alone does not prove a zero-goal appearance; need recorded goals/assignments.
    if(assigned.length || goals.goals.some(g=>g.side==="ours"&&g.scorer)) stats.goals={value:assigned.length,source:goals.goals.some(g=>g.side==="ours"&&(!g.confirmed||!g.scorer))?"likely":"confirmed",clips:assigned.map(g=>({id:g.id,time_s:g.time_s}))};
    else stats.goals=missing();
    if(keeper){
      const clean=performanceFromData([match],[{id:match.id,goals,keeper,player}],name,true,club,corrections).find(c=>c.label==="Clean sheets");
      stats.cleanSheets=cell(clean?.value??null,"confirmed");
      if(match.moments?.some(m=>m.actions?.includes("penaltiesSaved")))stats.penaltiesSaved={value:mine.filter(m=>m.actions?.includes("penaltiesSaved")).length,source:"action",clips:mine.filter(m=>m.actions?.includes("penaltiesSaved"))};
      const source=keeper.confirmed?"confirmed":"estimated";
      stats.saves=cell(keeper.saves,source);
      stats.conceded={...cell(keeper.conceded,source),clips:goals.goals.filter(g=>g.side==="theirs"&&g.keeper&&sameCode(g.keeper,name)).map(g=>({id:g.id,time_s:g.time_s}))};
      stats.faced=cell(keeper.saves===null?null:keeper.saves+keeper.conceded,source);
      stats.savePercentage=ratio(keeper.saves??undefined,keeper.saves===null?undefined:keeper.saves+keeper.conceded,source);
    }
    const c=manual?.counts??{};
    const aliases:Record<string,string>={shotOnTarget:"shots",dribbleWins:"successfulDribbles",defensiveAttempts:"defensive1v1"};
    for(const [key,value] of Object.entries(c)) if(stats[aliases[key]??key]) stats[aliases[key]??key]=cell(value);
    stats.passAccuracy=ratio(c.passCompleted,c.passAttempts);
    stats.shotAccuracy=ratio(c.shotOnTarget,c.shotAttempts);
    stats.conversion=ratio(c.goals,c.shotAttempts);
    stats.dribbleSuccess=ratio(c.dribbleWins,c.dribbleAttempts);
    stats.defensiveSuccess=ratio(c.defensiveWins,c.defensiveAttempts);
    if(c.saves!==undefined||c.conceded!==undefined){
      stats.faced=c.saves!==undefined&&c.conceded!==undefined?cell(c.saves+c.conceded):missing();
      stats.savePercentage=ratio(c.saves,c.saves!==undefined&&c.conceded!==undefined?c.saves+c.conceded:undefined);
    }
    const date=fixtureDate(match.title);
    const year=date?(date.getMonth()>=6?date.getFullYear():date.getFullYear()-1):null;
    const iso=date?`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`:"";
    return [{match,date:iso,season:year?`${year}/${String((year+1)%100).padStart(2,"0")}`:match.season_label||"Unclassified",stats,
      minutes:manual?.minutes??null,estimatedMinutes:goalkeeperPosition(manual?.position||position)||(!position&&!!keeper)?null:estimatePlayerMinutes(match.moments??[],name,goals.spells),position:manual?.position||position||"",note:manual?.note||"",score:matchScore(match,club,corrections)}];
  }).sort((a,b)=>b.date.localeCompare(a.date)||a.match.id.localeCompare(b.match.id));
}
export function aggregateCells(cells:LabCell[],percent=false):number|null {
  const known=cells.filter(c=>c.value!==null);
  if(!known.length)return null;
  if(percent){const n=known.reduce((s,c)=>s+(c.numerator??0),0),d=known.reduce((s,c)=>s+(c.denominator??0),0);return d?100*n/d:null;}
  return known.reduce((s,c)=>s+c.value!,0);
}
/** Fixed chronological windows: never skip missing matches to cherry-pick a trend. */
export function compareWindows(rows:LabRow[],metric:string):{recent:number;previous:number;change:number|null;source:LabSource}|null {
  const window=rows.filter(r=>r.date).slice(0,10);
  if(new Set(window.map(r=>r.position.trim().toUpperCase())).size>1)return null;
  const ten=window.map(r=>r.stats[metric]);
  if(ten.length<10||ten.some(c=>!c||c.value===null||!["action","confirmed","manual"].includes(c.source))||new Set(ten.map(c=>c.source)).size!==1)return null;
  const percent=LAB_METRICS.find(m=>m.key===metric)?.percent??false;
  const value=(cs:LabCell[])=>{const n=aggregateCells(cs,percent);return n===null?null:percent?n:n/5;};
  const recent=value(ten.slice(0,5)),previous=value(ten.slice(5));
  if(recent===null||previous===null)return null;
  return {recent,previous,change:percent?recent-previous:previous?(recent-previous)/previous*100:null,source:ten[0].source};
}
export function clipHref(row:LabRow,name:string,clip?:{id:string;time_s:number|null}):string {
  const params=new URLSearchParams({player:name});
  if(clip?.time_s!==null&&clip?.time_s!==undefined)params.set("t",String(clip.time_s));
  return `/hudl/${encodeURIComponent(row.match.id)}?${params}`;
}
/** Teammates compare only at matched fixtures with explicit equal positions and minutes. */
export function teammateComparison(own:LabRow[],other:LabRow[],metric:string) {
  const pairs=own.flatMap(a=>{const b=other.find(b=>b.match.id===a.match.id);
    return b&&a.position&&a.position.trim().toUpperCase()===b.position.trim().toUpperCase()&&a.minutes&&b.minutes
      && a.stats[metric]?.value!==null&&b.stats[metric]?.value!==null&&["manual","action","confirmed"].includes(a.stats[metric]?.source)
      &&a.stats[metric].source===b.stats[metric]?.source?[[a,b] as const]:[];});
  if(pairs.length<3||new Set(pairs.flatMap(p=>p.map(r=>r.stats[metric].source))).size!==1)return null;
  const percent=LAB_METRICS.find(m=>m.key===metric)?.percent??false;
  const value=(index:0|1)=>{const rows=pairs.map(p=>p[index]);const v=aggregateCells(rows.map(r=>r.stats[metric]),percent)!;return percent?v:v/rows.reduce((s,r)=>s+r.minutes!,0)*30;};
  return {ours:value(0),theirs:value(1),matches:pairs.length,percent};
}
