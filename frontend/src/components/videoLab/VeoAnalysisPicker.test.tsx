import { screen,waitFor,within } from "@testing-library/react";
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
 await userEvent.selectOptions(await screen.findByRole('combobox',{name:'Match'}),'veo-synthetic');
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
 await userEvent.selectOptions(await screen.findByRole('combobox',{name:'Match'}),'veo-synthetic');
 await userEvent.click(screen.getByRole('button',{name:'Analyse selected match'}));
 await waitFor(()=>expect(imported).toEqual(['1'.repeat(32)]));
 await userEvent.click(await screen.findByRole('button',{name:'Analyse selected match'}));
 await waitFor(()=>expect(imported).toEqual(['1'.repeat(32),'2'.repeat(32)]));
});

it("unlocks a new match when an earlier background run finishes",async()=>{
 const runningId='b'.repeat(32),completedId='c'.repeat(32);
 let finished=false;
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>{
  if(url.endsWith('/veo/library'))return Response.json([{id:'new-match',title:'Synthetic new match',available:true,duration_s:3600}]);
  if(url.endsWith('/samples'))return Response.json([]);
  if(url.endsWith('/jobs'))return Response.json([
   {id:completedId,sample_id:'old-match',state:'complete',progress:1,artifacts:[]},
   {id:runningId,sample_id:'background-match',state:finished?'complete':'running',progress:finished?1:0.5}
  ]);
  if(url.endsWith(`/jobs/${completedId}`))return Response.json({id:completedId,state:'complete',progress:1,artifacts:[]});
  throw new Error(`Unexpected request: ${url}`);
 }));
 renderWithProviders(<VideoLabPage/>);
 await userEvent.selectOptions(await screen.findByRole('combobox',{name:'Match'}),'new-match');
 const analyse=screen.getByRole('button',{name:'Analyse selected match'});
 expect(analyse).toBeDisabled();
 expect(within(screen.getByRole('region',{name:'Analyse a Match'})).getByRole('status')).toHaveTextContent('Another analysis is queued or running. This button will unlock automatically when it finishes.');
 finished=true;
 await waitFor(()=>expect(analyse).toBeEnabled(),{timeout:4000});
});

it("explains an out-of-range window and enables a valid correction",async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json([{id:'short-match',title:'Synthetic short match',available:true,duration_s:1140}])));
 const {VeoAnalysisPicker}=await import('./VeoAnalysisPicker');
 renderWithProviders(<VeoAnalysisPicker busy={false} onQueued={()=>undefined}/>);
 await userEvent.selectOptions(await screen.findByRole('combobox',{name:'Match'}),'short-match');
 await userEvent.clear(screen.getByRole('spinbutton',{name:'Start minute'}));
 await userEvent.type(screen.getByRole('spinbutton',{name:'Start minute'}),'16');
 await userEvent.clear(screen.getByRole('spinbutton',{name:'Minutes to analyse'}));
 await userEvent.type(screen.getByRole('spinbutton',{name:'Minutes to analyse'}),'4');
 expect(screen.getByRole('button',{name:'Analyse selected match'})).toBeDisabled();
 expect(screen.getByRole('status')).toHaveTextContent('The selected window ends after this match. Choose an earlier start or fewer minutes.');
 await userEvent.clear(screen.getByRole('spinbutton',{name:'Minutes to analyse'}));
 await userEvent.type(screen.getByRole('spinbutton',{name:'Minutes to analyse'}),'3');
 expect(screen.getByRole('button',{name:'Analyse selected match'})).toBeEnabled();
});

it("shows measured preparation progress with a gradient bar",async()=>{
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>{
  if(url.endsWith('/veo/library'))return Response.json([{id:'progress-match',title:'Synthetic progress match',available:true,duration_s:3600}]);
  if(url.endsWith('/veo/action'))return Response.json({accepted:true});
  if(url.endsWith('/veo/account'))return Response.json({busy:true,state:'working',message:'Preparing selected footage · 150 of 600 seconds',progress:{done:150,total:600,fraction:0.25}});
  throw new Error(`Unexpected request: ${url}`);
 }));
 const {VeoAnalysisPicker}=await import('./VeoAnalysisPicker');
 renderWithProviders(<VeoAnalysisPicker busy={false} onQueued={()=>undefined}/>);
 await userEvent.selectOptions(await screen.findByRole('combobox',{name:'Match'}),'progress-match');
 await userEvent.click(screen.getByRole('button',{name:'Analyse selected match'}));
 const bar=await screen.findByRole('progressbar',{name:'Preparing analysis clip'});
 await waitFor(()=>expect(bar).toHaveAttribute('aria-valuenow','25'));
 expect(bar).toHaveTextContent('25%');
 expect(screen.getByText(/150 of 600 seconds/)).toBeInTheDocument();
});

it("uses indeterminate progress while connecting instead of inventing a percentage",async()=>{
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>{
  if(url.endsWith('/veo/library'))return Response.json([{id:'connecting-match',title:'Synthetic connecting match',available:true,duration_s:3600}]);
  if(url.endsWith('/veo/action'))return Response.json({accepted:true});
  if(url.endsWith('/veo/account'))return Response.json({busy:true,state:'working',message:'Connecting to the selected footage…',progress:null});
  throw new Error(`Unexpected request: ${url}`);
 }));
 const {VeoAnalysisPicker}=await import('./VeoAnalysisPicker');
 renderWithProviders(<VeoAnalysisPicker busy={false} onQueued={()=>undefined}/>);
 await userEvent.selectOptions(await screen.findByRole('combobox',{name:'Match'}),'connecting-match');
 await userEvent.click(screen.getByRole('button',{name:'Analyse selected match'}));
 const bar=await screen.findByRole('progressbar',{name:'Preparing analysis clip'});
 expect(bar).not.toHaveAttribute('aria-valuenow');
 expect(bar).not.toHaveTextContent('%');
});

it("lists U11 2026/27 Hudl games in their own group and imports a prepared Hudl window",async()=>{
 const posts:{url:string,body:unknown}[]=[];
 vi.stubGlobal('fetch',vi.fn(async(url:string,init?:RequestInit)=>{
  if(init?.method==='POST'){
   posts.push({url,body:JSON.parse(init.body as string)});
   return Response.json(url.endsWith('/hudl-jobs')?{id:'a'.repeat(32),state:'queued'}:{accepted:true});
  }
  if(url.endsWith('/me'))return Response.json({csrf_token:'fake'});
  if(url.endsWith('/veo/library'))return Response.json([{id:'veo-synthetic',title:'Synthetic Veo match',available:true,duration_s:3600}]);
  if(url.endsWith('/library'))return Response.json([
   {id:'hudl-u11',title:'261122 U11 v Synthetic (Game 1)',age_group:'U11',season_label:'2026/27',capture_key:'k1'},
   {id:'hudl-u12',title:'261122 U12 v Synthetic',age_group:'U12',season_label:'2026/27',capture_key:'k2'},
   {id:'hudl-old',title:'250913 U11 v Synthetic',age_group:'U11',season_label:'2025/26',capture_key:'k3'},
  ]);
  if(url.endsWith('/account'))return Response.json({busy:false,state:'done',match_id:'hudl-u11',analysis_ticket:'e'.repeat(32),configured:true,message:''});
  return Response.json([]);
 }));
 const {VeoAnalysisPicker}=await import('./VeoAnalysisPicker');
 renderWithProviders(<VeoAnalysisPicker busy={false} onQueued={()=>undefined}/>);
 const region=screen.getByRole('region',{name:'Analyse a Match'});
 expect(within(region).getByRole('heading',{name:'Analyse a Match'})).toBeInTheDocument();
 const select=await screen.findByRole('combobox',{name:'Match'});
 const hudl=await within(select).findByRole('group',{name:'Hudl · U11 2026/27'});
 expect(within(hudl).getAllByRole('option').map(o=>o.textContent)).toEqual(['261122 U11 v Synthetic (Game 1)']);
 expect(within(within(select).getByRole('group',{name:'Veo'})).getAllByRole('option').map(o=>o.textContent)).toEqual(['Synthetic Veo match']);
 await userEvent.selectOptions(select,'hudl:hudl-u11');
 await userEvent.clear(screen.getByRole('spinbutton',{name:'Start minute'}));
 await userEvent.type(screen.getByRole('spinbutton',{name:'Start minute'}),'4');
 await userEvent.click(screen.getByRole('button',{name:'Analyse selected match'}));
 await waitFor(()=>expect(posts).toEqual([
  {url:expect.stringMatching(/\/account\/action$/),body:{action:'analysis',match_id:'hudl-u11',start_s:240,duration_s:600}},
  {url:'/_admin/api/video-analytics/hudl-jobs',body:{ticket:'e'.repeat(32)}}
 ]));
});
