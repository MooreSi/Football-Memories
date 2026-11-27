import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { RefreshColours } from "./RefreshColours";

afterEach(() => vi.unstubAllGlobals());
const hash = "b".repeat(64);
const kits = [
  { team: "own" as const, role: "player" as const, lab: [66, 130, 123], examples: 300 },
  { team: "opponent" as const, role: "player" as const, lab: [137, 150, 101], examples: 47 },
  { team: null, role: "referee" as const, lab: [70, 133, 123], examples: 50 },
];

it("re-reads shirt colours in a new run that keeps your labels, sending your two teams' kits", async () => {
  let sent: { url: string; body: unknown } | undefined;
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/me")) return Response.json({ csrf_token: "synthetic" });
    sent = { url, body: JSON.parse(init!.body as string) };
    return Response.json({ id: "c".repeat(32) }, { status: 202 });
  }));
  const onQueued = vi.fn();
  render(<RefreshColours jobId="j" sourceHash={hash} kits={kits} onQueued={onQueued} />);
  await userEvent.click(screen.getByRole("button", { name: "Update shirt colours" }));
  await waitFor(() => expect(onQueued).toHaveBeenCalledWith("c".repeat(32)));
  expect(sent?.url).toMatch(/\/jobs\/j\/team-calibration$/);
  expect(sent?.body).toEqual({ source_sha256: hash, kits: [
    { id: "own", label: "Our team", colour_hex: expect.stringMatching(/^#[0-9a-f]{6}$/) },
    { id: "opponent", label: "Opponent", colour_hex: expect.stringMatching(/^#[0-9a-f]{6}$/) },
  ] });
});

it("needs one label for each team first", () => {
  render(<RefreshColours jobId="j" sourceHash={hash} kits={kits.slice(1)} onQueued={() => undefined} />);
  expect(screen.getByRole("button", { name: "Update shirt colours" })).toBeDisabled();
  expect(screen.getByText(/Label one player from each team first/)).toBeInTheDocument();
});
