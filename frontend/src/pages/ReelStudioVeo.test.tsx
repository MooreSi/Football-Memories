import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { stubFetch } from "../test/render";

vi.mock("../lib/reelCards", async (original) => ({
  ...(await original<typeof import("../lib/reelCards")>()),
  recordCard: vi.fn(async () => new Blob(["webm"], { type: "video/webm" })),
  loadCrest: vi.fn(async () => null),
}));
import { ReelStudioPage } from "./ReelStudioPage";
import { VeoMatchFull } from "./VeoMatchFullPage";

// Owner request 2026-11-13: highlight reels from Veo matches, named with the Veo
// team name (it may differ from the Hudl one). Synthetic data only.
const H = "http://127.0.0.1:8766";
const veo = [{ id: "veo-a", source: "veo", title: "261108 NL vs Northgate CB", age_group: "Unclassified", season_label: "2026/27",
  available: true, moments: [
    { id: "h1", category: "GOAL", time_s: 61, duration_s: 20 }, { id: "h2", category: "SHOT ON GOAL", time_s: 120, duration_s: 20 },
    { id: "h3", category: "GOAL", time_s: 900, duration_s: 20 }] }];
const idle = { configured: true, state: "ready", busy: false, message: "", summary: null };
beforeEach(() => { vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); sessionStorage.clear(); });

function stub(status: object = idle) {
  let n = 0;
  stubFetch({ [`${H}/veo/library`]: veo, [`${H}/veo/account`]: status, [`${H}/veo/action`]: { accepted: true },
    [`${H}/library`]: [], [`${H}/account`]: { state: "ready", busy: false, configured: true },
    "/api/settings/home-teams": { hudl: "Aston Villa", veo: "Norton Lindsay" }, "/api/notes": [],
    "/api/preferences": { primary_player_id: null }, "/api/matches": { total: 0, page: 1, page_size: 1, items: [] } });
  const base = vi.mocked(fetch).getMockImplementation()!;
  vi.mocked(fetch).mockImplementation(async (input, init) => {
    if (String(input) === `${H}/reel/cards`) { n += 1; return new Response(JSON.stringify({ card_id: `card-${n}-xxxxxxxxxxxxxx` }), { status: 200 }); }
    return base(input, init);
  });
}
const posts = () => vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === "POST")
  .map(([input, init]) => ({ url: String(input), body: JSON.parse(String(init?.body ?? "null")) }));

function studio(state: unknown) {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[{ pathname: "/clips/reel/new", state }]}>
      <Routes><Route path="/clips/reel/new" element={<ReelStudioPage />} /><Route path="/veo/:id" element={<VeoMatchFull id="veo-a" />} /></Routes>
    </MemoryRouter></QueryClientProvider>);
}

it("names a Veo reel and its match card with the Veo team, not the Hudl one", async () => {
  stub();
  studio({ source: "veo", items: [{ match_id: "veo-a", moment_ids: ["h1", "h3"] }] });
  const list = await screen.findByRole("list", { name: "Matches in this reel" });
  await vi.waitFor(() => expect(within(list).getByText(/Norton Lindsay v Northgate CB/)).toBeInTheDocument());
  expect(within(list).getByText(/2 moments/)).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Reel name" })).toHaveValue("Norton Lindsay vs. Northgate CB");
  expect(screen.queryByText(/Aston Villa/)).toBeNull();
  expect(screen.queryByRole("radio", { name: "One reel per match" })).toBeNull(); // one Veo match per reel
});

it("sends the Veo reel to the helper's Veo route with the recorded card ids", async () => {
  stub();
  studio({ source: "veo", items: [{ match_id: "veo-a", moment_ids: ["h1", "h3"] }] });
  const user = userEvent.setup();
  await screen.findByRole("list", { name: "Matches in this reel" });
  await vi.waitFor(() => expect(screen.getByRole("textbox", { name: "Reel name" })).toHaveValue("Norton Lindsay vs. Northgate CB"));
  await user.click(screen.getByRole("button", { name: /Make highlight reel/ }));
  await vi.waitFor(() => expect(posts().some(p => p.url === `${H}/veo/action`)).toBe(true));
  const sent = posts().find(p => p.url === `${H}/veo/action`)!.body;
  expect(sent).toEqual({ action: "reel", match_id: "veo-a", moment_ids: ["h1", "h3"], name: "Norton Lindsay vs. Northgate CB",
    match_label: "Norton Lindsay vs. Northgate CB",
    opening_card: "card-1-xxxxxxxxxxxxxx", match_card: "card-2-xxxxxxxxxxxxxx", closing_card: "card-3-xxxxxxxxxxxxxx" });
  expect(posts().some(p => p.url === `${H}/account/batch`)).toBe(false);
});

it("offers Save reel once the helper has made it", async () => {
  stub({ ...idle, state: "done", match_id: "veo-a", filename: "reels/Norton Lindsay (ab12cd34).mp4",
    message: "Highlight reel ready: 2 highlights.", download_url: `${H}/files/scope/reels/Norton%20Lindsay%20(ab12cd34).mp4` });
  studio({ source: "veo", items: [{ match_id: "veo-a", moment_ids: ["h1", "h3"] }] });
  const user = userEvent.setup();
  await vi.waitFor(() => expect(screen.getByRole("textbox", { name: "Reel name" })).toHaveValue("Norton Lindsay vs. Northgate CB"));
  await user.click(screen.getByRole("button", { name: /Make highlight reel/ }));
  expect(await screen.findByRole("link", { name: /Save reel/ })).toHaveAttribute("href", `${H}/files/scope/reels/Norton%20Lindsay%20(ab12cd34).mp4`);
});

it("asks for the Veo team name when Settings has none, rather than borrowing Hudl's", async () => {
  stub();
  const base = vi.mocked(fetch).getMockImplementation()!;
  vi.mocked(fetch).mockImplementation(async (input, init) => String(input) === "/api/settings/home-teams"
    ? new Response(JSON.stringify({ hudl: "Aston Villa", veo: null }), { status: 200 }) : base(input, init));
  studio({ source: "veo", items: [{ match_id: "veo-a", moment_ids: ["h1"] }] });
  const note = await screen.findByRole("note", { name: "Veo team name" });
  expect(within(note).getByRole("link", { name: /Settings/ })).toHaveAttribute("href", "/settings/connections");
  expect(screen.queryByText(/Aston Villa/)).toBeNull();
});
