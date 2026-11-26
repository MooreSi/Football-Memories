import {fireEvent,screen,within,waitFor} from "@testing-library/react";
import {afterEach,expect,it,vi} from "vitest";
import {renderWithProviders,stubFetch} from "../../test/render";
import {TournamentProvider} from "./Tournaments";
import {GroupedTournaments,type GroupedLibraryGame} from "./GroupedTournaments";
const group={id:"cup",name:"Cup",entries:{"hudl:a":"Blue","hudl:b":"White","hudl:c":"Team unassigned"}};
const games:GroupedLibraryGame[]=Object.keys(group.entries).map(key=>({key,title:key,href:"/"+key,date:"2026-10-26",source:"Hudl",score:()=>null}));
afterEach(()=>vi.unstubAllGlobals());
// The Library opens on All matches (owner request 2026-11-26); these tests start in Tournaments.
function mount(){const calls=stubFetch({"/api/tournaments":[group]});renderWithProviders(<TournamentProvider compact><GroupedTournaments games={games} eligibleKeys={games.map(g=>g.key)} scores={[]}/></TournamentProvider>);fireEvent.click(screen.getByRole("button",{name:"Tournaments"}));return calls;}
it("counts only assigned squads and offers a separate review group",async()=>{
  mount();
  await screen.findByRole("button",{name:"Open squad Blue"});
  expect(screen.getByRole("button",{name:/3 matches · 2 squads/})).toBeInTheDocument();
  expect(screen.queryByRole("button",{name:"Open squad Team unassigned"})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"Review 1 unassigned game"}));
  expect(screen.getByRole("region",{name:"Team unassigned tournament matches"})).toHaveTextContent("hudl:c");
});
it("keeps All matches free of edit, selection and add-tournament controls",async()=>{
  mount();await screen.findByRole("button",{name:"Open squad Blue"});
  fireEvent.click(screen.getByRole("button",{name:"All matches"}));
  expect(screen.queryByRole("button",{name:"Add tournament"})).not.toBeInTheDocument();
  const all=screen.getByRole("region",{name:"All cached matches"});
  expect(within(all).queryByRole("checkbox")).not.toBeInTheDocument();
  expect(within(all).queryByRole("button",{name:/Correct tournament/})).not.toBeInTheDocument();
});
it("lets an unassigned game choose an existing squad and sends that assignment",async()=>{
  mount();await screen.findByRole("button",{name:"Open squad Blue"});
  fireEvent.click(screen.getByRole("button",{name:"Review 1 unassigned game"}));
  fireEvent.click(screen.getByRole("button",{name:"Correct tournament for hudl:c"}));
  fireEvent.change(screen.getByRole("combobox",{name:"Entered home team"}),{target:{value:"White"}});
  fireEvent.click(screen.getByRole("button",{name:"Save 1 game"}));
  await waitFor(()=>expect(fetch).toHaveBeenCalledWith("/api/tournaments",expect.objectContaining({method:"PUT",body:JSON.stringify({name:"Cup",team:"White",match_keys:["hudl:c"]})})));
});
it("lets the owner create a new squad from the dropdown",async()=>{
  mount();await screen.findByRole("button",{name:"Open squad Blue"});
  fireEvent.click(screen.getByRole("button",{name:"Open squad Blue"}));
  fireEvent.click(screen.getByRole("button",{name:"Correct squad"}));
  fireEvent.change(screen.getByRole("combobox",{name:"Entered home team"}),{target:{value:"__new__"}});
  fireEvent.change(screen.getByLabelText("New squad name"),{target:{value:"Green"}});
  fireEvent.click(screen.getByRole("button",{name:"Save 1 game"}));
  await waitFor(()=>expect(fetch).toHaveBeenCalledWith("/api/tournaments",expect.objectContaining({method:"PUT",body:JSON.stringify({name:"Cup",team:"Green",match_keys:["hudl:a"]})})));
});
