import { screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/render";
import { MacStatusLight } from "./MacStatusLight";

afterEach(()=>vi.unstubAllGlobals());
const serve=(body:unknown,status=200)=>vi.stubGlobal("fetch",vi.fn(async(url:RequestInfo|URL)=>
 String(url).endsWith("/_admin/api/video-nodes")?Response.json(body,{status}):new Response("",{status:404})));

it("shows a green light when the gateway reports the MacBook ready",async()=>{
 serve({mode:"local",local_ready:true,remote_ready:true});
 renderWithProviders(<MacStatusLight/>);
 const light=await screen.findByRole("status",{name:"MacBook Pro connected"});
 expect(light.querySelector("[data-light]")).toHaveAttribute("data-light","on");
});
it("shows a red light when the MacBook is not ready",async()=>{
 serve({mode:"local",local_ready:true,remote_ready:false});
 renderWithProviders(<MacStatusLight/>);
 const light=await screen.findByRole("status",{name:"MacBook Pro not connected"});
 expect(light.querySelector("[data-light]")).toHaveAttribute("data-light","off");
});
it("shows red, not green, when the status cannot be read",async()=>{
 serve({},503);
 renderWithProviders(<MacStatusLight/>);
 expect(await screen.findByRole("status",{name:"MacBook Pro status unavailable"})).toBeInTheDocument();
 expect(screen.queryByRole("status",{name:"MacBook Pro connected"})).toBeNull();
});
it("stays hidden and never calls the admin API for a granted non-admin user",async()=>{
 const {selectVideoLabEndpoint}=await import("../../api/videoLabEndpoint");
 selectVideoLabEndpoint("user");
 try{
  serve({mode:"local",local_ready:true,remote_ready:true});
  renderWithProviders(<MacStatusLight/>);
  await new Promise(r=>setTimeout(r,20));
  expect(fetch).not.toHaveBeenCalled();
  expect(screen.queryByRole("status")).toBeNull();
 }finally{selectVideoLabEndpoint("admin");}
});
