import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../test/render";
import { VeoMatchPage } from "./VeoMatchPage";

// Spec 260: one Veo match from the cache; Watch and Download go through the desktop helper.
const LIB = "http://127.0.0.1:8766/veo/library";
const STATUS = "http://127.0.0.1:8766/veo/account";
const ACTION = "http://127.0.0.1:8766/veo/action";
const idle = { configured: true, busy: false, state: "ready", message: "", summary: null };
const match = {
  id: "veo-a", source: "veo", title: "260901 Riverside U11 vs Rovers", age_group: "U11", season_label: "2026/27", team: "Riverside U11",
  available: true, expiration_status: "does-not-expire-soon", home_or_away: "home", duration_s: 3600, score: { ours: 3, theirs: 1 },
  halves: [[0, 1500], [1800, 3300]],
  moments: [
    { id: "h2", category: "SHOT", time_s: 125, duration_s: 10, ai: true },
    { id: "h1", category: "GOAL", time_s: 61, duration_s: 10, note: "Top corner" },
    { id: "h3", category: "GOAL", time_s: 1900, duration_s: 10 },
  ],
};
afterEach(() => vi.unstubAllGlobals());
const open = (id: string) => renderWithProviders(<Routes><Route path="/veo/:id" element={<VeoMatchPage />} /></Routes>, `/veo/${id}`);

it("shows the match details, halves and Veo highlights by type in match order", async () => {
  stubFetch({ [LIB]: [match], [STATUS]: idle });
  open("veo-a");
  expect(await screen.findByRole("heading", { name: /Riverside U11 vs Rovers/ })).toBeInTheDocument();
  expect(screen.getByText("3–1")).toBeInTheDocument();
  expect(screen.getByText(/Home/)).toBeInTheDocument();
  expect(screen.getByText(/1st half 0:00–25:00/)).toBeInTheDocument();
  const types = screen.getByRole("list", { name: "Highlight types" });
  expect(within(types).getByText("GOAL").closest("li")).toHaveTextContent("2");
  expect(within(types).getByText("SHOT").closest("li")).toHaveTextContent("1");
  const rows = within(screen.getByRole("list", { name: "Veo highlights" })).getAllByRole("listitem");
  expect(rows.map(r => r.textContent)).toEqual([
    expect.stringMatching(/1:01.*GOAL.*Top corner/), expect.stringMatching(/2:05.*SHOT.*Veo AI/), expect.stringMatching(/31:40.*GOAL/),
  ]);
  expect(document.querySelector("video")).toBeNull();
});

it("explains an expired match and an unknown id", async () => {
  stubFetch({ [LIB]: [{ ...match, available: false, expiration_status: "expired", moments: [] }], [STATUS]: idle });
  const { unmount } = open("veo-a");
  expect(await screen.findByText(/Veo no longer has the video/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Watch|Download/ })).toBeNull();
  unmount();
  stubFetch({ [LIB]: [match], [STATUS]: idle });
  open("veo-zzz");
  expect(await screen.findByText(/not in the Veo cache/)).toBeInTheDocument();
});

const sent = () => vi.mocked(fetch).mock.calls.filter(([u]) => u === ACTION).map(([, init]) => JSON.parse(String(init?.body)));

it("watches the match through the helper and jumps to a highlight", async () => {
  stubFetch({ [LIB]: [match], [ACTION]: { accepted: true },
    [STATUS]: { ...idle, match_id: "veo-a", stream_url: "http://127.0.0.1:8766/veo/stream/tok" } });
  const user = userEvent.setup();
  open("veo-a");
  await user.click(await screen.findByRole("button", { name: "Watch match" }));
  expect(sent()).toContainEqual({ action: "watch", match_id: "veo-a" });
  const video = await screen.findByLabelText("Veo match video") as HTMLVideoElement;
  expect(video).toHaveAttribute("src", "http://127.0.0.1:8766/veo/stream/tok");
  expect(video).toHaveAttribute("crossorigin", "anonymous");
  await user.click(screen.getByRole("button", { name: /31:40 GOAL/ }));
  expect(video.currentTime).toBe(1900);
});

it("does not play another match's stream", async () => {
  stubFetch({ [LIB]: [match], [STATUS]: { ...idle, match_id: "veo-other", stream_url: "http://127.0.0.1:8766/veo/stream/x" } });
  open("veo-a");
  await screen.findByRole("button", { name: "Watch match" });
  expect(document.querySelector("video")).toBeNull();
});

it("shows download progress and blocks a second operation meanwhile", async () => {
  stubFetch({ [LIB]: [match],
    [STATUS]: { ...idle, busy: true, state: "working", match_id: "veo-a", message: "Downloading the Veo match… 120 of 900 MB",
      progress: { done: 120, total: 900, fraction: 0.13 } } });
  open("veo-a");
  expect(await screen.findByRole("status")).toHaveTextContent("120 of 900 MB");
  expect(screen.getByRole("button", { name: "Download full match" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Watch match" })).toBeDisabled();
});

it("starts a full-match download in the helper", async () => {
  stubFetch({ [LIB]: [match], [ACTION]: { accepted: true }, [STATUS]: idle });
  open("veo-a");
  const button = await screen.findByRole("button", { name: "Download full match" });
  await userEvent.setup().click(button);
  expect(sent()).toContainEqual({ action: "download", match_id: "veo-a" });
});
