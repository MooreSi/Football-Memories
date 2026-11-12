import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../test/render";
import { HudlMatchPage } from "./HudlMatchPage";
import { LibraryPage } from "./LibraryPage";

// Spec 210 (owner request 2026-11-12): a score per match, from goal tags or the owner's correction.
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });

const H = "http://127.0.0.1:8766";
let n = 0;
const tags = (category: string, k: number) => Array.from({ length: k }, () => ({ id: String(n++), category, time_s: n, duration_s: 5 }));
const stoke = { id: "stoke", title: "261108 U11 v Stoke (A)", age_group: "U11", age_groups: ["U11"], season_label: "2026/27", tag_status: "synced",
  moments: [...tags("ASTON VILLA GOAL", 4), ...tags("OPPOSITION GOAL", 3), ...tags("ASTON VILLA GOAL KICK", 6), ...tags("OPPOSITION KICK OFF", 4)] };
const derby = { id: "derby", title: "261101 U11 v Derby (H)", age_group: "U11", age_groups: ["U11"], season_label: "2026/27", tag_status: "synced",
  moments: [...tags("ASTON VILLA KICK OFF", 2), ...tags("OPPOSITION KICK OFF", 2)] };

function library(corrections: Record<string, unknown>) {
  localStorage.setItem("fm.hudl.age", "U11");
  stubFetch({
    "/api/matches": { total: 0, page: 1, page_size: 24, items: [] },
    "/api/stats": { matches: 0, moments: 0, footage_seconds: 0, teams: 0, players: 0, top_tags: [], recent_moments: [] },
    "/api/preferences": { primary_player_id: null }, "/api/teams": [], "/api/seasons": [],
    "/api/scores": corrections,
    [`${H}/library`]: [stoke, derby],
    [`${H}/account`]: { configured: true, state: "ready", busy: false },
  });
  renderWithProviders(<LibraryPage />);
}

it("shows the tagged score on the hero and the latest match panel, labelled as from tags", async () => {
  library({});
  const hero = await screen.findByRole("region", { name: "Featured match" });
  expect(await within(hero).findByRole("group", { name: "Home 4, Stoke City 3" })).toBeInTheDocument();
  const panel = screen.getByRole("region", { name: "Latest match" });
  expect(within(panel).getByText("4–3")).toBeInTheDocument();
  expect(within(panel).getByText("From tags")).toBeInTheDocument();
});

it("shows vs, not 0-0, when a match has no goal tags", async () => {
  library({});
  const hero = await screen.findByRole("region", { name: "Featured match" });
  await userEvent.setup().click(within(hero).getByRole("button", { name: "Next match" }));
  const panel = screen.getByRole("region", { name: "Selected match" });
  expect(within(panel).getByText("vs")).toBeInTheDocument();
  expect(within(panel).queryByText("From tags")).toBeNull();
  expect(within(hero).getByRole("group", { name: "Home vs Derby County" })).toBeInTheDocument();
});

it("prefers the owner's corrected score", async () => {
  library({ stoke: { ours: 5, theirs: 3 } });
  const panel = await screen.findByRole("region", { name: "Latest match" });
  expect(await within(panel).findByText("5–3")).toBeInTheDocument();
  expect(within(panel).getByText("Corrected")).toBeInTheDocument();
});

it("lets the owner correct the score on the match page and go back to the tags", async () => {
  let saved: Record<string, { ours: number; theirs: number }> = {};
  const puts: unknown[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input).split("?")[0];
    const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { "Content-Type": "application/json" } });
    if (url === "/api/scores" && init?.method === "PUT") {
      const body = JSON.parse(String(init.body)); puts.push(body);
      if (body.ours === null) { const { [body.match_id]: _, ...rest } = saved; saved = rest; } else saved = { ...saved, [body.match_id]: { ours: body.ours, theirs: body.theirs } };
      return json(saved);
    }
    if (url === "/api/scores") return json(saved);
    if (url === `${H}/library`) return json([stoke]);
    if (url === `${H}/account`) return json({ configured: true, state: "idle", busy: false });
    if (url === "/api/preferences") return json({ primary_player_id: null });
    if (url === "/api/matches") return json({ total: 0, page: 1, page_size: 1, items: [] });
    return json({ accepted: true });
  }));
  renderWithProviders(<Routes><Route path="/hudl/:id" element={<HudlMatchPage />} /></Routes>, "/hudl/stoke");
  const user = userEvent.setup();
  const score = await screen.findByRole("group", { name: "Score" });
  expect(within(score).getByText("4–3")).toBeInTheDocument();
  expect(within(score).getByText("From tags")).toBeInTheDocument();

  await user.click(within(score).getByRole("button", { name: "Correct score" }));
  const ours = within(score).getByLabelText("Our goals"), theirs = within(score).getByLabelText("Their goals");
  await user.clear(ours); await user.type(ours, "5");
  await user.clear(theirs); await user.type(theirs, "3");
  await user.click(within(score).getByRole("button", { name: "Save score" }));
  expect(puts).toContainEqual({ match_id: "stoke", ours: 5, theirs: 3 });
  expect(await within(score).findByText("5–3")).toBeInTheDocument();
  expect(within(score).getByText("Corrected")).toBeInTheDocument();

  await user.click(within(score).getByRole("button", { name: "Use tagged score" }));
  expect(puts).toContainEqual({ match_id: "stoke", ours: null, theirs: null });
  expect(await within(score).findByText("4–3")).toBeInTheDocument();
});
