import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { App } from "../App";
import { renderWithProviders, stubFetch } from "../test/render";
vi.mock("../api/hostedFlag",()=>({HOSTED:true}));
// Preserve the real player/chooser and app navigation; source checks stay offline.
vi.mock("./hudl/useHudlAutoCheck",()=>({useHudlAutoCheck:()=>undefined}));
vi.mock("./veo/useVeoAutoCheck",()=>({useVeoAutoCheck:()=>undefined}));
afterEach(()=>{vi.unstubAllGlobals();localStorage.clear();});
function setup(role="admin",primary:number|null=null){
 stubFetch({"/_portal/api/me":{role,stage:"full",email:"admin@example.test"},"/_portal/api/connections":{hudl:{confirmed_at:"2026-11-23"},veo:{confirmed_at:null}},"/_portal/api/update":{},"/api/alerts/seen":{},"/api/preferences":{primary_player_id:primary},"/api/players":[],[`${window.location.origin}/helper/library`]:[],"/api/players/5":{id:5,display_name:"Sam Example",shirt_number:"1",position:"GK",photo_url:null,is_primary:true,totals:{matches:0,moments:0,unwatched:0,favourites:0},categories:[],teams:[],per_match:[],teammates:[],first_match_date:null,latest_match_date:null},"/api/players/5/moments":{total:0,items:[]}});
}
it("gives the admin a separate active Player Lab tab without selecting My Player",async()=>{
 setup();renderWithProviders(<App/>,"/player-lab");
 const nav=screen.getByRole("navigation",{name:"Main"});
 const lab=await within(nav).findByRole("link",{name:/Player lab/i});
 expect(lab).toHaveAttribute("href","/player-lab");
 expect(lab).toHaveAttribute("aria-current","page");
 expect(within(nav).getByRole("link",{name:"My Player"})).not.toHaveAttribute("aria-current");
});
it("My Player returns from the lab to the original player chooser and can reopen preview",async()=>{
 setup();renderWithProviders(<App/>,"/player-lab");
 const nav=screen.getByRole("navigation",{name:"Main"});
 await within(nav).findByRole("link",{name:/Player lab/i});
 await userEvent.click(within(nav).getByRole("link",{name:"My Player"}));
 expect(await screen.findByRole("heading",{name:"Choose your player"})).toBeInTheDocument();
 expect(within(nav).getByRole("link",{name:"My Player"})).toHaveAttribute("aria-current","page");
 expect(within(nav).getByRole("link",{name:/Player lab/i})).not.toHaveAttribute("aria-current");
 await userEvent.click(within(nav).getByRole("link",{name:/Player lab/i}));
 expect(await screen.findByRole("heading",{name:"Every number has a story."})).toBeInTheDocument();
});
it("does not add a private tab for ordinary accounts",async()=>{
 setup("user");renderWithProviders(<App/>,"/player-lab");
 expect(await screen.findByText(/Only the signed-in admin/)).toBeInTheDocument();
 expect(within(screen.getByRole("navigation",{name:"Main"})).queryByRole("link",{name:/Player lab/i})).toBeNull();
});
it("old preview bookmarks redirect without selecting My Player",async()=>{
 setup();renderWithProviders(<App/>,"/player/lab");
 const nav=screen.getByRole("navigation",{name:"Main"});
 expect(await within(nav).findByRole("link",{name:/Player lab/i})).toHaveAttribute("aria-current","page");
 expect(within(nav).getByRole("link",{name:"My Player"})).not.toHaveAttribute("aria-current");
});

it("My Player restores the original saved player card and hub after visiting preview",async()=>{
 setup("admin",5);renderWithProviders(<App/>,"/player-lab");
 const nav=screen.getByRole("navigation",{name:"Main"});
 await within(nav).findByRole("link",{name:/Player lab/i});
 await userEvent.click(within(nav).getByRole("link",{name:"My Player"}));
 expect(await screen.findByRole("figure",{name:"Sam Example player card"})).toBeInTheDocument();
 expect(screen.getByRole("region",{name:"Memories timeline"})).toBeInTheDocument();
 expect(screen.queryByRole("heading",{name:"Every number has a story."})).toBeNull();
});
