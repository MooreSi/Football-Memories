import { screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { renderWithProviders } from "../../test/render";
import { HudlHero } from "./HudlHero";

it("shows both clubs' crests at the top left of the snapshot", () => {
  renderWithProviders(<HudlHero club="Aston Villa" age="U11" matches={[
    { id: "liv", title: "261026 U11s v Liverpool (A) - Pitch 2", age_group: "U11", capture_key: "k" },
  ]} />);
  const crests = screen.getByRole("group", { name: "Aston Villa vs Liverpool" });
  const sources = [...crests.querySelectorAll("img")].map((i) => i.getAttribute("src"));
  expect(sources).toEqual(["/api/team-logo?name=Aston%20Villa", "/api/team-logo?name=Liverpool"]);
  expect(within(crests).getByText("v")).toBeInTheDocument();
});

it("shows no crests for a video that is not a fixture", () => {
  renderWithProviders(<HudlHero club="Aston Villa" age="U11" matches={[
    { id: "x", title: "Doku Combo 2", age_group: "U11", capture_key: "k" },
  ]} />);
  expect(screen.queryByRole("group", { name: /vs/ })).toBeNull();
});
