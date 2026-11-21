import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/render";
import { PlayerMinutes } from "./PlayerMinutes";
afterEach(() => vi.unstubAllGlobals());

it("saves confirmed minutes and reads them after remount", async () => {
  let saved: Record<string, number> = {};
  const bodies: unknown[] = [];
  vi.stubGlobal("fetch", vi.fn(async (_input, init) => {
    if (init?.method === "PUT") {
      const body = JSON.parse(init.body); bodies.push(body);
      saved = { "SAM EXAMPLE": body.minutes };
    }
    return new Response(JSON.stringify(saved), { status: 200 });
  }));
  const user = userEvent.setup();
  const view = renderWithProviders(<PlayerMinutes matchId="a" name="Sam Example" />);
  await user.click(screen.getByRole("button", { name: "Edit minutes for Sam Example" }));
  await user.type(screen.getByLabelText("Minutes played for Sam Example"), "42.5");
  await user.click(screen.getByRole("button", { name: "Save minutes" }));
  expect(await screen.findByText("42.5")).toBeInTheDocument();
  expect(bodies).toEqual([{ match_id: "a", player: "Sam Example", minutes: 42.5 }]);
  view.unmount();
  renderWithProviders(<PlayerMinutes matchId="a" name="Sam Example" />);
  expect(await screen.findByText("42.5")).toBeInTheDocument();
});

it("reports a failed save instead of presenting unsaved minutes", async () => {
  vi.stubGlobal("fetch", vi.fn(async (_input, init) => new Response(JSON.stringify({}), { status: init?.method === "PUT" ? 503 : 200 })));
  const user = userEvent.setup();
  renderWithProviders(<PlayerMinutes matchId="a" name="Sam Example" />);
  await user.click(screen.getByRole("button", { name: "Edit minutes for Sam Example" }));
  await user.type(screen.getByLabelText("Minutes played for Sam Example"), "40");
  await user.click(screen.getByRole("button", { name: "Save minutes" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not save minutes");
});

it("shows saved zero and clears it without replacing it with an estimate", async () => {
  let saved: Record<string, number> = { "SAM EXAMPLE": 0 };
  const puts: unknown[] = [];
  vi.stubGlobal("fetch", vi.fn(async (_input, init) => {
    if (init?.method === "PUT") { puts.push(JSON.parse(init.body)); saved = {}; }
    return new Response(JSON.stringify(saved), { status: 200 });
  }));
  const user = userEvent.setup();
  renderWithProviders(<PlayerMinutes matchId="a" name="Sam Example" />);
  expect(await screen.findByText("0")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Edit minutes for Sam Example" }));
  await user.clear(screen.getByLabelText("Minutes played for Sam Example"));
  await user.click(screen.getByRole("button", { name: "Save minutes" }));
  expect(await screen.findByText("—")).toBeInTheDocument();
  expect(puts).toEqual([{ match_id: "a", player: "Sam Example", minutes: null }]);
});

it("labels inferred minutes and explains their limitations", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 200 })));
  renderWithProviders(<PlayerMinutes matchId="a" name="Sam Example" estimate={38} />);
  expect(await screen.findByText("≈38")).toBeInTheDocument();
  expect(screen.getByText(/Estimated from first to last player tag/)).toHaveTextContent("Substitutions and untagged time may change actual minutes");
});

it("keeps confirmed minutes ahead of an estimate", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response('{"SAM EXAMPLE":42}', { status: 200 })));
  renderWithProviders(<PlayerMinutes matchId="a" name="Sam Example" estimate={38} />);
  expect(await screen.findByText("42")).toBeInTheDocument();
  expect(screen.queryByText("≈38")).not.toBeInTheDocument();
});
