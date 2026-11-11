import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import type { HudlMatch } from "../../api/hudl";
import { renderWithProviders, stubFetch } from "../../test/render";
import { BatchDownload } from "./BatchDownload";

const H = "http://127.0.0.1:8766";
afterEach(() => vi.unstubAllGlobals());
const matches: HudlMatch[] = [
  { id: "stoke", title: "261108 U11 v Stoke (A)", age_group: "U11", capture_key: "k", moments: [
    { id: "a", category: "Sam Example", time_s: 1, duration_s: 2 }, { id: "b", category: "Sam Example", time_s: 5, duration_s: 2 }, { id: "g", category: "Goal", time_s: 9, duration_s: 2 }] },
  { id: "wba", title: "261101 U11s v West Brom (A)", age_group: "U11", capture_key: "j", moments: [{ id: "c", category: "Sam Example", time_s: 3, duration_s: 2 }] },
  { id: "derby", title: "261025 U11 v Derby (H)", age_group: "U11", capture_key: "d", moments: [{ id: "x", category: "Goal", time_s: 3, duration_s: 2 }] },
];
function Probe() { const l = useLocation(); return <pre data-testid="state">{JSON.stringify(l.state)}</pre>; }

function renderPanel() {
  stubFetch({ [`${H}/account`]: { state: "ready", busy: false }, [`${H}/account/batch`]: { accepted: true },
    [`${H}/downloads/index`]: [{ kind: "moments", match_id: "wba", matches: ["wba"], file: "moments/w.zip" }] });
  renderWithProviders(<Routes><Route path="/clips" element={<BatchDownload matches={matches} />} /><Route path="/clips/reel/new" element={<Probe />} /></Routes>, "/clips");
}

it("downloads one player's moments from every match they are tagged in", async () => {
  renderPanel();
  const user = userEvent.setup();
  await user.selectOptions(screen.getByRole("combobox", { name: "Player or code" }), "Sam Example");
  const list = screen.getByRole("list", { name: "Matches to include" });
  expect(within(list).getAllByRole("checkbox")).toHaveLength(2); // Derby has no Sam Example moments
  expect(within(list).getByRole("checkbox", { name: /Stoke City/ })).toBeChecked();
  // Already downloaded matches start unticked so nothing is fetched twice by accident.
  expect(await within(list).findByRole("checkbox", { name: /West Bromwich Albion/ })).not.toBeChecked();
  await user.click(screen.getByRole("radio", { name: /One video per match/ }));
  await user.click(screen.getByRole("button", { name: /Download 2 moments from 1 match/ }));
  const call = vi.mocked(fetch).mock.calls.find(([u]) => String(u) === `${H}/account/batch`)!;
  expect(JSON.parse(String(call[1]?.body))).toEqual({ items: [{ match_id: "stoke", codes: ["Sam Example"] }], combined: true });
});

it("sends the selection to the highlight reel studio", async () => {
  renderPanel();
  const user = userEvent.setup();
  await user.selectOptions(screen.getByRole("combobox", { name: "Player or code" }), "Sam Example");
  await user.click(within(screen.getByRole("list", { name: "Matches to include" })).getByRole("checkbox", { name: /West Bromwich Albion/ }));
  await user.click(screen.getByRole("radio", { name: /One highlight reel/ }));
  await user.click(screen.getByRole("button", { name: /Create highlight reel/ }));
  const state = JSON.parse(screen.getByTestId("state").textContent!);
  expect(state).toEqual({ name: "Sam Example highlights", items: [
    { match_id: "stoke", codes: ["Sam Example"] }, { match_id: "wba", codes: ["Sam Example"] }] });
});

it("can send the selection to the studio as one reel per match", async () => {
  renderPanel();
  const user = userEvent.setup();
  await user.selectOptions(screen.getByRole("combobox", { name: "Player or code" }), "Sam Example");
  await user.click(within(screen.getByRole("list", { name: "Matches to include" })).getByRole("checkbox", { name: /West Bromwich Albion/ }));
  await user.click(screen.getByRole("radio", { name: /One reel per match/ }));
  await user.click(screen.getByRole("button", { name: /Create 2 highlight reels/ }));
  const state = JSON.parse(screen.getByTestId("state").textContent!);
  expect(state).toEqual({ name: "Sam Example highlights", per_match: true, items: [
    { match_id: "stoke", codes: ["Sam Example"] }, { match_id: "wba", codes: ["Sam Example"] }] });
});
