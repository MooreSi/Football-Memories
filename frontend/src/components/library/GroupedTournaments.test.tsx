import {fireEvent,screen,within} from "@testing-library/react";
import {afterEach,expect,it,vi} from "vitest";
import {renderWithProviders,stubFetch} from "../../test/render";
import {TournamentProvider} from "./Tournaments";
import {GroupedTournaments,type GroupedLibraryGame} from "./GroupedTournaments";

const group={id:"nov",name:"November Festival",entries:{"hudl:a":"Blue","veo:b":"White"}};
const games:GroupedLibraryGame[]=[
  {key:"hudl:a",title:"261122 U11 v Rovers (Game 1)",href:"/hudl/a",date:"2026-11-22",source:"Hudl",score:()=>({ours:4,theirs:1})},
  {key:"veo:b",title:"261122 U11 v Town (Game 2)",href:"/veo/b",date:"2026-11-22",source:"Veo",score:()=>null},
  {key:"hudl:ordinary",title:"261121 U11 v City (9v9)",href:"/hudl/ordinary",date:"2026-11-21",source:"Hudl",score:()=>null},
];
afterEach(()=>vi.unstubAllGlobals());
function renderLibrary(eligibleKeys=games.map(g=>g.key)){
  stubFetch({"/api/tournaments":[group],"/api/tournaments/nov/matches/hudl%3Aa":[group]});
  return renderWithProviders(<TournamentProvider compact><GroupedTournaments games={games} eligibleKeys={eligibleKeys} scores={[{key:"hudl:a",score:{ours:4,theirs:1}}]} /></TournamentProvider>);
}
it("opens dated tournament rows into squads and then the selected squad matches",async()=>{
  renderLibrary();
  fireEvent.click(await screen.findByRole("button",{name:"Open squad Blue"}));
  const matches=screen.getByRole("region",{name:"Blue tournament matches"});
  expect(within(matches).getByRole("link",{name:games[0].title})).toHaveAttribute("href","/hudl/a");
  expect(within(matches).queryByRole("link",{name:games[1].title})).not.toBeInTheDocument();
  expect(screen.getByText("1 of 1 games have scores")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"All squads"}));
  fireEvent.click(screen.getByRole("button",{name:"Open squad White"}));
  expect(screen.getByRole("region",{name:"White tournament matches"})).toHaveTextContent(games[1].title);
  expect(screen.getByText("0 of 1 games have scores")).toBeInTheDocument();
});
it("keeps ordinary games outside tournament groups and removes the permanent settings panel",async()=>{
  renderLibrary();
  await screen.findByRole("button",{name:"Open squad Blue"});
  const ordinary=screen.getByRole("region",{name:"Other matches"});
  expect(within(ordinary).getByRole("link",{name:games[2].title})).toBeInTheDocument();
  expect(within(ordinary).queryByRole("link",{name:games[0].title})).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Tournament",{exact:true})).not.toBeInTheDocument();
});
it("can select games in All matches and open the existing real assignment dialog",async()=>{
  renderLibrary();
  fireEvent.click(await screen.findByRole("button",{name:"All matches"}));
  fireEvent.click(screen.getByLabelText(`Select ${games[2].title} for tournament`));
  fireEvent.click(screen.getByRole("button",{name:"Add selected games (1)"}));
  expect(screen.getByRole("dialog",{name:"Add games to tournament"})).toBeInTheDocument();
});
it("limits groups to matching member keys from the current age and season",async()=>{
  renderLibrary(["hudl:ordinary"]);
  expect(await screen.findByText("No tournaments match these filters.")).toBeInTheDocument();
  expect(screen.queryByRole("button",{name:"Open squad Blue"})).not.toBeInTheDocument();
});
it("keeps removing a mistaken membership available in the compact squad view",async()=>{
  renderLibrary();
  fireEvent.click(await screen.findByRole("button",{name:"Open squad Blue"}));
  fireEvent.click(screen.getByLabelText(`Select ${games[0].title} for tournament`));
  fireEvent.click(screen.getByRole("button",{name:"Remove selected from this tournament"}));
  expect(await screen.findByText("Selected games removed from this tournament")).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith("/api/tournaments/nov/matches/hudl%3Aa",expect.objectContaining({method:"DELETE"}));
});
it("offers the whole-event rename dialog without collapsing squad navigation",async()=>{
  renderLibrary();
  fireEvent.click(await screen.findByRole("button",{name:"Rename tournament November Festival"}));
  const dialog=screen.getByRole("dialog",{name:"Rename tournament"});
  fireEvent.change(within(dialog).getByLabelText("New tournament name"),{target:{value:"Winter Festival"}});
  expect(dialog).toBeInTheDocument();
  expect(dialog).toHaveTextContent("Applies to all 2 games and every entered team");
});
