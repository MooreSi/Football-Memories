import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../../test/render";
import { MediaLibraryPanel } from "./MediaLibraryPanel";

afterEach(() => vi.unstubAllGlobals());
const H = "http://127.0.0.1:8766";
const entries = [
  { kind: "match" as const, match_id: "stoke", matches: ["stoke"], title: "261108 U11 v Stoke (A)", file: "hudl-x.mp4", url: "",
    moment_count: 3, codes: [] as string[], combined: false, created: 0, size: 1, modified: 0 },
];
const library = [{ id: "stoke", title: "261108 U11 v Stoke (A)", age_group: "U11", age_groups: ["U11"], capture_key: "x",
  moments: [{ id: "1", time_s: 1, duration_s: 1, category: "ASTON VILLA GOAL" }] }];
const app = { "/api/preferences": { primary_player_id: 7 }, "/api/players/7": { id: 7, display_name: "Sam Example", club_name: "Aston Villa" },
  "/api/scores": { stoke: { ours: 2, theirs: 1 } }, [`${H}/library`]: library };
const posted = () => vi.mocked(fetch).mock.calls.filter((c) => String(c[0]) === `${H}/downloads/media` && c[1]?.method === "POST")
  .map((c) => JSON.parse(String(c[1]?.body)));

it("is off until turned on, then builds the folder with the app's match details", async () => {
  stubFetch({ ...app, [`${H}/downloads/media`]: { enabled: false, folder: "/x/inbox/Media library" } });
  renderWithProviders(<MediaLibraryPanel entries={entries} />);
  const panel = await screen.findByRole("region", { name: "Media library" });
  const toggle = await within(panel).findByRole("switch", { name: /Media library for Plex/ });
  expect(toggle).toHaveAttribute("aria-checked", "false");
  expect(within(panel).queryByRole("button", { name: "Update" })).toBeNull();
  await vi.waitFor(() => expect(toggle).toBeEnabled());
  vi.mocked(fetch).mockImplementationOnce(async () => new Response(JSON.stringify(
    { enabled: true, folder: "/x/inbox/Media library", created: 3, updated: 0, failed: [] }), { status: 200 }));
  await userEvent.click(toggle);
  expect(posted()).toEqual([{ enabled: true, context: { club: "Aston Villa", player: "Sam Example",
    matches: { stoke: { label: "Aston Villa vs. Stoke City U11", ours: 2, theirs: 1 } } } }]);
  expect(await within(panel).findByText(/3 files added/)).toBeInTheDocument();
  expect(within(panel).getByText("/x/inbox/Media library")).toBeInTheDocument();
});

it("says which downloads could not be linked", async () => {
  stubFetch({ ...app, [`${H}/downloads/media`]: { enabled: true, folder: "/x/Media library" } });
  renderWithProviders(<MediaLibraryPanel entries={entries} />);
  const panel = await screen.findByRole("region", { name: "Media library" });
  vi.mocked(fetch).mockImplementationOnce(async () => new Response(JSON.stringify(
    { enabled: true, folder: "/x/Media library", created: 0, updated: 0, failed: ["hudl-x.mp4"] }), { status: 200 }));
  const button = await within(panel).findByRole("button", { name: "Update" });
  await vi.waitFor(() => expect(button).toBeEnabled());
  await userEvent.click(button);
  expect(await within(panel).findByRole("alert")).toHaveTextContent(/1 download could not be added/);
});

it("is hidden when the helper is not running", async () => {
  stubFetch(app);
  renderWithProviders(<MediaLibraryPanel entries={entries} />);
  await new Promise((r) => setTimeout(r, 50));
  expect(screen.queryByRole("region", { name: "Media library" })).toBeNull();
});

it("says when the drive cannot link files and copies were made instead", async () => {
  stubFetch({ ...app, [`${H}/downloads/media`]: { enabled: true, folder: "/Volumes/NAS/Media library" } });
  renderWithProviders(<MediaLibraryPanel entries={entries} />);
  const panel = await screen.findByRole("region", { name: "Media library" });
  vi.mocked(fetch).mockImplementationOnce(async () => new Response(JSON.stringify(
    { enabled: true, folder: "/Volumes/NAS/Media library", created: 34, updated: 0, failed: [], copied: 17, copied_bytes: 6.2 * 1024 ** 3 }), { status: 200 }));
  const button = await within(panel).findByRole("button", { name: "Update" });
  await vi.waitFor(() => expect(button).toBeEnabled());
  await userEvent.click(button);
  expect(await within(panel).findByText(/17 videos were copied \(6\.2 GB\)/)).toBeInTheDocument();
  expect(within(panel).getByText(/cannot link files/)).toBeInTheDocument();
  expect(within(panel).queryByRole("alert")).toBeNull();
});
