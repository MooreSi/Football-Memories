import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../test/render";
import { DownloadedPage } from "./DownloadedPage";
import { downloadState } from "../api/hudl";
import { fireEvent } from "@testing-library/react";

afterEach(() => vi.unstubAllGlobals());
const H = "http://127.0.0.1:8766";
const entries = [
  { kind: "moments", match_id: "stoke", matches: ["stoke"], title: "261108 U11 v Stoke (A)", file: "moments/Stoke Sam.zip", url: `${H}/files/s/moments/Stoke%20Sam.zip`,
    moment_count: 12, codes: ["Sam Example"], combined: false, created: Date.UTC(2026, 10, 10) / 1000, size: 52_428_800, modified: 0 },
  { kind: "match", match_id: "stoke", matches: ["stoke"], title: "261108 U11 v Stoke (A)", file: "hudl-x-highest-1080p-1.mp4", url: `${H}/files/s/hudl-x-highest-1080p-1.mp4`,
    moment_count: 455, codes: [], combined: false, created: Date.UTC(2026, 10, 9) / 1000, size: 3_000_000_000, modified: 0 },
  { kind: "moments", match_id: "wba", matches: ["wba"], title: "261101 U11s v West Brom (A)", file: "moments/WBA.mp4", url: `${H}/files/s/moments/WBA.mp4`,
    moment_count: 3, codes: ["Goal"], combined: true, created: Date.UTC(2026, 10, 2) / 1000, size: 1_000_000, modified: 0 },
];
const library = [
  { id: "stoke", title: "261108 U11 v Stoke (A)", age_group: "U11", age_groups: ["U11"], season_label: "2026/27", capture_key: "x" },
  { id: "wba", title: "261101 U11s v West Brom (A)", age_group: "U11", age_groups: ["U11"], season_label: "2026/27", capture_key: "y" },
];

it("lists downloaded matches and moments per match with their metadata and links", async () => {
  stubFetch({ [`${H}/downloads/index`]: entries, [`${H}/library`]: library });
  renderWithProviders(<DownloadedPage />);
  const stoke = await screen.findByRole("article", { name: /Stoke City/ });
  expect(within(stoke).getByText("Full match")).toBeInTheDocument();
  expect(within(stoke).getByText(/12 moments/)).toBeInTheDocument();
  expect(within(stoke).getByText(/Sam Example/)).toBeInTheDocument();
  expect(within(stoke).getByText(/8 November 2026/)).toBeInTheDocument();
  expect(within(stoke).getByRole("link", { name: /Save Stoke Sam.zip/ })).toHaveAttribute("href", `${H}/files/s/moments/Stoke%20Sam.zip`);
  expect(screen.getByRole("article", { name: /West Bromwich Albion/ })).toBeInTheDocument();
});

it("filters to moments only", async () => {
  stubFetch({ [`${H}/downloads/index`]: entries, [`${H}/library`]: library });
  renderWithProviders(<DownloadedPage />);
  await screen.findByRole("article", { name: /Stoke City/ });
  await userEvent.click(screen.getByRole("button", { name: /Moments/ }));
  expect(screen.queryByText("Full match")).toBeNull();
  expect(screen.getAllByRole("article")).toHaveLength(2);
});

it("explains an empty list", async () => {
  stubFetch({ [`${H}/downloads/index`]: [], [`${H}/library`]: [] });
  renderWithProviders(<DownloadedPage />);
  expect(await screen.findByText(/Nothing downloaded yet/)).toBeInTheDocument();
});

it("summarises what each match has downloaded for the Library badges", () => {
  const state = downloadState(entries as never);
  expect(state.get("stoke")).toEqual({ match: true, moments: true });
  expect(state.get("wba")).toEqual({ match: false, moments: true });
  expect(state.get("other")).toBeUndefined();
});

it("plays a downloaded match, reel or combined video in place", async () => {
  stubFetch({ [`${H}/downloads/index`]: entries, [`${H}/library`]: library });
  renderWithProviders(<DownloadedPage />);
  const wba = await screen.findByRole("article", { name: /West Bromwich Albion/ });
  await userEvent.click(within(wba).getByRole("button", { name: /Play WBA.mp4/ }));
  const dialog = screen.getByRole("dialog", { name: /Play/ });
  expect(dialog.querySelector("video")).toHaveAttribute("src", `${H}/files/s/moments/WBA.mp4`);
});

it("plays a moments ZIP clip after clip from the downloaded file", async () => {
  stubFetch({ [`${H}/downloads/index`]: entries, [`${H}/library`]: library,
    [`${H}/downloads/members`]: [{ name: "Stoke - Goal - 001.mp4", url: `${H}/files/s/moments/Stoke%20Sam.zip?member=1` },
      { name: "Stoke - Save - 002.mp4", url: `${H}/files/s/moments/Stoke%20Sam.zip?member=2` }] });
  renderWithProviders(<DownloadedPage />);
  const stoke = await screen.findByRole("article", { name: /Stoke City/ });
  await userEvent.click(within(stoke).getByRole("button", { name: /Play Stoke Sam.zip/ }));
  const dialog = await screen.findByRole("dialog", { name: /Play/ });
  const video = await vi.waitFor(() => { const v = dialog.querySelector("video"); if (!v?.getAttribute("src")) throw new Error("no clip"); return v; });
  expect(video).toHaveAttribute("src", `${H}/files/s/moments/Stoke%20Sam.zip?member=1`);
  expect(within(dialog).getByText(/1 of 2/)).toBeInTheDocument();
  fireEvent.ended(video);
  expect(dialog.querySelector("video")).toHaveAttribute("src", `${H}/files/s/moments/Stoke%20Sam.zip?member=2`);
  const asked = vi.mocked(fetch).mock.calls.map(([u]) => String(u)).find((u) => u.includes("/downloads/members"));
  expect(asked).toContain("file=moments%2FStoke%20Sam.zip");
});

it("deletes a download only after a second confirmation, moving it to the Trash", async () => {
  stubFetch({ [`${H}/downloads/index`]: entries, [`${H}/library`]: library, [`${H}/account`]: { platform: "mac" },
    [`${H}/downloads/remove`]: { trashed_as: "WBA.mp4" } });
  const posted = () => vi.mocked(fetch).mock.calls.filter((c) => String(c[0]).endsWith("/downloads/remove"))
    .map((c) => JSON.parse(String(c[1]?.body)));
  renderWithProviders(<DownloadedPage />);
  const user = userEvent.setup();
  const wba = await screen.findByRole("article", { name: /West Bromwich Albion/ });
  await user.click(within(wba).getByRole("button", { name: "Delete WBA.mp4" }));
  const dialog = screen.getByRole("dialog", { name: "Delete WBA.mp4?" });
  expect(dialog).toHaveTextContent(/Trash/);
  expect(posted()).toEqual([]);
  await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(posted()).toEqual([]);
  await user.click(within(wba).getByRole("button", { name: "Delete WBA.mp4" }));
  await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: /Move to Trash/ }));
  expect(posted()).toEqual([{ file: "moments/WBA.mp4" }]);
});

it("shows the media library panel and says Delete takes its folder too", async () => {
  stubFetch({ [`${H}/downloads/index`]: entries, [`${H}/library`]: library, [`${H}/account`]: { platform: "mac" },
    [`${H}/downloads/media`]: { enabled: true, folder: "/x/Media library" } });
  renderWithProviders(<DownloadedPage />);
  expect(await screen.findByRole("region", { name: "Media library" })).toBeInTheDocument();
  const wba = await screen.findByRole("article", { name: /West Bromwich Albion/ });
  await userEvent.click(within(wba).getByRole("button", { name: "Delete WBA.mp4" }));
  expect(screen.getByRole("dialog", { name: "Delete WBA.mp4?" })).toHaveTextContent(/Media library folder/);
});

// Owner request 2026-11-13: a Veo download is named with the Veo team, not the Hudl club.
it("labels a Veo download with the Veo team name from Settings", async () => {
  stubFetch({
    [`${H}/downloads/index`]: [{ kind: "match", match_id: "veo-a", matches: ["veo-a"], title: "261108 RJ vs Northgate CB", file: "RJ vs Northgate 2026-11-08.mp4",
      url: `${H}/files/s/x.mp4`, moment_count: 0, codes: [], combined: false, created: 0, size: 1, modified: 0 }],
    [`${H}/library`]: library,
    [`${H}/veo/library`]: [{ id: "veo-a", source: "veo", title: "261108 RJ vs Northgate CB", age_group: "Unclassified", available: true, moments: [] }],
    "/api/settings/home-teams": { hudl: "Aston Example", veo: "Riverside Juniors" },
  });
  renderWithProviders(<DownloadedPage />);
  const veo = await screen.findByRole("article", { name: /Riverside Juniors vs\. Northgate CB/ });
  expect(within(veo).getByRole("link", { name: "Open match" })).toHaveAttribute("href", "/veo/veo-a");
  expect(screen.queryByRole("article", { name: /Aston Example vs\. Northgate/ })).toBeNull();
});
