import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/render";
import { AutomaticTournaments } from "./AutomaticTournaments";
import { TournamentProvider, TournamentSelect, TournamentTools } from "./Tournaments";

const group = {id: "auto", name: "Match day · 2026-11-22 · U11", entries: {"hudl:a": "Riverside · Squad 1"}, automatic: {"hudl:a": {confidence: "review", reason: "Same date and numbered games. Overlapping player tags."}}};
const hudl = [{id: "a", capture_key: "a", title: "261122 U11 v Rovers (Game 1)", age_group: "U11", moments: [
  {id: "1", category: "Pat Example", time_s: 1, duration_s: 10}, {id:"2", category:"Period Start", time_s:0,duration_s:1},
]}];
afterEach(() => vi.unstubAllGlobals());

it("automatically submits cached metadata and reruns when the player evidence changes", async () => {
  const fetcher = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify([group]), {headers:{"Content-Type":"application/json"}}));
  vi.stubGlobal("fetch", fetcher);
  const view = renderWithProviders(<AutomaticTournaments hudl={hudl} veo={[]} club="Riverside" veoClubOf={() => null} importedVersion={0} />);
  await waitFor(() => expect(fetcher).toHaveBeenCalledWith("/api/tournaments/detect", expect.objectContaining({method:"POST"})));
  const first = JSON.parse(fetcher.mock.calls[0][1]?.body as string);
  expect(first.matches[0]).toEqual({key:"hudl:a", title:hudl[0].title, club:"Riverside", age_group:"U11", players:["PAT EXAMPLE"]});
  view.unmount();
  renderWithProviders(<AutomaticTournaments hudl={[{...hudl[0], moments:[...hudl[0].moments, {id:"3",category:"Alex Demo",time_s:30,duration_s:10}]}]} veo={[]} club="Riverside" veoClubOf={() => null} importedVersion={0} />);
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  expect(JSON.parse(fetcher.mock.calls[1][1]?.body as string).matches[0].players).toEqual(["ALEX DEMO", "PAT EXAMPLE"]);
});

it("shows automatic evidence and opens a prefilled correction dialog from the card", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([group]), {headers:{"Content-Type":"application/json"}})));
  renderWithProviders(<TournamentProvider><TournamentTools games={[]} /><TournamentSelect matchKey="hudl:a" title="Game one" /></TournamentProvider>);
  expect(await screen.findByText("Auto · Review")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Why grouped?"));
  expect(screen.getByText(group.automatic["hudl:a"].reason)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", {name:"Correct tournament for Game one"}));
  expect(screen.getByLabelText("Tournament name")).toHaveValue(group.name);
  expect(screen.getByLabelText("Entered home team")).toHaveValue("Riverside · Squad 1");
});

it("renames an automatic tournament without replacing its identity", async () => {
  const fetcher = vi.fn(async (_url: string, init?: RequestInit) => new Response(JSON.stringify([{...group, name:init?.method === "PATCH" ? "Winter Cup" : group.name}]), {headers:{"Content-Type":"application/json"}}));
  vi.stubGlobal("fetch", fetcher);
  renderWithProviders(<TournamentProvider><TournamentTools games={[]} /></TournamentProvider>);
  await screen.findByRole("option", {name:group.name});
  fireEvent.change(screen.getByLabelText("Tournament"), {target:{value:"auto"}});
  fireEvent.click(screen.getByRole("button", {name:"Rename tournament"}));
  fireEvent.change(screen.getByLabelText("New tournament name"), {target:{value:"Winter Cup"}});
  fireEvent.click(screen.getByRole("button", {name:"Save tournament name"}));
  expect(await screen.findByRole("option", {name:"Winter Cup"})).toHaveValue("auto");
  expect(fetcher).toHaveBeenCalledWith("/api/tournaments/auto", expect.objectContaining({method:"PATCH", body:JSON.stringify({name:"Winter Cup"})}));
});

it("reprocesses changed tags in the same mounted library", async () => {
  const { useState } = await import("react");
  function LibraryHarness() {
    const [tagged, setTagged] = useState(false);
    const matches = tagged ? [{...hudl[0], moments:[...hudl[0].moments, {id:"new",category:"Alex Demo",time_s:30,duration_s:10}]}] : hudl;
    return <><button onClick={() => setTagged(true)}>New player tags arrived</button><AutomaticTournaments hudl={matches} veo={[]} club="Riverside" veoClubOf={() => null} importedVersion={0} /></>;
  }
  const fetcher = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify([group]), {headers:{"Content-Type":"application/json"}}));
  vi.stubGlobal("fetch", fetcher);
  renderWithProviders(<LibraryHarness />);
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole("button", {name:"New player tags arrived"}));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  expect(JSON.parse(fetcher.mock.calls[1][1]?.body as string).matches[0].players).toEqual(["ALEX DEMO", "PAT EXAMPLE"]);
});
