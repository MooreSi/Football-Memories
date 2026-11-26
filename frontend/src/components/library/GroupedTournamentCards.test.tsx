import {fireEvent,screen,within} from "@testing-library/react";
import {afterEach,expect,it,vi} from "vitest";
import {renderWithProviders,stubFetch} from "../../test/render";
import {TournamentProvider} from "./Tournaments";
import {GroupedTournaments,type GroupedLibraryGame} from "./GroupedTournaments";

const games:GroupedLibraryGame[]=[
  {key:"veo:cup",title:"261122 U11 v Rovers",href:"/veo/cup",date:"2026-11-22",source:"Veo",score:()=>({ours:4,theirs:1})},
  {key:"veo:ordinary",title:"261121 U11 v Town",href:"/veo/ordinary",date:"2026-11-21",source:"Veo",score:()=>({ours:2,theirs:0})},
];
const group={id:"cup",name:"November Cup",entries:{"veo:cup":"Riverside · Squad 1"}};
afterEach(()=>vi.unstubAllGlobals());
// The Library opens on All matches (owner request 2026-11-26); these tests start in Tournaments.
function mount(loading=false){
  stubFetch({"/api/tournaments":[group]});
  const result=renderWithProviders(<TournamentProvider compact><GroupedTournaments games={games} eligibleKeys={games.map(g=>g.key)} scores={[]} loading={loading}/></TournamentProvider>);
  fireEvent.click(screen.getByRole("button",{name:"Tournaments"}));
  return result;
}
it("uses the original large card renderer in All matches, Other matches and squad matches",async()=>{
  // The adapter's source card must survive every grouping view, with its score pill.
  const richGames=games.map(g=>({...g,renderCard:()=> <article className="tile"><a href={g.href} aria-label={g.title}><div className="aspect-video">Original thumbnail</div><span role="group" aria-label="Home 4, Rovers 1">4–1</span><h3>{g.title}</h3></a></article>}));
  stubFetch({"/api/tournaments":[group]});
  renderWithProviders(<TournamentProvider compact><GroupedTournaments games={richGames} eligibleKeys={games.map(g=>g.key)} scores={[]}/></TournamentProvider>);
  fireEvent.click(screen.getByRole("button",{name:"Tournaments"}));
  await screen.findByRole("button",{name:"Open squad Riverside · Squad 1"});
  const ordinary=screen.getByRole("region",{name:"Other matches"});
  expect(within(ordinary).getByText("Original thumbnail")).toBeInTheDocument();
  fireEvent.click(await screen.findByRole("button",{name:"Open squad Riverside · Squad 1"}));
  const squad=screen.getByRole("region",{name:"Riverside · Squad 1 tournament matches"});
  expect(within(squad).getByRole("group",{name:"Home 4, Rovers 1"})).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"All matches"}));
  expect(within(screen.getByRole("region",{name:"All cached matches"})).getAllByText("Original thumbnail")).toHaveLength(2);
});
it("shows a club crest for the entered squad rather than a shirt",async()=>{
  mount();
  const squad=await screen.findByRole("button",{name:"Open squad Riverside · Squad 1"});
  expect(squad.querySelector('[data-crest] img')).toHaveAttribute("src","/api/team-logo?name=Riverside");
});
it("does not insert a loading message above cards during background refresh",async()=>{
  mount(true);
  await screen.findByRole("button",{name:"Open squad Riverside · Squad 1"});
  expect(screen.queryByText("Loading cached matches…")).not.toBeInTheDocument();
  expect(within(screen.getByRole("region",{name:"Other matches"})).getByRole("link",{name:games[1].title})).toBeInTheDocument();
});
