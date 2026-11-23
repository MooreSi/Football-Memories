import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/render";
import { TournamentProvider, TournamentTools, TournamentSelect } from "./Tournaments";

afterEach(() => vi.unstubAllGlobals());

it("selects several source-qualified games and saves a tournament with its entered team", async () => {
  const fetcher = vi.fn(async (_url: string, init?: RequestInit) => new Response(JSON.stringify(init?.method === "PUT" ? [
    { id: "cup", name: "Winter Cup", entries: {"hudl:one": "Blue", "veo:one": "Blue"} },
  ] : []), { headers: {"Content-Type": "application/json"} }));
  vi.stubGlobal("fetch", fetcher);
  renderWithProviders(<TournamentProvider>
    <TournamentTools games={[]} />
    <TournamentSelect matchKey="hudl:one" title="Game one" />
    <TournamentSelect matchKey="veo:one" title="Game two" />
  </TournamentProvider>);
  fireEvent.click(await screen.findByLabelText("Select Game one for tournament"));
  fireEvent.click(screen.getByLabelText("Select Game two for tournament"));
  fireEvent.click(screen.getByRole("button", {name: "Add to tournament (2)"}));
  fireEvent.change(screen.getByLabelText("Tournament name"), {target: {value: "Winter Cup"}});
  fireEvent.change(screen.getByLabelText("New squad name"), {target: {value: "Blue"}});
  fireEvent.click(screen.getByRole("button", {name: "Save 2 games"}));
  await waitFor(() => expect(fetcher).toHaveBeenCalledWith("/api/tournaments", expect.objectContaining({
    method: "PUT", body: JSON.stringify({name: "Winter Cup", team: "Blue", match_keys: ["hudl:one", "veo:one"]}),
  })));
  expect(await screen.findByText("2 games added to Winter Cup · Blue")).toBeInTheDocument();
  expect(screen.getByLabelText("Select Game one for tournament")).not.toBeChecked();
});

it("filters by entered team and shows score coverage, keeping unscored games out of results", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([
    {id: "cup", name: "Winter Cup", entries: {"hudl:one": "Blue", "veo:one": "White", "hudl:missing": "Blue"}},
  ]), {headers: {"Content-Type": "application/json"}})));
  renderWithProviders(<TournamentProvider>
    <TournamentTools games={[{key: "hudl:one", score: {ours: 4, theirs: 1}}, {key: "veo:one", score: {ours: 0, theirs: 2}}]} />
  </TournamentProvider>);
  await screen.findByRole("option", {name: "Winter Cup"});
  fireEvent.change(screen.getByLabelText("Tournament"), {target: {value: "cup"}});
  expect(screen.getByText("2 of 3 games have scores")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Tournament team"), {target: {value: "Blue"}});
  expect(screen.getByText("1 of 2 games have scores")).toBeInTheDocument();
  expect(screen.queryByRole("row", {name: /White/})).not.toBeInTheDocument();
});

it("retains selection and the dialog when saving fails", async () => {
  vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => new Response(JSON.stringify(init?.method ? {detail: "Save unavailable"} : []), {
    status: init?.method ? 503 : 200, headers: {"Content-Type": "application/json"},
  })));
  renderWithProviders(<TournamentProvider><TournamentTools games={[]} /><TournamentSelect matchKey="local:1" title="Game one" /></TournamentProvider>);
  fireEvent.click(await screen.findByLabelText("Select Game one for tournament"));
  fireEvent.click(screen.getByRole("button", {name: "Add to tournament (1)"}));
  fireEvent.change(screen.getByLabelText("Tournament name"), {target: {value: "Cup"}});
  fireEvent.change(screen.getByLabelText("New squad name"), {target: {value: "Blue"}});
  fireEvent.click(screen.getByRole("button", {name: "Save 1 game"}));
  expect(await screen.findByRole("alert")).toHaveTextContent("Save unavailable");
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByLabelText("Select Game one for tournament")).toBeChecked();
});

it("keeps the batch action available after selecting a game and opens the saved tournament", async () => {
  vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => new Response(JSON.stringify(init?.method === "PUT" ? [
    {id: "cup", name: "Cup", entries: {"hudl:one": "Blue"}},
  ] : []), {headers: {"Content-Type": "application/json"}})));
  renderWithProviders(<TournamentProvider><TournamentTools games={[]} /><TournamentSelect matchKey="hudl:one" title="Game one" /></TournamentProvider>);
  fireEvent.click(await screen.findByLabelText("Select Game one for tournament"));
  fireEvent.click(screen.getByRole("button", {name: "Add selected games (1)"}));
  fireEvent.change(screen.getByLabelText("Tournament name"), {target: {value: "Cup"}});
  fireEvent.change(screen.getByLabelText("New squad name"), {target: {value: "Blue"}});
  fireEvent.click(screen.getByRole("button", {name: "Save 1 game"}));
  await screen.findByText("1 games added to Cup · Blue");
  expect(screen.getByLabelText("Tournament")).toHaveValue("cup");
  expect(screen.getByLabelText("Tournament team")).toHaveValue("Blue");
  expect(screen.getByRole("group", {name: "Blue tournament stats"})).toBeInTheDocument();
});

it("removes only selected memberships from the active tournament", async () => {
  const fetcher = vi.fn(async (_url: string, init?: RequestInit) => new Response(JSON.stringify([
    {id: "cup", name: "Cup", entries: init?.method === "DELETE" ? {} : {"hudl:one": "Blue"}},
  ]), {headers: {"Content-Type": "application/json"}}));
  vi.stubGlobal("fetch", fetcher);
  renderWithProviders(<TournamentProvider><TournamentTools games={[]} /><TournamentSelect matchKey="hudl:one" title="Game one" /></TournamentProvider>);
  await screen.findByRole("option", {name:"Cup"});
  fireEvent.change(screen.getByLabelText("Tournament"), {target: {value: "cup"}});
  expect(screen.getByRole("group", {name: "Blue tournament stats"})).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Select Game one for tournament"));
  fireEvent.click(screen.getByRole("button", {name: "Remove selected from this tournament"}));
  expect(await screen.findByText("Selected games removed from this tournament")).toBeInTheDocument();
  expect(fetcher).toHaveBeenCalledWith("/api/tournaments/cup/matches/hudl%3Aone", expect.objectContaining({method: "DELETE"}));
  expect(screen.queryByRole("group", {name: "Blue tournament stats"})).not.toBeInTheDocument();
});
