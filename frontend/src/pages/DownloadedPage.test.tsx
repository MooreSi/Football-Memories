import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../test/render";
import { DownloadedPage } from "./DownloadedPage";
import { downloadState } from "../api/hudl";

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
