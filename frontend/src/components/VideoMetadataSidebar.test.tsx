import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders } from "../test/render";
import { VideoMetadataSidebar, VideoTeamStats } from "./VideoMetadataSidebar";

afterEach(()=>vi.unstubAllGlobals());
const artifacts=["veo_tags.json","event_suggestions.json","team_stats.json"];
function mockMetadata(){
 vi.stubGlobal("fetch",vi.fn(async(url:string)=>{
  if(url.endsWith("veo_tags.json"))return Response.json({events:[{id:"teacher-1",type:"corner",side:"own",time_s:12,source_time_s:1092},{id:"teacher-2",type:"goal",side:"opponent",time_s:30,source_time_s:1110}],highlights:[{source_id:"highlight-1",source_label:"SHOT",time_s:8,source_time_s:1088}]});
  if(url.endsWith("event_suggestions.json"))return Response.json([{id:"model-1",type:"pass",time_s:15,score:.7}]);
  if(url.endsWith("team_stats.json"))return Response.json({teams:[{id:"team_a",label:"Team A",colour_hex:"#ff0000",person_observations:20}],roles:{sideline_candidate:5},veo:{own:{corner:1},opponent:{goal:1}},analysed:{team_a:{},unknown:{pass:1}},proximity:{team_a:3,unknown:2},tracks:[{track_id:2,role:"sideline_candidate",team_id:null,start_s:2,end_s:4,observations:5}],limitations:[],status:"experimental"});
  throw new Error("unstubbed metadata request");
 }));
}
it("separates source and analysed counts, filters our corners and seeks clip time",async()=>{
 mockMetadata();const seek=vi.fn();
 renderWithProviders(<VideoMetadataSidebar jobId="synthetic" artifacts={artifacts} onSeek={seek}/>);
 await userEvent.click(await screen.findByRole("button",{name:"Veo team events: Our corner (1)"}));
 expect(screen.getByRole("button",{name:"Veo team events: Our corner (1)"})).toHaveAttribute("aria-pressed","true");
 expect(screen.queryByRole("button",{name:/pass · 0:15/i})).toBeNull();
 await userEvent.click(screen.getByRole("button",{name:/corner · 0:12/i}));
 expect(seek).toHaveBeenCalledWith(12);
 expect(screen.getByText(/Source time 18:12/)).toBeInTheDocument();
});
it("keeps unknown actors out of team action totals and shows Veo sides separately",async()=>{
 mockMetadata();renderWithProviders(<VideoTeamStats jobId="synthetic" artifacts={artifacts}/>);
 expect(await screen.findByRole("heading",{name:"Team statistics"})).toBeInTheDocument();
 expect(screen.getByText("Team A")).toBeInTheDocument();
 expect(screen.getByText("Unassigned actions: pass 1")).toBeInTheDocument();
 expect(screen.getByText("Our team · corner 1")).toBeInTheDocument();
 expect(screen.getByText("Opponent · goal 1")).toBeInTheDocument();
});
it("old jobs load only available metadata and never request missing team files",async()=>{
 mockMetadata();renderWithProviders(<VideoMetadataSidebar jobId="old" artifacts={["veo_tags.json"]} onSeek={vi.fn()}/>);
 expect(await screen.findByRole("button",{name:"Veo team events: Our corner (1)"})).toBeInTheDocument();
 expect(vi.mocked(fetch).mock.calls).toHaveLength(1);
});
it("reports failed source metadata while retaining successfully loaded model data",async()=>{
 vi.stubGlobal("fetch",vi.fn(async(url:string)=>url.endsWith("veo_tags.json")?new Response("",{status:404}):Response.json([{id:"p",type:"pass",time_s:5}])));
 renderWithProviders(<VideoMetadataSidebar jobId="partial" artifacts={["veo_tags.json","event_suggestions.json"]} onSeek={vi.fn()}/>);
 expect(await screen.findByText(/Veo metadata unavailable/)).toBeInTheDocument();
 expect(screen.getByRole("button",{name:"Analysed actions: pass (1)"})).toBeInTheDocument();
});
