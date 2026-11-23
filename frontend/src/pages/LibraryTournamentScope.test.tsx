import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../test/render";
import { LibraryPage } from "./LibraryPage";

const groups = [
  {id:"current",name:"Current U11 Cup",entries:{"hudl:a":"Blue"}},
  {id:"age",name:"Current U12 Cup",entries:{"hudl:b":"Blue"}},
  {id:"season",name:"Previous U11 Cup",entries:{"hudl:c":"Blue"}},
];
afterEach(() => {vi.unstubAllGlobals();localStorage.clear();});

it("connects the Library age and season controls to tournament choices independently of search", async () => {
  stubFetch({
    "/api/matches":{total:0,page:1,page_size:24,items:[]},
    "/api/stats":{matches:0,moments:0,footage_seconds:0,teams:0,players:0,top_tags:[],recent_moments:[]},
    "/api/preferences":{primary_player_id:null},"/api/teams":[],"/api/seasons":[],"/api/notes":[],"/api/watching":[],"/api/scores":{},
    "/api/settings/home-teams":{hudl:"Riverside",veo:null},
    "/api/tournaments":groups,"/api/tournaments/detect":groups,
    "http://127.0.0.1:8766/library":[
      {id:"a",title:"261122 U11 v Town",age_group:"U11",season_label:"2026/27",moments:[]},
      {id:"b",title:"261122 U12 v Rovers",age_group:"U12",season_label:"2026/27",moments:[]},
      {id:"c",title:"251122 U11 v City",age_group:"U11",season_label:"2025/26",moments:[]},
    ],
    "http://127.0.0.1:8766/account":{configured:true,state:"ready",busy:false},
    "http://127.0.0.1:8766/veo/library":[],
    "http://127.0.0.1:8766/veo/account":{configured:false,state:"idle",busy:false},
  });
  renderWithProviders(<LibraryPage />);
  const region=await screen.findByRole("region",{name:"All matches"});
  await screen.findByRole("option",{name:"Current U11 Cup"});
  fireEvent.change(screen.getByLabelText("Age group"),{target:{value:"U11"}});
  fireEvent.change(screen.getByLabelText("Season"),{target:{value:"2026/27"}});
  await waitFor(() => expect(screen.queryByRole("option",{name:"Current U12 Cup"})).not.toBeInTheDocument());
  expect(screen.queryByRole("option",{name:"Previous U11 Cup"})).not.toBeInTheDocument();
  expect(screen.getByRole("option",{name:"Current U11 Cup"})).toBeInTheDocument();
  fireEvent.change(within(region).getByLabelText("Search matches"),{target:{value:"absent opponent"}});
  expect(screen.getByRole("option",{name:"Current U11 Cup"})).toBeInTheDocument();
});
