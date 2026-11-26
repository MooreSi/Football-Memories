import {fireEvent,screen,within} from "@testing-library/react";
import {afterEach,expect,it,vi} from "vitest";
import {renderWithProviders,stubFetch} from "../test/render";
import {LibraryPage} from "./LibraryPage";

afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();localStorage.clear();});
it("renders original Hudl and Veo thumbnail cards with score pills in each grouping view",async()=>{
  vi.stubEnv("VITE_FM_GROUPED_TOURNAMENTS","1");
  const groups=[{id:"cup",name:"November Cup",entries:{"hudl:a":"Blue"}}];
  stubFetch({
    "/api/matches":{total:0,page:1,page_size:24,items:[]},
    "/api/stats":{matches:0,moments:0,footage_seconds:0,teams:0,players:0,top_tags:[],recent_moments:[]},
    "/api/preferences":{primary_player_id:null},"/api/teams":[],"/api/seasons":[],"/api/notes":[],"/api/watching":[],"/api/scores":{a:{ours:4,theirs:1}},
    "/api/settings/home-teams":{hudl:"Riverside",veo:"Riverside"},"/api/tournaments":groups,"/api/tournaments/detect":groups,
    "http://127.0.0.1:8766/library":[{id:"a",title:"261122 U11 v Rovers",age_group:"U11",season_label:"2026/27",thumbnail_url:"/test-hudl.jpg",moments:[]}],
    "http://127.0.0.1:8766/account":{configured:true,state:"ready",busy:false},"http://127.0.0.1:8766/downloads/index":[],
    "http://127.0.0.1:8766/veo/library":[{id:"b",source:"veo",title:"261121 Riverside vs Town",age_group:"U11",season_label:"2026/27",poster_url:"/test-veo.jpg",score:{ours:2,theirs:0},moments:[],available:true}],
    "http://127.0.0.1:8766/veo/account":{configured:true,state:"ready",busy:false},
  });
  renderWithProviders(<LibraryPage/>);
  // The Library opens on All matches (owner request 2026-11-26); this test starts in Tournaments.
  fireEvent.click(await screen.findByRole("button",{name:"Tournaments"}));
  const squad=await screen.findByRole("button",{name:"Open squad Blue"});
  expect(squad.querySelector('[data-crest] img')).toHaveAttribute("src","/api/team-logo?name=Riverside");
  const ordinary=screen.getByRole("region",{name:"Other matches"});
  expect(within(ordinary).getByRole("img",{name:"261121 Riverside vs Town"})).toHaveAttribute("src","/test-veo.jpg");
  expect(within(ordinary).getByRole("group",{name:"Riverside 2, Town 0"})).toHaveClass("rounded-full");
  fireEvent.click(squad);
  const matches=screen.getByRole("region",{name:"Blue tournament matches"});
  expect(within(matches).getByRole("img",{name:"261122 U11 v Rovers"})).toHaveAttribute("src","/test-hudl.jpg");
  expect(within(matches).getByRole("group",{name:"Riverside 4, Rovers 1"})).toHaveClass("rounded-full");
  fireEvent.click(screen.getByRole("button",{name:"All matches"}));
  expect(within(screen.getByRole("region",{name:"All cached matches"})).getAllByRole("link")).toHaveLength(2);
});
