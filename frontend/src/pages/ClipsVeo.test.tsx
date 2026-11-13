import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../test/render";
import { App } from "../App";
import { ClipExplorerPage } from "./ClipExplorerPage";

// Owner request 2026-11-13: a Veo match opens in the Clip explorer. Synthetic data.
const H = "http://127.0.0.1:8766";
const hudl = [{ id: "new", title: "261108 U11 v Stoke (A)", age_group: "U11", age_groups: ["U11"], moments: [] }];
const veo = [
  { id: "veo-a", source: "veo", title: "261108 RJ vs Northgate CB", age_group: "Unclassified", available: true, moments: [{ id: "h1", category: "GOAL", time_s: 61, duration_s: 10 }] },
  { id: "veo-b", source: "veo", title: "261025 RJ vs Town", age_group: "Unclassified", available: true, moments: [] },
];
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
function stub(library = hudl) {
  stubFetch({ [`${H}/library`]: library, [`${H}/veo/library`]: veo, [`${H}/account`]: { configured: true, state: "ready", busy: false },
    [`${H}/veo/account`]: { configured: true, state: "ready", busy: false, message: "", summary: null },
    "/api/moments": { total: 0, items: [] }, "/api/moments/facets": { categories: [], players: [], teams: [], seasons: [], matches: [] }, "/api/playlists": [] });
}

it("opens the Veo match named in the address, with Veo matches in the picker", async () => {
  stub();
  renderWithProviders(<Routes><Route path="/clips" element={<ClipExplorerPage />} /></Routes>, "/clips?match=veo-a");
  const picker = await screen.findByRole("combobox", { name: "Match" });
  await vi.waitFor(() => expect(picker).toHaveValue("veo-a"));
  const view = screen.getByRole("region", { name: "Selected Veo match" });
  expect(within(view).getByRole("heading", { name: /RJ vs Northgate CB/ })).toBeInTheDocument();
  expect(within(view).getByRole("list", { name: "Veo highlights" })).toBeInTheDocument();
  expect(within(picker).getByRole("group", { name: /Veo/ })).toBeInTheDocument();
  await userEvent.setup().selectOptions(picker, "veo-b");
  expect(await screen.findByRole("heading", { name: /RJ vs Town/ })).toBeInTheDocument();
});

it("offers Veo matches even with no Hudl matches", async () => {
  stub([]);
  renderWithProviders(<Routes><Route path="/clips" element={<ClipExplorerPage />} /></Routes>, "/clips?match=veo-b");
  expect(await screen.findByRole("region", { name: "Selected Veo match" })).toBeInTheDocument();
});

it("sends an old /veo/ link to the Clip explorer", async () => {
  stub();
  renderWithProviders(<App />, "/veo/veo-a");
  expect(await screen.findByRole("region", { name: "Selected Veo match" })).toBeInTheDocument();
});
