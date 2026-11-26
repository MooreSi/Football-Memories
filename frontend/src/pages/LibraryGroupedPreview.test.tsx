import {fireEvent,screen,waitFor} from "@testing-library/react";
import {afterEach,expect,it,vi} from "vitest";
import {renderWithProviders,stubFetch} from "../test/render";
import {LibraryPage} from "./LibraryPage";
import {groupedTournamentsEnabled} from "../components/library/GroupedTournaments";

afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();localStorage.clear();});
it("enables the released presentation by default for normal builds",()=>{
  vi.stubEnv("VITE_FM_GROUPED_TOURNAMENTS",undefined);
  expect(groupedTournamentsEnabled()).toBe(true);
});
it("uses scoped event rows in the released grouped presentation",async()=>{
  vi.stubEnv("VITE_FM_GROUPED_TOURNAMENTS","1");
  const groups=[{id:"current",name:"Current U11 Cup",entries:{"hudl:a":"Blue"}},{id:"other",name:"Current U12 Cup",entries:{"hudl:b":"White"}}];
  stubFetch({
    "/api/matches":{total:0,page:1,page_size:24,items:[]},
    "/api/stats":{matches:0,moments:0,footage_seconds:0,teams:0,players:0,top_tags:[],recent_moments:[]},
    "/api/preferences":{primary_player_id:null},"/api/teams":[],"/api/seasons":[],"/api/notes":[],"/api/watching":[],"/api/scores":{},
    "/api/settings/home-teams":{hudl:"Riverside",veo:null},"/api/tournaments":groups,"/api/tournaments/detect":groups,
    "http://127.0.0.1:8766/library":[
      {id:"a",title:"261122 U11 v Town",age_group:"U11",season_label:"2026/27",moments:[]},
      {id:"b",title:"261122 U12 v Rovers",age_group:"U12",season_label:"2026/27",moments:[]},
    ],
    "http://127.0.0.1:8766/account":{configured:true,state:"ready",busy:false},
    "http://127.0.0.1:8766/veo/library":[],"http://127.0.0.1:8766/veo/account":{configured:false,state:"idle",busy:false},
  });
  renderWithProviders(<LibraryPage/>);
  // The Library opens on All matches (owner request 2026-11-26); this test starts in Tournaments.
  fireEvent.click(await screen.findByRole("button",{name:"Tournaments"}));
  expect(await screen.findByRole("region",{name:"Current U12 Cup"})).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Age group"),{target:{value:"U11"}});
  await waitFor(()=>expect(screen.queryByRole("region",{name:"Current U12 Cup"})).not.toBeInTheDocument());
  expect(screen.getByRole("region",{name:"Current U11 Cup"})).toBeInTheDocument();
  expect(screen.queryByRole("combobox",{name:"Tournament"})).not.toBeInTheDocument();
});

it("retains an explicit rollback to the previous Library",()=>{
  vi.stubEnv("VITE_FM_GROUPED_TOURNAMENTS","0");
  expect(groupedTournamentsEnabled()).toBe(false);
});
