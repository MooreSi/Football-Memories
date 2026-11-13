import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { expect, it } from "vitest";
import { SeasonStory } from "./SeasonStory";

const series = [
  { match_id: 1, match_date: "2025-09-06", opponent: "Rovers", moments: 10 },
  { match_id: 2, match_date: "2026-09-19", opponent: "Town", moments: 30, href: "/hudl/t?player=Sam" },
  { match_id: 3, match_date: "2026-10-03", opponent: "Rovers", moments: 18 },
];

it("tells the newest season first and switches to another season", async () => {
  render(<MemoryRouter><SeasonStory series={series} name="Sam Example" today={new Date("2026-11-13T12:00:00")} /></MemoryRouter>);
  const panel = screen.getByRole("region", { name: "Season story" });
  expect(within(panel).getByRole("tab", { name: "2026/27" })).toHaveAttribute("aria-selected", "true");
  expect(within(panel).getByText(/2026\/27 so far: 2 matches and 48 moments/)).toBeInTheDocument();
  const months = within(panel).getByRole("list", { name: "Match of the month" });
  const items = within(months).getAllByRole("listitem");
  expect(items).toHaveLength(2);
  expect(within(items[0]).getByText("September 2026")).toBeInTheDocument();
  expect(within(items[0]).getByRole("link", { name: /vs Town/ })).toHaveAttribute("href", "/hudl/t?player=Sam");
  await userEvent.setup().click(within(panel).getByRole("tab", { name: "2025/26" }));
  expect(within(panel).getByText(/^2025\/26: 1 match and 10 moments/)).toBeInTheDocument();
});

it("is left out with no matches", () => {
  render(<MemoryRouter><SeasonStory series={[]} name="Sam" /></MemoryRouter>);
  expect(screen.queryByRole("region", { name: "Season story" })).toBeNull();
});
