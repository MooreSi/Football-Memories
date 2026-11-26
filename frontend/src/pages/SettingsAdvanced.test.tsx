import { screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders } from "../test/render";
import { SettingsLayout } from "./SettingsPage";
vi.mock("../api/hostedFlag",()=>({HOSTED:true}));
afterEach(()=>vi.unstubAllGlobals());
it("shows Advanced settings for a fully verified admin even when both labs are disabled",async()=>{
 vi.stubGlobal("fetch",vi.fn(async()=>Response.json({role:"admin",stage:"full",labs:{player_lab:false,video_lab:false}})));
 renderWithProviders(<SettingsLayout/>);
 expect(await screen.findByRole("link",{name:"Advanced"})).toHaveAttribute("href","/settings/advanced");
});
it("hides Advanced settings from a user with both labs granted",async()=>{
 vi.stubGlobal("fetch",vi.fn(async()=>Response.json({role:"user",stage:"full",labs:{player_lab:true,video_lab:true}})));
 renderWithProviders(<SettingsLayout/>);
 expect(screen.queryByRole("link",{name:"Advanced"})).toBeNull();
});
