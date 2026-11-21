import { screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { EMPTY_ENTRY } from "../../lib/goals";
import { renderWithProviders, stubFetch } from "../../test/render";
import { RecordsPanel } from "./RecordsPanel";

afterEach(() => vi.unstubAllGlobals());

it("replaces moment milestones with the four outfield records", async () => {
  stubFetch({ "/api/goals": {} });
  renderWithProviders(<RecordsPanel library={[]} name="Sam Example" position="Forward" club={null} />);
  const panel = screen.getByRole("region", { name: "Records and streaks" });
  await within(panel).findByRole("group", { name: "Goals scored" });
  expect(within(panel).getAllByRole("group").map(el => el.getAttribute("aria-label"))).toEqual([
    "Goals scored", "Shots on target", "Chances", "Passes",
  ]);
  expect(within(panel).getAllByText("—")).toHaveLength(4);
  expect(within(panel).queryByText("Next milestone")).toBeNull();
});

it("uses saved goalkeeper records and formats the save percentage", async () => {
  stubFetch({ "/api/goals": { a: { ...EMPTY_ENTRY, keepers: [{ name: "Sam Example", saves: 3 }],
    added: [{ id: "g", side: "theirs" }] } } });
  renderWithProviders(<RecordsPanel library={[{ id: "a", title: "Synthetic match", age_group: "U11", capture_key: "a" }]} name="Sam Example" position="Goalkeeper" club={null} />);
  expect(await screen.findByRole("group", { name: "Save percentage" })).toHaveTextContent("75%");
  expect(screen.getByRole("group", { name: "Goals conceded" })).toHaveTextContent("1");
  expect(screen.getAllByRole("group")).toHaveLength(4);
});

it("does not show uncorrected totals when saved assignments fail to load", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 500 })));
  renderWithProviders(<RecordsPanel library={[]} name="Sam Example" position="GK" club={null} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load saved goals and keepers");
  expect(screen.queryByRole("group")).toBeNull();
});
