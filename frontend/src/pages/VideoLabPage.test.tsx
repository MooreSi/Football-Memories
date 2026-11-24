import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders } from "../test/render";
import VideoLabPage from "./VideoLabPage";

afterEach(()=>vi.unstubAllGlobals());
it("submits a real sample through the admin API with CSRF and shows outputs",async()=>{
 const calls:{url:string;init?:RequestInit}[]=[];
 vi.stubGlobal("fetch",vi.fn(async(url:string,init?:RequestInit)=>{
  calls.push({url,init});
  if(url.endsWith("/me"))return Response.json({csrf_token:"synthetic-csrf"});
  if(url.endsWith("/samples"))return Response.json([{id:"sample-a",label:"Synthetic sample",duration_s:120,source_offset_s:300}]);
  if(url.endsWith("/jobs")&&init?.method==="POST")return Response.json({id:"a".repeat(32),state:"queued"});
  if(url.endsWith("/jobs"))return Response.json([]);
  return Response.json({id:"a".repeat(32),state:"complete",progress:1,summary:{sampled_frames:360,person_detections:1200,ball_detections:0,unique_tracklets:60,ball_observation_coverage:0,football_events_confirmed:0},artifacts:["annotated.mp4","bundle.zip","summary.json"]});
 }));
 renderWithProviders(<VideoLabPage/>);
 await screen.findByText("Synthetic sample");
 await userEvent.click(screen.getByRole("button",{name:"Analyse two minutes"}));
 expect(await screen.findByRole("link",{name:"Download bundle.zip"})).toHaveAttribute("href",expect.stringContaining("/_admin/api/video-analytics/jobs/"));
 expect(screen.getByText(/No confirmed football events/)).toBeInTheDocument();
 const post=calls.find(c=>c.init?.method==="POST")!;
 expect(post.init?.body).toBe(JSON.stringify({sample_id:"sample-a"}));
 expect(post.init?.headers).toMatchObject({"X-CSRF-Token":"synthetic-csrf"});
});
it("reports API refusal without inventing a finished analysis",async()=>{
 vi.stubGlobal("fetch",vi.fn(async()=>new Response("",{status:503})));
 renderWithProviders(<VideoLabPage/>);
 expect(await screen.findByRole("alert")).toHaveTextContent(/unavailable/i);
 expect(screen.queryByRole("link",{name:/Download/})).toBeNull();
});
it("shows the selected ten-minute sample duration",async()=>{
 vi.stubGlobal("fetch",vi.fn(async(url:string)=>url.endsWith("/samples")?Response.json([{id:"ten-minute",label:"Synthetic ten-minute fixture",duration_s:600,source_offset_s:900}]):Response.json([])));
 renderWithProviders(<VideoLabPage/>);
 expect(await screen.findByRole("button",{name:"Analyse 10 minutes"})).toBeInTheDocument();
 expect(screen.getByText(/600-second local sample/)).toBeInTheDocument();
});
