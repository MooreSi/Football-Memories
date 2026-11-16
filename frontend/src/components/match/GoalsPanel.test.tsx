import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/render";
import { GoalsPanel } from "./GoalsPanel";

// Spec 270 (owner requests 2026-11-16): who scored, keepers, saves and conceded. Made-up names.
afterEach(() => vi.unstubAllGlobals());

const t = (id: string, category: string, time_s: number, duration_s: number) => ({ id, category, time_s, duration_s });
const hudl = { id: "m1", moments: [
  t("g1", "ASTON VILLA GOAL", 100, 25), t("p1", "Sam Example", 95, 15), t("p2", "Alex Demo", 110, 15),
  t("g2", "OPPOSITION GOAL", 500, 25),
  t("k1", "1 GOAL KEEPER", 700, 15), t("p4", "Chris Hands", 700, 15),
  t("o2", "OPPOSITION ON TARGET", 800, 10), t("a1", "ASTON VILLA ON TARGET", 98, 20),
] };

function serve(initial: Record<string, unknown> = {}) {
  let saved = initial;
  const puts: { match_id: string; entry: unknown }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { "Content-Type": "application/json" } });
    if (String(input) === "/api/goals" && init?.method === "PUT") {
      const body = JSON.parse(String(init.body)); puts.push(body);
      if (body.entry === null) { const { [body.match_id]: _, ...rest } = saved; saved = rest; } else saved = { ...saved, [body.match_id]: body.entry };
      return json(saved);
    }
    if (String(input) === "/api/goals") return json(saved);
    return new Response("{}", { status: 599 });
  }));
  return puts;
}

it("shows the likely scorer and keeper, marked as likely, and seeks to a goal", async () => {
  serve();
  const seek = vi.fn();
  renderWithProviders(<GoalsPanel match={hudl} club="Aston Villa" onSeek={seek} />);
  const panel = await screen.findByRole("region", { name: "Goals and keepers" });
  expect(within(panel).getByText("1 scored · 1 conceded")).toBeInTheDocument();
  const ours = within(panel).getByRole("list", { name: "Our goals" });
  expect(within(ours).getByText("Alex Demo")).toBeInTheDocument();
  expect(within(ours).getByText("Likely")).toBeInTheDocument();
  const keepers = within(panel).getByRole("list", { name: "Keepers" });
  expect(within(keepers).getByText("Chris Hands")).toBeInTheDocument();
  expect(within(keepers).getByText("1 save · 1 conceded")).toBeInTheDocument();
  await userEvent.setup().click(within(ours).getByRole("button", { name: "Watch goal at 1:40" }));
  expect(seek).toHaveBeenCalledWith(100);
});

it("saves the owner's scorer, an added goal and the keeper's saves, then shows them confirmed", async () => {
  const puts = serve();
  const user = userEvent.setup();
  renderWithProviders(<GoalsPanel match={hudl} club="Aston Villa" />);
  const panel = await screen.findByRole("region", { name: "Goals and keepers" });
  await user.click(within(panel).getByRole("button", { name: "Edit goals and keepers" }));
  const first = within(panel).getByLabelText("Scorer, our goal 1");
  expect(first).toHaveValue("Alex Demo");
  await user.clear(first); await user.type(first, "Sam Example");
  await user.click(within(panel).getByRole("button", { name: "Add one of our goals" }));
  await user.type(within(panel).getByLabelText("Scorer, our goal 2"), "Pat Demo");
  const saves = within(panel).getByLabelText("Keeper 1 saves");
  await user.clear(saves); await user.type(saves, "4");
  await user.click(within(panel).getByRole("button", { name: "Save" }));
  expect(puts).toHaveLength(1);
  const entry = puts[0].entry as { scorers: Record<string, string>; added: { id: string; side: string }[]; keepers: unknown[] };
  expect(puts[0].match_id).toBe("m1");
  expect(entry.added).toEqual([{ id: expect.any(String), side: "ours" }]);
  expect(entry.scorers).toEqual({ g1: "Sam Example", [entry.added[0].id]: "Pat Demo" });
  expect(entry.keepers).toEqual([{ name: "Chris Hands", saves: 4 }]);
  expect(await within(panel).findByText("2 scored · 1 conceded")).toBeInTheDocument();
  expect(within(panel).queryByText("Likely")).toBeNull();
  expect(within(panel).getByText("4 saves · 1 conceded")).toBeInTheDocument();

  await user.click(within(panel).getByRole("button", { name: "Use the guess" }));
  expect(puts[1]).toEqual({ match_id: "m1", entry: null });
  expect(await within(panel).findByText("1 scored · 1 conceded")).toBeInTheDocument();
});

it("stores nothing on Cancel", async () => {
  const puts = serve();
  const user = userEvent.setup();
  renderWithProviders(<GoalsPanel match={hudl} club="Aston Villa" />);
  const panel = await screen.findByRole("region", { name: "Goals and keepers" });
  await user.click(within(panel).getByRole("button", { name: "Edit goals and keepers" }));
  await user.type(within(panel).getByLabelText("Scorer, our goal 1"), "x");
  await user.click(within(panel).getByRole("button", { name: "Cancel" }));
  expect(puts).toEqual([]);
  expect(within(panel).getByText("Alex Demo")).toBeInTheDocument();
});

it("lists Veo's goals with no scorer until the owner names one", async () => {
  serve({ v1: { scorers: {}, added: [], removed: [], keepers: [{ name: "Jo Back", saves: null }], beaten: {} } });
  const veo = { id: "v1", source: "veo", team_data: { stats: {}, events: [
    { type: "GOAL", side: "own" as const, time_s: 61, period: 1 }, { type: "GOAL", side: "opponent" as const, time_s: 90, period: 1 },
  ] } };
  renderWithProviders(<GoalsPanel match={veo} club={null} />);
  const panel = await screen.findByRole("region", { name: "Goals and keepers" });
  expect(within(panel).getByText("Scorer not set")).toBeInTheDocument();
  expect(await within(panel).findByText("Saves not counted · 1 conceded")).toBeInTheDocument();
});
