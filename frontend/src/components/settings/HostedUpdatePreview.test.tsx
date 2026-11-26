import { screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../../test/render";
import { HostedUpdateSettings } from "./HostedUpdateSettings";
vi.mock("../../api/hostedFlag",()=>({HOSTED:true}));
afterEach(()=>vi.unstubAllGlobals());
it("explains why a separate preview build is protected",async()=>{
 stubFetch({"/_portal/api/update":{current:"b".repeat(40),latest:"a".repeat(40),available:false,auto_update:false,checked_at:null}});
 renderWithProviders(<HostedUpdateSettings/>);
 expect(await screen.findByText(/Preview build kept/)).toBeInTheDocument();
 expect(screen.queryByRole("button",{name:"Update now"})).toBeNull();
});
