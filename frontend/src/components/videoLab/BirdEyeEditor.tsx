import {useEffect,useMemo,useRef,useState} from "react";
import {BoundaryLayer} from "./BoundaryEditor";
import {PAD} from "./MarkLayer";
import {applyRay,applyBirdEdit,fitBirdBoundary,toBird,rayPanorama,type GroundCalibration} from "./atlasGeometry";
import type {Panorama} from "./panorama";
import type {Corners} from "./pitch";

/** Samples real atlas pixels through the shared ground calibration. Empty coverage stays black. */
export function BirdEyeEditor({data,src,calibration:baseCalibration,points,editing,onChange}:{data:Panorama;src:string;calibration:GroundCalibration|null;points:Corners;editing:boolean;onChange:(p:Corners)=>void}){
 const [fit,setFit]=useState(false);
 const calibration=useMemo(()=>baseCalibration&&fit?fitBirdBoundary(data,baseCalibration,data.suggested_boundary):baseCalibration,[baseCalibration,fit,data]);
 const canvas=useRef<HTMLCanvasElement>(null),[pixels,setPixels]=useState<ImageData|null>(null),[selected,setSelected]=useState(0);
 useEffect(()=>{let alive=true;const image=new Image();image.onload=()=>{if(!alive)return;const c=document.createElement("canvas");c.width=image.naturalWidth;c.height=image.naturalHeight;const ctx=c.getContext("2d",{willReadFrequently:true});if(!ctx)return;ctx.drawImage(image,0,0);setPixels(ctx.getImageData(0,0,c.width,c.height));};image.src=src;return()=>{alive=false;};},[src]);
 useEffect(()=>{
  if(!pixels||!calibration||!canvas.current)return;
  const ctx=canvas.current.getContext("2d");if(!ctx)return;
  const timer=setTimeout(()=>{
   const w=720,h=450,out=ctx.createImageData(w,h),c=calibration,[l,t,r,b]=c.bounds;
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    let ray=applyRay(c.inverse,[l+x/(w-1)*(r-l),t+y/(h-1)*(b-t),1]);
    if(ray.reduce((s,v,i)=>s+v*c.normal[i],0)<0)ray=ray.map(v=>-v);
    const [u,v]=rayPanorama(data,ray),i=(y*w+x)*4;out.data[i+3]=255;
    if(!Number.isFinite(u)||!Number.isFinite(v)||u<0||u>1||v<0||v>1)continue;
    const j=(Math.round(v*(pixels.height-1))*pixels.width+Math.round(u*(pixels.width-1)))*4;
    out.data[i]=pixels.data[j];out.data[i+1]=pixels.data[j+1];out.data[i+2]=pixels.data[j+2];
   }
   ctx.putImageData(out,0,0);
  },70);return()=>clearTimeout(timer);
 },[pixels,calibration,data]);
 const bird=calibration?toBird(data,calibration,points):[];
 return <section className="min-w-0 space-y-2" aria-label="Bird’s-eye boundary editor">
  <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Bird’s-eye view</h3><span className="text-xs text-fg-muted">{calibration?.kind==="corners"?"Corner-calibrated":"Goal-based estimate · check ground contacts"}</span></div>
  <button className="text-xs underline" onClick={()=>setFit(!fit)}>{fit?"Focus on goal area":"Fit whole boundary"}</button>
  <div className="relative overflow-hidden rounded-lg bg-black" style={{aspectRatio:"8/5"}}>
   <canvas ref={canvas} width={720} height={450} role="img" aria-label="Bird’s-eye pitch" className="block h-full w-full" style={editing?{transform:`scale(${1-2*PAD})`}:undefined}/>
   {calibration&&bird.every(p=>p.every(Number.isFinite))&&(editing?<BoundaryLayer points={bird} selected={selected} onSelect={setSelected} onChange={p=>onChange(applyBirdEdit(data,calibration,points,p))}/>:<svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none" aria-label="Top-down boundary"><polygon points={bird.map(p=>p.join(",")).join(" ")} fill="#22c55e" fillOpacity={.1} stroke="#22c55e" strokeWidth={.004}/></svg>)}
  </div>
  {!calibration&&<p className="text-xs text-warn">Locate both goals or mark four physical pitch corners to build this view.</p>}
  <p className="text-xs text-fg-muted">Both views edit the same boundary. Goal-based shape is relative, not a measurement in metres. Correct the post contacts or mark the physical corners if lines look skewed. Black areas have no observed pixels.</p>
 </section>;
}
