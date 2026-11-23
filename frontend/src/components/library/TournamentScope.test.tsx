import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/render";
import { TournamentProvider, TournamentSelect, TournamentTools } from "./Tournaments";

const groups = [
  {id:"current", name:"This season U11", entries:{"hudl:a":"Blue"}},
  {id:"other-age", name:"U12 Cup", entries:{"veo:b":"White"}},
  {id:"other-season", name:"Last season Cup", entries:{"hudl:c":"Blue"}},
];
afterEach(() => vi.unstubAllGlobals());

it("limits tournament choices to matching age and season memberships and resets a hidden selection", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(groups))));
  const {useState} = await import("react");
  function Harness() {
    const [keys,setKeys] = useState(["hudl:a"]);
    return <TournamentProvider><button onClick={() => setKeys(["veo:b"])}>Choose U12</button><TournamentTools games={[]} eligibleKeys={keys} /></TournamentProvider>;
  }
  renderWithProviders(<Harness />);
  await screen.findByRole("option", {name:"This season U11"});
  expect(screen.queryByRole("option", {name:"U12 Cup"})).not.toBeInTheDocument();
  expect(screen.queryByRole("option", {name:"Last season Cup"})).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Tournament"), {target:{value:"current"}});
  fireEvent.click(screen.getByText("Choose U12"));
  await waitFor(() => expect(screen.getByLabelText("Tournament")).toHaveValue(""));
  expect(screen.getByRole("option", {name:"U12 Cup"})).toBeInTheDocument();
});

it("renames directly from a grouped match without first choosing a filter", async () => {
  const fetcher=vi.fn(async (_url:string,init?:RequestInit) => new Response(JSON.stringify([{...groups[0], name:init?.method==="PATCH"?"November Festival":groups[0].name}])));
  vi.stubGlobal("fetch",fetcher);
  renderWithProviders(<TournamentProvider><TournamentTools games={[]} /><TournamentSelect matchKey="hudl:a" title="Game A" /></TournamentProvider>);
  fireEvent.click(await screen.findByRole("button", {name:"Rename tournament This season U11"}));
  fireEvent.change(screen.getByLabelText("New tournament name"),{target:{value:"November Festival"}});
  fireEvent.click(screen.getByRole("button",{name:"Save tournament name"}));
  await waitFor(() => expect(fetcher).toHaveBeenCalledWith("/api/tournaments/current",expect.objectContaining({method:"PATCH",body:JSON.stringify({name:"November Festival"})})));
  expect(await screen.findByRole("option",{name:"November Festival"})).toBeInTheDocument();
});
