import { screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders } from "../test/render";
import { PlayerLabAccess } from "./PlayerLabAccess";
import { VideoLabLink } from "./VideoLabAccess";
vi.mock("../api/hostedFlag",()=>({HOSTED:true}));
afterEach(()=>vi.unstubAllGlobals());
it("respects the admin's disabled player lab",async()=>{
 vi.stubGlobal("fetch",vi.fn(async()=>Response.json({role:"admin",stage:"full",email:"admin@example.test",labs:{player_lab:false,video_lab:true}})));
 renderWithProviders(<PlayerLabAccess>{()=> <p>Player feature mounted</p>}</PlayerLabAccess>);
 expect(await screen.findByText(/Only the signed-in admin/)).toBeInTheDocument();
 expect(screen.queryByText("Player feature mounted")).toBeNull();
});
it("allows a granted user's video lab independently of player lab",async()=>{
 vi.stubGlobal("fetch",vi.fn(async()=>Response.json({role:"user",stage:"full",email:"parent@example.test",labs:{player_lab:false,video_lab:true}})));
 renderWithProviders(<VideoLabLink/>);
 expect(await screen.findByRole("link",{name:/Video Lab/})).toBeInTheDocument();
});
it("opens a granted user's video lab through the user portal API",async()=>{
 const requests:string[]=[];
 vi.stubGlobal("fetch",vi.fn(async(url:RequestInfo|URL)=>{
  requests.push(String(url));
  return Response.json(String(url).endsWith("/me")?{role:"user",stage:"full",email:"parent@example.test",labs:{video_lab:true}}:[]);
 }));
 const {VideoLabRoute}=await import("./VideoLabAccess");
 renderWithProviders(<VideoLabRoute/>);
 expect(await screen.findByRole("heading",{name:"Video analysis lab"})).toBeInTheDocument();
 expect(requests).toContain("/_portal/api/video-analytics/jobs");
 expect(requests.some(url=>url.startsWith("/_admin/"))).toBe(false);
});
