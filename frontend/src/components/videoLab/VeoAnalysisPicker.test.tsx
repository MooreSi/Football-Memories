import { screen,waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/render";
import VideoLabPage from "../../pages/VideoLabPage";
afterEach(()=>vi.unstubAllGlobals());
it("uses the Veo library and queues the selected minutes then imports the verified clip",async()=>{
 const posts:{url:string,body:unknown}[]=[];
 vi.stubGlobal('fetch',vi.fn(async(url:string,init?:RequestInit)=>{
  if(init?.method==='POST'){
   posts.push({url,body:JSON.parse(init.body as string)});
   return Response.json(url.endsWith('/veo-jobs')?{id:'a'.repeat(32),state:'queued'}:{accepted:true});
  }
  if(url.endsWith('/me'))return Response.json({csrf_token:'fake'});
  if(url.endsWith('/veo/library'))return Response.json([{id:'veo-synthetic',title:'Riverside vs Northgate',available:true,duration_s:3600}]);
  if(url.endsWith('/veo/account'))return Response.json({busy:false,state:'done',match_id:'veo-synthetic',analysis_ticket:'f'.repeat(32)});
  if(url.endsWith('/samples')||url.endsWith('/jobs'))return Response.json([]);
  return Response.json({id:'a'.repeat(32),state:'queued'});
 }));
 renderWithProviders(<VideoLabPage/>);
 await userEvent.selectOptions(await screen.findByRole('combobox',{name:'Veo match'}),'veo-synthetic');
 await userEvent.clear(screen.getByRole('spinbutton',{name:'Minutes to analyse'}));
 await userEvent.type(screen.getByRole('spinbutton',{name:'Minutes to analyse'}),'5');
 await userEvent.clear(screen.getByRole('spinbutton',{name:'Start minute'}));
 await userEvent.type(screen.getByRole('spinbutton',{name:'Start minute'}),'18');
 await userEvent.click(screen.getByRole('button',{name:'Analyse selected match'}));
 await waitFor(()=>expect(posts).toEqual([
  {url:expect.stringContaining('/veo/action'),body:{action:'analysis',match_id:'veo-synthetic',start_s:1080,duration_s:300}},
  {url:'/_admin/api/video-analytics/veo-jobs',body:{ticket:'f'.repeat(32)}}
 ]));
});

it("does not import the previous clip when analysing the same game with a new duration",async()=>{
 const imported:string[]=[];let preparations=0;
 vi.stubGlobal('fetch',vi.fn(async(url:string,init?:RequestInit)=>{
  if(url.endsWith('/me'))return Response.json({csrf_token:'fake'});
  if(url.endsWith('/veo/library'))return Response.json([{id:'veo-synthetic',title:'Synthetic same-game retry',available:true,duration_s:3600}]);
  if(url.endsWith('/veo/action')){preparations++;return Response.json({accepted:true});}
  if(url.endsWith('/veo/account'))return Response.json({busy:false,state:'done',match_id:'veo-synthetic',analysis_ticket:String(preparations).repeat(32)});
  if(url.endsWith('/veo-jobs')){imported.push(JSON.parse(init!.body as string).ticket);return Response.json({id:'a'.repeat(32)});}
  return Response.json([]);
 }));
 const {VeoAnalysisPicker}=await import('./VeoAnalysisPicker');
 renderWithProviders(<VeoAnalysisPicker busy={false} onQueued={()=>undefined}/>);
 await userEvent.selectOptions(await screen.findByRole('combobox',{name:'Veo match'}),'veo-synthetic');
 await userEvent.click(screen.getByRole('button',{name:'Analyse selected match'}));
 await waitFor(()=>expect(imported).toEqual(['1'.repeat(32)]));
 await userEvent.click(await screen.findByRole('button',{name:'Analyse selected match'}));
 await waitFor(()=>expect(imported).toEqual(['1'.repeat(32),'2'.repeat(32)]));
});
