import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import type { HudlMatch } from "../../api/hudl";
import { renderWithProviders } from "../../test/render";
import { PlayerInsights } from "./PlayerInsights";

const t = (id: string, category: string, time_s: number, duration_s = 0) => ({ id, category, time_s, duration_s });
const match = (id: string, title: string, season: string, moments: ReturnType<typeof t>[]): HudlMatch =>
  ({ id, title, age_group: season === "2025-26" ? "U10" : "U11", capture_key: id, season_label: season, moments });
const library = [
  match("a", "250901 U10 v Rovers", "2025-26", [t("a1", "PAT EXAMPLE", 10, 5), t("a2", "ASTON VILLA CHANCE", 12), t("a3", "ALEX SAMPLE", 11, 2)]),
  match("b", "260901 U11 v Stoke City", "2026-27", [
    t("b1", "PAT EXAMPLE", 100, 10), t("b2", "ASTON VILLA POSSESSION", 95, 30), t("b3", "ASTON VILLA ATTACKING THIRD ENTRY", 101),
    t("b4", "ASTON VILLA GOAL", 104), t("b5", "OPPOSITION CHANCE", 300), t("b6", "OPPOSITION POSSESSION", 290, 20), t("b7", "ALEX SAMPLE", 102, 2),
  ]),
  match("c", "260908 U11 v Town", "2026-27", [t("c1", "PRESSING", 1)]),
];

it("says what he was on the pitch during, for the latest season by default", () => {
  renderWithProviders(<PlayerInsights library={library} name="Pat Example" club="Aston Villa" />);
  const panel = screen.getByRole("region", { name: "Involvement" });
  expect(panel).toHaveTextContent("Tagged during 0 of our chances and 1 goal, and during 0 opposition chances, across 1 match.");
  expect(panel).toHaveTextContent(/not necessarily the one who made them/);
});

it("switches the season, and charts every season of the journey", async () => {
  renderWithProviders(<PlayerInsights library={library} name="Pat Example" club="Aston Villa" />);
  await userEvent.setup().selectOptions(screen.getByLabelText("Season"), "all");
  expect(screen.getByRole("region", { name: "Involvement" })).toHaveTextContent("Tagged during 1 of our chances and 1 goal");
  const journey = screen.getByRole("region", { name: "Football journey" });
  expect(within(journey).getAllByRole("listitem").map((li) => li.getAttribute("aria-label"))).toEqual([
    "2025-26: 1 moments per match over 1 matches, 100% attacking, 0% defending",
    "2026-27: 1 moments per match over 1 matches, 100% attacking, 0% defending",
  ]);
});

it("ranks partners and links his attacks that ended in a chance", () => {
  renderWithProviders(<PlayerInsights library={library} name="Pat Example" club="Aston Villa" />);
  expect(screen.getByRole("region", { name: "Best partnerships" })).toHaveTextContent("Alex Sample1 shared moments · 1 match");
  const attacks = screen.getByRole("region", { name: "Attacks he was in" });
  expect(within(attacks).getByRole("link")).toHaveAttribute("href", "/hudl/b?player=Pat%20Example&phases=1");
});

it("shows nothing for a player with no tagged moments", () => {
  const { container } = renderWithProviders(<PlayerInsights library={library} name="Nobody Here" club="Aston Villa" />);
  expect(container).toBeEmptyDOMElement();
});
