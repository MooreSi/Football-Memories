import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { MomentItem } from "../api/types";
import { renderWithProviders } from "../test/render";
import { ClipExplorerPage } from "./ClipExplorerPage";

const mk = (event_id: number, category: string, opponent: string, time_s: number): MomentItem => ({
  event_id, match_id: event_id < 3 ? 1 : 2, time_s, duration_s: 0, category, players: ["Sam"], note: "",
  favourite: false, viewed: false, team_name: "Riverside", opponent, match_date: "2026-10-18",
  season_label: "2026/27", age_group: "U12", media_id: 1, stream_url: "/api/media/1/stream",
  thumbnail_url: `/api/events/${event_id}/thumbnail`, match_duration_s: 3600, offline: true,
});
const items = [mk(1, "Save", "Rovers", 60), mk(2, "Goal", "Rovers", 120), mk(3, "GK Claim", "City", 30)];
const facets = {
  categories: [{ id: null, name: "Save", count: 1 }, { id: null, name: "Goal", count: 1 }, { id: null, name: "GK Claim", count: 1 }],
  players: [{ id: 1, name: "Sam", count: 3 }], teams: [{ id: 1, name: "Riverside", count: 3 }],
  seasons: [{ id: 1, name: "2026/27", count: 3 }], matches: [],
};

beforeAll(() => {
  // jsdom has no media playback
  HTMLMediaElement.prototype.load = vi.fn();
  HTMLMediaElement.prototype.play = vi.fn(async () => undefined);
  HTMLMediaElement.prototype.pause = vi.fn();
});
afterEach(() => vi.unstubAllGlobals());

function mockApi() {
  const calls: { method: string; url: string; body?: unknown }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    calls.push({ method, url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const path = url.split("?")[0];
    const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });
    if (path === "/api/moments") return json({ total: items.length, items });
    if (path === "/api/moments/facets") return json(facets);
    if (path === "/api/playlists" && method === "POST") return json({ id: 9, name: "Best", items }, 201);
    if (path === "/api/playlists") return json([]);
    return json({ detail: `unstubbed ${method} ${url}` }, 599);
  }));
  return calls;
}

describe("ClipExplorerPage", () => {
  it("lists matching moments with their key facts", async () => {
    mockApi();
    renderWithProviders(<ClipExplorerPage />);
    const results = await screen.findByRole("region", { name: "Matching moments" });
    expect(await within(results).findByText("3 moments")).toBeInTheDocument();
    expect(within(results).getByRole("article", { name: "Goal vs Rovers at 2:00" })).toBeInTheDocument();
  });

  it("Play all puts every result in the queue in order", async () => {
    mockApi();
    renderWithProviders(<ClipExplorerPage />);
    await userEvent.click(await screen.findByRole("button", { name: /Play all/ }));
    const queue = screen.getByRole("list", { name: "Play queue" });
    expect(within(queue).getAllByRole("listitem").map((li) => li.textContent?.replace(/\s+/g, " "))).toEqual([
      expect.stringContaining("Save"), expect.stringContaining("Goal"), expect.stringContaining("GK Claim"),
    ]);
  });

  it("filters by an event type through the rail", async () => {
    const calls = mockApi();
    renderWithProviders(<ClipExplorerPage />);
    await userEvent.click(await screen.findByRole("button", { name: /^Goal/ }));
    expect(calls.some((c) => c.url.includes("category=Goal"))).toBe(true);
  });

  it("saves the reordered queue as a playlist", async () => {
    const calls = mockApi();
    renderWithProviders(<ClipExplorerPage />);
    await userEvent.click(await screen.findByRole("button", { name: /Play all/ }));
    await userEvent.click(screen.getByRole("button", { name: "Move GK Claim up" }));
    await userEvent.click(screen.getByRole("button", { name: "Save the queue as a playlist" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Playlist name" }), "Best{Enter}");
    const post = calls.find((c) => c.method === "POST" && c.url === "/api/playlists");
    expect(post?.body).toEqual({ name: "Best", event_ids: [1, 3, 2] });
  });
});
