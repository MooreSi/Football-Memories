import { screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders } from "../test/render";
import { LabelFramesRoute, VideoLabLink, VideoLabRoute } from "./VideoLabAccess";
vi.mock("../api/hostedFlag",()=>({HOSTED:true}));
afterEach(()=>vi.unstubAllGlobals());
it.each([{role:"user",stage:"full"},{role:"admin",stage:"mfa"},{role:"admin",stage:"mfa_setup"},{}])("denies video lab and never asks for samples for %j",async me=>{
 const fetchMock=vi.fn(async(_url:RequestInfo|URL)=>Response.json(me));vi.stubGlobal("fetch",fetchMock);
 renderWithProviders(<><VideoLabLink/><VideoLabRoute/></>);
 expect(await screen.findByText(/Only the signed-in admin/)).toBeInTheDocument();
 expect(screen.queryByRole("link",{name:/Video Lab/})).toBeNull();
 expect(fetchMock.mock.calls.every(call=>String(call[0]).includes("/_portal/api/me"))).toBe(true);
});
it("exposes navigation only after full admin verification",async()=>{
 vi.stubGlobal("fetch",vi.fn(async()=>Response.json({role:"admin",stage:"full",email:"admin@example.test"})));
 renderWithProviders(<VideoLabLink/>);
 expect(await screen.findByRole("link",{name:/Video Lab/})).toHaveAttribute("href","/video-lab");
});
it.each([{role:"user",stage:"full"},{role:"admin",stage:"mfa"},{}])("denies frame labelling and never asks for label sets for %j",async me=>{
 const fetchMock=vi.fn(async(_url:RequestInfo|URL)=>Response.json(me));vi.stubGlobal("fetch",fetchMock);
 renderWithProviders(<LabelFramesRoute/>);
 expect(await screen.findByText(/Only the signed-in admin/)).toBeInTheDocument();
 expect(fetchMock.mock.calls.every(call=>String(call[0]).includes("/_portal/api/me"))).toBe(true);
});
it("opens frame labelling for the fully verified admin",async()=>{
 vi.stubGlobal("fetch",vi.fn(async(url:RequestInfo|URL)=>String(url).endsWith("/label-sets")?Response.json([]):Response.json({role:"admin",stage:"full",email:"admin@example.test"})));
 renderWithProviders(<LabelFramesRoute/>);
 expect(await screen.findByText(/No frames waiting/)).toBeInTheDocument();
});
