import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it } from "vitest";
import { MilestonesTimeline } from "./MilestonesTimeline";

it("shows each milestone as a badge with its date and a link, oldest first", () => {
  render(<MemoryRouter><MilestonesTimeline name="Sam Example" series={[
    { match_id: 1, match_date: "2026-08-30", opponent: "Rovers", moments: 60 },
    { match_id: 2, match_date: "2026-09-06", opponent: "Town", moments: 50, href: "/hudl/t?player=Sam", age: "U11", goals: 1 },
  ]} /></MemoryRouter>);
  const list = within(screen.getByRole("region", { name: "Milestones" })).getByRole("list", { name: "Milestones, oldest first" });
  const items = within(list).getAllByRole("listitem");
  expect(items.map((i) => within(i).getByRole("heading").textContent)).toEqual(["First match", "100 moments", "First team goal with Sam on"]);
  expect(within(items[0]).getByText("30 Aug 2026")).toBeInTheDocument();
  expect(within(items[2]).getByRole("link")).toHaveAttribute("href", "/hudl/t?player=Sam");
});

it("is left out with no matches", () => {
  render(<MemoryRouter><MilestonesTimeline name="Sam" series={[]} /></MemoryRouter>);
  expect(screen.queryByRole("region", { name: "Milestones" })).toBeNull();
});
