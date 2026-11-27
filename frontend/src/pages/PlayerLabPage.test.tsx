import { screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../test/render";
import PlayerLabPage from "./PlayerLabPage";
const H="http://127.0.0.1:8766";
const match={id:"a",title:"261101 U11 v Town",age_group:"U11",capture_key:"a",moments:[{id:"p",category:"Sam Example",time_s:10,duration_s:10,actions:["passes"]}]};
function setup(){return stubFetch({[`${H}/library`]:[match],"/api/goals":{},"/api/scores":{},"/api/preferences":{primary_player_id:9},"/api/players/9":{id:9,display_name:"Sam Example",position:"CB",club_name:"Aston Villa"}});}
afterEach(()=>{vi.unstubAllGlobals();localStorage.clear();});
it("explores a recorded metric and opens supporting footage without source mutations",async()=>{
 const calls=setup();renderWithProviders(<PlayerLabPage account="admin@example.test"/>);
 await screen.findByRole("region",{name:"Recent five matches"});
 await userEvent.selectOptions(screen.getByLabelText("Metric"),"passes");
 const evidence=screen.getByRole("region",{name:"Stat evidence"});
 expect(within(evidence).getByText("Individual action")).toBeInTheDocument();
 expect(within(evidence).getByRole("link",{name:"0:10"})).toHaveAttribute("href","/hudl/a?player=Sam+Example&t=10");
 expect(calls).not.toContain(`${H}/account/action`);
});
it("persists coach feedback and validates manual percentages in an account-scoped notebook",async()=>{
 setup();renderWithProviders(<PlayerLabPage account="admin@example.test"/>);
 await screen.findByRole("region",{name:"Manual match record"});
 await userEvent.type(screen.getByLabelText("Passes attempted"),"10");
 await userEvent.type(screen.getByLabelText("Passes completed"),"8");
 await userEvent.type(screen.getByLabelText("Coach feedback / match notes"),"Review body position");
 await userEvent.click(screen.getByRole("button",{name:"Save match notebook"}));
 await userEvent.selectOptions(screen.getByLabelText("Metric"),"passAccuracy");
 expect(screen.getByRole("region",{name:"Metric coverage"})).toHaveTextContent("80%");
 const saved=JSON.parse(localStorage.getItem("fm.playerLab.v1:admin%40example.test")!);
 expect(saved.records[0].note).toBe("Review body position");
 expect(localStorage.getItem("fm.playerLab.v1:another%40example.test")).toBeNull();
});
it("adds and reviews a clip-linked development goal",async()=>{
 setup();renderWithProviders(<PlayerLabPage account="admin@example.test"/>);
 await screen.findByRole("region",{name:"Development goals"});
 await userEvent.type(screen.getByLabelText("Your next focus"),"Scan before receiving");
 await userEvent.selectOptions(screen.getByLabelText("Attach match"),"a");
 await userEvent.selectOptions(screen.getByLabelText("Attach moment"),"p");
 await userEvent.click(screen.getByRole("button",{name:"Add development goal"}));
 expect(screen.getByRole("link",{name:"Review linked moment"})).toHaveAttribute("href","/hudl/a?player=Sam+Example&t=10");
 await userEvent.click(screen.getByRole("checkbox",{name:"Reviewed: Scan before receiving"}));
 expect(screen.getByRole("progressbar",{name:"Goals reviewed"})).toHaveAttribute("aria-valuenow","1");
});
it("reports an unavailable library with a working retry",async()=>{
 vi.stubGlobal("fetch",vi.fn(async()=>new Response(null,{status:503})));
 renderWithProviders(<PlayerLabPage account="admin@example.test"/>);
 expect(await screen.findByRole("alert")).toHaveTextContent("metadata is unavailable");
 expect(screen.getByRole("button",{name:"Retry library"})).toBeEnabled();
});
it("does not expose another admin's existing notebook",async()=>{
 localStorage.setItem("fm.playerLab.v1:other%40example.test",JSON.stringify({version:1,records:[],goals:[{id:"g",player:"Sam Example",text:"Other account focus",due:"",done:false,match:"",moment:""}],picks:[]}));
 setup();renderWithProviders(<PlayerLabPage account="admin@example.test"/>);
 await waitFor(()=>expect(screen.getByRole("region",{name:"Development goals"})).toBeInTheDocument());
 expect(screen.queryByText("Other account focus")).toBeNull();
});

// Owner request 2026-11-27: "fix Performance Over Time, Recent Five Matches, Compare on fair terms".
it("opens on the player's main squad and fills the trend, recent five and teammate panels", async () => {
  const tg=(id:string,category:string,time_s:number,actions?:string[])=>({id,category,time_s,duration_s:10,...(actions?{actions}:{})});
  const m=(id:string,day:number,age:string)=>({id,title:`2611${String(day).padStart(2,"0")} ${age} v Town`,age_group:age,capture_key:id,
    moments:[tg(`${id}s`,"Sam Example",10,["passes"]),tg(`${id}a`,"Ali Demo",60,["passes"]),tg(`${id}b`,"Ali Demo",80,["passes"])]});
  const library=[m("u10",1,"U10"),m("a",2,"U11"),m("b",3,"U11"),m("c",4,"U11")];
  stubFetch({[`${H}/library`]:library,"/api/goals":{},"/api/scores":{},"/api/preferences":{primary_player_id:9},"/api/players/9":{id:9,display_name:"Sam Example",position:"CB",club_name:"Aston Villa"}});
  renderWithProviders(<PlayerLabPage account="admin@example.test"/>);
  await screen.findByRole("region",{name:"Recent five matches"});
  expect(screen.getByLabelText("Age group / squad")).toHaveValue("U11");
  await userEvent.selectOptions(screen.getByLabelText("Metric"),"passes");
  const trend=screen.getByRole("region",{name:"Performance over time"});
  expect(within(trend).getAllByRole("link",{name:/^Review .*Town/})).toHaveLength(3);
  expect(within(trend).getByRole("figure",{name:"Selection average headline"})).toHaveTextContent("1");
  expect(within(screen.getByRole("region",{name:"Recent five matches"})).getAllByRole("link")).toHaveLength(3);
  const compare=screen.getByRole("region",{name:"Teammate comparison"});
  expect(within(compare).getByRole("option",{name:"Ali Demo · 3 shared"})).toBeInTheDocument();
  await userEvent.selectOptions(within(compare).getByLabelText("Teammate"),"Ali Demo");
  expect(within(compare).getByRole("img",{name:"Passes: Sam Example 1, Ali Demo 2 per shared match"})).toBeInTheDocument();
});
