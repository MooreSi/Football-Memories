import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { MomentItem, ReelDetail } from "../api/types";
import { renderWithProviders } from "../test/render";
import { ReelBuilderPage } from "./ReelBuilderPage";
import { ReelsPage } from "./ReelsPage";

const mk = (event_id: number, category: string, time_s: number): MomentItem => ({
  event_id, match_id: 1, time_s, duration_s: 0, category, players: ["Sam"], note: "", favourite: false, viewed: true,
  team_name: "Riverside", opponent: "Rovers", match_date: "2026-10-18", season_label: "2026/27", age_group: "U12",
  media_id: 1, stream_url: "/api/media/1/stream", thumbnail_url: null, match_duration_s: 3600, offline: true,
});

const reel = (over: Partial<ReelDetail> = {}): ReelDetail => ({
  id: 4, name: "Best saves", status: "draft", progress: 0, error: null, item_count: 2, planned_seconds: 26,
  output_relpath: null, output_bytes: null, output_duration_s: null, output_width: null, output_height: null,
  video_url: null, thumbnail_url: null, updated_at: "2026-11-09T12:00:00Z", rendered_at: null,
  opening_title: "Best saves", opening_subtitle: null, closing_text: null, has_opening_card: false, has_closing_card: false,
  items: [
    { id: 1, position: 0, pre_s: null, post_s: null, start_s: 52, end_s: 65, moment: mk(11, "Save", 60) },
    { id: 2, position: 1, pre_s: null, post_s: null, start_s: 112, end_s: 125, moment: mk(12, "Claim", 120) },
  ],
  ...over,
});

beforeAll(() => {
  HTMLMediaElement.prototype.load = vi.fn();
  HTMLMediaElement.prototype.play = vi.fn(async () => undefined);
  HTMLMediaElement.prototype.pause = vi.fn();
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never; // jsdom cannot draw
});
afterEach(() => vi.unstubAllGlobals());

function mockApi(detail: ReelDetail) {
  const calls: { method: string; url: string; body?: unknown }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    calls.push({ method, url, body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined });
    let out: unknown;
    if (url === "/api/settings") out = { clip_pre_s: 8, clip_post_s: 5 };
    else if (url === "/api/reels") out = [detail];
    else if (url.startsWith("/api/reels/4/render")) out = { ...detail, status: "queued" };
    else if (url.startsWith("/api/reels/4")) out = detail;
    return new Response(JSON.stringify(out ?? { detail: "unstubbed" }), { status: out === undefined ? 599 : 200, headers: { "Content-Type": "application/json" } });
  }));
  return calls;
}

function renderBuilder() {
  return renderWithProviders(<Routes><Route path="/clips/reels/:id" element={<ReelBuilderPage />} /></Routes>, "/clips/reels/4");
}

describe("ReelBuilderPage", () => {
  it("lists the clips with their windows from the saved timing", async () => {
    mockApi(reel());
    renderBuilder();
    const list = await screen.findByRole("list", { name: "Reel clips" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(within(list).getByText("0:52-1:05")).toBeInTheDocument();
  });

  it("saves reordered clips with per-clip trims, then asks for a render", async () => {
    const calls = mockApi(reel());
    renderBuilder();
    await screen.findByRole("list", { name: "Reel clips" });
    await userEvent.click(screen.getByRole("button", { name: "Move clip 2 up" }));
    fireEvent.change(screen.getByLabelText("Seconds before Claim 1"), { target: { value: "3" } });
    await userEvent.click(screen.getByRole("button", { name: /Render video/ }));
    await screen.findByText(/Waiting to start/);
    const put = calls.find((c) => c.method === "PUT" && c.url === "/api/reels/4");
    expect((put?.body as { items: unknown }).items).toEqual([
      { event_id: 12, pre_s: 3, post_s: null },
      { event_id: 11, pre_s: null, post_s: null },
    ]);
    expect(calls.some((c) => c.method === "POST" && c.url === "/api/reels/4/render")).toBe(true);
  });

  it("offers the finished video for download", async () => {
    mockApi(reel({ status: "done", video_url: "/api/reels/4/video", output_duration_s: 29, output_width: 1920,
      output_height: 1080, output_bytes: 52428800, output_relpath: "FootballMemories/Compilations/Best saves (4).mp4" }));
    renderBuilder();
    const ready = await screen.findByRole("region", { name: "Finished reel" });
    expect(within(ready).getByRole("link", { name: /Download MP4/ })).toHaveAttribute("href", "/api/reels/4/video?download=1");
    expect(within(ready).getByText("1920 x 1080")).toBeInTheDocument();
  });

  it("shows why a render failed", async () => {
    mockApi(reel({ status: "failed", error: "the video for vs Rovers (2026-10-18) is missing" }));
    renderBuilder();
    expect(await screen.findByRole("alert")).toHaveTextContent("is missing");
  });
});

describe("ReelsPage", () => {
  it("lists reels with their status", async () => {
    mockApi(reel({ status: "rendering", progress: 0.4 }));
    renderWithProviders(<ReelsPage />);
    const link = await screen.findByRole("link", { name: /Best saves/ });
    expect(link).toHaveAttribute("href", "/clips/reels/4");
    expect(within(link).getByText("Rendering")).toBeInTheDocument();
  });
});
