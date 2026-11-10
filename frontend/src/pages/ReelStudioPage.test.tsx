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

const H = "http://127.0.0.1:8766";
const library = [
  { id: "stoke", title: "261108 U11 v Stoke (A)", age_group: "U11", capture_key: "k", moments: [
    { id: "a", category: "Sam Example", time_s: 1, duration_s: 2 }, { id: "b", category: "Goal", time_s: 9, duration_s: 2 }] },
  { id: "wba", title: "261101 U11s v West Brom (A)", age_group: "U11", capture_key: "j", moments: [
    { id: "c", category: "Sam Example", time_s: 3, duration_s: 2 }] },
];
beforeEach(() => { vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); sessionStorage.clear(); });

function renderStudio(state: unknown) {
  let n = 0;
  const calls = stubFetch({ [`${H}/library`]: library, [`${H}/account`]: { state: "ready", busy: false, configured: true },
    [`${H}/account/batch`]: { accepted: true }, "/api/preferences": { primary_player_id: null },
    "/api/matches": { total: 0, page: 1, page_size: 1, items: [] } });
  const base = vi.mocked(fetch).getMockImplementation()!;
  vi.mocked(fetch).mockImplementation(async (input, init) => {
    if (String(input) === `${H}/reel/cards`) { n += 1; return new Response(JSON.stringify({ card_id: `card-${n}-xxxxxxxxxxxxxx` }), { status: 200 }); }
    return base(input, init);
  });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[{ pathname: "/clips/reel/new", state }]}>
        <Routes><Route path="/clips/reel/new" element={<ReelStudioPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return calls;
}

it("auto-fills a card for each match and makes the reel with uploaded animated cards", async () => {
  renderStudio({ items: [{ match_id: "stoke", codes: ["Sam Example"] }, { match_id: "wba", codes: ["Sam Example"] }], name: "Sam Example highlights" });
  const matches = await screen.findByRole("list", { name: "Matches in this reel" });
  const first = await within(matches).findByText(/Stoke City/);
  expect(first).toBeInTheDocument();
  expect(within(matches).getByText(/8 November 2026/)).toBeInTheDocument();
  expect(within(matches).getByText(/1 November 2026/)).toBeInTheDocument();
  expect(screen.getAllByRole("radio", { name: "Trophy gold" }).length).toBeGreaterThan(0);
  await userEvent.click(screen.getByRole("button", { name: /Make highlight reel/ }));
  await vi.waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([u]) => String(u) === `${H}/account/batch`)).toBe(true));
  const uploads = vi.mocked(fetch).mock.calls.filter(([u]) => String(u) === `${H}/reel/cards`);
  expect(uploads).toHaveLength(4); // opening, two match cards, closing
  const batch = vi.mocked(fetch).mock.calls.find(([u]) => String(u) === `${H}/account/batch`)!;
  const body = JSON.parse(String(batch[1]?.body));
  expect(body.combined).toBe(true);
  expect(body.reel).toEqual({ name: "Sam Example highlights", opening_card: "card-1-xxxxxxxxxxxxxx", closing_card: "card-4-xxxxxxxxxxxxxx" });
  expect(body.items).toEqual([
    { match_id: "stoke", codes: ["Sam Example"], card_id: "card-2-xxxxxxxxxxxxxx" },
    { match_id: "wba", codes: ["Sam Example"], card_id: "card-3-xxxxxxxxxxxxxx" },
  ]);
});

it("can leave out the per-match cards", async () => {
  renderStudio({ items: [{ match_id: "stoke", moment_ids: ["a"] }] });
  await screen.findByRole("list", { name: "Matches in this reel" });
  await userEvent.click(screen.getByRole("checkbox", { name: "Title card before each match" }));
  await userEvent.click(screen.getByRole("button", { name: /Make highlight reel/ }));
  await vi.waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([u]) => String(u) === `${H}/account/batch`)).toBe(true));
  const batch = vi.mocked(fetch).mock.calls.find(([u]) => String(u) === `${H}/account/batch`)!;
  expect(JSON.parse(String(batch[1]?.body)).items).toEqual([{ match_id: "stoke", moment_ids: ["a"] }]);
});

it("asks for moments when opened without a selection", async () => {
  renderStudio(null);
  expect(await screen.findByText(/Choose moments first/)).toBeInTheDocument();
});
