import { screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders } from "../test/render";
import { PlayerLabAccess } from "./PlayerLabAccess";
vi.mock("../api/hostedFlag",()=>({HOSTED:true}));
afterEach(()=>vi.unstubAllGlobals());
it("loads the feature only for a fully signed-in admin",async()=>{
 vi.stubGlobal("fetch",vi.fn(async()=>new Response(JSON.stringify({role:"admin",stage:"full",email:"admin@example.test"}))));
 renderWithProviders(<PlayerLabAccess>{account=><p>Lab for {account}</p>}</PlayerLabAccess>);
 expect(await screen.findByText("Lab for admin@example.test")).toBeInTheDocument();
});
it.each([{role:"user",stage:"full"},{role:"admin",stage:"mfa"},{role:"admin",stage:"mfa_setup"},{}])("does not mount children for an unapproved identity %j",async me=>{
 const child=vi.fn(()=> <p>Private lab</p>);
 vi.stubGlobal("fetch",vi.fn(async()=>new Response(JSON.stringify(me))));
 renderWithProviders(<PlayerLabAccess>{child}</PlayerLabAccess>);
 expect(await screen.findByText(/Only the signed-in admin/)).toBeInTheDocument();
 expect(child).not.toHaveBeenCalled();
});
it("fails closed after an unsuccessful identity check",async()=>{
 vi.stubGlobal("fetch",vi.fn(async()=>new Response(null,{status:401})));
 const child=vi.fn(()=> <p>Private lab</p>);
 renderWithProviders(<PlayerLabAccess>{child}</PlayerLabAccess>);
 expect(await screen.findByText(/Only the signed-in admin/)).toBeInTheDocument();
 expect(child).not.toHaveBeenCalled();
});
it("local installations cannot acquire lab access even with an admin-shaped identity",async()=>{
 const {allowedLabIdentity}=await import("./PlayerLabAccess");
 expect(allowedLabIdentity({role:"admin",stage:"full",email:"admin@example.test"},false)).toBeNull();
 expect(allowedLabIdentity({role:"admin",stage:"full",email:"admin@example.test"},true)).toBe("admin@example.test");
});
