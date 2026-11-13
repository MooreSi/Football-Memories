import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it } from "vitest";
import { RecordsPanel } from "./RecordsPanel";

const series = [
  { match_id: 1, match_date: "2026-09-06", opponent: "Rovers", moments: 10 },
  { match_id: 2, match_date: "2026-10-04", opponent: "Northgate", moments: 30, href: "/hudl/n?player=Sam" },
];

it("shows the best match with its link, best month, run and next milestone", () => {
  render(<MemoryRouter><RecordsPanel series={series} /></MemoryRouter>);
  const panel = screen.getByRole("region", { name: "Records and streaks" });
  const best = within(panel).getByRole("group", { name: "Best match" });
  expect(best).toHaveTextContent("30");
  expect(best).toHaveTextContent("vs Northgate");
  expect(within(best).getByRole("link")).toHaveAttribute("href", "/hudl/n?player=Sam");
  expect(within(panel).getByRole("group", { name: "Best month" })).toHaveTextContent("October 2026");
  expect(within(panel).getByRole("group", { name: "Above-average run" })).toHaveTextContent("1");
  const next = within(panel).getByRole("group", { name: "Next milestone" });
  expect(next).toHaveTextContent("50");
  expect(within(next).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "80");
  expect(within(panel).getByText("New personal best")).toBeInTheDocument();
});

it("is left out when there are no matches", () => {
  render(<MemoryRouter><RecordsPanel series={[]} /></MemoryRouter>);
  expect(screen.queryByRole("region", { name: "Records and streaks" })).toBeNull();
});
