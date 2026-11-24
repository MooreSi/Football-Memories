import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders } from "../test/render";
import { VideoReviewPanel } from "./VideoReviewPanel";

afterEach(()=>vi.unstubAllGlobals());
it("saves a reviewed action at the current video time using CSRF",async()=>{
 const puts:RequestInit[]=[];
 vi.stubGlobal("fetch",vi.fn(async(url:string,init?:RequestInit)=>{
  if(url.endsWith("/me"))return Response.json({csrf_token:"synthetic-only"});
  if(url.endsWith("review-tracks"))return Response.json([{track_id:7,start_s:0,end_s:100}]);
  if(init?.method==="PUT"){puts.push(init);return Response.json({revision:1});}
  return Response.json({revision:0,source_sha256:"a".repeat(64),events:[],identities:[],reviewed_intervals:[],review_complete:false});
 }));
 renderWithProviders(<VideoReviewPanel jobId={"a".repeat(32)} at={12} onSeek={vi.fn()}/>);
 await userEvent.click(await screen.findByRole("button",{name:"Add pass at current time"}));
 await userEvent.click(screen.getByRole("button",{name:"Save review"}));
 await screen.findByText(/Review saved/);
 const body=JSON.parse(puts[0].body as string) as {events:{type:string;time_s:number;confirmed:boolean}[];review_complete:boolean};
 expect(body.events[0]).toMatchObject({type:"pass",time_s:12,confirmed:true});
 expect(body.review_complete).toBe(false);
 expect(puts[0].headers).toMatchObject({"X-CSRF-Token":"synthetic-only"});
});
it("shows refusal without claiming the review was saved",async()=>{
 vi.stubGlobal("fetch",vi.fn(async()=>new Response("",{status:403})));
 renderWithProviders(<VideoReviewPanel jobId={"a".repeat(32)} at={12} onSeek={vi.fn()}/>);
 expect(await screen.findByRole("alert")).toHaveTextContent(/review unavailable/i);
 expect(screen.queryByText(/Review saved/)).toBeNull();
});

it("keeps a model suggestion separate until the admin confirms it",async()=>{
 vi.stubGlobal("fetch",vi.fn(async(url:string)=>{
  if(url.endsWith("review-tracks"))return Response.json([]);
  if(url.endsWith("event_suggestions.json"))return Response.json([{id:"candidate-1",type:"pass",time_s:51.2,score:.87,confirmed:false}]);
  return Response.json({revision:0,source_sha256:"a".repeat(64),events:[],identities:[],reviewed_intervals:[],review_complete:false});
 }));
 renderWithProviders(<VideoReviewPanel jobId={"a".repeat(32)} at={51.2} onSeek={vi.fn()} hasSuggestions/>);
 expect(await screen.findByRole("button",{name:"Confirm pass suggestion at 51.20s"})).toBeInTheDocument();
 expect(screen.queryByRole("button",{name:"Remove pass at 51.20s"})).toBeNull();
 await userEvent.click(screen.getByRole("button",{name:"Confirm pass suggestion at 51.20s"}));
 expect(screen.getByRole("button",{name:"Remove pass at 51.20s"})).toBeInTheDocument();
});
