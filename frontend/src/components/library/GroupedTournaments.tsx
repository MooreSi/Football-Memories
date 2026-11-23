import {useEffect,useRef,useState,type ReactNode} from "react";
import {Link} from "react-router-dom";
import {useMutation,useQuery,useQueryClient} from "@tanstack/react-query";
import {ArrowLeft,ChevronDown,ChevronRight,Film,Pencil,CircleHelp,RefreshCw} from "lucide-react";
import {api} from "../../api/client";
import {useTournaments} from "../../api/tournaments";
import type {Tournament} from "../../api/types";
import {hudlBlocked,hudlRequest,useHudlStatus} from "../../api/hudl";
import {useVeoStatus,veoRequest} from "../../api/veo";
import {taggedScore,type Score} from "../../lib/matchScore";
import {tournamentStats,type TournamentGame} from "../../lib/tournaments";
import {TeamBadge} from "../TeamBadge";
import {ScoreBadge} from "../hudl/HudlLibrary";
import {Button} from "../ui/Button";
import {TournamentActions,TournamentSelect,TournamentTools,useTournamentSelection} from "./Tournaments";

export type GroupedLibraryGame={key:string;title:string;href:string;date:string|null;source:string;thumbnail?:string|null;score:()=>Score|null;homeClub?:string|null;renderCard?:()=>ReactNode};
export function groupedTournamentsEnabled(){return import.meta.env.VITE_FM_GROUPED_TOURNAMENTS!=="0";}
function dateLabel(day:string|null){return day?new Date(`${day.slice(0,10)}T12:00:00`).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}):"Date unknown";}

/** Released grouped Library. Explicit build flag 0 retains the rollback presentation. */
export function GroupedTournaments({games,eligibleKeys,scores,search="",loading=false,error=false,scopeLoading=false,scoreError=false,scoresLoading=false,sources=[]}:{
  games:GroupedLibraryGame[];eligibleKeys:string[];scores:TournamentGame[];search?:string;loading?:boolean;error?:boolean;scopeLoading?:boolean;scoreError?:boolean;scoresLoading?:boolean;sources?:string[];
}){
  const state=useTournamentSelection()!;
  const tournaments=useTournaments();
  const [view,setView]=useState<"all"|"tournaments">("tournaments");
  const autoOpened=useRef(false);
  const allowed=new Set(eligibleKeys),byKey=new Map(games.map(g=>[g.key,g]));
  const scoped=games.filter(g=>allowed.has(g.key));
  const query=search.toLocaleLowerCase();
  const matchesSearch=(g:GroupedLibraryGame)=>!query||g.title.toLocaleLowerCase().includes(query);
  const dateOf=(t:Tournament)=>Object.keys(t.entries).map(key=>byKey.get(key)?.date??"").sort().reverse()[0]||null;
  const groups=(tournaments.data??[]).filter(t=>Object.keys(t.entries).some(key=>allowed.has(key)))
    .filter(t=>!query||`${t.name} ${Object.values(t.entries).join(" ")}`.toLocaleLowerCase().includes(query)||Object.keys(t.entries).some(key=>byKey.has(key)&&matchesSearch(byKey.get(key)!)))
    .sort((a,b)=>(dateOf(b)??"").localeCompare(dateOf(a)??"")||a.name.localeCompare(b.name));
  const groupedKeys=new Set((tournaments.data??[]).flatMap(t=>Object.keys(t.entries)));
  useEffect(()=>{
    if(!autoOpened.current&&tournaments.isSuccess&&!scopeLoading&&groups.length){autoOpened.current=true;state.setTournamentId(groups[0].id);}
  },[tournaments.data,scopeLoading,eligibleKeys]);
  useEffect(()=>{if(state.tournamentId)setView("tournaments");},[state.tournamentId]);
  function allMatches(){autoOpened.current=true;setView("all");state.setTournamentId("");state.clear();}
  return <div className="grouped-library">
    <div className="grouped-view-toolbar">
      <div className="grouped-view-switch" role="group" aria-label="Library presentation">
        <Button variant="ghost" aria-pressed={view==="all"} onClick={allMatches}>All matches</Button>
        <Button variant="ghost" aria-pressed={view==="tournaments"} onClick={()=>setView("tournaments")}>Tournaments</Button>
      </div>
      {view==="all"&&sources.length>0&&<SourceRefresh sources={sources}/>}
    </div>
    {loading&&games.length===0&&<p role="status" className="mb-3 text-xs text-fg-muted">Loading cached matches…</p>}
    {error&&<p role="alert" className="mb-3 text-xs text-danger">Some matches could not be loaded. Showing available cached matches.</p>}
    {tournaments.isError&&<p role="alert" className="mb-3 text-xs text-danger">Could not load tournaments. <Button onClick={()=>void tournaments.refetch()}>Retry tournaments</Button></p>}
    {view==="tournaments"?<>
      {tournaments.isPending?<p role="status" className="text-sm text-fg-muted">Loading tournaments…</p>:!scopeLoading&&groups.length===0&&<p className="py-4 text-sm text-fg-muted">No tournaments match these filters.</p>}
      {groups.map(t=>{
        const open=state.tournamentId===t.id,day=dateOf(t),teams=[...new Set(Object.values(t.entries))].filter(team=>team!=="Team unassigned").sort();
        const unassigned=Object.values(t.entries).filter(team=>team==="Team unassigned").length;
        const label=!t.name_corrected&&t.name.startsWith("Match day · ")?`Tournament · ${dateLabel(day)}`:t.name;
        const memberKeys=Object.keys(t.entries).filter(key=>!state.team||t.entries[key]===state.team);
        const members=scoped.filter(g=>memberKeys.includes(g.key)&&matchesSearch(g));
        return <section key={t.id} className="grouped-event" aria-label={t.name}>
          <div className="grouped-event-heading">
            <button className="grouped-event-toggle" aria-expanded={open} onClick={()=>state.setTournamentId(open?"":t.id)}>
              <span className="grouped-date">{day?<><strong>{Number(day.slice(8,10))}</strong><span>{new Date(`${day.slice(0,10)}T12:00:00`).toLocaleDateString("en-GB",{month:"short"})}</span></>:<Film size={18}/>}</span>
              <span className="grouped-event-identity"><strong>{label}</strong><span>{Object.keys(t.entries).length} matches · {teams.length} {teams.length===1?"squad":"squads"}{unassigned>0&&` · ${unassigned} ${unassigned===1?"needs":"need"} review`}</span></span>
              {open?<ChevronDown size={17}/>:<ChevronRight size={17}/>} 
            </button>
            <Button variant="ghost" aria-label={`Rename tournament ${t.name}`} title="Rename tournament" onClick={()=>state.rename(t.id)}><Pencil size={15}/></Button>
          </div>
          {open&&<div className="grouped-event-detail">
            {state.team?<>
              <div className="grouped-squad-heading"><Button variant="ghost" onClick={()=>state.setTeam("")}><ArrowLeft size={14}/>All squads</Button><h3>{state.team==="Team unassigned"?"Games needing review":state.team}</h3><Button variant="ghost" className="ml-auto" onClick={()=>{state.select(memberKeys);state.assign(true);}}>{state.team==="Team unassigned"?"Assign squad":"Correct squad"}</Button></div>
              {state.team!=="Team unassigned"&&<SquadStats tournament={t} team={state.team} scores={scores} scoreError={scoreError} loading={scoresLoading}/>}
              {memberKeys.some(key=>t.automatic?.[key])&&<details className="mb-3 text-xs text-fg-subtle"><summary className="cursor-pointer">Review automatic grouping</summary><div className="mt-2 space-y-1">{[...new Set(memberKeys.map(key=>t.automatic?.[key]?.reason).filter(Boolean))].map(reason=><p key={reason}>{reason}</p>)}<p>Use Edit on a game or Correct squad to change the assignment.</p></div></details>}
              <section aria-label={`${state.team} tournament matches`}><GameRows games={members} resetKey={`${t.id}:${state.team}:${search}`}/></section>
              {members.length<memberKeys.length&&<p className="mt-3 text-xs text-fg-subtle">Showing {members.length} of {memberKeys.length} linked games. Age, season, search and connection visibility apply to this list.</p>}
            </>:<div className="grouped-squad-grid">{teams.map(team=>{
              const count=Object.values(t.entries).filter(v=>v===team).length;
              const home=games.find(g=>t.entries[g.key]===team&&g.homeClub)?.homeClub||team.split(" · ")[0];
              return <button className="grouped-squad-card" key={team} aria-label={`Open squad ${team}`} onClick={()=>state.setTeam(team)}><TeamBadge name={home} size="md"/><span><strong>{team}</strong><span>{count} {count===1?"match":"matches"} · View matches & stats</span></span><ChevronRight size={16}/></button>;
            })}{unassigned>0&&<button className="grouped-squad-card" aria-label={`Review ${unassigned} unassigned ${unassigned===1?"game":"games"}`} onClick={()=>state.setTeam("Team unassigned")}><CircleHelp size={26} className="shrink-0 text-warn"/><span><strong>Needs review</strong><span>{unassigned} {unassigned===1?"game":"games"} · Assign a squad</span></span><ChevronRight size={16}/></button>}</div>}
          </div>}
        </section>;
      })}
      <section aria-label="Other matches" className="grouped-ordinary"><div className="grouped-section-heading"><h3>Other matches</h3><span>Not in a tournament</span></div><GameRows games={scoped.filter(g=>!groupedKeys.has(g.key)&&matchesSearch(g))} resetKey={`ordinary:${eligibleKeys.join("|")}:${search}`}/></section>
    </>:<TournamentActions enabled={false}><section aria-label="All cached matches"><GameRows games={scoped.filter(matchesSearch)} resetKey={`all:${eligibleKeys.join("|")}:${search}`}/></section></TournamentActions>}
    <TournamentTools compact games={scores} eligibleKeys={eligibleKeys} scopeLoading={scopeLoading}/>
  </div>;
}

function GameRows({games,resetKey}:{games:GroupedLibraryGame[];resetKey:string}){
  const [limit,setLimit]=useState(12);
  useEffect(()=>setLimit(12),[resetKey]);
  if(!games.length)return <p className="py-3 text-xs text-fg-subtle">No matches in this view.</p>;
  return <><div className="grouped-game-grid">{games.slice(0,limit).map(game=>{
    if(game.renderCard)return <div key={game.key} className="min-w-0">{game.renderCard()}</div>;
    return <article className="tile overflow-hidden" key={game.key}>
      <Link to={game.href} aria-label={game.title} className="block"><div className="relative aspect-video overflow-hidden bg-ink-800">{game.thumbnail?<img src={game.thumbnail} alt={game.title} loading="lazy" crossOrigin="anonymous" className="size-full object-cover"/>:<div className="grid h-full place-items-center text-fg-subtle"><Film size={28}/></div>}<span className="absolute left-2.5 top-2.5 rounded-full bg-ink-950/80 px-2 py-1 text-[11px] text-accent">{game.source}</span><ScoreBadge title={game.title} club={game.homeClub??null} score={game.score()}/></div><div className="space-y-2 p-4"><h3 className="text-sm font-semibold leading-snug">{game.title}</h3><p className="text-xs text-fg-muted">{dateLabel(game.date)}</p></div></Link>
      <TournamentSelect matchKey={game.key} title={game.title}/>
    </article>;
  })}</div>{games.length>limit&&<div className="mt-3 text-center"><Button onClick={()=>setLimit(n=>n+12)}>Show more matches ({games.length-limit})</Button></div>}</>;

}

function SquadStats({tournament,team,scores,scoreError,loading}:{tournament:Tournament;team:string;scores:TournamentGame[];scoreError:boolean;loading:boolean}){
  const keys=Object.keys(tournament.entries).filter(k=>k.startsWith("local:")&&tournament.entries[k]===team).sort();
  const local=useQuery({queryKey:["grouped-squad-scores",keys],enabled:keys.length>0,retry:false,queryFn:async()=>{
    const result:TournamentGame[]=[];
    for(let i=0;i<keys.length;i+=4)result.push(...await Promise.all(keys.slice(i,i+4).map(async key=>{
      const match=await api.match(Number(key.slice(6)));return {key,score:taggedScore(match.events.map(event=>({...event,id:String(event.id)})),match.team_name)};
    })));
    return result;
  }});
  const row=tournamentStats(tournament,[...scores,...(local.data??[])]).find(r=>r.team===team)!;
  return <div className="grouped-stats" aria-label={`${team} tournament stats`}>
    <dl>{[["Games",row.games],["Wins",row.scored?row.won:"—"],["Draws",row.scored?row.drawn:"—"],["Losses",row.scored?row.lost:"—"],["Goals for",row.scored?row.gf:"—"],["Goals against",row.scored?row.ga:"—"]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <p>{row.scored} of {row.games} games have scores</p>
    <p role="status" className="grouped-score-status">{(loading||local.isFetching)&&row.scored===0?"Loading scores…":"\u00a0"}</p>{(scoreError||local.isError)&&<p role="alert" className="text-danger">Some scores could not be loaded.</p>}
    <p className="text-fg-subtle">Whole-squad tournament totals. Unknown scores are excluded.</p>
  </div>;
}

function SourceRefresh({sources}:{sources:string[]}){
  const hudl=useHudlStatus(),veo=useVeoStatus(),client=useQueryClient();
  useEffect(()=>{if(hudl.data&&!hudl.data.busy)void client.invalidateQueries({queryKey:["hudl-library"]});},[hudl.data?.busy,client]);
  useEffect(()=>{if(veo.data&&!veo.data.busy)void client.invalidateQueries({queryKey:["veo-library"]});},[veo.data?.busy,client]);
  const refresh=useMutation({mutationFn:(source:string)=>source==="Hudl"?hudlRequest("/account/action",{action:"refresh"}):veoRequest("/action",{action:"refresh"}),onSuccess:()=>{void client.invalidateQueries({queryKey:["hudl-account"]});void client.invalidateQueries({queryKey:["veo-account"]});}});
  return <div className="grouped-source-refresh">{sources.map(source=><Button variant="ghost" key={source} disabled={refresh.isPending||(source==="Hudl"?hudlBlocked(hudl.data)||!hudl.data?.configured:veo.data?.busy||!(veo.data?.configured||veo.data?.shared))} onClick={()=>refresh.mutate(source)}><RefreshCw size={13}/>Refresh {source}</Button>)}{refresh.isError&&<p role="alert" className="text-xs text-danger">{refresh.error.message}</p>}</div>;
}
