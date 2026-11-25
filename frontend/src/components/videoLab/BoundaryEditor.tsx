import { useRef } from "react";
import { Button } from "../ui/Button";
import { PAD } from "./MarkLayer";
import type { Corners } from "./pitch";
import { validBoundary, type Boundary } from "./boundary";
import { clock } from "./labTypes";

export function BoundaryPanel({editing,selected,setSelected,onChange,onStart,onSave,onCancel,manual,automatic,marks,onDelete,onSeek}:{editing:Corners|null;selected:number;setSelected:(n:number)=>void;onChange:(p:Corners)=>void;onStart:()=>void;onSave:()=>void;onCancel:()=>void;manual:boolean;automatic:boolean;marks:Boundary[];onDelete:(t:number)=>void;onSeek:(t:number)=>void}) {
 const add=()=>{if(!editing||editing.length>=32)return;const a=editing[selected],b=editing[(selected+1)%editing.length];const p=[...editing];p.splice(selected+1,0,[(a[0]+b[0])/2,(a[1]+b[1])/2]);onChange(p);setSelected(selected+1);};
 const remove=()=>{if(!editing||editing.length<=3)return;onChange(editing.filter((_,i)=>i!==selected));setSelected(Math.max(0,selected-1));};
 return <section className="panel space-y-3 p-3" aria-label="Editable pitch boundary">
  <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">Playing area boundary</h2><span className="text-xs text-fg-muted">{manual?"Your boundary correction":automatic?"Automatic boundary · review suggested":"Prepare camera tracking to generate an automatic boundary"}</span></div>
  <p className="text-sm text-fg-muted">The outline follows the visible turf as the camera pans. Check touchlines where there are neighbouring pitches or green apron. Correct its shape with up to 32 points; metre calibration is separate below.</p>
  {editing?<>
   <p className="text-xs text-fg-muted">Select a numbered handle, then drag or use arrow keys. Add a point between it and the next handle. Double-click an edge to insert there. Delete removes the selected point.</p>
   <div className="flex flex-wrap items-center gap-2"><span className="text-xs tabular-nums">{editing.length}/32 points · selected {selected+1}</span><Button disabled={editing.length>=32} onClick={add}>Add boundary point</Button><Button disabled={editing.length<=3} onClick={remove}>Remove selected point</Button></div>
   {!validBoundary(editing)&&<p role="alert" className="text-xs text-warn">Keep at least three distinct points enclosing the pitch, without crossing edges.</p>}
   <div className="flex flex-wrap gap-2"><Button variant="primary" disabled={!validBoundary(editing)} onClick={onSave}>Save boundary correction</Button><Button onClick={onCancel}>Cancel boundary edit</Button></div>
  </>:<div className="flex flex-wrap items-center gap-2"><Button variant="primary" onClick={onStart}>Edit boundary here</Button>{marks.map(m=><span key={m.time_s} className="inline-flex items-center gap-1 rounded border border-line px-2 text-xs"><button onClick={()=>onSeek(m.time_s)}>{clock(m.time_s)}</button><button aria-label={`Delete boundary at ${clock(m.time_s)}`} onClick={()=>onDelete(m.time_s)}>×</button></span>)}</div>}
 </section>;
}

/** `edge` draws each side between handles (curved where the view is not a plane); default straight. */
export function BoundaryLayer({points,onChange,selected,onSelect,edge}:{points:Corners;onChange:(p:Corners)=>void;selected:number;onSelect:(n:number)=>void;edge?:(a:[number,number],b:[number,number])=>Corners}) {
 const side=(i:number)=>{const a=points[i],b=points[(i+1)%points.length];return edge?edge(a,b):[a,b];};
 const svg=useRef<SVGSVGElement>(null),dragging=useRef<number|null>(null);
 const span=1/(1-2*PAD),origin=-PAD*span;
 const position=(e:React.PointerEvent|React.MouseEvent):[number,number]=>{const r=svg.current!.getBoundingClientRect();return [Math.max(-2,Math.min(3,origin+(e.clientX-r.left)/r.width*span)),Math.max(-2,Math.min(3,origin+(e.clientY-r.top)/r.height*span))];};
 const move=(i:number,p:[number,number])=>onChange(points.map((v,n)=>n===i?p:v));
 return <svg ref={svg} className="absolute inset-0 h-full w-full touch-none" viewBox={`${origin} ${origin} ${span} ${span}`} preserveAspectRatio="none" aria-label="Edit pitch boundary"
  onPointerMove={e=>{if(dragging.current!==null)move(dragging.current,position(e));}} onPointerUp={()=>{dragging.current=null;}} onPointerCancel={()=>{dragging.current=null;}}>
  <polygon points={points.flatMap((_,i)=>side(i).slice(0,-1)).map(p=>p.join(",")).join(" ")} fill="#22c55e" fillOpacity={0.08} stroke="#22c55e" strokeWidth={0.003}/>
  {points.map((_,i)=><polyline key={`edge${i}`} points={side(i).map(p=>p.join(",")).join(" ")} fill="none" stroke="transparent" strokeWidth={0.025} className="cursor-copy" onDoubleClick={e=>{if(points.length<32){const next=[...points];next.splice(i+1,0,position(e));onChange(next);onSelect(i+1);}}}/>)}
  {points.map(([x,y],i)=><g key={i}>
   <ellipse cx={x} cy={y} rx={selected===i?0.01:0.007} ry={selected===i?0.018:0.012} fill={selected===i?"#38bdf8":"#22c55e"} stroke="white" strokeWidth={1.5} vectorEffect="non-scaling-stroke" role="slider" tabIndex={0} aria-label={`Boundary point ${i+1}`} aria-valuenow={Math.round(x*100)} aria-valuetext={`${Math.round(x*100)}% across, ${Math.round(y*100)}% down`}
    onFocus={()=>onSelect(i)} onPointerDown={e=>{onSelect(i);dragging.current=i;e.currentTarget.setPointerCapture(e.pointerId);}}
    onKeyDown={e=>{const d=e.shiftKey?0.02:0.004;const steps:Record<string,[number,number]>={ArrowLeft:[-d,0],ArrowRight:[d,0],ArrowUp:[0,-d],ArrowDown:[0,d]};if(steps[e.key]){e.preventDefault();move(i,[Math.max(-2,Math.min(3,x+steps[e.key][0])),Math.max(-2,Math.min(3,y+steps[e.key][1]))]);}else if((e.key==="Delete"||e.key==="Backspace")&&points.length>3){e.preventDefault();onChange(points.filter((_,n)=>n!==i));onSelect(Math.max(0,i-1));}}}/>
   <text x={x} y={y-0.022} textAnchor="middle" fontSize={0.018} fill="white" stroke="black" strokeWidth={0.002} paintOrder="stroke" pointerEvents="none">{i+1}</text>
  </g>)}
 </svg>;
}
