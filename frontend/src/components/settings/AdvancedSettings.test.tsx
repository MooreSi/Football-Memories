import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/render";
import { AdvancedSettings } from "./AdvancedSettings";
vi.mock("../../api/hostedFlag",()=>({HOSTED:true}));
afterEach(()=>vi.unstubAllGlobals());
it("saves an individual lab switch without changing the other lab",async()=>{
 const person={id:"user-1",display_name:"Pat Example",email:"parent@example.test",self:false,player_lab:false,video_lab:false};
 const writes:unknown[]=[];
 vi.stubGlobal("fetch",vi.fn(async(url:RequestInfo|URL,init?:RequestInit)=>{
  if(String(url).endsWith("/me"))return Response.json({role:"admin",stage:"full",csrf_token:"test-csrf"});
  if(init?.method==="PATCH"){
   writes.push({body:JSON.parse(String(init.body)),headers:init.headers});
   person.video_lab=true;
   return Response.json({player_lab:false,video_lab:true});
  }
  return Response.json([person]);
 }));
 renderWithProviders(<AdvancedSettings/>);
 const video=await screen.findByRole("checkbox",{name:"Video Lab for parent@example.test"});
 await userEvent.click(video);
 await waitFor(()=>expect(video).toBeChecked());
 expect(screen.getByRole("checkbox",{name:"Player Lab for parent@example.test"})).not.toBeChecked();
 expect(writes).toEqual([{body:{video_lab:true},headers:{"Content-Type":"application/json","X-CSRF-Token":"test-csrf"}}]);
});
it("direct navigation by an ordinary user does not fetch the account list",async()=>{
 const fetcher=vi.fn(async()=>Response.json({role:"user",stage:"full"}));vi.stubGlobal("fetch",fetcher);
 renderWithProviders(<AdvancedSettings/>);
 expect(await screen.findByText(/only available to the signed-in admin/)).toBeInTheDocument();
 expect(fetcher.mock.calls).toHaveLength(1);
});
it("updates all libraries with CSRF and reports protected or failed libraries",async()=>{
 const posts:unknown[]=[];
 vi.stubGlobal("fetch",vi.fn(async(url:RequestInfo|URL,init?:RequestInit)=>{
  if(String(url).endsWith("/me"))return Response.json({role:"admin",stage:"full",csrf_token:"test-csrf"});
  if(String(url).endsWith("/all")){posts.push(init);return Response.json({updated:2,unchanged:1,failed:1});}
  return Response.json([]);
 }));
 renderWithProviders(<AdvancedSettings/>);
 await userEvent.click(await screen.findByRole("button",{name:"Update all users"}));
 expect(await screen.findByRole("status")).toHaveTextContent("Updated: 2. Unchanged or protected: 1. Failed: 1.");
 expect(posts).toEqual([{method:"POST",credentials:"same-origin",headers:{"X-CSRF-Token":"test-csrf"}}]);
});
