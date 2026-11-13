import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { stubFetch } from "../../test/render";
import { OpponentMap } from "./OpponentMap";
import { TopMoments } from "./TopMoments";

afterEach(() => vi.unstubAllGlobals());

function Studio() {
  const state = useLocation().state as { items: unknown; name: string };
  return <pre data-testid="studio">{JSON.stringify(state)}</pre>;
}
function mount(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/player/5"]}><Routes>
    <Route path="/player/5" element={ui} /><Route path="/clips/reel/new" element={<Studio />} />
  </Routes></MemoryRouter></QueryClientProvider>);
}

it("shows each club played with its crest, how often, and links to the latest match", () => {
  mount(<OpponentMap series={[
    { match_id: 1, match_date: "2026-09-01", opponent: "Rovers", moments: 10 },
    { match_id: 2, match_date: "2026-10-01", opponent: "Rovers", moments: 20, href: "/hudl/r?player=Sam" },
    { match_id: 3, match_date: "2026-10-08", opponent: "Town", moments: 5 },
  ]} />);
  const panel = screen.getByRole("region", { name: "Opponent map" });
  expect(within(panel).getByText("2 clubs")).toBeInTheDocument();
  const rovers = within(panel).getByRole("link", { name: /Rovers/ });
  expect(rovers).toHaveAttribute("href", "/hudl/r?player=Sam");
  expect(rovers).toHaveTextContent("2 matches");
  expect(rovers.querySelector("[data-crest]")).not.toBeNull();
  expect(within(panel).getByRole("link", { name: "All opponents" })).toHaveAttribute("href", "/opponents");
});

const library = [{ id: "b", title: "261001 U11 v Town (A)", age_group: "U11", capture_key: "b", moments: [
  { id: "b1", category: "Sam Example", time_s: 50, duration_s: 10 }, { id: "bv", category: "SAVE", time_s: 55, duration_s: 5 },
  { id: "b2", category: "Sam Example", time_s: 900, duration_s: 10 }, { id: "bg", category: "GOAL", time_s: 905, duration_s: 5 },
] }];

it("plays the top moments and makes them into a reel in one click", async () => {
  stubFetch({ "/api/players/5/moments": { total: 0, items: [] } });
  mount(<TopMoments playerId={5} name="Sam Example" library={library} />);
  const panel = await screen.findByRole("region", { name: "Top 5 moments" });
  const cards = within(within(panel).getByRole("list", { name: "Top moments" })).getAllByRole("listitem");
  expect(cards).toHaveLength(2);
  expect(within(cards[0]).getByRole("link", { name: /Play/ })).toHaveAttribute("href", "/hudl/b?moment=b2");
  expect(cards[0]).toHaveTextContent("Team goal");
  await userEvent.setup().click(within(panel).getByRole("button", { name: "Make a reel" }));
  expect(JSON.parse(screen.getByTestId("studio").textContent!)).toEqual({ items: [{ match_id: "b", moment_ids: ["b2", "b1"] }], name: "Sam's top moments" });
});

it("puts favourites first and makes an imported-only reel through the reels API", async () => {
  stubFetch({
    "/api/players/5/moments": { total: 1, items: [{ event_id: 7, match_id: 3, time_s: 64, duration_s: 6, category: "Save", players: [], favourite: true, viewed: true,
      match_date: "2026-09-01", opponent: "Rovers", team_name: "Riverside", age_group: "U11", season_label: "2026/27", thumbnail_url: null }] },
    "/api/reels": { id: 12, name: "Sam's top moments", items: [] },
  });
  mount(<TopMoments playerId={5} name="Sam Example" library={[]} />);
  const panel = await screen.findByRole("region", { name: "Top 5 moments" });
  const card = await within(panel).findByRole("listitem");
  expect(card).toHaveTextContent("Favourite");
  expect(within(card).getByRole("link", { name: /Play/ })).toHaveAttribute("href", "/matches/3?moment=7");
  await userEvent.setup().click(within(panel).getByRole("button", { name: "Make a reel" }));
  const post = vi.mocked(fetch).mock.calls.find(([u, i]) => u === "/api/reels" && i?.method === "POST");
  expect(JSON.parse(String(post?.[1]?.body))).toEqual({ name: "Sam's top moments", items: [{ event_id: 7, pre_s: null, post_s: null }] });
});

it("is left out when there is nothing to show", async () => {
  stubFetch({ "/api/players/5/moments": { total: 0, items: [] } });
  mount(<TopMoments playerId={5} name="Sam" library={[]} />);
  await new Promise((r) => setTimeout(r, 20));
  expect(screen.queryByRole("region", { name: "Top 5 moments" })).toBeNull();
});
