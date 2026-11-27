import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/render";
import { AdvancedSettings } from "./AdvancedSettings";
vi.mock("../../api/hostedFlag",()=>({HOSTED:true}));
afterEach(()=>vi.unstubAllGlobals());
it("saves the admin split preference with fresh CSRF and explains the split",async()=>{
 const writes:RequestInit[]=[];
 let mode="local";
 vi.stubGlobal("fetch",vi.fn(async(url:RequestInfo|URL,init?:RequestInit)=>{
  if(String(url).endsWith("/me")) return Response.json({role:"admin",stage:"full",csrf_token:"fresh-csrf"});
  if(String(url).endsWith("/video-nodes")){
   if(init?.method==="PUT"){writes.push(init);mode=JSON.parse(String(init.body)).mode;}
   return Response.json({mode,local_ready:true,remote_ready:true});
  }
  return Response.json([]);
 }));
 renderWithProviders(<AdvancedSettings/>);
 const split=await screen.findByRole("radio",{name:"Split between both Macs"});
 await userEvent.click(split);
 await userEvent.click(screen.getByRole("button",{name:"Save analysis location"}));
 await waitFor(()=>expect(split).toBeChecked());
 expect(writes).toEqual([{method:"PUT",credentials:"same-origin",headers:{"Content-Type":"application/json","X-CSRF-Token":"fresh-csrf"},body:JSON.stringify({mode:"split"})}]);
 expect(screen.getByText(/pitch reconstruction on the mini.*player appearance on the MacBook/)).toBeInTheDocument();
});
it("disables remote choices while the MacBook is unavailable and keeps local usable",async()=>{
 vi.stubGlobal("fetch",vi.fn(async(url:RequestInfo|URL)=>{
  if(String(url).endsWith("/me")) return Response.json({role:"admin",stage:"full",csrf_token:"csrf"});
  if(String(url).endsWith("/video-nodes")) return Response.json({mode:"local",remote_ready:false,local_ready:true});
  return Response.json([]);
 }));
 renderWithProviders(<AdvancedSettings/>);
 expect(await screen.findByRole("radio",{name:"MacBook Pro"})).toBeDisabled();
 expect(screen.getByRole("radio",{name:"Split between both Macs"})).toBeDisabled();
 expect(screen.getByRole("radio",{name:"Local Mac mini"})).toBeEnabled();
 expect(screen.getByText(/MacBook Pro is unavailable/)).toBeInTheDocument();
});
it("never exposes node settings or fetches nodes for a non-admin",async()=>{
 const fetcher=vi.fn(async()=>Response.json({role:"user",stage:"full"}));vi.stubGlobal("fetch",fetcher);
 renderWithProviders(<AdvancedSettings/>);
 await screen.findByText(/only available to the signed-in admin/);
 expect(screen.queryByRole("radio")).toBeNull();
 expect(fetcher.mock.calls).toHaveLength(1);
});
